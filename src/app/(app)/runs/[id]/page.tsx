import { notFound } from "next/navigation";

import { RunActionsPanel } from "@/components/runs/run-actions-panel";
import { RunEventTimeline } from "@/components/runs/run-event-timeline";
import { RunHeader } from "@/components/runs/run-header";
import { RunIssuesTable } from "@/components/runs/run-issues-table";
import { RunMismatchBreakdown } from "@/components/runs/run-mismatch-breakdown";
import { RunRiskSummary } from "@/components/runs/run-risk-summary";
import {
  getRunById,
  getRunEvents,
  getRunIssueBreakdown,
  getRunIssues,
} from "@/lib/runs-data";

interface RunDetailPageProps {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

export default async function RunDetailPage({ params, searchParams }: RunDetailPageProps) {
  const { id } = await params;
  const query = searchParams ? await searchParams : {};

  const type = readParam(query, "type");
  const severity = readParam(query, "severity");
  const q = readParam(query, "q");
  const page = readParam(query, "page") || "1";
  const pageSize = readParam(query, "pageSize") || "25";

  const run = await getRunById(id);

  if (!run) {
    notFound();
  }

  const [events, mismatchBreakdown, issuesData] = await Promise.all([
    getRunEvents(id),
    getRunIssueBreakdown(id),
    getRunIssues(id, {
      type,
      severity,
      q,
      page,
      pageSize,
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <RunHeader run={run} />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <div className="space-y-6">
          <RunRiskSummary run={run} />
          <RunMismatchBreakdown breakdown={mismatchBreakdown} />
          <RunIssuesTable
            runId={run.id}
            issues={issuesData.items}
            count={issuesData.count}
            pageIndex={issuesData.pageIndex}
            pageSize={issuesData.pageSize}
            filters={{
              type,
              severity,
              q,
            }}
          />
        </div>

        <div className="space-y-6">
          <RunEventTimeline events={events.slice(0, 30)} />
          <RunActionsPanel runId={run.id} />
        </div>
      </div>
    </div>
  );
}
