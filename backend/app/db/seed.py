import asyncio
import uuid
from decimal import Decimal

from sqlalchemy import delete

from app.db.session import AsyncSessionLocal
from app.models.customer import Customer
from app.models.order import Order
from app.models.supplier import Supplier

SUPPLIER_DATA = [
    ("Runa", "runa.io", "healthy"),
    ("Eneba", "eneba.com", "warn"),
    ("Epay", "epayworldwide.com", "critical"),
    ("Incomm", "incomm.com", "healthy"),
    ("Diggecard", "diggecard.net", "warn"),
    ("Gamivo", "gamivo.com", "healthy"),
    ("Kinguin", "kinguin.net", "warn"),
    ("G2A", "g2a.com", "critical"),
    ("Ezpin", "ezpin.com", "healthy"),
    ("Cadooz", "cadooz.com", "healthy"),
]

CUSTOMER_DATA = [
    ("Aarav Menon", "aarav.menon@acme-pay.com", "+1-415-555-0198", "vip"),
    ("Sophia Turner", "sophia.turner@northbridge.io", "+1-212-555-0112", "standard"),
    ("Liam Patel", "liam.patel@bamboo-retail.com", "+1-646-555-0171", "vip"),
    ("Emma Wright", "emma.wright@arcadia.co", "+1-310-555-0180", "standard"),
    ("Noah Kim", "noah.kim@sunwell.ai", "+1-408-555-0122", "standard"),
    ("Olivia Green", "olivia.green@pinecrest.tech", "+1-617-555-0136", "vip"),
    ("Ethan Brown", "ethan.brown@ledgerlane.com", "+1-202-555-0190", "standard"),
    ("Ava Rodriguez", "ava.rodriguez@orbitplay.io", "+1-323-555-0192", "standard"),
    ("Lucas Hall", "lucas.hall@deltaops.org", "+1-718-555-0111", "vip"),
    ("Mia Clark", "mia.clark@riverline.app", "+1-469-555-0154", "standard"),
    ("James Scott", "james.scott@novaflow.net", "+1-917-555-0164", "standard"),
    ("Charlotte Adams", "charlotte.adams@bluepeak.io", "+1-503-555-0103", "vip"),
]

ORDER_STATUSES = [
    "delivered",
    "delayed",
    "failed",
    "refund",
    "delivered",
    "delivered",
    "delayed",
    "failed",
    "delivered",
    "refund",
    "delivered",
    "delayed",
    "failed",
    "delivered",
    "delivered",
    "refund",
    "delivered",
    "delayed",
    "failed",
    "delivered",
]

ORDER_AMOUNTS = [
    Decimal("148.50"),
    Decimal("420.00"),
    Decimal("56.20"),
    Decimal("89.90"),
    Decimal("271.40"),
    Decimal("115.00"),
    Decimal("730.30"),
    Decimal("220.10"),
    Decimal("64.80"),
    Decimal("399.00"),
    Decimal("180.70"),
    Decimal("940.00"),
    Decimal("52.40"),
    Decimal("310.20"),
    Decimal("127.60"),
    Decimal("280.00"),
    Decimal("73.50"),
    Decimal("512.20"),
    Decimal("88.40"),
    Decimal("205.90"),
]


async def seed_data() -> None:
    async with AsyncSessionLocal() as session:
        await session.execute(delete(Order))
        await session.execute(delete(Customer))
        await session.execute(delete(Supplier))

        suppliers: list[Supplier] = []

        for name, domain, health in SUPPLIER_DATA:
            supplier = Supplier(
                id=uuid.uuid5(uuid.NAMESPACE_DNS, f"supplier:{name}"),
                name=name,
                domain=domain,
                health=health,
            )
            suppliers.append(supplier)

        customers: list[Customer] = []

        for name, email, phone, tier in CUSTOMER_DATA:
            customer = Customer(
                id=uuid.uuid5(uuid.NAMESPACE_DNS, f"customer:{email}"),
                name=name,
                email=email,
                phone=phone,
                tier=tier,
            )
            customers.append(customer)

        session.add_all(suppliers)
        session.add_all(customers)
        await session.flush()

        orders: list[Order] = []

        for index in range(20):
            customer = customers[index % len(customers)]
            supplier = suppliers[index % len(suppliers)]

            orders.append(
                Order(
                    id=uuid.uuid5(
                        uuid.NAMESPACE_DNS,
                        f"order:OB-{index + 24831}",
                    ),
                    order_number=f"OB-{index + 24831}",
                    customer_id=customer.id,
                    supplier_id=supplier.id,
                    amount=ORDER_AMOUNTS[index],
                    currency="USD",
                    status=ORDER_STATUSES[index],
                )
            )

        session.add_all(orders)
        await session.commit()


def main() -> None:
    asyncio.run(seed_data())


if __name__ == "__main__":
    main()
