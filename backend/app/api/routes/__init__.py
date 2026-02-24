from app.api.routes.ask import router as ask_router
from app.api.routes.health import router as health_router
from app.api.routes.knowledge import router as knowledge_router
from app.api.routes.operations import router as operations_router
from app.api.routes.webhooks_zendesk import router as zendesk_autopilot_router

__all__ = [
    "ask_router",
    "health_router",
    "knowledge_router",
    "operations_router",
    "zendesk_autopilot_router",
]
