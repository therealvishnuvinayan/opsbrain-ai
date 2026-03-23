import type { NormalizedAuditLogs } from "@/lib/bamboo/audit";
import type {
  NormalizedOrderDetail,
  NormalizedOrderHistory,
} from "@/lib/bamboo/orders";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";

import type { OrderAnalytics } from "@/lib/ops/analytics/analytics-types";
import { analyzeAuditLogsContext } from "@/lib/ops/analytics/audit-analytics";
import { analyzeOrderDetailContext } from "@/lib/ops/analytics/order-detail-analytics";
import { analyzeOrderHistoryContext } from "@/lib/ops/analytics/order-history-analytics";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isNormalizedOrderHistory(value: unknown): value is NormalizedOrderHistory {
  return isRecord(value) && Array.isArray(value.orders) && typeof value.returnedCount === "number";
}

function isNormalizedOrderDetail(value: unknown): value is NormalizedOrderDetail {
  return (
    isRecord(value) &&
    typeof value.orderId === "string" &&
    typeof value.status === "string" &&
    Array.isArray(value.items) &&
    Array.isArray(value.cards)
  );
}

function isNormalizedAuditLogs(value: unknown): value is NormalizedAuditLogs {
  return isRecord(value) && Array.isArray(value.logs) && typeof value.returnedCount === "number";
}

function addUnique(values: string[], nextValue: string | undefined) {
  if (!nextValue) {
    return;
  }

  if (!values.includes(nextValue)) {
    values.push(nextValue);
  }
}

function mergeAuditSignals(base: OrderAnalytics, audit: NormalizedAuditLogs): OrderAnalytics {
  const auditAnalytics = analyzeAuditLogsContext(audit);
  const patterns = [...base.patterns];
  const nextChecks = [...base.nextChecks];
  const notes = [...base.notes, ...auditAnalytics.notes];

  for (const pattern of auditAnalytics.patterns) {
    addUnique(patterns, pattern);
  }

  for (const nextCheck of auditAnalytics.nextChecks) {
    addUnique(nextChecks, nextCheck);
  }

  let summary = base.summary;
  if (auditAnalytics.auditSummary.noEvents) {
    summary = `${base.summary} No recent audit activity was returned for this order.`;
  } else if (auditAnalytics.auditSummary.totalEvents > 0) {
    summary = `${base.summary} I also found related audit activity.`;
  }

  return {
    ...base,
    summary,
    patterns,
    nextChecks,
    notes,
    auditSummary: auditAnalytics.auditSummary,
  };
}

export function analyzeOrderContext(
  context: PackedOpsContext<PackedOrderData>
): OrderAnalytics {
  const auditLogs = isNormalizedAuditLogs(context.data.audit) ? context.data.audit : undefined;

  if (isNormalizedOrderDetail(context.data.order)) {
    const detailAnalytics = analyzeOrderDetailContext(context.intent, context.data.order, context.notes);
    return auditLogs ? mergeAuditSignals(detailAnalytics, auditLogs) : detailAnalytics;
  }

  if (isNormalizedOrderHistory(context.data.history)) {
    const historyAnalytics = analyzeOrderHistoryContext(context.intent, context.data.history, context.notes);
    return auditLogs ? mergeAuditSignals(historyAnalytics, auditLogs) : historyAnalytics;
  }

  if (auditLogs) {
    const auditAnalytics = analyzeAuditLogsContext(auditLogs);
    return {
      domain: "orders",
      intent: context.intent,
      summary: auditAnalytics.auditSummary.noEvents
        ? "No recent audit activity was returned for this order."
        : "I found related audit activity for this order.",
      patterns: auditAnalytics.patterns,
      nextChecks: auditAnalytics.nextChecks,
      examples: context.entities.orderId ? [String(context.entities.orderId)] : [],
      notes: context.notes,
      auditSummary: auditAnalytics.auditSummary,
    };
  }

  return {
    domain: "orders",
    intent: context.intent,
    summary: "No successful order data was available.",
    patterns: [],
    nextChecks: [],
    examples: [],
    notes: context.notes,
  };
}
