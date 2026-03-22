import "server-only";

import { getBambooJson } from "@/lib/bamboo/client";

export interface NormalizedSystemHealth {
  checkedAt: string;
  overallStatus: "healthy" | "warning" | "critical" | "unknown";
  activeJobs: number;
  failedJobs: number;
  delayedJobs: number;
  notes: string[];
  rawSummary?: {
    totalJobs: number;
    statusCounts: Record<string, number>;
    sampleJobs: Array<{
      name: string;
      state: string;
    }>;
  };
}

const SYSTEM_HEALTH_KEYWORDS = [
  "system health",
  "system status",
  "background job",
  "background jobs",
  "job health",
  "job status",
  "health check",
  "health checks",
  "service health",
];

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function getString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function getBoolean(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") {
      return value;
    }
  }

  return undefined;
}

function findFirstRecordArray(value: unknown, depth = 0): Record<string, unknown>[] {
  if (depth > 3) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => asRecord(item))
      .filter((item): item is Record<string, unknown> => item !== null);
  }

  const record = asRecord(value);
  if (!record) {
    return [];
  }

  const preferredKeys = [
    "jobs",
    "backgroundJobs",
    "states",
    "items",
    "data",
    "result",
    "results",
    "value",
  ];

  for (const key of preferredKeys) {
    const nested = record[key];
    const found = findFirstRecordArray(nested, depth + 1);
    if (found.length > 0) {
      return found;
    }
  }

  for (const nested of Object.values(record)) {
    const found = findFirstRecordArray(nested, depth + 1);
    if (found.length > 0) {
      return found;
    }
  }

  return [];
}

function normalizeToken(value: string | undefined) {
  return value?.trim().toLowerCase().replace(/[\s_-]+/g, " ") ?? "";
}

function classifyJob(record: Record<string, unknown>) {
  const name =
    getString(record, ["jobName", "name", "backgroundJobName", "key", "id"]) ?? "Unnamed job";
  const state =
    getString(record, ["state", "status", "jobState", "backgroundJobState", "result"]) ?? "unknown";
  const normalizedState = normalizeToken(state);

  const delayed =
    getBoolean(record, ["isDelayed", "delayed", "isOverdue", "overdue", "isBehindSchedule"]) ??
    (normalizedState.includes("delay") ||
      normalizedState.includes("overdue") ||
      normalizedState.includes("stuck"));
  const failed =
    normalizedState.includes("fail") ||
    normalizedState.includes("error") ||
    normalizedState.includes("exception") ||
    normalizedState.includes("dead");
  const active =
    normalizedState.includes("run") ||
    normalizedState.includes("progress") ||
    normalizedState.includes("execut") ||
    normalizedState.includes("active") ||
    normalizedState.includes("processing");

  return {
    name,
    state,
    normalizedState,
    delayed,
    failed,
    active,
  };
}

function inferOverallStatus(input: {
  failedJobs: number;
  delayedJobs: number;
  activeJobs: number;
  totalJobs: number;
  rawStatus?: string;
}) {
  const rawStatus = normalizeToken(input.rawStatus);

  if (
    rawStatus.includes("critical") ||
    rawStatus.includes("down") ||
    rawStatus.includes("failed") ||
    rawStatus.includes("error")
  ) {
    return "critical" as const;
  }

  if (rawStatus.includes("warn") || rawStatus.includes("degrad")) {
    return "warning" as const;
  }

  if (rawStatus.includes("healthy") || rawStatus.includes("ok") || rawStatus.includes("success")) {
    return "healthy" as const;
  }

  if (input.failedJobs > 0) {
    return "critical" as const;
  }

  if (input.delayedJobs > 0) {
    return "warning" as const;
  }

  if (input.totalJobs > 0 || input.activeJobs > 0) {
    return "healthy" as const;
  }

  return "unknown" as const;
}

export function isSystemHealthQuestion(question: string) {
  const normalized = question.trim().toLowerCase();
  return SYSTEM_HEALTH_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

export async function getNormalizedSystemHealth(): Promise<NormalizedSystemHealth> {
  const raw = await getBambooJson<unknown>("/api/v1.0/BackgroundJob/state");
  const root = asRecord(raw) ?? {};
  const jobs = findFirstRecordArray(raw).map(classifyJob);
  const rawStatus = getString(root, ["overallStatus", "status", "state", "health"]);
  const directActiveJobs = getNumber(root, ["activeJobs", "runningJobs", "active", "running"]);
  const directFailedJobs = getNumber(root, ["failedJobs", "errorJobs", "failed", "errors"]);
  const directDelayedJobs = getNumber(root, ["delayedJobs", "overdueJobs", "delayed", "overdue"]);
  const activeJobs =
    directActiveJobs ?? jobs.filter((job) => job.active && !job.failed && !job.delayed).length;
  const failedJobs = directFailedJobs ?? jobs.filter((job) => job.failed).length;
  const delayedJobs = directDelayedJobs ?? jobs.filter((job) => job.delayed).length;
  const statusCounts = jobs.reduce<Record<string, number>>((accumulator, job) => {
    const key = job.normalizedState || "unknown";
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
  const overallStatus = inferOverallStatus({
    failedJobs,
    delayedJobs,
    activeJobs,
    totalJobs: jobs.length,
    rawStatus,
  });
  const notes: string[] = [];

  if (jobs.length === 0) {
    notes.push(
      "The endpoint did not expose a per-job list, so the summary is based on top-level state fields only."
    );
  }

  if (failedJobs > 0) {
    const failedSample = jobs
      .filter((job) => job.failed)
      .slice(0, 3)
      .map((job) => `${job.name} (${job.state})`);

    notes.push(
      failedSample.length > 0
        ? `Failed jobs detected: ${failedSample.join(", ")}.`
        : "One or more background jobs are reporting a failed state."
    );
  }

  if (delayedJobs > 0) {
    const delayedSample = jobs
      .filter((job) => job.delayed)
      .slice(0, 3)
      .map((job) => `${job.name} (${job.state})`);

    notes.push(
      delayedSample.length > 0
        ? `Delayed jobs detected: ${delayedSample.join(", ")}.`
        : "One or more background jobs appear delayed or overdue."
    );
  }

  if (!rawStatus && jobs.length === 0) {
    notes.push("Overall state was inferred because the endpoint did not provide an explicit health field.");
  }

  return {
    checkedAt: new Date().toISOString(),
    overallStatus,
    activeJobs,
    failedJobs,
    delayedJobs,
    notes,
    rawSummary: {
      totalJobs: jobs.length,
      statusCounts,
      sampleJobs: jobs.slice(0, 5).map((job) => ({
        name: job.name,
        state: job.state,
      })),
    },
  };
}
