"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Copy, Loader2, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { fetchZendeskAutopilotCase } from "@/features/zendesk/api";
import type {
  ZendeskAutopilotCase,
  ZendeskAutopilotStatus,
  ZendeskDiagnosisItem,
  ZendeskEvidenceItem,
  ZendeskRecommendedAction,
} from "@/features/zendesk/types";

interface ZendeskCaseDetailViewProps {
  ticketId: string;
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

function formatWhen(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatConfidence(value: number | null) {
  if (typeof value !== "number") {
    return "-";
  }

  return `${Math.round(value * 100)}%`;
}

function asDiagnosis(value: ZendeskAutopilotCase["investigation"]): ZendeskDiagnosisItem[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const diagnosis = (value as { diagnosis?: unknown }).diagnosis;
  if (!Array.isArray(diagnosis)) {
    return [];
  }

  return diagnosis
    .filter((item): item is ZendeskDiagnosisItem => {
      return (
        item !== null &&
        typeof item === "object" &&
        typeof (item as ZendeskDiagnosisItem).title === "string" &&
        typeof (item as ZendeskDiagnosisItem).detail === "string"
      );
    })
    .map((item) => ({
      title: item.title,
      detail: item.detail,
      confidence:
        typeof item.confidence === "number" && Number.isFinite(item.confidence)
          ? item.confidence
          : 0,
    }));
}

function asEvidence(value: ZendeskAutopilotCase["investigation"]): ZendeskEvidenceItem[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const evidence = (value as { evidence?: unknown }).evidence;
  if (!Array.isArray(evidence)) {
    return [];
  }

  return evidence.filter((item): item is ZendeskEvidenceItem => {
    return (
      item !== null &&
      typeof item === "object" &&
      typeof (item as ZendeskEvidenceItem).type === "string" &&
      typeof (item as ZendeskEvidenceItem).ref === "string" &&
      typeof (item as ZendeskEvidenceItem).detail === "string"
    );
  });
}

function asActions(value: ZendeskAutopilotCase["investigation"]): ZendeskRecommendedAction[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const actions = (value as { recommendedActions?: unknown }).recommendedActions;
  if (!Array.isArray(actions)) {
    return [];
  }

  return actions.filter((item): item is ZendeskRecommendedAction => {
    return (
      item !== null &&
      typeof item === "object" &&
      typeof (item as ZendeskRecommendedAction).label === "string" &&
      typeof (item as ZendeskRecommendedAction).action === "string"
    );
  });
}

function investigationSummary(value: ZendeskAutopilotCase["investigation"]) {
  if (!value || typeof value !== "object") {
    return "No investigation output available.";
  }

  const summary = (value as { summary?: unknown }).summary;
  return typeof summary === "string" && summary.trim().length > 0
    ? summary
    : "No investigation summary available.";
}

export function ZendeskCaseDetailView({ ticketId }: ZendeskCaseDetailViewProps) {
  const router = useRouter();
  const [caseData, setCaseData] = useState<ZendeskAutopilotCase | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const payload = await fetchZendeskAutopilotCase(ticketId);
        setCaseData(payload);
      } catch (fetchError) {
        setError(fetchError instanceof Error ? fetchError.message : "Failed to load autopilot case.");
      } finally {
        setIsLoading(false);
      }
    };

    void run();
  }, [ticketId]);

  const diagnosis = useMemo(() => asDiagnosis(caseData?.investigation ?? null), [caseData?.investigation]);
  const evidence = useMemo(() => asEvidence(caseData?.investigation ?? null), [caseData?.investigation]);
  const actions = useMemo(() => asActions(caseData?.investigation ?? null), [caseData?.investigation]);

  const copyText = async (label: string, value: string | null | undefined) => {
    if (!value) {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(`${label} copied`);
      window.setTimeout(() => setCopyStatus(null), 1600);
    } catch {
      setCopyStatus(`Unable to copy ${label.toLowerCase()}`);
      window.setTimeout(() => setCopyStatus(null), 1600);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-52 animate-pulse rounded-2xl bg-white/5" />
        <div className="h-52 animate-pulse rounded-2xl bg-white/5" />
      </div>
    );
  }

  if (error || !caseData) {
    return (
      <Card className="border-danger/30 bg-danger/10">
        <CardContent className="space-y-3 py-8">
          <p className="text-sm text-danger">{error ?? "Case not found."}</p>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => router.push("/zendesk")}>Back to list</Button>
            <Button onClick={() => router.refresh()}>Retry</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/zendesk" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Zendesk Autopilot
          </Link>
          <h2 className="mt-1 text-2xl font-semibold tracking-tight md:text-3xl">{caseData.ticket_id}</h2>
          <p className="text-sm text-muted-foreground md:text-base">{caseData.subject || "Zendesk ticket"}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusBadgeVariant(caseData.status)}>{statusLabel(caseData.status)}</Badge>
          <Badge variant="neutral">Confidence {formatConfidence(caseData.confidence)}</Badge>
        </div>
      </section>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Case Summary</CardTitle>
          <CardDescription>
            Requester {caseData.requester_email ?? "unknown"} · Updated {formatWhen(caseData.updated_at)}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{investigationSummary(caseData.investigation)}</p>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span>Created: {formatWhen(caseData.created_at)}</span>
            <span>Trace: {caseData.trace_id}</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Suggested Reply</CardTitle>
            <CardDescription>Customer-facing draft response.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/35 p-3 text-sm text-muted-foreground">
              {caseData.suggested_reply ?? "No reply generated."}
            </pre>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyText("Suggested reply", caseData.suggested_reply)}
              disabled={!caseData.suggested_reply}
            >
              <Copy className="h-4 w-4" />
              Copy reply
            </Button>
          </CardContent>
        </Card>

        <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Internal Note</CardTitle>
            <CardDescription>Escalation note for support and operations teams.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-slate-950/35 p-3 text-sm text-muted-foreground">
              {caseData.internal_note ?? "No internal note generated."}
            </pre>
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyText("Internal note", caseData.internal_note)}
              disabled={!caseData.internal_note}
            >
              <Copy className="h-4 w-4" />
              Copy note
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Diagnosis</CardTitle>
            <CardDescription>Ranked findings inferred from linked operational context.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {diagnosis.length === 0 ? (
              <p className="text-sm text-muted-foreground">No diagnosis entries.</p>
            ) : (
              diagnosis.map((item, index) => (
                <div key={`${item.title}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                  <p className="mt-2 text-xs text-muted-foreground">Confidence {Math.round(item.confidence * 100)}%</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Recommended Actions</CardTitle>
            <CardDescription>Actions proposed by autopilot (recommend-only).</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {actions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recommended actions.</p>
            ) : (
              actions.map((item, index) => (
                <div key={`${item.label}-${index}`} className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
                  <p className="text-sm font-medium">{item.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">Action key: {item.action}</p>
                  {item.params ? (
                    <pre className="mt-2 overflow-auto whitespace-pre-wrap rounded-lg border border-white/10 bg-slate-950/50 p-2 text-xs text-muted-foreground">
                      {JSON.stringify(item.params, null, 2)}
                    </pre>
                  ) : null}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Evidence</CardTitle>
          <CardDescription>Records used to justify diagnosis and recommendations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {evidence.length === 0 ? (
            <p className="text-sm text-muted-foreground">No evidence entries captured.</p>
          ) : (
            evidence.map((item, index) => (
              <div
                key={`${item.type}-${item.ref}-${index}`}
                className="flex flex-wrap items-start gap-2 rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2 text-sm"
              >
                <Badge variant="neutral" className="capitalize">
                  {item.type}
                </Badge>
                <p className="font-medium">{item.ref}</p>
                <p className="text-muted-foreground">{item.detail}</p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Raw Payload</CardTitle>
          <CardDescription>Original webhook payload (collapsed by default).</CardDescription>
        </CardHeader>
        <CardContent>
          <details className="rounded-xl border border-white/10 bg-slate-950/30 p-3">
            <summary className="cursor-pointer text-sm font-medium">Show raw payload</summary>
            <pre className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap text-xs text-muted-foreground">
              {JSON.stringify(caseData.raw_payload ?? {}, null, 2)}
            </pre>
          </details>
        </CardContent>
      </Card>

      {copyStatus ? (
        <div className="fixed bottom-4 right-4 rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-muted-foreground shadow-xl">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5" />
            {copyStatus}
          </div>
        </div>
      ) : null}
    </div>
  );
}
