import "server-only";

import {
  buildPackedOrderFallbackAnswer,
  buildPackedOrderPrompt,
} from "@/lib/ai/order-prompt";
import { resolveAiQuery } from "@/lib/ai/query";
import { analyzeOrderContext } from "@/lib/ops/analytics/analyze-order-context";
import type { OrderAnalytics } from "@/lib/ops/analytics/analytics-types";
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
      analytics?: OrderAnalytics;
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

function supportsOrchestratedOrdersPlan(plan: ExecutionPlan) {
  return (
    plan.domain === "orders" &&
    (plan.intent === "order_history" ||
      plan.intent === "order_detail" ||
      plan.intent === "order_issue_investigation" ||
      plan.intent === "order_audit_activity")
  );
}

function hasMeaningfulPackedOrderData(context: PackedOpsContext<PackedOrderData>) {
  return Boolean(
    context.data.history ||
      context.data.order ||
      context.data.billing ||
      context.data.cards ||
      context.data.items ||
      context.data.audit
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

  if (!supportsOrchestratedOrdersPlan(plan)) {
    return resolveLegacyQuery(question);
  }

  const execution = await executePlan(plan, options.executePlanOptions);
  const packedContext = packExecutionContext(plan, execution) as PackedOpsContext<PackedOrderData>;
  const analytics = analyzeOrderContext(packedContext);
  const hasMeaningfulData = hasMeaningfulPackedOrderData(packedContext);

  return {
    type: "resolved",
    prompt: buildPackedOrderPrompt(question, packedContext, analytics),
    fallbackAnswer: hasMeaningfulData
      ? buildPackedOrderFallbackAnswer(packedContext, analytics)
      : "I couldn't retrieve Bamboo order data right now. Please try again in a moment.",
    useFallbackOnly: !hasMeaningfulData,
    sources: packedContext.sources,
    plan,
    execution,
    packedContext,
    analytics,
  };
}
