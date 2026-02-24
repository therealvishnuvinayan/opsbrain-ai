"""add zendesk autopilot cases table

Revision ID: 20260224_0002
Revises: 20260220_0001
Create Date: 2026-02-24 00:02:00.000000

"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "20260224_0002"
down_revision: str | None = "20260220_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "zendesk_autopilot_cases",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, nullable=False),
        sa.Column("trace_id", sa.String(length=64), nullable=False),
        sa.Column("ticket_id", sa.String(length=128), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="received"),
        sa.Column("subject", sa.Text(), nullable=False, server_default=""),
        sa.Column("requester_email", sa.String(length=320), nullable=True),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("raw_payload", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("extracted_entities", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("investigation", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column("suggested_reply", sa.Text(), nullable=True),
        sa.Column("internal_note", sa.Text(), nullable=True),
        sa.Column("confidence", sa.Float(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    op.create_index(
        "ix_zendesk_autopilot_cases_ticket_id",
        "zendesk_autopilot_cases",
        ["ticket_id"],
        unique=True,
    )
    op.create_index(
        "ix_zendesk_autopilot_cases_trace_id",
        "zendesk_autopilot_cases",
        ["trace_id"],
    )
    op.create_index(
        "ix_zendesk_autopilot_cases_status",
        "zendesk_autopilot_cases",
        ["status"],
    )


def downgrade() -> None:
    op.drop_index("ix_zendesk_autopilot_cases_status", table_name="zendesk_autopilot_cases")
    op.drop_index("ix_zendesk_autopilot_cases_trace_id", table_name="zendesk_autopilot_cases")
    op.drop_index("ix_zendesk_autopilot_cases_ticket_id", table_name="zendesk_autopilot_cases")
    op.drop_table("zendesk_autopilot_cases")
