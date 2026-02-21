import uuid
from typing import Any

from pydantic import BaseModel, Field


class EntityHints(BaseModel):
    order_numbers: list[str] = Field(default_factory=list)
    customer_ids: list[uuid.UUID] = Field(default_factory=list)
    supplier_ids: list[uuid.UUID] = Field(default_factory=list)


class AskRequest(BaseModel):
    question: str
    entity_hints: EntityHints = Field(default_factory=EntityHints)
    k: int = 6


class RecommendedAction(BaseModel):
    label: str
    href: str


class StructuredAskResponse(BaseModel):
    summary: str
    key_findings: list[str]
    evidence: list[str]
    recommended_actions: list[RecommendedAction]


class OrderEntityOut(BaseModel):
    order_number: str
    status: str


class CustomerEntityOut(BaseModel):
    id: uuid.UUID
    name: str


class SupplierEntityOut(BaseModel):
    id: uuid.UUID
    name: str


class AskEntitiesResponse(BaseModel):
    orders: list[OrderEntityOut]
    customers: list[CustomerEntityOut]
    suppliers: list[SupplierEntityOut]


class CitationOut(BaseModel):
    source_id: uuid.UUID
    chunk_id: uuid.UUID
    snippet: str


class AskResponse(BaseModel):
    answer: str
    structured: StructuredAskResponse
    entities: AskEntitiesResponse
    citations: list[CitationOut]
    raw_model_output: dict[str, Any] | None = None
