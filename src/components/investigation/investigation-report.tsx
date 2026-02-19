import { Download, Loader2, Sparkles } from "lucide-react";

import { EvidenceTimeline } from "@/components/investigation/evidence-timeline";
import { HypothesesAccordion } from "@/components/investigation/hypotheses-accordion";
import type {
  InvestigationActionType,
  InvestigationReportResponse,
} from "@/components/investigation/evidence-bundle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface InvestigationReportProps {
  report: InvestigationReportResponse | null;
  isLoading: boolean;
  showEvidenceFirst: boolean;
  lastInvestigationAt: string | null;
  onExport: () => Promise<void>;
  onAction: (action: {
    id: string;
    label: string;
    intent: string;
    actionType: InvestigationActionType;
    payload?: unknown;
  }) => Promise<void>;
  isExporting: boolean;
  actionInFlightId: string | null;
}

function severityVariant(severity: string) {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return "danger" as const;
    case "MEDIUM":
      return "warning" as const;
    default:
      return "success" as const;
  }
}

function ReportLoadingState() {
  return (
    <div className="space-y-4">
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader className="space-y-3">
          <Skeleton className="h-6 w-80" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-80 w-full" />
    </div>
  );
}

function EvidenceSection({ report }: { report: InvestigationReportResponse }) {
  const totalIssues = report.evidence.topIssueTypes.reduce((sum, item) => sum + item.count, 0);

  return (
    <div className="grid gap-4 xl:grid-cols-[1.1fr_1fr]">
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Top Issue Types</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.evidence.topIssueTypes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No issue clusters available.</p>
          ) : (
            report.evidence.topIssueTypes.map((item) => {
              const widthPercent = totalIssues > 0 ? (item.count / totalIssues) * 100 : 0;

              return (
                <div key={item.type} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">{item.type}</p>
                    <Badge variant={severityVariant(item.severity)}>{item.count}</Badge>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(widthPercent, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Top Error Messages</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.evidence.topErrors.length === 0 ? (
            <p className="text-sm text-muted-foreground">No repeated errors detected.</p>
          ) : (
            report.evidence.topErrors.map((error, index) => (
              <div key={`${error.message}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm">{error.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Observed {error.count.toLocaleString("en-US")} time
                  {error.count === 1 ? "" : "s"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function InvestigationReport({
  report,
  isLoading,
  showEvidenceFirst,
  lastInvestigationAt,
  onExport,
  onAction,
  isExporting,
  actionInFlightId,
}: InvestigationReportProps) {
  if (isLoading) {
    return <ReportLoadingState />;
  }

  if (!report) {
    return (
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Investigation Report</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>Select a run and execute the deterministic investigator to generate structured findings.</p>
          <div className="rounded-xl border border-dashed border-white/15 bg-white/[0.03] p-4">
            <p>Expected output includes diagnosis, ranked hypotheses, evidence traces, and action recommendations.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Investigation Report • {report.run.processId}
              </p>
              <h3 className="text-xl font-semibold">{report.diagnosis.headline}</h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={severityVariant(report.diagnosis.severity)}>
                {report.diagnosis.severity}
              </Badge>
              <Badge variant="neutral">Confidence {report.diagnosis.confidence}%</Badge>
            </div>
          </div>

          <p className="text-sm text-muted-foreground">{report.diagnosis.summary}</p>

          <div className="flex flex-wrap items-center gap-2">
            {report.diagnosis.primarySignals.map((signal) => (
              <Badge key={signal} variant="warning">
                <Sparkles className="h-3.5 w-3.5" />
                {signal}
              </Badge>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {report.evidence.keyMetrics.map((metric) => (
              <div key={metric.label} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
                <p className="mt-1 text-lg font-semibold">{metric.value}</p>
                {metric.note ? <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p> : null}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {report.recommendedActions.map((action) => (
              <Button
                key={action.id}
                variant={action.actionType === "GENERATE_EVIDENCE_BUNDLE" ? "default" : "outline"}
                size="sm"
                disabled={Boolean(actionInFlightId)}
                onClick={() => {
                  void onAction(action);
                }}
              >
                {actionInFlightId === action.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {action.label}
              </Button>
            ))}

            <Button
              variant="outline"
              size="sm"
              disabled={isExporting}
              onClick={() => {
                void onExport();
              }}
            >
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export Evidence Bundle
            </Button>
          </div>
        </CardContent>
      </Card>

      {showEvidenceFirst ? (
        <>
          <EvidenceSection report={report} />
          <EvidenceTimeline timeline={report.evidence.timeline} />
          <HypothesesAccordion hypotheses={report.hypotheses} />
        </>
      ) : (
        <>
          <HypothesesAccordion hypotheses={report.hypotheses} />
          <EvidenceSection report={report} />
          <EvidenceTimeline timeline={report.evidence.timeline} />
        </>
      )}

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader>
          <CardTitle>Next Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {report.nextQuestions.map((question) => (
            <div key={question} className="rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-muted-foreground">
              {question}
            </div>
          ))}
          {lastInvestigationAt ? (
            <p className="pt-1 text-xs text-muted-foreground">
              Last investigation: {new Date(lastInvestigationAt).toLocaleString("en-US")}
            </p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
