import "server-only";

import {
  buildPackedOrderFallbackAnswer,
  buildPackedOrderPrompt,
} from "@/lib/ai/order-prompt";
import { resolveAiQuery } from "@/lib/ai/query";
import { analyzeOpsContext } from "@/lib/ops/analytics/analyze-ops-context";
import type { OpsAnalytics } from "@/lib/ops/analytics/analytics-types";
import { packExecutionContext } from "@/lib/ops/context/pack-execution-context";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";
import { executePlan, type ExecutePlanOptions } from "@/lib/ops/executor/execute-plan";
import type { ExecutionRunResult } from "@/lib/ops/executor/execution-types";
import { buildOrderPlan } from "@/lib/ops/planner/build-order-plan";
import type { ExecutionPlan } from "@/lib/ops/planner/plan-types";

type RunOpsQuerySource = {
  type: string;
  endpoint?: string;
  label?: string;
};

export type RunOpsQueryResult =
  | {
      type: "unsupported";
      answer: string;
      sources: RunOpsQuerySource[];
    }
  | {
      type: "missing_order_id";
      answer: string;
      sources: RunOpsQuerySource[];
    }
  | {
      type: "missing_history_id";
      answer: string;
      sources: RunOpsQuerySource[];
    }
  | {
      type: "resolved";
      prompt: {
        system: string;
        user: string;
      };
      fallbackAnswer: string;
      useFallbackOnly?: boolean;
      sources: RunOpsQuerySource[];
      plan?: ExecutionPlan;
      execution?: ExecutionRunResult;
      packedContext?: PackedOpsContext<PackedOrderData>;
      analytics?: OpsAnalytics;
    };

interface RunOpsQueryOptions {
  executePlanOptions?: ExecutePlanOptions;
}

function isMissingOrderIdPlan(plan: ExecutionPlan) {
  return (
    plan.tools.length === 0 &&
    (
      plan.intent === "order_detail" ||
      plan.intent === "order_issue_investigation" ||
      plan.intent === "order_audit_activity"
    )
  );
}

function isMissingHistoryIdPlan(plan: ExecutionPlan) {
  return plan.tools.length === 0 && plan.intent.startsWith("reconciliation_");
}

function supportsOrchestratedOpsPlan(plan: ExecutionPlan) {
  return (
    (plan.domain === "orders" || plan.domain === "reconciliation") &&
    (plan.intent === "order_history" ||
      plan.intent === "order_detail" ||
      plan.intent === "order_issue_investigation" ||
      plan.intent === "order_audit_activity" ||
      plan.intent.startsWith("reconciliation_"))
  );
}

function hasMeaningfulPackedOpsData(context: PackedOpsContext<PackedOrderData>) {
  return Boolean(
    context.data.history ||
      context.data.order ||
      context.data.billing ||
      context.data.cards ||
      context.data.items ||
      context.data.audit ||
      context.data.reconciliationStatus ||
      context.data.bufferedRecords ||
      context.data.reconciledRecords ||
      context.data.invalidProductBrandCards ||
      context.data.expiredCards ||
      context.data.reconciliationSummary
  );
}

async function resolveLegacyQuery(question: string): Promise<RunOpsQueryResult> {
  const legacyResult = await resolveAiQuery(question);

  if (legacyResult.type === "unsupported" || legacyResult.type === "missing_order_id") {
    return legacyResult;
  }

  return {
    type: "resolved",
    prompt: legacyResult.prompt,
    fallbackAnswer: legacyResult.fallbackAnswer,
    sources: legacyResult.sources,
  };
}

export async function runOpsQuery(
  question: string,
  options: RunOpsQueryOptions = {}
): Promise<RunOpsQueryResult> {
  const plan = buildOrderPlan(question);

  if (plan.intent === "unsupported") {
    return resolveLegacyQuery(question);
  }

  if (isMissingOrderIdPlan(plan)) {
    return {
      type: "missing_order_id",
      answer:
        "Please include the order id. This first version supports order history and order detail queries by order id.",
      sources: [],
    };
  }

  if (isMissingHistoryIdPlan(plan)) {
    return {
      type: "missing_history_id",
      answer:
        "Please include the reconciliation history id. This first version supports reconciliation checks by history id.",
      sources: [],
    };
  }

  if (!supportsOrchestratedOpsPlan(plan)) {
    return resolveLegacyQuery(question);
  }

  const execution = await executePlan(plan, options.executePlanOptions);
  const packedContext = packExecutionContext(plan, execution) as PackedOpsContext<PackedOrderData>;
  const analytics = analyzeOpsContext(packedContext);
  const hasMeaningfulData = hasMeaningfulPackedOpsData(packedContext);

  return {
    type: "resolved",
    prompt: buildPackedOrderPrompt(question, packedContext, analytics),
    fallbackAnswer: hasMeaningfulData
      ? buildPackedOrderFallbackAnswer(packedContext, analytics)
      : plan.domain === "reconciliation"
        ? "I couldn't retrieve Bamboo reconciliation data right now. Please try again in a moment."
        : "I couldn't retrieve Bamboo order data right now. Please try again in a moment.",
    useFallbackOnly: !hasMeaningfulData,
    sources: packedContext.sources,
    plan,
    execution,
    packedContext,
    analytics,
  };
}
