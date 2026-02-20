import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowLeft, Circle } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getSupplierById } from "@/features/operations/mock";
import {
  buildSupplierSummary,
  buildTimelineForSupplier,
  formatDateTime,
  relativeFromNow,
} from "@/features/operations/utils";
import { cn } from "@/lib/utils";

interface OperationSupplierProfilePageProps {
  params: Promise<{
    id: string;
  }>;
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

function supplierHealthVariant(health: string) {
  if (health === "critical") {
    return "danger" as const;
  }

  if (health === "warn") {
    return "warning" as const;
  }

  return "success" as const;
}

export default async function OperationSupplierProfilePage({
  params,
}: OperationSupplierProfilePageProps) {
  const { id } = await params;
  const supplier = getSupplierById(id);

  if (!supplier) {
    notFound();
  }

  const timeline = buildTimelineForSupplier(supplier)
    .slice()
    .reverse()
    .slice(0, 6);
  const summary = buildSupplierSummary(supplier);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Supplier Profile</h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Connector and payout context for supplier {supplier.name}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/operations/search" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Link>
          <Link
            href={`/investigation?${new URLSearchParams({ entityType: "supplier", entityId: supplier.id, entityLabel: supplier.name }).toString()}`}
            className={buttonVariants({ size: "sm" })}
          >
            Investigate
          </Link>
        </div>
      </section>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {supplier.name}
            <Badge variant={supplierHealthVariant(supplier.health)}>{supplier.health}</Badge>
            <Badge variant={summary.risk === "High" ? "danger" : summary.risk === "Medium" ? "warning" : "success"}>
              {summary.risk} risk
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Domain</p>
            <p className="text-sm font-medium">{supplier.domain ?? "Not configured"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Last payout</p>
            <p className="text-sm font-medium">
              {supplier.lastPayoutAt ? formatDateTime(supplier.lastPayoutAt) : "Unknown"}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Updated</p>
            <p className="text-sm font-medium">{relativeFromNow(supplier.updatedAt)}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(supplier.updatedAt)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tags</p>
            <p className="text-sm font-medium">{supplier.tags.slice(0, 3).join(", ") || "No tags"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Supplier Timeline</CardTitle>
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
            <CardTitle>AI Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>{summary.summary}</p>
            <div className="space-y-1">
              {summary.nextSteps.map((step) => (
                <p key={step} className="text-xs">
                  - {step}
                </p>
              ))}
            </div>
            <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-3">
              Deeper connector diagnostics and payout controls will be surfaced in this profile workspace.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
