from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.schemas.customer import CustomerOut
from app.schemas.order import OrderDetailOut, OrderListOut
from app.schemas.supplier import SupplierOut
from app.services.search import (
    get_order_by_number,
    search_customers,
    search_orders,
    search_suppliers,
)

router = APIRouter(prefix="/operations", tags=["operations"])


@router.get("/orders", response_model=list[OrderListOut])
async def list_orders(
    query: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
) -> list[OrderListOut]:
    orders = await search_orders(session, query=query, status=status, limit=limit)
    return [
        OrderListOut(
            id=order.id,
            order_number=order.order_number,
            customer_id=order.customer_id,
            supplier_id=order.supplier_id,
            customer_name=order.customer.name if order.customer else "Unknown",
            customer_email=order.customer.email if order.customer else None,
            supplier_name=order.supplier.name if order.supplier else "Unknown",
            amount=order.amount,
            currency=order.currency,
            status=order.status,
            created_at=order.created_at,
            updated_at=order.updated_at,
        )
        for order in orders
    ]


@router.get("/customers", response_model=list[CustomerOut])
async def list_customers(
    query: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
) -> list[CustomerOut]:
    customers = await search_customers(session, query=query, limit=limit)
    return [CustomerOut.model_validate(customer) for customer in customers]


@router.get("/suppliers", response_model=list[SupplierOut])
async def list_suppliers(
    query: str | None = Query(default=None),
    limit: int = Query(default=20, ge=1, le=100),
    session: AsyncSession = Depends(get_db),
) -> list[SupplierOut]:
    suppliers = await search_suppliers(session, query=query, limit=limit)
    return [SupplierOut.model_validate(supplier) for supplier in suppliers]


@router.get("/orders/{order_number}", response_model=OrderDetailOut)
async def get_order(
    order_number: str,
    session: AsyncSession = Depends(get_db),
) -> OrderDetailOut:
    order = await get_order_by_number(session, order_number)

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    return OrderDetailOut.model_validate(order)
