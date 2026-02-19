"use client";

import { FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Microscope, Search } from "lucide-react";

import {
  exportEvidenceBundle,
  type InvestigationActionType,
  type InvestigationReportResponse,
} from "@/components/investigation/evidence-bundle";
import { InvestigationReport } from "@/components/investigation/investigation-report";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface RunOption {
  id: string;
  processId: string;
  entityType: string;
  entityName: string;
  mode: string;
  status: string;
  severity: string;
  uploadedAt: string;
}

interface InvestigationSetupProps {
  runs: RunOption[];
  initialRunId?: string;
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

async function postActionLog(params: {
  runId: string;
  actionType: InvestigationActionType;
  note: string;
  payload?: unknown;
}) {
  const response = await fetch("/api/actions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      runId: params.runId,
      actionType: params.actionType,
      note: params.note,
      payloadJson: params.payload,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to write action log.");
  }
}

export function InvestigationSetup({ runs, initialRunId }: InvestigationSetupProps) {
  const [selectedRunId, setSelectedRunId] = useState(initialRunId ?? runs[0]?.id ?? "");
  const [search, setSearch] = useState("");
  const [showEvidenceFirst, setShowEvidenceFirst] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [actionInFlightId, setActionInFlightId] = useState<string | null>(null);
  const [lastInvestigationAt, setLastInvestigationAt] = useState<string | null>(null);
  const [report, setReport] = useState<InvestigationReportResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const filteredRuns = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return runs;
    }

    return runs.filter((run) => {
      const haystack = `${run.processId} ${run.entityName} ${run.entityType} ${run.status}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [runs, search]);

  const selectedRun = runs.find((run) => run.id === selectedRunId) ?? null;

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 2200);
  };

  const runInvestigation = async () => {
    if (!selectedRunId) {
      setErrorMessage("Select a run to investigate.");
      return;
    }

    try {
      setErrorMessage(null);
      setIsRunning(true);

      const response = await fetch("/api/investigate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          runId: selectedRunId,
        }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as { message?: string } | null;
        throw new Error(errorPayload?.message ?? "Failed to run investigation.");
      }

      const result = (await response.json()) as InvestigationReportResponse;
      setReport(result);
      setLastInvestigationAt(new Date().toISOString());
      showToast("Investigation complete");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to generate report.");
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void runInvestigation();
  };

  const handleExport = async () => {
    if (!report) {
      setErrorMessage("Run an investigation before exporting evidence.");
      return;
    }

    try {
      setIsExporting(true);

      await postActionLog({
        runId: report.run.id,
        actionType: "GENERATE_EVIDENCE_BUNDLE",
        note: "Evidence bundle exported from Investigation Center.",
        payload: {
          source: "investigation-page",
        },
      });

      await exportEvidenceBundle({
        investigation: report,
        source: "investigation-center",
      });

      showToast("Evidence bundle downloaded");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to export evidence bundle.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleAction = async (action: {
    id: string;
    label: string;
    intent: string;
    actionType: InvestigationActionType;
    payload?: unknown;
  }) => {
    if (!report) {
      return;
    }

    try {
      setActionInFlightId(action.id);
      setErrorMessage(null);

      await postActionLog({
        runId: report.run.id,
        actionType: action.actionType,
        note: `${action.label}: ${action.intent}`,
        payload: action.payload,
      });

      if (action.actionType === "GENERATE_EVIDENCE_BUNDLE") {
        await exportEvidenceBundle({
          investigation: report,
          source: "investigation-action",
        });
        showToast("Evidence bundle downloaded");
      } else {
        showToast(`${action.label} logged`);
      }
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to execute action.");
    } finally {
      setActionInFlightId(null);
    }
  };

  return (
    <>
      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Card className="h-fit border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Microscope className="h-5 w-5 text-primary" />
              Investigation Setup
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <form className="space-y-3" onSubmit={handleSubmit}>
              <div className="space-y-1.5">
                <label htmlFor="run-search" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Search Runs
                </label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="run-search"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="RB-8293, Runa, status..."
                    className="pl-9"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="runId" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Run
                </label>
                <Select
                  id="runId"
                  value={selectedRunId}
                  onChange={(event) => setSelectedRunId(event.target.value)}
                >
                  {filteredRuns.length === 0 ? (
                    <option value="">No runs found</option>
                  ) : (
                    filteredRuns.map((run) => (
                      <option key={run.id} value={run.id}>
                        {run.processId} • {run.entityName} • {run.status}
                      </option>
                    ))
                  )}
                </Select>
              </div>

              <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-white/20 bg-transparent"
                  checked={showEvidenceFirst}
                  onChange={(event) => setShowEvidenceFirst(event.target.checked)}
                />
                Show evidence first
              </label>

              <Button type="submit" className="w-full" disabled={isRunning || !selectedRunId}>
                {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Run Investigation
              </Button>
            </form>

            {selectedRun ? (
              <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="text-sm font-medium">{selectedRun.processId}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedRun.entityType}: {selectedRun.entityName}
                </p>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="neutral">{selectedRun.mode}</Badge>
                  <Badge variant={severityVariant(selectedRun.severity)}>{selectedRun.severity}</Badge>
                  <Badge variant="neutral">{selectedRun.status}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Uploaded {new Date(selectedRun.uploadedAt).toLocaleString("en-US")}
                </p>
              </div>
            ) : null}

            {lastInvestigationAt ? (
              <p className="text-xs text-muted-foreground">
                Last investigation: {new Date(lastInvestigationAt).toLocaleString("en-US")}
              </p>
            ) : null}

            {errorMessage ? (
              <p className="rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
                {errorMessage}
              </p>
            ) : null}
          </CardContent>
        </Card>

        <InvestigationReport
          report={report}
          isLoading={isRunning}
          showEvidenceFirst={showEvidenceFirst}
          lastInvestigationAt={lastInvestigationAt}
          onExport={handleExport}
          onAction={handleAction}
          isExporting={isExporting}
          actionInFlightId={actionInFlightId}
        />
      </div>

      <AnimatePresence>
        {toastMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 right-5 z-50 rounded-xl border border-white/15 bg-slate-950/80 px-4 py-3 text-sm text-white shadow-xl backdrop-blur-xl"
          >
            {toastMessage}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
