import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowLeft, Circle } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getOrderById } from "@/features/operations/mock";
import { buildTimelineForOrder, formatCurrency, formatDateTime } from "@/features/operations/utils";
import { cn } from "@/lib/utils";

interface OperationOrderProfilePageProps {
  params: Promise<{
    id: string;
  }>;
}

function orderStatusVariant(status: string) {
  if (status === "failed") {
    return "danger" as const;
  }

  if (status === "delayed") {
    return "warning" as const;
  }

  if (status === "refund") {
    return "neutral" as const;
  }

  return "success" as const;
}

function eventIcon(type: "info" | "warning" | "error") {
  if (type === "error") {
    return AlertCircle;
  }

  if (type === "warning") {
    return AlertTriangle;
  }

  return Circle;
}

export default async function OperationOrderProfilePage({ params }: OperationOrderProfilePageProps) {
  const { id } = await params;
  const order = getOrderById(id);

  if (!order) {
    notFound();
  }

  const timeline = buildTimelineForOrder(order)
    .slice()
    .reverse()
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Order Profile</h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Operational context and timeline for order {order.orderNumber}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/operations/search" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Link>
          <Link
            href={`/investigation?${new URLSearchParams({ entityType: "order", entityId: order.id, entityLabel: order.orderNumber }).toString()}`}
            className={buttonVariants({ size: "sm" })}
          >
            Investigate
          </Link>
        </div>
      </section>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Order {order.orderNumber}
            <Badge variant={orderStatusVariant(order.status)}>{order.status}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Customer</p>
            <p className="text-sm font-medium">{order.customerName}</p>
            <p className="text-xs text-muted-foreground">{order.customerEmail ?? "No email"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Supplier</p>
            <p className="text-sm font-medium">{order.supplierName}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Amount</p>
            <p className="text-sm font-medium">{formatCurrency(order.amount, order.currency)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Updated</p>
            <p className="text-sm font-medium">{formatDateTime(order.updatedAt)}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Operational Timeline</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {timeline.map((event) => {
              const EventIcon = eventIcon(event.type);

              return (
                <div key={event.id} className="flex gap-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <EventIcon
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      event.type === "error"
                        ? "text-danger"
                        : event.type === "warning"
                          ? "text-warning"
                          : "text-muted-foreground"
                    )}
                  />
                  <div>
                    <p className="text-sm">{event.message}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Workspace Expansion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              Full order diagnostics, retry controls, and linked reconciliation run drilldowns are planned for this profile workspace.
            </p>
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-3">
              Next step: correlate this order with supplier-level incident traces and policy actions.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
