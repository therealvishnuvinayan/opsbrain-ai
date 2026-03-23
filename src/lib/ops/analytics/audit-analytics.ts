import type { NormalizedAuditLogs } from "@/lib/bamboo/audit";

import type { AuditSummary } from "@/lib/ops/analytics/analytics-types";

function addUnique(values: string[], nextValue: string | undefined) {
  if (!nextValue) {
    return;
  }

  if (!values.includes(nextValue)) {
    values.push(nextValue);
  }
}

function isErrorLikeLog(value: string) {
  const normalized = value.toLowerCase();
  return (
    normalized.includes("fail") ||
    normalized.includes("error") ||
    normalized.includes("block") ||
    normalized.includes("deny") ||
    normalized.includes("cancel")
  );
}

export function analyzeAuditLogsContext(context: NormalizedAuditLogs) {
  const errorEvents = context.logs.filter((log) =>
    isErrorLikeLog(`${log.eventType} ${log.severity ?? ""} ${log.status ?? ""} ${log.message ?? ""}`)
  );
  const auditSummary: AuditSummary = {
    totalEvents: context.returnedCount,
    latestEventType: context.latestEvent?.eventType,
    latestEventAt: context.latestEvent?.createdAt,
    latestMessage: context.latestEvent?.message,
    errorEvents: errorEvents.length,
    repeatedErrorEvents: errorEvents.length >= 2,
    noEvents: context.returnedCount === 0,
  };
  const patterns: string[] = [];
  const nextChecks: string[] = [];
  const notes: string[] = [];

  if (auditSummary.noEvents) {
    addUnique(patterns, "No recent audit activity was returned for this order.");
    addUnique(nextChecks, "manual checking");
  } else {
    addUnique(patterns, `I found ${auditSummary.totalEvents} related audit events.`);
  }

  if (auditSummary.latestEventType) {
    addUnique(
      patterns,
      auditSummary.latestMessage
        ? `Latest audit event: ${auditSummary.latestEventType}. ${auditSummary.latestMessage}`
        : `Latest audit event: ${auditSummary.latestEventType}.`
    );
  }

  if (auditSummary.repeatedErrorEvents) {
    addUnique(patterns, "Audit logs show repeated error activity.");
    addUnique(nextChecks, "audit trail");
  }

  if (errorEvents.some((log) => isErrorLikeLog(log.eventType))) {
    addUnique(nextChecks, "the failing audit events");
  }

  return {
    auditSummary,
    patterns,
    nextChecks,
    notes,
  };
}
