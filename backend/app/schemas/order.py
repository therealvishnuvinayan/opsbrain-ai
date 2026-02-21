import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.schemas.customer import CustomerOut
from app.schemas.supplier import SupplierOut


class OrderOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    order_number: str
    amount: Decimal
    currency: str
    status: str
    created_at: datetime
    updated_at: datetime


class OrderListOut(OrderOut):
    customer_id: uuid.UUID
    supplier_id: uuid.UUID
    customer_name: str
    customer_email: str | None
    supplier_name: str


class OrderDetailOut(OrderOut):
    customer: CustomerOut
    supplier: SupplierOut
