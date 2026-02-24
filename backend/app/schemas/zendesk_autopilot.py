import uuid
from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field


AutopilotStatus = Literal["received", "investigating", "ready", "failed"]


class DiagnosisItem(BaseModel):
    title: str
    detail: str
    confidence: float = Field(ge=0.0, le=1.0)


class EvidenceItem(BaseModel):
    type: Literal["order", "supplier", "run", "action", "log", "ticket", "knowledge"]
    ref: str
    detail: str


class RecommendedActionItem(BaseModel):
    label: str
    action: str
    params: dict[str, Any] = Field(default_factory=dict)


class InvestigationPack(BaseModel):
    summary: str
    diagnosis: list[DiagnosisItem] = Field(default_factory=list)
    evidence: list[EvidenceItem] = Field(default_factory=list)
    recommendedActions: list[RecommendedActionItem] = Field(default_factory=list)


class ZendeskAutopilotCaseOut(BaseModel):
    id: uuid.UUID
    trace_id: str
    ticket_id: str
    status: AutopilotStatus
    subject: str
    requester_email: str | None = None
    description: str
    extracted_entities: dict[str, Any] | None = None
    investigation: InvestigationPack | dict[str, Any] | None = None
    suggested_reply: str | None = None
    internal_note: str | None = None
    confidence: float | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class ZendeskAutopilotCaseDetailOut(ZendeskAutopilotCaseOut):
    raw_payload: dict[str, Any] | None = None


class ZendeskAutopilotListResponse(BaseModel):
    items: list[ZendeskAutopilotCaseOut]
    limit: int
    offset: int
    count: int


class ZendeskSimulateTicketIn(BaseModel):
    ticket_id: str = Field(min_length=1, max_length=128)
    subject: str = Field(default="", max_length=5000)
    description: str = Field(default="", max_length=100000)
    requester_email: str | None = Field(default=None, max_length=320)
    status: str | None = Field(default=None, max_length=64)
    tags: list[str] = Field(default_factory=list)
    custom_fields: dict[str, Any] = Field(default_factory=dict)


class ZendeskAutopilotProcessResponse(BaseModel):
    ok: bool = True
    case: ZendeskAutopilotCaseDetailOut
