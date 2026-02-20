"use client";

import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowRight, Building2, Circle, ShoppingCart, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AISummary, SearchResult, TimelineEvent } from "@/features/operations/types";
import { getCustomerById, getOrderById, getSupplierById } from "@/features/operations/mock";
import {
  buildCustomerSummary,
  buildOrderSummary,
  buildSupplierSummary,
  buildTimelineForCustomer,
  buildTimelineForOrder,
  buildTimelineForSupplier,
  formatCurrency,
  formatDateTime,
  relativeFromNow,
} from "@/features/operations/utils";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PreviewPanelProps {
  selectedResult: SearchResult | null;
}

interface PreviewData {
  title: string;
  subtitle: string;
  profileHref: string;
  keyFields: Array<{ label: string; value: string }>;
  timeline: TimelineEvent[];
  summary: AISummary;
}

function summaryRiskVariant(risk: AISummary["risk"]) {
  if (risk === "High") {
    return "danger" as const;
  }

  if (risk === "Medium") {
    return "warning" as const;
  }

  return "success" as const;
}

function eventIcon(type: TimelineEvent["type"]) {
  if (type === "error") {
    return AlertCircle;
  }

  if (type === "warning") {
    return AlertTriangle;
  }

  return Circle;
}

function buildPreviewData(selectedResult: SearchResult): PreviewData | null {
  if (selectedResult.type === "order") {
    const order = getOrderById(selectedResult.id);

    if (!order) {
      return null;
    }

    return {
      title: `Order ${order.orderNumber}`,
      subtitle: `${order.supplierName} - ${order.status} - updated ${relativeFromNow(order.updatedAt)}`,
      profileHref: `/operations/orders/${order.id}`,
      keyFields: [
        { label: "Amount", value: formatCurrency(order.amount, order.currency) },
        { label: "Supplier", value: order.supplierName },
        { label: "Customer", value: order.customerName },
        { label: "Status", value: order.status },
      ],
      timeline: buildTimelineForOrder(order),
      summary: buildOrderSummary(order),
    };
  }

  if (selectedResult.type === "customer") {
    const customer = getCustomerById(selectedResult.id);

    if (!customer) {
      return null;
    }

    return {
      title: customer.name,
      subtitle: `${customer.email} - ${customer.tier} - updated ${relativeFromNow(customer.updatedAt)}`,
      profileHref: `/operations/customers/${customer.id}`,
      keyFields: [
        { label: "Email", value: customer.email },
        { label: "Phone", value: customer.phone ?? "Not provided" },
        { label: "Tier", value: customer.tier },
        { label: "Tags", value: customer.tags.slice(0, 2).join(", ") || "No tags" },
      ],
      timeline: buildTimelineForCustomer(customer),
      summary: buildCustomerSummary(customer),
    };
  }

  const supplier = getSupplierById(selectedResult.id);

  if (!supplier) {
    return null;
  }

  return {
    title: supplier.name,
    subtitle: `${supplier.domain ?? "No domain"} - ${supplier.health} - updated ${relativeFromNow(
      supplier.updatedAt
    )}`,
    profileHref: `/operations/suppliers/${supplier.id}`,
    keyFields: [
      { label: "Domain", value: supplier.domain ?? "Not configured" },
      { label: "Health", value: supplier.health },
      { label: "Last payout", value: supplier.lastPayoutAt ? formatDateTime(supplier.lastPayoutAt) : "Unknown" },
      { label: "Tags", value: supplier.tags.slice(0, 2).join(", ") || "No tags" },
    ],
    timeline: buildTimelineForSupplier(supplier),
    summary: buildSupplierSummary(supplier),
  };
}

export function PreviewPanel({ selectedResult }: PreviewPanelProps) {
  if (!selectedResult) {
    return (
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Select a result to preview entity context, timeline, and AI summary.</p>
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4">
            Search signals like a supplier name, customer email, or order number to begin.
          </div>
        </CardContent>
      </Card>
    );
  }

  const preview = buildPreviewData(selectedResult);

  if (!preview) {
    return (
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Preview unavailable</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The selected entity is not available in demo data.
        </CardContent>
      </Card>
    );
  }

  const entityIcon =
    selectedResult.type === "order"
      ? ShoppingCart
      : selectedResult.type === "customer"
        ? UserRound
        : Building2;

  const Icon = entityIcon;

  const investigateHref = `/investigation?${new URLSearchParams({
    entityType: selectedResult.type,
    entityId: selectedResult.id,
    entityLabel: preview.title,
  }).toString()}`;

  const createActionHref = `/actions?${new URLSearchParams({
    source: "operations-search",
    entityType: selectedResult.type,
    entityId: selectedResult.id,
  }).toString()}`;

  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader className="space-y-3">
        <CardTitle>Preview</CardTitle>
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
              <Icon className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-base font-semibold">{preview.title}</p>
              <p className="text-sm text-muted-foreground">{preview.subtitle}</p>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {preview.keyFields.map((field) => (
              <div key={`${preview.title}-${field.label}`} className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{field.label}</p>
                <p className="truncate text-sm font-medium">{field.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link href={preview.profileHref} className={buttonVariants({ size: "sm" })}>
            Open profile
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={investigateHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Investigate
          </Link>
          <Link href={createActionHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
            Create action
          </Link>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Timeline</h4>
            <span className="text-xs text-muted-foreground">{preview.timeline.length} events</span>
          </div>

          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
            {preview.timeline.slice(0, 8).map((event) => {
              const EventIcon = eventIcon(event.type);

              return (
                <div key={event.id} className="flex gap-2.5 border-b border-white/5 pb-2 last:border-b-0 last:pb-0">
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
                  <div className="space-y-0.5">
                    <p className="text-sm">{event.message}</p>
                    <p className="text-xs text-muted-foreground">{formatDateTime(event.at)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className="space-y-2 rounded-xl border border-primary/25 bg-primary/10 p-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">AI Summary</h4>
            <Badge variant={summaryRiskVariant(preview.summary.risk)}>{preview.summary.risk} risk</Badge>
          </div>
          <p className="text-sm text-muted-foreground">{preview.summary.summary}</p>
          <div className="space-y-1">
            {preview.summary.nextSteps.map((step) => (
              <p key={step} className="text-xs text-muted-foreground">
                - {step}
              </p>
            ))}
          </div>
        </section>
      </CardContent>
    </Card>
  );
}
