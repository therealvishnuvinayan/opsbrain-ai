import type { PlannerCandidate, PlannerQuestionContext } from "@/lib/ops/planner/plan-types";
import {
  buildToolCall,
  createCandidate,
  createExecutionPlan,
  mergeSelectedDomains,
} from "@/lib/ops/planner/planner-utils";
import { OPS_TOOL_NAMES } from "@/lib/ops/tools/tool-types";

export function buildAwsRuleCandidates(context: PlannerQuestionContext): PlannerCandidate[] {
  if (!context.signals.asksForAws) {
    return [];
  }

  const tools = [];

  if (context.orderId) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getOrderDetails,
        "Fetch the order detail record so system findings can be compared with the order state.",
        { orderId: context.orderId }
      )
    );
  }

  if (context.historyId) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getReconciliationStatus,
        "Fetch the reconciliation status so system findings can be compared with reconciliation activity.",
        { historyId: context.historyId }
      )
    );
  }

  const awsParams = {
    serviceName: context.serviceName,
    minutes: context.minutes,
    limit: context.signals.asksForExplicitLogs ? 25 : 15,
    queryText:
      context.normalizedQuestion.includes("payment") && !context.serviceName
        ? "payment"
        : context.normalizedQuestion.includes("reconcil")
          ? "reconciliation"
          : undefined,
  };

  tools.push(
    buildToolCall(
      OPS_TOOL_NAMES.getServiceErrorSummary,
      "Fetch a recent CloudWatch-based service error summary for the requested time window.",
      awsParams
    )
  );

  if (context.signals.asksForExplicitLogs || context.normalizedQuestion.includes("cloudwatch")) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getCloudWatchLogs,
        "Fetch recent CloudWatch log entries to inspect the latest infrastructure-side signals.",
        awsParams
      )
    );
  }

  return [
    createCandidate({
      ruleName: "aws",
      entityStrength:
        (context.orderId ? 2 : 0) + (context.historyId ? 2 : 0) + (context.serviceName ? 2 : 1),
      plan: createExecutionPlan({
        intent: context.signals.asksForExplicitLogs ? "aws_logs" : "aws_service_errors",
        domain: context.orderId ? "orders" : context.historyId ? "reconciliation" : "aws",
        entities: {
          orderId: context.orderId ?? null,
          historyId: context.historyId ?? null,
          serviceName: context.serviceName ?? null,
          minutes: context.minutes,
          includeAws: true,
        },
        tools,
        confidence:
          context.serviceName || context.signals.asksForServiceSummary || context.signals.asksForExplicitLogs
            ? 0.94
            : 0.9,
        matchedSignals: [
          "aws",
          ...(context.orderId ? ["order_id"] : []),
          ...(context.historyId ? ["history_id"] : []),
          ...(context.serviceName ? ["service_name"] : []),
          ...(context.signals.asksForExplicitLogs ? ["cloudwatch_logs"] : ["service_errors"]),
        ],
        selectedDomains: mergeSelectedDomains(
          context.orderId ? ["orders"] : undefined,
          context.historyId ? ["reconciliation"] : undefined,
          ["aws"]
        ),
        notes: [
          "Deterministic AWS rule matched system-health signals and selected only the AWS checks justified by the question.",
        ],
      }),
    }),
  ];
}
