from sqlalchemy import Select, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from app.models.customer import Customer
from app.models.order import Order
from app.models.supplier import Supplier


def _normalize_limit(limit: int) -> int:
    return max(1, min(limit, 100))


async def search_orders(
    session: AsyncSession,
    *,
    query: str | None,
    status: str | None,
    limit: int,
) -> list[Order]:
    stmt: Select[tuple[Order]] = (
        select(Order)
        .options(joinedload(Order.customer), joinedload(Order.supplier))
        .order_by(Order.updated_at.desc())
    )

    if status:
        stmt = stmt.where(Order.status == status)

    if query:
        pattern = f"%{query.strip()}%"

        stmt = (
            stmt.join(Order.customer)
            .join(Order.supplier)
            .where(
                or_(
                    Order.order_number.ilike(pattern),
                    Customer.name.ilike(pattern),
                    Customer.email.ilike(pattern),
                    Supplier.name.ilike(pattern),
                    Supplier.domain.ilike(pattern),
                )
            )
        )

    stmt = stmt.limit(_normalize_limit(limit))

    result = await session.execute(stmt)
    return list(result.scalars().unique().all())


async def search_customers(
    session: AsyncSession,
    *,
    query: str | None,
    limit: int,
) -> list[Customer]:
    stmt: Select[tuple[Customer]] = select(Customer).order_by(Customer.updated_at.desc())

    if query:
        pattern = f"%{query.strip()}%"
        stmt = stmt.where(
            or_(
                Customer.name.ilike(pattern),
                Customer.email.ilike(pattern),
                Customer.phone.ilike(pattern),
            )
        )

    stmt = stmt.limit(_normalize_limit(limit))

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def search_suppliers(
    session: AsyncSession,
    *,
    query: str | None,
    limit: int,
) -> list[Supplier]:
    stmt: Select[tuple[Supplier]] = select(Supplier).order_by(Supplier.updated_at.desc())

    if query:
        pattern = f"%{query.strip()}%"
        stmt = stmt.where(
            or_(
                Supplier.name.ilike(pattern),
                Supplier.domain.ilike(pattern),
            )
        )

    stmt = stmt.limit(_normalize_limit(limit))

    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_order_by_number(session: AsyncSession, order_number: str) -> Order | None:
    stmt = (
        select(Order)
        .where(Order.order_number == order_number)
        .options(joinedload(Order.customer), joinedload(Order.supplier))
        .limit(1)
    )

    return await session.scalar(stmt)
