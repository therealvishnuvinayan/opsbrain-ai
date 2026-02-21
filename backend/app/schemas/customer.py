import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CustomerOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    email: str
    phone: str | None
    tier: str
    created_at: datetime
    updated_at: datetime
