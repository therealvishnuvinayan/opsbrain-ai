import type {
  NormalizedOrderDetail,
  NormalizedOrderHistory,
} from "@/lib/bamboo/orders";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";

import type { OrderAnalytics } from "@/lib/ops/analytics/analytics-types";
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

export function analyzeOrderContext(
  context: PackedOpsContext<PackedOrderData>
): OrderAnalytics {
  if (isNormalizedOrderDetail(context.data.order)) {
    return analyzeOrderDetailContext(context.intent, context.data.order, context.notes);
  }

  if (isNormalizedOrderHistory(context.data.history)) {
    return analyzeOrderHistoryContext(context.intent, context.data.history, context.notes);
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
