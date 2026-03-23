import type { PlannerCandidate, PlannerQuestionContext } from "@/lib/ops/planner/plan-types";
import {
  buildToolCall,
  createCandidate,
  createExecutionPlan,
  mergeSelectedDomains,
} from "@/lib/ops/planner/planner-utils";
import { OPS_TOOL_NAMES } from "@/lib/ops/tools/tool-types";

function buildMissingHistoryCandidate(context: PlannerQuestionContext) {
  return createCandidate({
    ruleName: "reconciliation_missing_history_id",
    entityStrength: context.orderId ? 1 : 0,
    unnecessaryToolPenalty: 0.02,
    plan: createExecutionPlan({
      intent: "reconciliation_investigation",
      domain: "reconciliation",
      entities: {
        orderId: context.orderId ?? null,
      },
      tools: [],
      confidence: 0.28,
      matchedSignals: [
        ...(context.orderId ? ["order_id"] : []),
        "reconciliation",
      ],
      selectedDomains: ["reconciliation"],
      notes: ["Reconciliation query matched, but no reconciliation history id could be extracted."],
    }),
  });
}

export function buildReconciliationRuleCandidates(
  context: PlannerQuestionContext
): PlannerCandidate[] {
  if (!context.signals.asksForReconciliation) {
    return [];
  }

  if (!context.historyId) {
    return [buildMissingHistoryCandidate(context)];
  }

  let intent = "reconciliation_investigation";

  if (
    context.signals.asksForBufferedRecords &&
    !context.signals.asksForReconciledRecords &&
    !context.signals.asksWhyReconciliationFailing
  ) {
    intent = "reconciliation_buffered_records";
  } else if (
    context.signals.asksForReconciledRecords &&
    !context.signals.asksForBufferedRecords &&
    !context.signals.asksWhyReconciliationFailing
  ) {
    intent = "reconciliation_reconciled_records";
  } else if (
    context.signals.asksForReconciliationStatus &&
    !context.signals.asksForBufferedRecords &&
    !context.signals.asksForReconciledRecords &&
    !context.signals.asksForInvalidProductBrandCards &&
    !context.signals.asksForExpiredCards
  ) {
    intent = "reconciliation_status";
  }

  const tools = [];

  if (context.orderId) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getOrderDetails,
        "Fetch the linked order detail record so reconciliation findings can be interpreted against the order state.",
        { orderId: context.orderId }
      )
    );

    if (
      context.signals.mentionsPayment ||
      context.signals.mentionsBilling ||
      context.signals.mentionsFailure
    ) {
      tools.push(
        buildToolCall(
          OPS_TOOL_NAMES.getBillingOrder,
          "Fetch billing data to compare payment state with reconciliation findings.",
          { orderId: context.orderId }
        )
      );
    }
  }

  if (
    context.signals.asksForReconciliationStatus ||
    context.signals.asksWhyReconciliationFailing ||
    context.signals.asksForBufferedRecords ||
    context.signals.asksForReconciledRecords
  ) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getReconciliationStatus,
        "Fetch the overall reconciliation status for the requested history id.",
        { historyId: context.historyId }
      )
    );
  }

  if (context.signals.asksForBufferedRecords || context.signals.asksWhyReconciliationFailing) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getBufferedRecords,
        "Fetch buffered reconciliation records to see whether this history is still waiting on unresolved items.",
        { historyId: context.historyId }
      )
    );
  }

  if (context.signals.asksForReconciledRecords || context.signals.asksWhyReconciliationFailing) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getReconciledRecords,
        "Fetch reconciled records to compare completed activity against unresolved reconciliation items.",
        { historyId: context.historyId }
      )
    );
  }

  if (
    context.signals.asksForInvalidProductBrandCards ||
    context.signals.asksWhyReconciliationFailing ||
    intent === "reconciliation_status"
  ) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getInvalidProductBrandCards,
        "Fetch invalid product-brand card issues related to this reconciliation history.",
        { historyId: context.historyId }
      )
    );
  }

  if (
    context.signals.asksForExpiredCards ||
    context.signals.asksWhyReconciliationFailing ||
    intent === "reconciliation_status"
  ) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getExpiredCards,
        "Fetch expired card issues related to this reconciliation history.",
        { historyId: context.historyId }
      )
    );
  }

  if (
    context.signals.asksForSupplierSummary ||
    context.signals.asksWhyReconciliationFailing ||
    intent === "reconciliation_status"
  ) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getSystemCardsSummaryReconcileSupplier,
        "Fetch supplier-level reconciliation summary signals for this history.",
        { historyId: context.historyId }
      )
    );
  }

  if (context.orderId && context.signals.asksForAuditActivity) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getAuditLogs,
        "Fetch audit activity so reconciliation findings can be compared with order activity.",
        {
          OrderId: context.orderId,
          EntityId: context.orderId,
          EntityType: "order",
          SearchText: context.orderId,
          PageSize: 20,
          PageIndex: 0,
        }
      )
    );
  }

  const selectedPlanDomains = mergeSelectedDomains(
    context.orderId ? ["orders"] : ["reconciliation"],
    ["reconciliation"],
    tools.some((tool) => tool.toolName === OPS_TOOL_NAMES.getBillingOrder) ? ["billing"] : undefined,
    tools.some((tool) => tool.toolName === OPS_TOOL_NAMES.getAuditLogs) ? ["audit"] : undefined
  );

  return [
    createCandidate({
      ruleName: "reconciliation",
      entityStrength: context.orderId ? 5 : 4,
      plan: createExecutionPlan({
        intent,
        domain: context.orderId ? "orders" : "reconciliation",
        entities: {
          historyId: context.historyId,
          orderId: context.orderId ?? null,
          includeAudit: context.orderId ? context.signals.asksForAuditActivity : false,
          asksForBufferedRecords: context.signals.asksForBufferedRecords,
          asksForReconciledRecords: context.signals.asksForReconciledRecords,
          asksForInvalidProductBrandCards: context.signals.asksForInvalidProductBrandCards,
          asksForExpiredCards: context.signals.asksForExpiredCards,
        },
        tools,
        confidence: context.signals.asksWhyReconciliationFailing ? 0.93 : 0.9,
        matchedSignals: [
          "reconciliation",
          "history_id",
          ...(context.orderId ? ["order_id"] : []),
          ...(context.signals.asksForBufferedRecords ? ["buffered_records"] : []),
          ...(context.signals.asksForReconciledRecords ? ["reconciled_records"] : []),
          ...(context.signals.asksForInvalidProductBrandCards ? ["invalid_cards"] : []),
          ...(context.signals.asksForExpiredCards ? ["expired_cards"] : []),
          ...(context.signals.asksForAuditActivity ? ["audit"] : []),
        ],
        selectedDomains: selectedPlanDomains,
        notes: [
          "Deterministic reconciliation rule matched the history id and selected only the reconciliation tools justified by the question.",
        ],
      }),
    }),
  ];
}
