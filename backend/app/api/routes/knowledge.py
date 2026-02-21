import uuid

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.security import require_service_api_key
from app.models.knowledge_chunk import KnowledgeChunk
from app.schemas.knowledge import (
    KnowledgeIngestRequest,
    KnowledgeIngestResponse,
    KnowledgeSearchResponse,
    KnowledgeSearchResult,
    KnowledgeSourceCreate,
    KnowledgeSourceOut,
)
from app.services.embeddings import EmbeddingService
from app.services.ingestion import create_source, ingest_source_text

router = APIRouter(prefix="/knowledge", tags=["knowledge"])
embedding_service = EmbeddingService()


@router.post(
    "/sources",
    response_model=KnowledgeSourceOut,
    dependencies=[Depends(require_service_api_key)],
)
async def create_knowledge_source(
    payload: KnowledgeSourceCreate,
    session: AsyncSession = Depends(get_db),
) -> KnowledgeSourceOut:
    source = await create_source(
        session,
        name=payload.name,
        source_type=payload.type,
        status=payload.status,
        access=payload.access,
        owner=payload.owner,
        tags=payload.tags,
    )
    return KnowledgeSourceOut.model_validate(source)


@router.post(
    "/ingest",
    response_model=KnowledgeIngestResponse,
    dependencies=[Depends(require_service_api_key)],
)
async def ingest_knowledge(
    payload: KnowledgeIngestRequest,
    session: AsyncSession = Depends(get_db),
) -> KnowledgeIngestResponse:
    try:
        chunks_created, embeddings_created, status = await ingest_source_text(
            session,
            source_id=payload.source_id,
            text=payload.text,
            chunk_size=payload.chunk_size,
            chunk_overlap=payload.chunk_overlap,
            embedding_service=embedding_service,
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    return KnowledgeIngestResponse(
        source_id=payload.source_id,
        chunks_created=chunks_created,
        embeddings_created=embeddings_created,
        status=status,
    )


@router.get("/search", response_model=KnowledgeSearchResponse)
async def search_knowledge(
    query: str = Query(..., min_length=1),
    k: int = Query(default=5, ge=1, le=20),
    session: AsyncSession = Depends(get_db),
) -> KnowledgeSearchResponse:
    query_embedding = (await embedding_service.embed_texts([query]))[0]

    if query_embedding is not None:
        score = KnowledgeChunk.embedding.cosine_distance(query_embedding)
        stmt = (
            select(KnowledgeChunk, score.label("score"))
            .where(KnowledgeChunk.embedding.is_not(None))
            .order_by(score.asc())
            .limit(k)
        )

        rows = (await session.execute(stmt)).all()

        items = [
            KnowledgeSearchResult(
                chunk_id=chunk.id,
                source_id=chunk.source_id,
                snippet=chunk.content[:240],
                score=float(distance),
                metadata=chunk.metadata_json,
            )
            for chunk, distance in rows
        ]

        return KnowledgeSearchResponse(query=query, items=items)

    pattern = f"%{query}%"
    stmt = (
        select(KnowledgeChunk)
        .where(KnowledgeChunk.content.ilike(pattern))
        .order_by(KnowledgeChunk.created_at.desc())
        .limit(k)
    )

    chunks = (await session.execute(stmt)).scalars().all()

    items = [
        KnowledgeSearchResult(
            chunk_id=chunk.id,
            source_id=chunk.source_id,
            snippet=chunk.content[:240],
            score=None,
            metadata=chunk.metadata_json,
        )
        for chunk in chunks
    ]

    return KnowledgeSearchResponse(query=query, items=items)
