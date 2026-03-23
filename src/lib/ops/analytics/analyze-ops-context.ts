import { analyzeOrderContext } from "@/lib/ops/analytics/analyze-order-context";
import type { OpsAnalytics } from "@/lib/ops/analytics/analytics-types";
import {
  analyzeReconciliationContext,
  hasReconciliationPackedData,
} from "@/lib/ops/analytics/reconciliation-analytics";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";

function addUnique(values: string[], value: string | undefined) {
  if (!value || values.includes(value)) {
    return;
  }

  values.push(value);
}

function mergeAnalytics(base: OpsAnalytics, next: OpsAnalytics): OpsAnalytics {
  const patterns = [...base.patterns];
  const nextChecks = [...base.nextChecks];
  const examples = [...base.examples];
  const notes = [...base.notes];

  for (const pattern of next.patterns) {
    addUnique(patterns, pattern);
  }

  for (const nextCheck of next.nextChecks) {
    addUnique(nextChecks, nextCheck);
  }

  for (const example of next.examples) {
    addUnique(examples, example);
  }

  for (const note of next.notes) {
    addUnique(notes, note);
  }

  return {
    ...base,
    domain: base.domain,
    summary:
      next.reconciliationSummary &&
      (next.reconciliationSummary.appearsIncomplete ||
        next.reconciliationSummary.hasInvalidProductBrandCards ||
        next.reconciliationSummary.hasExpiredCards)
        ? `${base.summary} I also found related reconciliation issues.`
        : `${base.summary} I also checked related reconciliation data.`,
    patterns,
    nextChecks,
    examples,
    notes,
    reconciliationSummary: next.reconciliationSummary,
  };
}

export function analyzeOpsContext(
  context: PackedOpsContext<PackedOrderData>
): OpsAnalytics {
  const hasOrderOrAuditData = Boolean(
    context.data.history ||
      context.data.order ||
      context.data.billing ||
      context.data.cards ||
      context.data.items ||
      context.data.audit
  );
  const hasReconciliationData = hasReconciliationPackedData(context.data);

  if (hasOrderOrAuditData) {
    const orderAnalytics = analyzeOrderContext(context);

    if (!hasReconciliationData) {
      return orderAnalytics;
    }

    return mergeAnalytics(orderAnalytics, analyzeReconciliationContext(context));
  }

  if (hasReconciliationData) {
    return analyzeReconciliationContext(context);
  }

  return {
    domain: context.domain,
    intent: context.intent,
    summary: "No successful Bamboo ops data was available.",
    patterns: [],
    nextChecks: [],
    examples: [],
    notes: context.notes,
  };
}
