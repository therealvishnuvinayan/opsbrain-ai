"use client";

import { Download, RotateCcw, X } from "lucide-react";

import type { ActionRun } from "@/features/actions/types";
import {
  durationLabel,
  formatDateTime,
  runStatusBadgeVariant,
  runStatusLabel,
} from "@/features/actions/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface RunLogsDrawerProps {
  open: boolean;
  run: ActionRun | null;
  onClose: () => void;
  onRerun: (runId: string) => void;
  onExport: (runId: string) => void;
}

export function RunLogsDrawer({
  open,
  run,
  onClose,
  onRerun,
  onExport,
}: RunLogsDrawerProps) {
  if (!open || !run) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-[2px]">
      <aside className="flex h-full w-full max-w-2xl flex-col border-l border-slate-700/80 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">{run.id}</h3>
            <p className="text-xs text-muted-foreground">{run.actionName}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant={runStatusBadgeVariant(run.status)}>{runStatusLabel(run.status)}</Badge>
              <Badge variant="neutral">{run.environment.toUpperCase()}</Badge>
              <Badge variant="neutral">{durationLabel(run.durationSec)}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close logs drawer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <section className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Inputs
            </p>
            <div className="grid gap-2 md:grid-cols-2">
              {Object.entries(run.inputs).map(([key, value]) => (
                <div key={key} className="rounded-lg bg-white/[0.03] px-2.5 py-2 text-sm">
                  <p className="text-xs text-muted-foreground">{key}</p>
                  <p>{value || "-"}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Timeline logs
            </p>
            {run.logs.map((entry, index) => (
              <div key={`${run.id}-log-${index}`} className="rounded-lg bg-white/[0.03] px-2.5 py-2 text-sm">
                <p className="text-xs text-muted-foreground">{formatDateTime(entry.t)} • {entry.level.toUpperCase()}</p>
                <p>{entry.message}</p>
              </div>
            ))}
          </section>

          <section className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Output summary
            </p>
            <p className="text-sm text-muted-foreground">{run.resultSummary || "No structured output summary available."}</p>
            {run.errorMessage ? (
              <p className="rounded-lg border border-danger/30 bg-danger/10 px-2.5 py-2 text-sm text-danger">
                {run.errorMessage}
              </p>
            ) : null}
          </section>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-white/10 px-5 py-4">
          <Button variant="outline" onClick={() => onExport(run.id)}>
            <Download className="h-4 w-4" />
            Export
          </Button>
          <Button onClick={() => onRerun(run.id)}>
            <RotateCcw className="h-4 w-4" />
            Re-run
          </Button>
        </div>
      </aside>
    </div>
  );
}
