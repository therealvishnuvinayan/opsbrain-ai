import type { NormalizedOrderDetail } from "@/lib/bamboo/orders";

import type { OrderAnalytics, OrderDetailSummary } from "@/lib/ops/analytics/analytics-types";

function addUnique(values: string[], nextValue: string | undefined) {
  if (!nextValue) {
    return;
  }

  if (!values.includes(nextValue)) {
    values.push(nextValue);
  }
}

function isFailureStatus(value: string | undefined) {
  const normalized = value?.toLowerCase() ?? "";
  return normalized.includes("fail") || normalized.includes("block") || normalized.includes("error");
}

function buildDetailSummary(context: NormalizedOrderDetail): OrderDetailSummary {
  return {
    orderId: context.orderId,
    status: context.status,
    billingStatus: context.billingSummary?.status,
    itemCount: context.itemCount,
    cardCount: context.cardCount,
    missingCards: context.missingCards,
    problematicCardStatuses: context.problematicCardStatuses,
    problematicItemStatuses: context.problematicItemStatuses,
  };
}

function buildSummary(context: NormalizedOrderDetail, detailSummary: OrderDetailSummary) {
  if (isFailureStatus(context.status) && detailSummary.billingStatus) {
    return `Order ${context.orderId} is in ${context.status} status while billing looks ${detailSummary.billingStatus}.`;
  }

  return `Order ${context.orderId} is currently ${context.status}.`;
}

function buildPatterns(context: NormalizedOrderDetail, detailSummary: OrderDetailSummary) {
  const patterns: string[] = [];

  if (detailSummary.itemCount !== undefined || detailSummary.cardCount !== undefined) {
    addUnique(
      patterns,
      `It has ${detailSummary.itemCount ?? 0} items and ${detailSummary.cardCount ?? 0} cards.`
    );
  }

  if (context.missingCards) {
    addUnique(patterns, "The order has items but no cards were created.");
  }

  if (context.problematicCardStatuses.length > 0) {
    addUnique(
      patterns,
      `Card issues are visible: ${context.problematicCardStatuses.slice(0, 3).join(", ")}.`
    );
  }

  if (context.problematicItemStatuses.length > 0) {
    addUnique(
      patterns,
      `Item issues are visible: ${context.problematicItemStatuses.slice(0, 3).join(", ")}.`
    );
  }

  if (isFailureStatus(context.status) && detailSummary.billingStatus) {
    addUnique(
      patterns,
      `Billing is ${detailSummary.billingStatus} while the order is ${context.status}.`
    );
  }

  if (patterns.length === 0 && context.notableIssues[0]) {
    addUnique(patterns, context.notableIssues[0]);
  }

  return patterns;
}

function buildNextChecks(context: NormalizedOrderDetail, detailSummary: OrderDetailSummary) {
  const nextChecks: string[] = [];

  if (isFailureStatus(context.status) || detailSummary.billingStatus) {
    addUnique(nextChecks, "payment");
  }

  if (context.missingCards || context.problematicCardStatuses.length > 0) {
    addUnique(nextChecks, "card creation");
  }

  if (
    context.missingCards ||
    context.problematicCardStatuses.length > 0 ||
    context.problematicItemStatuses.length > 0 ||
    isFailureStatus(context.status)
  ) {
    addUnique(nextChecks, "supplier processing");
  }

  if (context.problematicCardStatuses.length > 0) {
    addUnique(nextChecks, "the card status");
  }

  if (context.problematicItemStatuses.length > 0) {
    addUnique(nextChecks, "the order items");
  }

  if (nextChecks.length === 0) {
    addUnique(nextChecks, "the latest updates on the order");
  }

  return nextChecks;
}

export function analyzeOrderDetailContext(
  intent: string,
  context: NormalizedOrderDetail,
  notes: string[] = []
): OrderAnalytics {
  const detailSummary = buildDetailSummary(context);

  return {
    domain: "orders",
    intent,
    summary: buildSummary(context, detailSummary),
    patterns: buildPatterns(context, detailSummary),
    nextChecks: buildNextChecks(context, detailSummary),
    examples: [context.orderId],
    notes,
    detailSummary,
  };
}
