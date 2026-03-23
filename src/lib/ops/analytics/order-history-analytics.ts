import type { NormalizedOrderHistory } from "@/lib/bamboo/orders";

import type { OrderAnalytics, OrderStatusSummary } from "@/lib/ops/analytics/analytics-types";

function countStatusesMatching(statuses: Record<string, number>, pattern: RegExp) {
  return Object.entries(statuses).reduce((total, [status, count]) => {
    return pattern.test(status.toLowerCase()) ? total + count : total;
  }, 0);
}

function addUnique(values: string[], nextValue: string | undefined) {
  if (!nextValue) {
    return;
  }

  if (!values.includes(nextValue)) {
    values.push(nextValue);
  }
}

function buildStatusSummary(context: NormalizedOrderHistory): OrderStatusSummary {
  const totalReturned = context.returnedCount;
  const statusBreakdown = Object.entries(context.statuses)
    .sort((left, right) => right[1] - left[1])
    .map(([status, count]) => ({
      status,
      count,
      share: totalReturned > 0 ? count / totalReturned : undefined,
    }));
  const failureCount = countStatusesMatching(context.statuses, /fail|error/);
  const blockedCount = countStatusesMatching(context.statuses, /block/);
  const pendingCount = countStatusesMatching(context.statuses, /pending|delay/);
  const missingCardsCount = context.orders.filter(
    (order) => order.itemCount && order.itemCount > 0 && order.cardCount === 0
  ).length;

  return {
    totalReturned,
    totalAvailable: context.totalCount,
    dominantStatus: context.dominantStatus,
    dominantStatusShare: context.dominantStatusShare,
    allSameStatus: context.dominantStatusShare === 1 && Boolean(context.dominantStatus),
    hasConcentratedFailures: context.hasConcentratedFailures,
    failureCount,
    blockedCount,
    pendingCount,
    missingCardsCount,
    statusBreakdown,
  };
}

function buildSummary(context: NormalizedOrderHistory, statusSummary: OrderStatusSummary) {
  if (context.orders.length === 0) {
    return "No matching orders were returned.";
  }

  if (statusSummary.allSameStatus && statusSummary.dominantStatus) {
    return `All ${context.returnedCount} checked orders are in ${statusSummary.dominantStatus} status.`;
  }

  if (statusSummary.hasConcentratedFailures) {
    return `Most of the checked orders are in Failed status.`;
  }

  if (statusSummary.dominantStatus) {
    return `Most of the checked orders are in ${statusSummary.dominantStatus} status.`;
  }

  return `I checked ${context.returnedCount} recent orders.`;
}

function buildPatterns(context: NormalizedOrderHistory, statusSummary: OrderStatusSummary) {
  const patterns: string[] = [];

  if (context.hasMixedStatuses) {
    addUnique(patterns, "The sampled orders show a mixed status pattern.");
  }

  if (statusSummary.hasConcentratedFailures) {
    addUnique(patterns, "Failures are concentrated in the current sample.");
  }

  if ((statusSummary.blockedCount ?? 0) > 0) {
    addUnique(patterns, "Some orders also look blocked.");
  }

  if ((statusSummary.pendingCount ?? 0) > 0) {
    addUnique(patterns, "Some orders are still waiting or delayed.");
  }

  if ((statusSummary.missingCardsCount ?? 0) > 0) {
    addUnique(patterns, "Some orders have items but no cards were created.");
  }

  if (patterns.length === 0 && statusSummary.statusBreakdown.length > 1) {
    addUnique(
      patterns,
      `Status breakdown: ${statusSummary.statusBreakdown
        .slice(0, 3)
        .map((item) => `${item.count} in ${item.status} status`)
        .join(", ")}.`
    );
  }

  return patterns;
}

function buildExamples(context: NormalizedOrderHistory) {
  if (context.issueOrderIds.length > 0) {
    return context.issueOrderIds.slice(0, 3);
  }

  return context.orders.slice(0, 3).map((order) => order.orderNumber);
}

function isHealthyDominantStatus(status?: string) {
  const normalized = status?.toLowerCase() ?? "";
  return (
    normalized.includes("success") ||
    normalized.includes("succeed") ||
    normalized.includes("complete") ||
    normalized.includes("done")
  );
}

function buildNextChecks(statusSummary: OrderStatusSummary) {
  const nextChecks: string[] = [];
  const totalReturned = Math.max(1, statusSummary.totalReturned ?? 0);
  const issueCount =
    (statusSummary.failureCount ?? 0) +
    (statusSummary.blockedCount ?? 0) +
    (statusSummary.pendingCount ?? 0) +
    (statusSummary.missingCardsCount ?? 0);
  const issueShare = issueCount / totalReturned;
  const hasMaterialFailures =
    (statusSummary.failureCount ?? 0) > 0 &&
    ((statusSummary.hasConcentratedFailures ?? false) || issueShare >= 0.3);

  if (hasMaterialFailures) {
    addUnique(nextChecks, "payment");
  }

  if (hasMaterialFailures || (statusSummary.missingCardsCount ?? 0) > 0) {
    addUnique(nextChecks, "supplier processing");
  }

  if ((statusSummary.missingCardsCount ?? 0) > 0) {
    addUnique(nextChecks, "card creation");
  }

  if (
    nextChecks.length === 0 &&
    ((statusSummary.blockedCount ?? 0) > 0 || (statusSummary.pendingCount ?? 0) > 0) &&
    issueShare >= 0.3
  ) {
    addUnique(nextChecks, "where the orders are slowing down");
  }

  if (nextChecks.length === 0) {
    if (isHealthyDominantStatus(statusSummary.dominantStatus)) {
      return nextChecks;
    }

    addUnique(nextChecks, "a few recent orders to make sure they are moving normally");
  }

  return nextChecks;
}

export function analyzeOrderHistoryContext(
  intent: string,
  context: NormalizedOrderHistory,
  notes: string[] = []
): OrderAnalytics {
  const statusSummary = buildStatusSummary(context);

  return {
    domain: "orders",
    intent,
    summary: buildSummary(context, statusSummary),
    patterns: buildPatterns(context, statusSummary),
    nextChecks: buildNextChecks(statusSummary),
    examples: buildExamples(context),
    notes,
    statusSummary,
  };
}
