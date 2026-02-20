"use client";

import { useKnowledgeStore } from "@/features/knowledge/store";
import { JobsTable } from "@/features/knowledge/components/jobs-table";

export function KnowledgeJobsView() {
  const { jobs, sources, isHydrated, retryJob } = useKnowledgeStore();

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Ingestion Jobs</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Monitor indexing runs, retry failed ingestions, and inspect processing logs.
        </p>
      </section>

      <JobsTable
        jobs={jobs}
        sources={sources}
        isLoading={!isHydrated}
        onRetry={retryJob}
      />
    </div>
  );
}
