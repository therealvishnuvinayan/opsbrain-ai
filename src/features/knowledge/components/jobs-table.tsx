"use client";

import { useMemo, useState } from "react";
import { AlertCircle, FileSearch, RotateCcw, X } from "lucide-react";

import type { IngestionJob, KnowledgeSource } from "@/features/knowledge/types";
import { formatDateTime, jobStatusBadgeVariant, toDurationLabel } from "@/features/knowledge/utils";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface JobsTableProps {
  jobs: IngestionJob[];
  sources: KnowledgeSource[];
  isLoading?: boolean;
  onRetry: (jobId: string) => void;
}

export function JobsTable({ jobs, sources, isLoading = false, onRetry }: JobsTableProps) {
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  const sourceById = useMemo(() => new Map(sources.map((source) => [source.id, source])), [sources]);

  const sortedJobs = useMemo(
    () => [...jobs].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()),
    [jobs]
  );

  const selectedJob = sortedJobs.find((job) => job.id === selectedJobId) ?? null;
  const failedCount = sortedJobs.filter((job) => job.status === "FAILED").length;

  return (
    <>
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardHeader className="space-y-3 pb-2">
          <CardTitle className="text-base">Ingestion Jobs</CardTitle>
          {failedCount > 0 ? (
            <Alert variant="destructive" className="border-danger/35 bg-danger/10">
              <AlertDescription>
                {failedCount} failed job{failedCount > 1 ? "s" : ""} detected. Retry or inspect logs before relying on stale knowledge.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardHeader>

        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job ID</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Error</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>

            {isLoading ? (
              <TableBody>
                {Array.from({ length: 6 }).map((_, index) => (
                  <TableRow key={`job-skeleton-${index}`}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-14" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-44" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ) : (
              <TableBody>
                {sortedJobs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-10 text-center text-sm text-muted-foreground">
                      No ingestion jobs yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedJobs.map((job) => {
                    const source = sourceById.get(job.sourceId);

                    return (
                      <TableRow key={job.id}>
                        <TableCell className="font-medium">{job.id}</TableCell>
                        <TableCell>{source?.name ?? "Removed source"}</TableCell>
                        <TableCell>{formatDateTime(job.startedAt)}</TableCell>
                        <TableCell>{toDurationLabel(job.durationSec)}</TableCell>
                        <TableCell>
                          <Badge variant={jobStatusBadgeVariant(job.status)}>{job.status}</Badge>
                        </TableCell>
                        <TableCell className="max-w-[280px] truncate text-xs text-muted-foreground">
                          {job.error ?? "-"}
                        </TableCell>
                        <TableCell className="space-x-2 text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedJobId(job.id)}
                          >
                            <FileSearch className="h-3.5 w-3.5" />
                            View logs
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onRetry(job.id)}
                            disabled={job.status === "RUNNING"}
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                            Retry
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            )}
          </Table>
        </CardContent>
      </Card>

      {selectedJob ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-[2px]">
          <aside className="h-full w-full max-w-2xl border-l border-slate-700/80 bg-slate-950 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold">Job Logs • {selectedJob.id}</h3>
                <p className="text-xs text-muted-foreground">
                  {sourceById.get(selectedJob.sourceId)?.name ?? "Removed source"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedJobId(null)}
                aria-label="Close job logs"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2 overflow-y-auto p-5">
              {selectedJob.error ? (
                <Alert variant="destructive" className="border-danger/35 bg-danger/10">
                  <AlertDescription className="inline-flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />
                    {selectedJob.error}
                  </AlertDescription>
                </Alert>
              ) : null}

              {selectedJob.logs.map((line, index) => (
                <pre
                  key={`${selectedJob.id}-log-${index}`}
                  className="overflow-x-auto rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground"
                >
                  {line}
                </pre>
              ))}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
