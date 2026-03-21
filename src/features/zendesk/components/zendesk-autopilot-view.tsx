"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCw, Sparkles, Ticket } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { canUseZendeskBackendApi, fetchZendeskAutopilotCases } from "@/features/zendesk/api";
import { SimulateTicketModal } from "@/features/zendesk/components/simulate-ticket-modal";
import type { ZendeskAutopilotCase, ZendeskAutopilotStatus } from "@/features/zendesk/types";

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function formatConfidence(value: number | null) {
  if (typeof value !== "number") {
    return "-";
  }

  return `${Math.round(value * 100)}%`;
}

function statusBadgeVariant(status: ZendeskAutopilotStatus): "neutral" | "warning" | "success" | "danger" {
  if (status === "ready") {
    return "success";
  }

  if (status === "failed") {
    return "danger";
  }

  if (status === "investigating") {
    return "warning";
  }

  return "neutral";
}

function statusLabel(status: ZendeskAutopilotStatus) {
  switch (status) {
    case "received":
      return "Received";
    case "investigating":
      return "Investigating";
    case "ready":
      return "Ready";
    case "failed":
      return "Failed";
    default:
      return status;
  }
}

const PAGE_SIZE = 20;

export function ZendeskAutopilotView() {
  const router = useRouter();
  const [cases, setCases] = useState<ZendeskAutopilotCase[]>([]);
  const [offset, setOffset] = useState(0);
  const [count, setCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulateOpen, setSimulateOpen] = useState(false);

  const fetchCases = useCallback(
    async (nextOffset: number, silent = false) => {
      if (!canUseZendeskBackendApi()) {
        setError("NEXT_PUBLIC_API_BASE_URL is not configured.");
        setCases([]);
        setCount(0);
        setIsLoading(false);
        return;
      }

      if (silent) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      try {
        setError(null);
        const payload = await fetchZendeskAutopilotCases(PAGE_SIZE, nextOffset);
        setCases(payload.items);
        setCount(payload.count);
        setOffset(nextOffset);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load Zendesk autopilot cases.");
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    []
  );

  useEffect(() => {
    void fetchCases(0);
  }, [fetchCases]);

  const page = Math.floor(offset / PAGE_SIZE) + 1;
  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  const hasPrev = offset > 0;
  const hasNext = offset + PAGE_SIZE < count;

  const emptyState = useMemo(
    () => (
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardContent className="py-14 text-center">
          <Ticket className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm font-medium">No autopilot cases yet</p>
          <p className="text-sm text-muted-foreground">
            Submit or replay a real Zendesk payload to generate investigation output and suggested replies.
          </p>
          <Button className="mt-4" onClick={() => setSimulateOpen(true)}>
            <Sparkles className="h-4 w-4" />
            Process Payload
          </Button>
        </CardContent>
      </Card>
    ),
    []
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Zendesk Autopilot</h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Webhook-to-investigation pipeline for support tickets with structured recommendations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void fetchCases(offset, true)}
            disabled={isLoading || isRefreshing}
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Refresh
          </Button>
          <Button onClick={() => setSimulateOpen(true)}>
            <Sparkles className="h-4 w-4" />
            Process Payload
          </Button>
        </div>
      </section>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader className="pb-2">
          <CardTitle>Autopilot Cases</CardTitle>
          <CardDescription>
            Stored outcomes from webhook events and manually processed payloads.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3 py-8">
              <div className="h-10 animate-pulse rounded-xl bg-white/5" />
              <div className="h-10 animate-pulse rounded-xl bg-white/5" />
              <div className="h-10 animate-pulse rounded-xl bg-white/5" />
            </div>
          ) : error ? (
            <div className="rounded-xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </div>
          ) : cases.length === 0 ? (
            emptyState
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cases.map((item) => (
                    <TableRow key={item.id} className="cursor-pointer">
                      <TableCell className="font-medium">
                        <Link href={`/zendesk/${encodeURIComponent(item.ticket_id)}`} className="text-primary hover:underline">
                          {item.ticket_id}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[500px] truncate text-sm text-muted-foreground">
                        {item.subject || "(no subject)"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
                      </TableCell>
                      <TableCell>{formatConfidence(item.confidence)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatWhen(item.updated_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <div className="mt-4 flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Showing {cases.length} of {count} cases
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasPrev}
                    onClick={() => void fetchCases(Math.max(0, offset - PAGE_SIZE))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    Page {page} / {pageCount}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hasNext}
                    onClick={() => void fetchCases(offset + PAGE_SIZE)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <SimulateTicketModal
        open={simulateOpen}
        onClose={() => setSimulateOpen(false)}
        onCreated={(ticketId) => {
          setSimulateOpen(false);
          router.push(`/zendesk/${encodeURIComponent(ticketId)}`);
        }}
      />
    </div>
  );
}
