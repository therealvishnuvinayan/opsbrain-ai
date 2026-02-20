import Link from "next/link";
import { AlertCircle, AlertTriangle, ArrowLeft, Circle } from "lucide-react";
import { notFound } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { getCustomerById } from "@/features/operations/mock";
import {
  buildCustomerSummary,
  buildTimelineForCustomer,
  formatDateTime,
  relativeFromNow,
} from "@/features/operations/utils";
import { cn } from "@/lib/utils";

interface OperationCustomerProfilePageProps {
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

export default async function OperationCustomerProfilePage({ params }: OperationCustomerProfilePageProps) {
  const { id } = await params;
  const customer = getCustomerById(id);

  if (!customer) {
    notFound();
  }

  const timeline = buildTimelineForCustomer(customer)
    .slice()
    .reverse()
    .slice(0, 6);
  const summary = buildCustomerSummary(customer);

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Customer Profile</h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Operational lookup for {customer.name} and connected order behaviors.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link href="/operations/search" className={buttonVariants({ variant: "outline", size: "sm" })}>
            <ArrowLeft className="h-4 w-4" />
            Back to Search
          </Link>
          <Link
            href={`/investigation?${new URLSearchParams({ entityType: "customer", entityId: customer.id, entityLabel: customer.name }).toString()}`}
            className={buttonVariants({ size: "sm" })}
          >
            Investigate
          </Link>
        </div>
      </section>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2">
            {customer.name}
            <Badge variant={customer.tier === "VIP" ? "warning" : "neutral"}>{customer.tier}</Badge>
            <Badge variant={summary.risk === "High" ? "danger" : summary.risk === "Medium" ? "warning" : "success"}>
              {summary.risk} risk
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Email</p>
            <p className="text-sm font-medium">{customer.email}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Phone</p>
            <p className="text-sm font-medium">{customer.phone ?? "Not provided"}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Last Updated</p>
            <p className="text-sm font-medium">{relativeFromNow(customer.updatedAt)}</p>
            <p className="text-xs text-muted-foreground">{formatDateTime(customer.updatedAt)}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Tags</p>
            <p className="text-sm font-medium">{customer.tags.slice(0, 3).join(", ") || "No tags"}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Customer Timeline</CardTitle>
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
              Full customer operations workspace with linked support notes and refund controls is coming soon.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
