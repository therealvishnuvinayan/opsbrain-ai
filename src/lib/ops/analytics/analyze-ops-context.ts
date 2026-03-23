import { analyzeOrderContext } from "@/lib/ops/analytics/analyze-order-context";
import type { OpsAnalytics } from "@/lib/ops/analytics/analytics-types";
import {
  analyzeAwsContext,
  hasAwsPackedData,
} from "@/lib/ops/analytics/aws-analytics";
import {
  analyzeKnowledgeContext,
  hasKnowledgePackedData,
} from "@/lib/ops/analytics/knowledge-analytics";
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
      next.knowledgeSummary && next.knowledgeSummary.hasRunbookMatch
        ? `${base.summary} I also found matching internal guidance.`
        : next.awsSummary && next.awsSummary.hasRecentErrors
        ? `${base.summary} I also found recent system errors.`
        : next.reconciliationSummary &&
            (next.reconciliationSummary.appearsIncomplete ||
              next.reconciliationSummary.hasInvalidProductBrandCards ||
              next.reconciliationSummary.hasExpiredCards)
          ? `${base.summary} I also found related reconciliation issues.`
          : next.awsSummary && next.awsSummary.noLogGroups
            ? `${base.summary} I also checked AWS logs, but no log groups were available.`
            : `${base.summary} I also checked related operational data.`,
    patterns,
    nextChecks,
    examples,
    notes,
    reconciliationSummary: next.reconciliationSummary,
    awsSummary: next.awsSummary,
    knowledgeSummary: next.knowledgeSummary,
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
  const hasAwsData = hasAwsPackedData(context.data);
  const hasKnowledgeData = hasKnowledgePackedData(context.data);

  if (hasOrderOrAuditData) {
    const orderAnalytics = analyzeOrderContext(context);
    let mergedAnalytics = orderAnalytics;

    if (hasReconciliationData) {
      mergedAnalytics = mergeAnalytics(mergedAnalytics, analyzeReconciliationContext(context));
    }

    if (hasAwsData) {
      mergedAnalytics = mergeAnalytics(mergedAnalytics, analyzeAwsContext(context));
    }

    if (hasKnowledgeData) {
      mergedAnalytics = mergeAnalytics(mergedAnalytics, analyzeKnowledgeContext(context));
    }

    return mergedAnalytics;
  }

  if (hasReconciliationData) {
    const reconciliationAnalytics = analyzeReconciliationContext(context);

    let mergedAnalytics = reconciliationAnalytics;

    if (hasAwsData) {
      mergedAnalytics = mergeAnalytics(mergedAnalytics, analyzeAwsContext(context));
    }

    if (hasKnowledgeData) {
      mergedAnalytics = mergeAnalytics(mergedAnalytics, analyzeKnowledgeContext(context));
    }

    return mergedAnalytics;
  }

  if (hasAwsData) {
    const awsAnalytics = analyzeAwsContext(context);

    if (!hasKnowledgeData) {
      return awsAnalytics;
    }

    return mergeAnalytics(awsAnalytics, analyzeKnowledgeContext(context));
  }

  if (hasKnowledgeData) {
    return analyzeKnowledgeContext(context);
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
