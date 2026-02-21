from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.core.security import require_service_api_key
from app.schemas.ask import AskRequest, AskResponse
from app.services.embeddings import EmbeddingService
from app.services.rag import ask_question

router = APIRouter(prefix="/ask", tags=["ask"])
embedding_service = EmbeddingService()


@router.post("", response_model=AskResponse, dependencies=[Depends(require_service_api_key)])
async def ask_opsbrain(
    payload: AskRequest,
    session: AsyncSession = Depends(get_db),
) -> AskResponse:
    return await ask_question(
        session,
        question=payload.question,
        order_numbers_hint=payload.entity_hints.order_numbers,
        customer_ids_hint=payload.entity_hints.customer_ids,
        supplier_ids_hint=payload.entity_hints.supplier_ids,
        k=payload.k,
        embedding_service=embedding_service,
    )
