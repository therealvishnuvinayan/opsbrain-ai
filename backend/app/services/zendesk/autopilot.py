import asyncio
import json
import logging
import re
import uuid
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from openai import AsyncOpenAI
from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.core.config import get_settings
from app.integrations.zendesk.client import ZendeskClient
from app.models.customer import Customer
from app.models.event import Event
from app.models.order import Order
from app.models.run import Run
from app.models.supplier import Supplier
from app.models.zendesk_autopilot_case import ZendeskAutopilotCase
from app.services.embeddings import EmbeddingService
from app.services.rag import ask_question

logger = logging.getLogger(__name__)

ORDER_PATTERN = re.compile(r"OB-\d+", re.IGNORECASE)
RUN_PATTERN = re.compile(r"RB-\d+", re.IGNORECASE)
EMAIL_PATTERN = re.compile(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}")
UUID_PATTERN = re.compile(
    r"[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}"
)

STOPWORDS = {
    "a",
    "about",
    "all",
    "and",
    "any",
    "are",
    "for",
    "from",
    "how",
    "in",
    "into",
    "is",
    "it",
    "its",
    "my",
    "of",
    "on",
    "or",
    "please",
    "recent",
    "status",
    "the",
    "this",
    "ticket",
    "to",
    "update",
    "why",
    "with",
}

EMBEDDING_SERVICE = EmbeddingService()


@dataclass
class NormalizedTicket:
    ticket_id: str
    subject: str
    description: str
    requester_email: str | None
    status: str | None
    tags: list[str]
    custom_fields: dict[str, Any]
    raw_payload: dict[str, Any]


@dataclass
class InvestigationContext:
    entities: dict[str, Any]
    order_rows: list[dict[str, Any]]
    supplier_rows: list[dict[str, Any]]
    run_rows: list[dict[str, Any]]
    action_rows: list[dict[str, Any]]
    rag_payload: dict[str, Any] | None


def _clip(text: str, max_len: int = 220) -> str:
    normalized = " ".join(text.split())
    if len(normalized) <= max_len:
        return normalized
    return f"{normalized[: max_len - 3]}..."


def _to_float(value: Decimal | float | int | None) -> float:
    if value is None:
        return 0.0
    if isinstance(value, Decimal):
        return float(value)
    return float(value)


def _tokenize_keywords(text: str) -> list[str]:
    tokens = set()
    for token in re.findall(r"[A-Za-z0-9._-]+", text.lower()):
        cleaned = token.strip("._-")
        if len(cleaned) < 3:
            continue
        if cleaned in STOPWORDS:
            continue
        if ORDER_PATTERN.fullmatch(cleaned):
            continue
        if RUN_PATTERN.fullmatch(cleaned):
            continue
        tokens.add(cleaned)
    return list(tokens)


def _coerce_list(value: Any) -> list[str]:
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str) and value.strip():
        return [value.strip()]
    return []


def _normalize_ticket_payload(payload: dict[str, Any]) -> NormalizedTicket:
    root_ticket = payload.get("ticket")
    detail_ticket = payload.get("detail", {}).get("ticket") if isinstance(payload.get("detail"), dict) else None

    ticket_obj: dict[str, Any]
    if isinstance(root_ticket, dict):
        ticket_obj = root_ticket
    elif isinstance(detail_ticket, dict):
        ticket_obj = detail_ticket
    else:
        ticket_obj = payload

    ticket_id = str(
        ticket_obj.get("id")
        or payload.get("ticket_id")
        or payload.get("ticketId")
        or payload.get("id")
        or f"sim-{uuid.uuid4().hex[:12]}"
    ).strip()

    subject = str(
        ticket_obj.get("subject")
        or payload.get("subject")
        or "Zendesk ticket"
    ).strip()

    description = str(
        ticket_obj.get("description")
        or ticket_obj.get("body")
        or (ticket_obj.get("comment") or {}).get("body")
        or payload.get("description")
        or payload.get("body")
        or payload.get("message")
        or ""
    ).strip()

    requester = ticket_obj.get("requester") if isinstance(ticket_obj.get("requester"), dict) else {}
    payload_requester = payload.get("requester") if isinstance(payload.get("requester"), dict) else {}

    requester_email = (
        requester.get("email")
        or payload_requester.get("email")
        or payload.get("requester_email")
        or payload.get("requesterEmail")
    )
    requester_email = str(requester_email).strip().lower() if requester_email else None

    status = str(ticket_obj.get("status") or payload.get("status") or "").strip() or None

    tags = _coerce_list(ticket_obj.get("tags") or payload.get("tags"))

    custom_fields: dict[str, Any] = {}
    if isinstance(ticket_obj.get("custom_fields"), dict):
        custom_fields.update(ticket_obj["custom_fields"])
    elif isinstance(ticket_obj.get("custom_fields"), list):
        for item in ticket_obj["custom_fields"]:
            if isinstance(item, dict):
                key = str(item.get("id") or item.get("key") or item.get("name") or "").strip()
                if key:
                    custom_fields[key] = item.get("value")

    if isinstance(payload.get("custom_fields"), dict):
        custom_fields.update(payload["custom_fields"])

    return NormalizedTicket(
        ticket_id=ticket_id,
        subject=subject,
        description=description,
        requester_email=requester_email,
        status=status,
        tags=tags,
        custom_fields=custom_fields,
        raw_payload=payload,
    )


def _extract_ids_from_text(text: str) -> tuple[list[str], list[str], list[str]]:
    order_numbers = sorted({match.upper() for match in ORDER_PATTERN.findall(text)})
    run_process_ids = sorted({match.upper() for match in RUN_PATTERN.findall(text)})
    emails = sorted({email.lower() for email in EMAIL_PATTERN.findall(text)})
    return order_numbers, run_process_ids, emails


def _extract_uuid_strings(values: list[str]) -> list[str]:
    found: set[str] = set()
    for value in values:
        for match in UUID_PATTERN.findall(value):
            found.add(match.lower())
    return sorted(found)


def _to_uuid_list(values: list[str]) -> list[uuid.UUID]:
    output: list[uuid.UUID] = []
    for value in values:
        try:
            output.append(uuid.UUID(value))
        except ValueError:
            continue
    return output


async def _extract_entities(
    session: AsyncSession,
    ticket: NormalizedTicket,
) -> dict[str, Any]:
    combined_text = f"{ticket.subject}\n{ticket.description}"
    order_numbers, run_process_ids, emails = _extract_ids_from_text(combined_text)

    if ticket.requester_email:
        emails = sorted({*emails, ticket.requester_email})

    custom_field_values = [str(value) for value in ticket.custom_fields.values() if value is not None]
    if custom_field_values:
        custom_text = "\n".join(custom_field_values)
        custom_orders, custom_runs, custom_emails = _extract_ids_from_text(custom_text)
        order_numbers = sorted({*order_numbers, *custom_orders})
        run_process_ids = sorted({*run_process_ids, *custom_runs})
        emails = sorted({*emails, *custom_emails})

    supplier_name_hints: set[str] = set()
    supplier_id_hints: set[str] = set()

    searchable_field_values = [ticket.subject, ticket.description, *custom_field_values, *ticket.tags]
    searchable_blob = "\n".join(searchable_field_values).lower()

    supplier_rows = await session.execute(select(Supplier.id, Supplier.name, Supplier.domain))
    for supplier_id, supplier_name, supplier_domain in supplier_rows.all():
        normalized_name = supplier_name.lower()
        if normalized_name in searchable_blob:
            supplier_name_hints.add(supplier_name)
            supplier_id_hints.add(str(supplier_id))
            continue

        if supplier_domain and supplier_domain.lower() in searchable_blob:
            supplier_name_hints.add(supplier_name)
            supplier_id_hints.add(str(supplier_id))

    for value in searchable_field_values:
        if "supplier" in value.lower():
            supplier_id_hints.update(_extract_uuid_strings([value]))

    customer_rows: list[Customer] = []
    if emails:
        stmt = select(Customer).where(Customer.email.in_(emails)).limit(20)
        customer_rows = list((await session.execute(stmt)).scalars().all())

    customer_ids = sorted({str(customer.id) for customer in customer_rows})

    keywords = _tokenize_keywords(combined_text)

    return {
        "orderNumbers": order_numbers,
        "runProcessIds": run_process_ids,
        "emails": emails,
        "supplierNames": sorted(supplier_name_hints),
        "supplierIds": sorted(supplier_id_hints),
        "customerIds": customer_ids,
        "keywords": keywords,
        "tags": ticket.tags,
    }


async def fetch_order_summary(
    session: AsyncSession,
    *,
    order_numbers: list[str],
    requester_email: str | None,
    keywords: list[str],
) -> list[dict[str, Any]]:
    filters = []

    if order_numbers:
        filters.append(Order.order_number.in_(order_numbers))

    if requester_email:
        filters.append(Order.customer.has(Customer.email == requester_email))

    keyword_conditions = []
    for keyword in keywords[:8]:
        pattern = f"%{keyword}%"
        keyword_conditions.append(Order.order_number.ilike(pattern))
        keyword_conditions.append(Order.customer.has(Customer.name.ilike(pattern)))
        keyword_conditions.append(Order.customer.has(Customer.email.ilike(pattern)))
        keyword_conditions.append(Order.supplier.has(Supplier.name.ilike(pattern)))

    if keyword_conditions:
        filters.append(or_(*keyword_conditions))

    if not filters:
        return []

    stmt: Select[tuple[Order]] = (
        select(Order)
        .options(joinedload(Order.customer), joinedload(Order.supplier))
        .where(or_(*filters))
        .order_by(Order.updated_at.desc())
        .limit(20)
    )

    rows = list((await session.execute(stmt)).scalars().unique().all())

    return [
        {
            "id": str(order.id),
            "order_number": order.order_number,
            "status": order.status,
            "amount": _to_float(order.amount),
            "currency": order.currency,
            "customer_id": str(order.customer_id),
            "customer_name": order.customer.name if order.customer else "Unknown",
            "customer_email": order.customer.email if order.customer else None,
            "supplier_id": str(order.supplier_id),
            "supplier_name": order.supplier.name if order.supplier else "Unknown",
            "updated_at": order.updated_at.isoformat(),
        }
        for order in rows
    ]


async def fetch_supplier_summary(
    session: AsyncSession,
    *,
    supplier_names: list[str],
    supplier_ids: list[str],
    keywords: list[str],
    order_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    supplier_names_from_orders = {
        row["supplier_name"] for row in order_rows if row.get("supplier_name")
    }
    supplier_ids_from_orders = {
        row["supplier_id"] for row in order_rows if row.get("supplier_id")
    }

    normalized_names = {name.lower() for name in supplier_names} | {
        name.lower() for name in supplier_names_from_orders
    }

    candidate_supplier_ids = {
        *supplier_ids,
        *supplier_ids_from_orders,
    }

    filters = []

    if normalized_names:
        filters.append(func.lower(Supplier.name).in_(list(normalized_names)))

    supplier_uuid_ids = _to_uuid_list(list(candidate_supplier_ids))
    if supplier_uuid_ids:
        filters.append(Supplier.id.in_(supplier_uuid_ids))

    keyword_conditions = []
    for keyword in keywords[:8]:
        pattern = f"%{keyword}%"
        keyword_conditions.append(Supplier.name.ilike(pattern))
        keyword_conditions.append(Supplier.domain.ilike(pattern))

    if keyword_conditions:
        filters.append(or_(*keyword_conditions))

    if not filters:
        return []

    stmt = select(Supplier).where(or_(*filters)).order_by(Supplier.updated_at.desc()).limit(20)
    suppliers = list((await session.execute(stmt)).scalars().all())

    return [
        {
            "id": str(supplier.id),
            "name": supplier.name,
            "domain": supplier.domain,
            "health": supplier.health,
            "updated_at": supplier.updated_at.isoformat(),
        }
        for supplier in suppliers
    ]


async def fetch_recent_runs_related(
    session: AsyncSession,
    *,
    run_process_ids: list[str],
    supplier_names: list[str],
    order_numbers: list[str],
) -> list[dict[str, Any]]:
    cutoff = datetime.now(timezone.utc) - timedelta(days=14)
    run_map: dict[uuid.UUID, dict[str, Any]] = {}

    if run_process_ids:
        direct_stmt = (
            select(Run)
            .where(Run.process_id.in_(run_process_ids))
            .order_by(Run.updated_at.desc())
            .limit(20)
        )
        direct_runs = list((await session.execute(direct_stmt)).scalars().all())

        for run in direct_runs:
            run_map[run.id] = {
                "id": str(run.id),
                "process_id": run.process_id,
                "status": run.status,
                "risk_score": run.risk_score,
                "updated_at": run.updated_at.isoformat(),
                "recent_events": [],
            }

    search_terms = [*supplier_names, *order_numbers]
    if not search_terms:
        return sorted(run_map.values(), key=lambda item: item["updated_at"], reverse=True)

    event_filters = [Event.message.ilike(f"%{term}%") for term in search_terms[:12]]

    events_stmt = (
        select(Event)
        .join(Event.run)
        .where(Event.created_at >= cutoff)
        .where(or_(*event_filters))
        .order_by(Event.created_at.desc())
        .limit(80)
    )
    events = list((await session.execute(events_stmt)).scalars().all())

    for event in events:
        if event.run is None:
            continue

        current = run_map.get(event.run.id)
        if not current:
            current = {
                "id": str(event.run.id),
                "process_id": event.run.process_id,
                "status": event.run.status,
                "risk_score": event.run.risk_score,
                "updated_at": event.run.updated_at.isoformat(),
                "recent_events": [],
            }
            run_map[event.run.id] = current

        if len(current["recent_events"]) < 4:
            current["recent_events"].append(
                {
                    "type": event.type,
                    "severity": event.severity,
                    "message": _clip(event.message, 140),
                    "at": event.created_at.isoformat(),
                }
            )

    rows = list(run_map.values())
    rows.sort(key=lambda item: item["updated_at"], reverse=True)
    return rows[:20]


async def fetch_recent_actions_related(
    session: AsyncSession,
    *,
    run_rows: list[dict[str, Any]],
    supplier_names: list[str],
    order_numbers: list[str],
) -> list[dict[str, Any]]:
    run_ids = _to_uuid_list([row["id"] for row in run_rows if row.get("id")])

    conditions = []
    if run_ids:
        conditions.append(Event.run_id.in_(run_ids))

    text_terms = [*supplier_names, *order_numbers]
    if text_terms:
        term_conditions = [Event.message.ilike(f"%{term}%") for term in text_terms[:8]]
        conditions.append(or_(*term_conditions))

    if not conditions:
        return []

    stmt = (
        select(Event)
        .join(Event.run)
        .where(or_(*conditions))
        .order_by(Event.created_at.desc())
        .limit(40)
    )
    events = list((await session.execute(stmt)).scalars().all())

    action_rows: list[dict[str, Any]] = []
    for event in events:
        lowered_message = event.message.lower()
        if event.type.upper() in {"COMPLETE", "BUFFER", "VALIDATE", "SUPPLIER_FETCH"} or any(
            marker in lowered_message
            for marker in ("retry", "queued", "approved", "discard", "rerun", "escalat")
        ):
            action_rows.append(
                {
                    "run_process_id": event.run.process_id if event.run else "unknown",
                    "type": event.type,
                    "message": _clip(event.message, 160),
                    "at": event.created_at.isoformat(),
                }
            )

    return action_rows[:12]


async def _run_rag_context(
    session: AsyncSession,
    *,
    ticket: NormalizedTicket,
    entities: dict[str, Any],
) -> dict[str, Any] | None:
    question = _clip(f"{ticket.subject}. {ticket.description}", 1800)

    try:
        result = await ask_question(
            session,
            question=question,
            order_numbers_hint=entities.get("orderNumbers", []),
            customer_ids_hint=_to_uuid_list(entities.get("customerIds", [])),
            supplier_ids_hint=_to_uuid_list(entities.get("supplierIds", [])),
            k=4,
            embedding_service=EMBEDDING_SERVICE,
        )
    except Exception:
        return None

    return {
        "answer": result.answer,
        "structured": result.structured.model_dump(),
        "entities": result.entities.model_dump(),
        "citations": [citation.model_dump() for citation in result.citations],
    }


def _compose_investigation_pack(
    *,
    ticket: NormalizedTicket,
    context: InvestigationContext,
) -> tuple[dict[str, Any], float]:
    order_rows = context.order_rows
    supplier_rows = context.supplier_rows
    run_rows = context.run_rows
    action_rows = context.action_rows
    rag_payload = context.rag_payload

    failed_orders = [row for row in order_rows if row.get("status") == "failed"]
    delayed_orders = [row for row in order_rows if row.get("status") == "delayed"]
    critical_suppliers = [row for row in supplier_rows if row.get("health") == "critical"]
    warning_suppliers = [row for row in supplier_rows if row.get("health") == "warn"]
    high_risk_runs = [row for row in run_rows if int(row.get("risk_score") or 0) >= 70]

    diagnosis: list[dict[str, Any]] = []

    if failed_orders:
        diagnosis.append(
            {
                "title": "Order fulfillment failures detected",
                "detail": f"Detected {len(failed_orders)} failed order(s) linked to this ticket context.",
                "confidence": 0.86,
            }
        )

    if delayed_orders:
        diagnosis.append(
            {
                "title": "Delayed fulfillment impacting customer experience",
                "detail": f"Detected {len(delayed_orders)} delayed order(s) in related operational records.",
                "confidence": 0.74,
            }
        )

    if critical_suppliers or warning_suppliers:
        diagnosis.append(
            {
                "title": "Supplier health signal is degraded",
                "detail": (
                    f"Supplier health includes {len(critical_suppliers)} critical and "
                    f"{len(warning_suppliers)} warning supplier signal(s)."
                ),
                "confidence": 0.72,
            }
        )

    if high_risk_runs:
        diagnosis.append(
            {
                "title": "Recent reconciliation runs show elevated risk",
                "detail": f"Found {len(high_risk_runs)} recent run(s) with risk score >= 70.",
                "confidence": 0.68,
            }
        )

    if not diagnosis:
        diagnosis.append(
            {
                "title": "Limited direct risk signal from linked entities",
                "detail": "No dominant failure mode was detected; monitor for repeated incidents.",
                "confidence": 0.42,
            }
        )

    evidence: list[dict[str, Any]] = [
        {
            "type": "ticket",
            "ref": ticket.ticket_id,
            "detail": _clip(ticket.subject or "Zendesk ticket", 160),
        }
    ]

    for row in order_rows[:8]:
        evidence.append(
            {
                "type": "order",
                "ref": row["order_number"],
                "detail": (
                    f"status={row['status']} supplier={row['supplier_name']} "
                    f"amount={row['currency']} {row['amount']:.2f}"
                ),
            }
        )

    for row in supplier_rows[:6]:
        evidence.append(
            {
                "type": "supplier",
                "ref": row["name"],
                "detail": f"health={row['health']} domain={row.get('domain') or 'n/a'}",
            }
        )

    for row in run_rows[:6]:
        evidence.append(
            {
                "type": "run",
                "ref": row["process_id"],
                "detail": f"status={row['status']} risk_score={row['risk_score']}",
            }
        )

    for row in action_rows[:6]:
        evidence.append(
            {
                "type": "action",
                "ref": row["run_process_id"],
                "detail": f"{row['type']}: {row['message']}",
            }
        )

    if rag_payload:
        for citation in rag_payload.get("citations", [])[:4]:
            evidence.append(
                {
                    "type": "knowledge",
                    "ref": str(citation.get("chunk_id") or "citation"),
                    "detail": _clip(str(citation.get("snippet") or ""), 180),
                }
            )

    recommended_actions: list[dict[str, Any]] = []
    seen_actions: set[str] = set()

    def add_action(label: str, action: str, params: dict[str, Any]) -> None:
        key = f"{action}:{label}"
        if key in seen_actions:
            return
        seen_actions.add(key)
        recommended_actions.append(
            {
                "label": label,
                "action": action,
                "params": params,
            }
        )

    if order_rows:
        first_order = order_rows[0]
        add_action(
            "Open impacted order profile",
            "open_order",
            {"order_number": first_order["order_number"]},
        )

    if run_rows:
        add_action(
            "Open related reconciliation run",
            "open_run",
            {"process_id": run_rows[0]["process_id"]},
        )

    if failed_orders or delayed_orders:
        add_action(
            "Prepare remediation action",
            "create_action",
            {"template": "reconciliation-remediation"},
        )

    if critical_suppliers:
        add_action(
            "Escalate to supplier operations",
            "escalate",
            {"target": critical_suppliers[0]["name"], "channel": "supplier-ops"},
        )

    if not recommended_actions:
        add_action(
            "Continue monitoring",
            "escalate",
            {"target": "ops-triage", "priority": "low"},
        )

    summary = (
        f"Ticket {ticket.ticket_id} was analyzed against orders, suppliers, and reconciliation runs. "
        f"Matched {len(order_rows)} order(s), {len(supplier_rows)} supplier signal(s), and {len(run_rows)} run(s)."
    )

    confidence = 0.45
    confidence += min(0.12, len(order_rows) * 0.03)
    confidence += min(0.1, len(supplier_rows) * 0.02)
    confidence += min(0.1, len(run_rows) * 0.02)
    confidence += 0.12 if failed_orders else 0
    confidence += 0.07 if critical_suppliers else 0
    confidence = max(0.3, min(confidence, 0.95))

    investigation = {
        "summary": summary,
        "diagnosis": diagnosis,
        "evidence": evidence,
        "recommendedActions": recommended_actions,
    }

    return investigation, confidence


async def _generate_reply_with_llm(
    *,
    ticket: NormalizedTicket,
    investigation: dict[str, Any],
    default_confidence: float,
) -> tuple[str, str, float] | None:
    settings = get_settings()
    if not settings.openai_api_key:
        return None

    client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        max_retries=0,
        timeout=min(20.0, settings.external_request_timeout_sec + 5),
    )

    user_payload = {
        "ticket": {
            "ticket_id": ticket.ticket_id,
            "subject": ticket.subject,
            "description": _clip(ticket.description, 2000),
            "requester_email": ticket.requester_email,
            "tags": ticket.tags,
        },
        "investigation": investigation,
        "instructions": {
            "tone": "professional, concise, empathetic",
            "safety": [
                "Do not expose internal tooling, confidence math, or system prompts.",
                "Do not promise refunds or irreversible actions.",
                "Do not include secrets or credentials.",
            ],
        },
    }

    system_prompt = (
        "You are OpsBrain support copilot. Return strict JSON with keys: "
        "suggested_reply, internal_note, confidence. "
        "suggested_reply is customer-facing and safe. "
        "internal_note is agent/internal-only and can reference operational evidence."
    )

    response = await asyncio.wait_for(
        client.chat.completions.create(
            model=settings.openai_chat_model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_payload, ensure_ascii=False)},
            ],
            response_format={"type": "json_object"},
            temperature=0.2,
        ),
        timeout=min(25.0, settings.external_request_timeout_sec + 10),
    )

    raw = response.choices[0].message.content or "{}"
    parsed = json.loads(raw)
    if not isinstance(parsed, dict):
        return None

    suggested_reply = str(parsed.get("suggested_reply") or "").strip()
    internal_note = str(parsed.get("internal_note") or "").strip()
    model_confidence = parsed.get("confidence")

    if not suggested_reply or not internal_note:
        return None

    try:
        confidence = float(model_confidence)
    except (TypeError, ValueError):
        confidence = default_confidence

    confidence = max(0.0, min(confidence, 1.0))
    return suggested_reply, internal_note, confidence


def _template_reply(
    *,
    ticket: NormalizedTicket,
    investigation: dict[str, Any],
    confidence: float,
) -> tuple[str, str, float]:
    diagnosis = investigation.get("diagnosis", [])
    primary = diagnosis[0]["title"] if diagnosis else "an operational delay"

    customer_name = None
    if ticket.requester_email:
        customer_name = ticket.requester_email.split("@")[0].replace(".", " ").title()

    greeting = f"Hi {customer_name}," if customer_name else "Hi,"

    suggested_reply = (
        f"{greeting}\n\n"
        "Thanks for contacting support. We reviewed your ticket and started an operational investigation. "
        f"Current assessment indicates {primary.lower()}. "
        "Our operations team is validating the impacted records and we will follow up once remediation is confirmed.\n\n"
        "Regards,\nOpsBrain Support"
    )

    evidence_lines = [
        f"- {item.get('type')}: {item.get('ref')} | {item.get('detail')}"
        for item in investigation.get("evidence", [])[:6]
    ]
    actions_lines = [
        f"- {item.get('label')} ({item.get('action')})"
        for item in investigation.get("recommendedActions", [])[:5]
    ]

    internal_note = (
        f"Autopilot case for ticket {ticket.ticket_id}.\n"
        f"Summary: {investigation.get('summary', 'n/a')}\n"
        "Evidence:\n"
        f"{chr(10).join(evidence_lines) if evidence_lines else '- none'}\n"
        "Recommended actions:\n"
        f"{chr(10).join(actions_lines) if actions_lines else '- none'}"
    )

    return suggested_reply, internal_note, confidence


async def _maybe_post_internal_note(ticket_id: str, internal_note: str) -> dict[str, Any]:
    settings = get_settings()
    if not settings.zendesk_postback_enabled:
        return {"attempted": False, "enabled": False}

    client = ZendeskClient()
    if not client.enabled:
        logger.warning("zendesk_postback_not_configured ticket_id=%s", ticket_id)
        return {"attempted": False, "enabled": True, "error": "credentials_missing"}

    try:
        await client.post_internal_note(ticket_id=ticket_id, note=internal_note[:5000])
        return {"attempted": True, "enabled": True, "ok": True}
    except Exception as exc:
        logger.warning("zendesk_postback_failed ticket_id=%s reason=%s", ticket_id, exc)
        return {"attempted": True, "enabled": True, "ok": False}


def _case_to_dict(case: ZendeskAutopilotCase) -> dict[str, Any]:
    return {
        "id": case.id,
        "trace_id": case.trace_id,
        "ticket_id": case.ticket_id,
        "status": case.status,
        "subject": case.subject,
        "requester_email": case.requester_email,
        "description": case.description,
        "raw_payload": case.raw_payload,
        "extracted_entities": case.extracted_entities,
        "investigation": case.investigation,
        "suggested_reply": case.suggested_reply,
        "internal_note": case.internal_note,
        "confidence": case.confidence,
        "created_at": case.created_at,
        "updated_at": case.updated_at,
    }


async def process_zendesk_ticket(
    payload: dict[str, Any],
    session: AsyncSession,
    *,
    trace_id: str | None = None,
) -> dict[str, Any]:
    normalized_ticket = _normalize_ticket_payload(payload)
    case_trace_id = (trace_id or uuid.uuid4().hex)[:64]

    case = await session.scalar(
        select(ZendeskAutopilotCase).where(ZendeskAutopilotCase.ticket_id == normalized_ticket.ticket_id)
    )

    if not case:
        case = ZendeskAutopilotCase(
            ticket_id=normalized_ticket.ticket_id,
            trace_id=case_trace_id,
            status="received",
        )
        session.add(case)
        await session.flush()

    case.trace_id = case_trace_id
    case.status = "investigating"
    case.subject = normalized_ticket.subject
    case.requester_email = normalized_ticket.requester_email
    case.description = normalized_ticket.description
    case.raw_payload = normalized_ticket.raw_payload

    await session.flush()

    try:
        entities = await _extract_entities(session, normalized_ticket)

        order_rows = await fetch_order_summary(
            session,
            order_numbers=entities.get("orderNumbers", []),
            requester_email=normalized_ticket.requester_email,
            keywords=entities.get("keywords", []),
        )

        supplier_rows = await fetch_supplier_summary(
            session,
            supplier_names=entities.get("supplierNames", []),
            supplier_ids=entities.get("supplierIds", []),
            keywords=entities.get("keywords", []),
            order_rows=order_rows,
        )

        run_rows = await fetch_recent_runs_related(
            session,
            run_process_ids=entities.get("runProcessIds", []),
            supplier_names=[row["name"] for row in supplier_rows],
            order_numbers=[row["order_number"] for row in order_rows],
        )

        action_rows = await fetch_recent_actions_related(
            session,
            run_rows=run_rows,
            supplier_names=[row["name"] for row in supplier_rows],
            order_numbers=[row["order_number"] for row in order_rows],
        )

        rag_payload = await _run_rag_context(
            session,
            ticket=normalized_ticket,
            entities=entities,
        )

        context = InvestigationContext(
            entities=entities,
            order_rows=order_rows,
            supplier_rows=supplier_rows,
            run_rows=run_rows,
            action_rows=action_rows,
            rag_payload=rag_payload,
        )

        investigation, confidence = _compose_investigation_pack(
            ticket=normalized_ticket,
            context=context,
        )

        llm_reply = None
        try:
            llm_reply = await _generate_reply_with_llm(
                ticket=normalized_ticket,
                investigation=investigation,
                default_confidence=confidence,
            )
        except Exception as exc:
            logger.warning(
                "zendesk_autopilot_llm_reply_failed ticket_id=%s trace_id=%s reason=%s",
                normalized_ticket.ticket_id,
                case_trace_id,
                exc,
            )

        if llm_reply:
            suggested_reply, internal_note, confidence = llm_reply
        else:
            suggested_reply, internal_note, confidence = _template_reply(
                ticket=normalized_ticket,
                investigation=investigation,
                confidence=confidence,
            )

        postback = await _maybe_post_internal_note(normalized_ticket.ticket_id, internal_note)
        investigation["postback"] = postback

        case.status = "ready"
        case.extracted_entities = entities
        case.investigation = investigation
        case.suggested_reply = suggested_reply
        case.internal_note = internal_note
        case.confidence = confidence

        await session.commit()
        await session.refresh(case)

        logger.info(
            "zendesk_autopilot_processed ticket_id=%s trace_id=%s status=%s confidence=%.2f",
            case.ticket_id,
            case.trace_id,
            case.status,
            case.confidence or 0.0,
        )

        return _case_to_dict(case)

    except Exception as exc:
        logger.exception(
            "zendesk_autopilot_failed ticket_id=%s trace_id=%s reason=%s",
            normalized_ticket.ticket_id,
            case_trace_id,
            exc,
        )

        case.status = "failed"
        case.extracted_entities = case.extracted_entities or {"orderNumbers": [], "runProcessIds": []}
        case.investigation = {
            "summary": "Autopilot processing failed.",
            "diagnosis": [
                {
                    "title": "Processing failure",
                    "detail": "The backend could not complete investigation for this ticket.",
                    "confidence": 0.0,
                }
            ],
            "evidence": [],
            "recommendedActions": [
                {
                    "label": "Retry autopilot",
                    "action": "escalate",
                    "params": {"channel": "ops-support"},
                }
            ],
        }
        case.suggested_reply = (
            "Thanks for contacting support. We are reviewing this request manually and will follow up shortly."
        )
        case.internal_note = "Autopilot failed. Please investigate manually."
        case.confidence = 0.0

        await session.commit()
        await session.refresh(case)
        return _case_to_dict(case)
