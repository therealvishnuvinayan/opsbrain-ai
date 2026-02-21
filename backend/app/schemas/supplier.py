import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    domain: str | None
    health: str
    updated_at: datetime
