"use client";

import Link from "next/link";
import { Building2, ShoppingCart, UserRound } from "lucide-react";

import type { AIResponse, Customer, Order, Supplier } from "@/features/operations/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EntitiesPanelProps {
  response: AIResponse | null;
  data: {
    orders: Order[];
    customers: Customer[];
    suppliers: Supplier[];
  };
}

function EntityGroup({
  title,
  icon: Icon,
  items,
  emptyLabel,
}: {
  title: string;
  icon: typeof ShoppingCart;
  items: Array<{ label: string; href: string }>;
  emptyLabel: string;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <p className="text-sm font-semibold">{title}</p>
        <Badge variant="neutral">{items.length}</Badge>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map((item) => (
            <Link
              key={`${item.href}-${item.label}`}
              href={item.href}
              className="inline-flex items-center rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function EntitiesPanel({ response, data }: EntitiesPanelProps) {
  const orderItems = (response?.entities.orders ?? [])
    .map((id) => data.orders.find((order) => order.id === id) ?? null)
    .filter((order): order is NonNullable<typeof order> => Boolean(order))
    .slice(0, 6)
    .map((order) => ({
      label: order.orderNumber,
      href: `/operations/orders/${order.id}`,
    }));

  const customerItems = (response?.entities.customers ?? [])
    .map((id) => data.customers.find((customer) => customer.id === id) ?? null)
    .filter((customer): customer is NonNullable<typeof customer> => Boolean(customer))
    .slice(0, 6)
    .map((customer) => ({
      label: customer.name,
      href: `/operations/customers/${customer.id}`,
    }));

  const supplierItems = (response?.entities.suppliers ?? [])
    .map((id) => data.suppliers.find((supplier) => supplier.id === id) ?? null)
    .filter((supplier): supplier is NonNullable<typeof supplier> => Boolean(supplier))
    .slice(0, 6)
    .map((supplier) => ({
      label: supplier.name,
      href: `/operations/suppliers/${supplier.id}`,
    }));

  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Relevant Entities</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <EntityGroup
          title="Orders"
          icon={ShoppingCart}
          items={orderItems}
          emptyLabel="No order citations for the current response."
        />

        <EntityGroup
          title="Customers"
          icon={UserRound}
          items={customerItems}
          emptyLabel="No customer citations for the current response."
        />

        <EntityGroup
          title="Suppliers"
          icon={Building2}
          items={supplierItems}
          emptyLabel="No supplier citations for the current response."
        />
      </CardContent>
    </Card>
  );
}
