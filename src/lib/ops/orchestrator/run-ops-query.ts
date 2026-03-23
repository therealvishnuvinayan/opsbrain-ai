import "server-only";

import {
  buildOpsFallbackAnswer,
  buildOpsPrompt,
} from "@/lib/ai/ops-prompt";
import { analyzeOpsContext } from "@/lib/ops/analytics/analyze-ops-context";
import type { OpsAnalytics } from "@/lib/ops/analytics/analytics-types";
import { packExecutionContext } from "@/lib/ops/context/pack-execution-context";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";
import { executePlan, type ExecutePlanOptions } from "@/lib/ops/executor/execute-plan";
import type { ExecutionRunResult } from "@/lib/ops/executor/execution-types";
import { buildOpsQueryTrace } from "@/lib/ops/observability/build-trace";
import type { OpsQueryTrace } from "@/lib/ops/observability/trace-types";
import { buildOpsPlan } from "@/lib/ops/planner/build-ops-plan";
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
      trace: OpsQueryTrace;
    }
  | {
      type: "missing_order_id";
      answer: string;
      sources: RunOpsQuerySource[];
      trace: OpsQueryTrace;
    }
  | {
      type: "missing_history_id";
      answer: string;
      sources: RunOpsQuerySource[];
      trace: OpsQueryTrace;
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
      trace: OpsQueryTrace;
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
    (
      plan.domain === "orders" ||
      plan.domain === "reconciliation" ||
      plan.domain === "aws" ||
      plan.domain === "knowledge"
    ) &&
    (plan.intent === "order_history" ||
      plan.intent === "order_detail" ||
      plan.intent === "order_issue_investigation" ||
      plan.intent === "order_audit_activity" ||
      plan.intent.startsWith("reconciliation_") ||
      plan.intent.startsWith("aws_") ||
      plan.intent.startsWith("knowledge_"))
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
      context.data.reconciliationSummary ||
      context.data.awsLogs ||
      context.data.serviceHealth ||
      context.data.infraSummary ||
      context.data.knowledgeResults ||
      context.data.docGuidance ||
      context.data.runbookMatches
  );
}

export async function runOpsQuery(
  question: string,
  options: RunOpsQueryOptions = {}
): Promise<RunOpsQueryResult> {
  const queryId = crypto.randomUUID();
  const totalStartMs = performance.now();
  const planningStartMs = performance.now();
  const plan = buildOpsPlan(question);
  const planningMs = Math.round(performance.now() - planningStartMs);

  if (plan.intent === "unsupported") {
    const totalMs = Math.round(performance.now() - totalStartMs);
    return {
      type: "unsupported",
      answer:
        "I couldn't match that request to a supported ops check yet. Try including the order id, reconciliation history id, service name, or the specific data you want checked.",
      sources: [],
      trace: buildOpsQueryTrace({
        queryId,
        question,
        resultType: "unsupported",
        plan,
        totalMs,
        timings: {
          planningMs,
          executionMs: 0,
          packingMs: 0,
          analyticsMs: 0,
        },
        noMeaningfulData: true,
      }),
    };
  }

  if (isMissingOrderIdPlan(plan)) {
    const totalMs = Math.round(performance.now() - totalStartMs);
    return {
      type: "missing_order_id",
      answer: "Please provide the order id.",
      sources: [],
      trace: buildOpsQueryTrace({
        queryId,
        question,
        resultType: "missing_order_id",
        plan,
        totalMs,
        timings: {
          planningMs,
          executionMs: 0,
          packingMs: 0,
          analyticsMs: 0,
        },
        noMeaningfulData: true,
      }),
    };
  }

  if (isMissingHistoryIdPlan(plan)) {
    const totalMs = Math.round(performance.now() - totalStartMs);
    return {
      type: "missing_history_id",
      answer: "Please provide the reconciliation history id.",
      sources: [],
      trace: buildOpsQueryTrace({
        queryId,
        question,
        resultType: "missing_history_id",
        plan,
        totalMs,
        timings: {
          planningMs,
          executionMs: 0,
          packingMs: 0,
          analyticsMs: 0,
        },
        noMeaningfulData: true,
      }),
    };
  }

  if (!supportsOrchestratedOpsPlan(plan)) {
    const totalMs = Math.round(performance.now() - totalStartMs);
    return {
      type: "unsupported",
      answer:
        "I couldn't match that request to a supported ops check yet. Try including the order id, reconciliation history id, service name, or the specific data you want checked.",
      sources: [],
      trace: buildOpsQueryTrace({
        queryId,
        question,
        resultType: "unsupported",
        plan,
        totalMs,
        timings: {
          planningMs,
          executionMs: 0,
          packingMs: 0,
          analyticsMs: 0,
        },
        noMeaningfulData: true,
      }),
    };
  }

  console.info("Ops query selected plan", {
    domain: plan.domain,
    intent: plan.intent,
    tools: plan.tools.map((tool) => tool.toolName),
  });

  const executionStartMs = performance.now();
  const execution = await executePlan(plan, options.executePlanOptions);
  const executionMs = Math.round(performance.now() - executionStartMs);
  const packingStartMs = performance.now();
  const packedContext = packExecutionContext(plan, execution) as PackedOpsContext<PackedOrderData>;
  const packingMs = Math.round(performance.now() - packingStartMs);
  const analyticsStartMs = performance.now();
  const analytics = analyzeOpsContext(packedContext);
  const analyticsMs = Math.round(performance.now() - analyticsStartMs);
  const hasMeaningfulData = hasMeaningfulPackedOpsData(packedContext);
  const successCount = execution.results.filter((result) => result.status === "success").length;
  const partialSuccessCount = execution.results.filter(
    (result) => result.status === "partial_success"
  ).length;
  const errorCount = execution.results.filter((result) => result.status === "error").length;

  console.info("Ops query execution summary", {
    domain: plan.domain,
    intent: plan.intent,
    totalTools: execution.results.length,
    successCount,
    partialSuccessCount,
    errorCount,
    toolResults: execution.results.map((result) => ({
      toolName: result.toolName,
      status: result.status,
      errorCode: result.error?.code,
      durationMs: result.durationMs,
    })),
  });

  const prompt = buildOpsPrompt(question, packedContext, analytics);
  const fallbackAnswer = hasMeaningfulData
    ? buildOpsFallbackAnswer(packedContext, analytics)
    : "I couldn't retrieve Bamboo operations data right now. Please try again in a moment.";
  const totalMs = Math.round(performance.now() - totalStartMs);
  const trace = buildOpsQueryTrace({
    queryId,
    question,
    resultType: "resolved",
    plan,
    execution,
    packedContext,
    analytics,
    totalMs,
    timings: {
      planningMs,
      executionMs,
      packingMs,
      analyticsMs,
    },
    usedFallback: !hasMeaningfulData,
    noMeaningfulData: !hasMeaningfulData,
  });

  return {
    type: "resolved",
    prompt,
    fallbackAnswer,
    useFallbackOnly: !hasMeaningfulData,
    sources: packedContext.sources,
    plan,
    execution,
    packedContext,
    analytics,
    trace,
  };
}
