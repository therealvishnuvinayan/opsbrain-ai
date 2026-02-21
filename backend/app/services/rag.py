import json
import re
import uuid
from collections import defaultdict
from dataclasses import dataclass
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import Select, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import get_settings
from app.models.customer import Customer
from app.models.knowledge_chunk import KnowledgeChunk
from app.models.order import Order
from app.models.supplier import Supplier
from app.schemas.ask import AskResponse, CitationOut
from app.services.embeddings import EmbeddingService

ORDER_PATTERN = re.compile(r"OB-\d+", re.IGNORECASE)


@dataclass
class ContextBundle:
    orders: list[Order]
    customers: list[Customer]
    suppliers: list[Supplier]


def _truncate(value: str, length: int = 220) -> str:
    text = " ".join(value.split())
    return text[: length - 3] + "..." if len(text) > length else text


def _extract_order_numbers(question: str) -> list[str]:
    return [match.upper() for match in ORDER_PATTERN.findall(question)]


async def _fetch_context_entities(
    session: AsyncSession,
    *,
    question: str,
    order_numbers_hint: list[str],
    customer_ids_hint: list[uuid.UUID],
    supplier_ids_hint: list[uuid.UUID],
) -> ContextBundle:
    order_numbers = set(_extract_order_numbers(question))
    order_numbers.update([order.upper() for order in order_numbers_hint])

    stmt: Select[tuple[Order]] = select(Order).options(
        joinedload(Order.customer),
        joinedload(Order.supplier),
    )

    filters = []

    if order_numbers:
        filters.append(Order.order_number.in_(order_numbers))

    if customer_ids_hint:
        filters.append(Order.customer_id.in_(customer_ids_hint))

    if supplier_ids_hint:
        filters.append(Order.supplier_id.in_(supplier_ids_hint))

    if filters:
        stmt = stmt.where(or_(*filters))
    else:
        question_like = f"%{question.strip()}%"
        stmt = stmt.join(Order.customer).join(Order.supplier).where(
            or_(
                Order.order_number.ilike(question_like),
                Customer.name.ilike(question_like),
                Customer.email.ilike(question_like),
                Supplier.name.ilike(question_like),
                Supplier.domain.ilike(question_like),
            )
        )

    stmt = stmt.order_by(Order.updated_at.desc()).limit(12)

    result = await session.execute(stmt)
    orders = list(result.scalars().unique().all())

    customers_by_id: dict[uuid.UUID, Customer] = {}
    suppliers_by_id: dict[uuid.UUID, Supplier] = {}

    for order in orders:
        if order.customer:
            customers_by_id[order.customer.id] = order.customer
        if order.supplier:
            suppliers_by_id[order.supplier.id] = order.supplier

    if customer_ids_hint:
        customer_stmt = select(Customer).where(Customer.id.in_(customer_ids_hint)).limit(20)
        customer_result = await session.execute(customer_stmt)
        for customer in customer_result.scalars().all():
            customers_by_id[customer.id] = customer

    if supplier_ids_hint:
        supplier_stmt = select(Supplier).where(Supplier.id.in_(supplier_ids_hint)).limit(20)
        supplier_result = await session.execute(supplier_stmt)
        for supplier in supplier_result.scalars().all():
            suppliers_by_id[supplier.id] = supplier

    return ContextBundle(
        orders=orders,
        customers=list(customers_by_id.values()),
        suppliers=list(suppliers_by_id.values()),
    )


async def _retrieve_knowledge(
    session: AsyncSession,
    *,
    question: str,
    k: int,
    embedding_service: EmbeddingService,
) -> list[tuple[KnowledgeChunk, float | None]]:
    limit = max(1, min(k, 20))
    query_embedding = (await embedding_service.embed_texts([question]))[0]

    if query_embedding is not None:
        score = KnowledgeChunk.embedding.cosine_distance(query_embedding)
        stmt = (
            select(KnowledgeChunk, score.label("score"))
            .where(KnowledgeChunk.embedding.is_not(None))
            .order_by(score.asc())
            .limit(limit)
        )

        result = await session.execute(stmt)
        rows = result.all()
        return [(row[0], float(row[1])) for row in rows]

    pattern = f"%{question.strip()}%"
    stmt = (
        select(KnowledgeChunk)
        .where(KnowledgeChunk.content.ilike(pattern))
        .order_by(KnowledgeChunk.created_at.desc())
        .limit(limit)
    )

    result = await session.execute(stmt)
    chunks = list(result.scalars().all())
    return [(chunk, None) for chunk in chunks]


def _fallback_answer(
    *,
    question: str,
    context: ContextBundle,
    chunk_rows: list[tuple[KnowledgeChunk, float | None]],
) -> dict[str, Any]:
    order_lines = [
        f"{order.order_number} ({order.status}, {order.currency} {order.amount})"
        for order in context.orders[:5]
    ]

    evidence = []

    for order in context.orders[:4]:
        evidence.append(
            f"[orders] {order.order_number} status={order.status} supplier={order.supplier.name if order.supplier else 'unknown'}"
        )

    for chunk, score in chunk_rows[:4]:
        score_text = f" score={score:.4f}" if score is not None else ""
        evidence.append(
            f"[knowledge]{score_text} {_truncate(chunk.content, 180)}"
        )

    if not evidence:
        evidence.append("No indexed knowledge snippets matched this query.")

    key_findings = [
        f"Matched {len(context.orders)} order records from operational data.",
        f"Matched {len(context.customers)} customer records and {len(context.suppliers)} supplier records.",
        f"Retrieved {len(chunk_rows)} knowledge snippets for supporting context.",
    ]

    summary = (
        "OpsBrain performed entity lookup and contextual retrieval. "
        "This response is deterministic because OPENAI_API_KEY is not configured."
    )

    recommended_actions = []

    if context.orders:
        recommended_actions.append(
            {
                "label": "Open order",
                "href": f"/operations/orders/{context.orders[0].order_number}",
            }
        )

    if context.customers:
        recommended_actions.append(
            {
                "label": "Open customer",
                "href": f"/operations/customers/{context.customers[0].id}",
            }
        )

    recommended_actions.extend(
        [
            {"label": "Start investigation", "href": "/investigation"},
            {"label": "Create action", "href": "/actions"},
        ]
    )

    answer = (
        f"Question: {question}\n"
        f"Primary operational matches: {', '.join(order_lines) if order_lines else 'none'}\n"
        "Recommendation: review cited snippets and run investigation for high-risk statuses."
    )

    return {
        "answer": answer,
        "structured": {
            "summary": summary,
            "key_findings": key_findings,
            "evidence": evidence,
            "recommended_actions": recommended_actions,
        },
        "raw_model_output": None,
    }


async def _llm_answer(
    *,
    question: str,
    context: ContextBundle,
    chunk_rows: list[tuple[KnowledgeChunk, float | None]],
) -> dict[str, Any] | None:
    settings = get_settings()

    if not settings.openai_api_key:
        return None

    client = AsyncOpenAI(api_key=settings.openai_api_key)

    entities_payload = {
        "orders": [
            {
                "order_number": order.order_number,
                "status": order.status,
                "amount": str(order.amount),
                "currency": order.currency,
                "customer": order.customer.name if order.customer else None,
                "supplier": order.supplier.name if order.supplier else None,
            }
            for order in context.orders
        ],
        "customers": [
            {
                "id": str(customer.id),
                "name": customer.name,
                "email": customer.email,
                "tier": customer.tier,
            }
            for customer in context.customers
        ],
        "suppliers": [
            {
                "id": str(supplier.id),
                "name": supplier.name,
                "domain": supplier.domain,
                "health": supplier.health,
            }
            for supplier in context.suppliers
        ],
    }

    snippets_payload = [
        {
            "chunk_id": str(chunk.id),
            "source_id": str(chunk.source_id),
            "score": score,
            "snippet": _truncate(chunk.content, 400),
        }
        for chunk, score in chunk_rows
    ]

    system_prompt = (
        "You are OpsBrain AI, an operations assistant for reconciliation and supplier workflows. "
        "Return strict JSON only with keys: answer, structured. "
        "structured must include summary, key_findings (array), evidence (array), recommended_actions (array of {label, href}). "
        "Be concise and only reference provided context."
    )

    user_prompt = json.dumps(
        {
            "question": question,
            "entities": entities_payload,
            "knowledge_snippets": snippets_payload,
            "href_conventions": {
                "orders": "/operations/orders/{order_number}",
                "customers": "/operations/customers/{customer_id}",
                "suppliers": "/operations/suppliers/{supplier_id}",
                "investigation": "/investigation",
                "actions": "/actions",
            },
        },
        ensure_ascii=False,
    )

    completion = await client.chat.completions.create(
        model=settings.openai_chat_model,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    raw_content = completion.choices[0].message.content or "{}"
    parsed = json.loads(raw_content)

    if not isinstance(parsed, dict):
        return None

    answer = str(parsed.get("answer", "")).strip()
    structured = parsed.get("structured", {})

    if not answer or not isinstance(structured, dict):
        return None

    key_findings = structured.get("key_findings")
    evidence = structured.get("evidence")
    actions = structured.get("recommended_actions")

    return {
        "answer": answer,
        "structured": {
            "summary": str(structured.get("summary", "")),
            "key_findings": key_findings if isinstance(key_findings, list) else [],
            "evidence": evidence if isinstance(evidence, list) else [],
            "recommended_actions": actions if isinstance(actions, list) else [],
        },
        "raw_model_output": parsed,
    }


async def ask_question(
    session: AsyncSession,
    *,
    question: str,
    order_numbers_hint: list[str],
    customer_ids_hint: list[uuid.UUID],
    supplier_ids_hint: list[uuid.UUID],
    k: int,
    embedding_service: EmbeddingService,
) -> AskResponse:
    context = await _fetch_context_entities(
        session,
        question=question,
        order_numbers_hint=order_numbers_hint,
        customer_ids_hint=customer_ids_hint,
        supplier_ids_hint=supplier_ids_hint,
    )

    chunk_rows = await _retrieve_knowledge(
        session,
        question=question,
        k=k,
        embedding_service=embedding_service,
    )

    llm_payload: dict[str, Any] | None = None

    try:
        llm_payload = await _llm_answer(
            question=question,
            context=context,
            chunk_rows=chunk_rows,
        )
    except Exception:
        llm_payload = None

    payload = llm_payload or _fallback_answer(
        question=question,
        context=context,
        chunk_rows=chunk_rows,
    )

    citations: list[CitationOut] = [
        CitationOut(
            source_id=chunk.source_id,
            chunk_id=chunk.id,
            snippet=_truncate(chunk.content, 240),
        )
        for chunk, _score in chunk_rows
    ]

    return AskResponse(
        answer=payload["answer"],
        structured=payload["structured"],
        entities={
            "orders": [
                {
                    "order_number": order.order_number,
                    "status": order.status,
                }
                for order in context.orders
            ],
            "customers": [
                {
                    "id": customer.id,
                    "name": customer.name,
                }
                for customer in context.customers
            ],
            "suppliers": [
                {
                    "id": supplier.id,
                    "name": supplier.name,
                }
                for supplier in context.suppliers
            ],
        },
        citations=citations,
        raw_model_output=payload.get("raw_model_output"),
    )
