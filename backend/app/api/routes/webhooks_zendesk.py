import base64
import hashlib
import hmac
import json
import logging
import uuid

from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.config import get_settings
from app.models.zendesk_autopilot_case import ZendeskAutopilotCase
from app.schemas.zendesk_autopilot import (
    ZendeskAutopilotCaseOut,
    ZendeskAutopilotCaseDetailOut,
    ZendeskAutopilotListResponse,
    ZendeskAutopilotProcessResponse,
    ZendeskSimulateTicketIn,
)
from app.services.zendesk.autopilot import process_zendesk_ticket

router = APIRouter(tags=["zendesk-autopilot"])
logger = logging.getLogger(__name__)


def _validate_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    digest = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).digest()
    digest_hex = digest.hex()
    digest_b64 = base64.b64encode(digest).decode("utf-8")

    candidates = {
        digest_hex,
        digest_b64,
        f"sha256={digest_hex}",
        f"sha256={digest_b64}",
        f"v1={digest_hex}",
    }

    provided = signature.strip()
    return any(hmac.compare_digest(provided, candidate) for candidate in candidates)


async def _parse_json_payload(request: Request, max_payload_bytes: int) -> tuple[bytes, dict]:
    raw_body = await request.body()

    if len(raw_body) > max_payload_bytes:
        raise HTTPException(status_code=413, detail="Payload too large")

    if not raw_body:
        return raw_body, {}

    try:
        payload = json.loads(raw_body.decode("utf-8"))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=400, detail="Invalid JSON payload") from exc

    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Webhook payload must be a JSON object")

    return raw_body, payload


@router.post("/webhooks/zendesk", response_model=ZendeskAutopilotProcessResponse)
async def receive_zendesk_webhook(
    request: Request,
    session: AsyncSession = Depends(get_db),
    zendesk_signature: str | None = Header(default=None, alias="X-Zendesk-Webhook-Signature"),
    request_id: str | None = Header(default=None, alias="X-Request-Id"),
) -> ZendeskAutopilotProcessResponse:
    settings = get_settings()
    raw_body, payload = await _parse_json_payload(request, settings.max_webhook_payload_bytes)

    if settings.zendesk_webhook_secret:
        if not zendesk_signature:
            raise HTTPException(status_code=401, detail="Missing webhook signature")

        if not _validate_signature(raw_body, zendesk_signature, settings.zendesk_webhook_secret):
            raise HTTPException(status_code=401, detail="Invalid webhook signature")

    trace_id = (request_id or uuid.uuid4().hex)[:64]
    case = await process_zendesk_ticket(payload, session, trace_id=trace_id)

    logger.info(
        "zendesk_webhook_processed ticket_id=%s trace_id=%s status=%s",
        case.get("ticket_id"),
        trace_id,
        case.get("status"),
    )

    return ZendeskAutopilotProcessResponse(case=ZendeskAutopilotCaseDetailOut.model_validate(case))


@router.post("/webhooks/zendesk/simulate", response_model=ZendeskAutopilotProcessResponse)
async def simulate_zendesk_webhook(
    payload: ZendeskSimulateTicketIn,
    request: Request,
    session: AsyncSession = Depends(get_db),
    request_id: str | None = Header(default=None, alias="X-Request-Id"),
) -> ZendeskAutopilotProcessResponse:
    trace_id = (request_id or uuid.uuid4().hex)[:64]

    simulated_payload = {
        "ticket": {
            "id": payload.ticket_id,
            "subject": payload.subject,
            "description": payload.description,
            "status": payload.status,
            "tags": payload.tags,
            "requester": {"email": payload.requester_email} if payload.requester_email else None,
            "custom_fields": payload.custom_fields,
        },
        "simulation": True,
    }

    case = await process_zendesk_ticket(simulated_payload, session, trace_id=trace_id)

    logger.info(
        "zendesk_webhook_simulated ticket_id=%s trace_id=%s status=%s",
        case.get("ticket_id"),
        trace_id,
        case.get("status"),
    )

    return ZendeskAutopilotProcessResponse(case=ZendeskAutopilotCaseDetailOut.model_validate(case))


@router.get("/zendesk/autopilot/tickets", response_model=ZendeskAutopilotListResponse)
async def list_autopilot_tickets(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    session: AsyncSession = Depends(get_db),
) -> ZendeskAutopilotListResponse:
    count_stmt = select(func.count()).select_from(ZendeskAutopilotCase)
    total = int((await session.execute(count_stmt)).scalar_one())

    items_stmt = (
        select(ZendeskAutopilotCase)
        .order_by(ZendeskAutopilotCase.updated_at.desc())
        .limit(limit)
        .offset(offset)
    )
    rows = list((await session.execute(items_stmt)).scalars().all())

    items = [ZendeskAutopilotCaseOut.model_validate(row) for row in rows]

    return ZendeskAutopilotListResponse(
        items=items,
        limit=limit,
        offset=offset,
        count=total,
    )


@router.get(
    "/zendesk/autopilot/tickets/{ticket_id}",
    response_model=ZendeskAutopilotCaseDetailOut,
)
async def get_autopilot_ticket(
    ticket_id: str,
    session: AsyncSession = Depends(get_db),
) -> ZendeskAutopilotCaseDetailOut:
    stmt = select(ZendeskAutopilotCase).where(ZendeskAutopilotCase.ticket_id == ticket_id).limit(1)
    case = await session.scalar(stmt)

    if not case:
        raise HTTPException(status_code=404, detail="Ticket not found")

    return ZendeskAutopilotCaseDetailOut.model_validate(case)
