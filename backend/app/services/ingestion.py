import math
import uuid
from collections.abc import Iterable

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.knowledge_chunk import KnowledgeChunk
from app.models.knowledge_source import KnowledgeSource
from app.services.embeddings import EmbeddingService


def chunk_text(
    text: str,
    *,
    chunk_size: int,
    chunk_overlap: int,
) -> list[str]:
    normalized = text.strip()

    if not normalized:
        return []

    size = max(100, min(chunk_size, 4000))
    overlap = max(0, min(chunk_overlap, size // 2))

    chunks: list[str] = []
    cursor = 0

    while cursor < len(normalized):
        window = normalized[cursor : cursor + size]
        chunks.append(window)

        if cursor + size >= len(normalized):
            break

        cursor += size - overlap

    return chunks


async def create_source(
    session: AsyncSession,
    *,
    name: str,
    source_type: str,
    status: str,
    access: str,
    owner: str,
    tags: Iterable[str],
) -> KnowledgeSource:
    source = KnowledgeSource(
        id=uuid.uuid4(),
        name=name,
        type=source_type,
        status=status,
        access=access,
        owner=owner,
        tags=list(tags),
    )

    session.add(source)
    await session.commit()
    await session.refresh(source)
    return source


async def ingest_source_text(
    session: AsyncSession,
    *,
    source_id: uuid.UUID,
    text: str,
    chunk_size: int,
    chunk_overlap: int,
    embedding_service: EmbeddingService,
) -> tuple[int, int, str]:
    source = await session.scalar(
        select(KnowledgeSource).where(KnowledgeSource.id == source_id)
    )

    if not source:
        raise ValueError("Knowledge source not found")

    source.status = "processing"
    await session.flush()

    chunks = chunk_text(text, chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    await session.execute(
        delete(KnowledgeChunk).where(KnowledgeChunk.source_id == source_id)
    )

    embeddings = await embedding_service.embed_texts(chunks)

    chunk_models = [
        KnowledgeChunk(
            id=uuid.uuid4(),
            source_id=source_id,
            chunk_index=index,
            content=content,
            metadata_json={
                "char_count": len(content),
                "token_estimate": max(1, math.ceil(len(content) / 4)),
            },
            embedding=embeddings[index] if index < len(embeddings) else None,
        )
        for index, content in enumerate(chunks)
    ]

    session.add_all(chunk_models)

    embeddings_created = sum(1 for embedding in embeddings if embedding is not None)

    source.status = "indexed" if chunks else "stale"

    await session.commit()

    return len(chunks), embeddings_created, source.status
