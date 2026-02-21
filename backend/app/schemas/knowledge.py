import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class KnowledgeSourceCreate(BaseModel):
    name: str
    type: str
    status: str = "processing"
    access: str = "internal"
    owner: str
    tags: list[str] = Field(default_factory=list)


class KnowledgeSourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    type: str
    status: str
    access: str
    owner: str
    tags: list[str]
    created_at: datetime
    updated_at: datetime


class KnowledgeIngestRequest(BaseModel):
    source_id: uuid.UUID
    text: str
    chunk_size: int = 800
    chunk_overlap: int = 120


class KnowledgeIngestResponse(BaseModel):
    source_id: uuid.UUID
    chunks_created: int
    embeddings_created: int
    status: str


class KnowledgeSearchResult(BaseModel):
    chunk_id: uuid.UUID
    source_id: uuid.UUID
    snippet: str
    score: float | None = None
    metadata: dict[str, Any] | None = None


class KnowledgeSearchResponse(BaseModel):
    query: str
    items: list[KnowledgeSearchResult]
