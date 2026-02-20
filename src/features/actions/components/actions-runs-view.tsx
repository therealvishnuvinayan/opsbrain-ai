"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { RunLogsDrawer } from "@/features/actions/components/run-logs-drawer";
import { RunsTable } from "@/features/actions/components/runs-table";
import { useActionsStore } from "@/features/actions/store";

export function ActionsRunsView() {
  const { data: session } = useSession();
  const { runs, isHydrated, rerunAction, exportRun } = useActionsStore();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const sortedRuns = useMemo(
    () => [...runs].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    [runs]
  );

  const selectedRun = useMemo(
    () => (selectedRunId ? sortedRuns.find((run) => run.id === selectedRunId) ?? null : null),
    [selectedRunId, sortedRuns]
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 2200);
  };

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Execution History</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Observe action executions, inspect logs, and re-run with controlled operator context.
        </p>
      </section>

      <RunsTable
        runs={sortedRuns}
        isLoading={!isHydrated}
        onViewLogs={setSelectedRunId}
      />

      <RunLogsDrawer
        open={Boolean(selectedRun)}
        run={selectedRun}
        onClose={() => setSelectedRunId(null)}
        onRerun={(runId) => {
          const createdId = rerunAction(runId, session?.user?.email ?? "opslead@opsbrain.ai");
          if (createdId) {
            showToast(`Re-run started: ${createdId}`);
            setSelectedRunId(null);
          }
        }}
        onExport={(runId) => {
          exportRun(runId);
          showToast("Run exported");
        }}
      />

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-white/15 bg-slate-950/85 px-4 py-3 text-sm text-white shadow-xl backdrop-blur-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
