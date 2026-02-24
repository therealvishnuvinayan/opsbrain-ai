import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Float, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ZendeskAutopilotCase(Base):
    __tablename__ = "zendesk_autopilot_cases"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    trace_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    ticket_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False, default="received", index=True)

    subject: Mapped[str] = mapped_column(Text, nullable=False, default="")
    requester_email: Mapped[str | None] = mapped_column(String(320), nullable=True)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")

    raw_payload: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    extracted_entities: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)
    investigation: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    suggested_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
        onupdate=func.now(),
    )
