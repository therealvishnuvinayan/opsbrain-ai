import type { OrderHistoryFilters } from "@/lib/bamboo/orders";
import type { PlannerCandidate, PlannerQuestionContext } from "@/lib/ops/planner/plan-types";
import type { OpsDomain } from "@/lib/ops/types";
import { applyDateWindow } from "@/lib/ops/planner/planner-context";
import {
  buildToolCall,
  createCandidate,
  createExecutionPlan,
  mergeSelectedDomains,
} from "@/lib/ops/planner/planner-utils";
import { OPS_TOOL_NAMES } from "@/lib/ops/tools/tool-types";

function getCrossDomainPenalty(
  context: PlannerQuestionContext,
  supported: {
    supportsAudit?: boolean;
    supportsAws?: boolean;
    supportsReconciliation?: boolean;
  }
) {
  let penalty = 0;

  if (context.signals.asksForAuditActivity && !supported.supportsAudit) {
    penalty += 0.05;
  }

  if (context.signals.asksForAws && !supported.supportsAws) {
    penalty += 0.08;
  }

  if (context.signals.asksForReconciliation && !supported.supportsReconciliation) {
    penalty += 0.08;
  }

  return penalty;
}

function buildHistoryFilters(context: PlannerQuestionContext) {
  const filters: OrderHistoryFilters = applyDateWindow(context.question, {
    PageSize: context.normalizedQuestion.includes("status of recent orders") ? 10 : 20,
    PageIndex: 0,
  });

  if (context.normalizedQuestion.includes("failed")) {
    filters.Status = "failed";
  } else if (context.normalizedQuestion.includes("blocked")) {
    filters.Status = "blocked";
  } else if (context.normalizedQuestion.includes("pending")) {
    filters.Status = "pending";
  }

  return filters;
}

function buildHistoryCandidate(context: PlannerQuestionContext) {
  const filters = buildHistoryFilters(context);

  return createCandidate({
    ruleName: "order_history",
    entityStrength: filters.Status ? 2 : 1,
    unnecessaryToolPenalty: getCrossDomainPenalty(context, {}),
    plan: createExecutionPlan({
      intent: "order_history",
      domain: "orders",
      entities: {
        orderId: null,
        status: filters.Status ?? null,
        dateFrom: filters.DateFrom ?? null,
        dateTo: filters.DateTo ?? null,
        useClientHistory: context.signals.useClientHistory,
      },
      tools: [
        buildToolCall(
          context.signals.useClientHistory
            ? OPS_TOOL_NAMES.getClientOrderHistory
            : OPS_TOOL_NAMES.getOrderHistory,
          "Fetch recent order history to inspect the requested order set and current statuses.",
          { ...filters }
        ),
      ],
      confidence: 0.88,
      matchedSignals: [
        ...(filters.Status ? ["failed"] : []),
        ...(filters.DateFrom || filters.DateTo ? ["date_window"] : []),
        "order_history",
      ],
      selectedDomains: ["orders"],
      notes: ["Deterministic order-history rule matched the question."],
    }),
  });
}

function buildDetailCandidate(context: PlannerQuestionContext) {
  if (!context.orderId) {
    return createCandidate({
      ruleName: "order_detail_missing_order_id",
      entityStrength: 0,
      plan: createExecutionPlan({
        intent: "order_detail",
        domain: "orders",
        entities: {},
        tools: [],
        confidence: 0.25,
        matchedSignals: [...context.matchedSignals, "order_detail"],
        selectedDomains: ["orders"],
        notes: ["Order detail query matched, but no order id could be extracted."],
      }),
    });
  }

  const tools = [
    buildToolCall(
      OPS_TOOL_NAMES.getOrderDetails,
      "Fetch the core order detail record for the requested order id.",
      { orderId: context.orderId }
    ),
  ];

  if (context.signals.mentionsCards) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getOrderCards,
        "Fetch card-level details because the question explicitly asks about cards.",
        { orderId: context.orderId }
      )
    );
  }

  if (context.signals.mentionsItems) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getOrderItemsInfo,
        "Fetch item-level details because the question explicitly asks about order items.",
        { orderId: context.orderId }
      )
    );
  }

  return createCandidate({
    ruleName: "order_detail",
    entityStrength: 3,
    unnecessaryToolPenalty: getCrossDomainPenalty(context, {}),
    plan: createExecutionPlan({
      intent: "order_detail",
      domain: "orders",
      entities: {
        orderId: context.orderId,
        includeCards: context.signals.mentionsCards,
        includeItems: context.signals.mentionsItems,
      },
      tools,
      confidence: 0.93,
      matchedSignals: [
        "order_id",
        "order_detail",
        ...(context.signals.mentionsCards ? ["cards"] : []),
        ...(context.signals.mentionsItems ? ["items"] : []),
      ],
      selectedDomains: ["orders"],
      notes: ["Deterministic order-detail rule matched the question."],
    }),
  });
}

function buildIssueCandidate(context: PlannerQuestionContext) {
  if (!context.orderId) {
    return createCandidate({
      ruleName: "order_issue_missing_order_id",
      entityStrength: 0,
      plan: createExecutionPlan({
        intent: "order_issue_investigation",
        domain: "orders",
        entities: {},
        tools: [],
        confidence: 0.3,
        matchedSignals: [...context.matchedSignals, "issue_investigation"],
        selectedDomains: ["orders"],
        notes: ["Issue investigation matched, but no order id could be extracted."],
      }),
    });
  }

  const tools = [
    buildToolCall(
      OPS_TOOL_NAMES.getOrderDetails,
      "Fetch the order detail record to inspect status, items, cards, and notable issues.",
      { orderId: context.orderId }
    ),
    buildToolCall(
      OPS_TOOL_NAMES.getBillingOrder,
      "Fetch billing data to compare payment state against the operational order state.",
      { orderId: context.orderId }
    ),
  ];

  if (context.signals.mentionsCards) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getOrderCards,
        "Fetch card details because the investigation mentions card-related behavior.",
        { orderId: context.orderId }
      )
    );
  }

  return createCandidate({
    ruleName: "order_issue_investigation",
    entityStrength: 4,
    unnecessaryToolPenalty: getCrossDomainPenalty(context, {}),
    plan: createExecutionPlan({
      intent: "order_issue_investigation",
      domain: "orders",
      entities: {
        orderId: context.orderId,
        mentionsPayment: context.signals.mentionsPayment || context.signals.mentionsBilling,
        mentionsFailure: context.signals.mentionsFailure,
      },
      tools,
      confidence: 0.92,
      matchedSignals: [
        "order_id",
        "issue_investigation",
        ...(context.signals.mentionsFailure ? ["failed"] : []),
        ...(context.signals.mentionsPayment || context.signals.mentionsBilling ? ["payment"] : []),
        ...(context.signals.mentionsCards ? ["cards"] : []),
      ],
      selectedDomains: ["orders", "billing"],
      notes: [
        "Question mentions a failed or problematic order, so order and billing tools were selected.",
      ],
    }),
  });
}

function buildAuditCandidate(context: PlannerQuestionContext) {
  if (!context.orderId) {
    return createCandidate({
      ruleName: "order_audit_missing_order_id",
      entityStrength: 0,
      plan: createExecutionPlan({
        intent: "order_audit_activity",
        domain: "orders",
        entities: {},
        tools: [],
        confidence: 0.3,
        matchedSignals: [...context.matchedSignals, "audit_activity"],
        selectedDomains: ["orders"],
        notes: ["Audit activity query matched, but no order id could be extracted."],
      }),
    });
  }

  const tools = [
    buildToolCall(
      OPS_TOOL_NAMES.getOrderDetails,
      "Fetch the order detail record so audit activity can be interpreted against the order state.",
      { orderId: context.orderId }
    ),
  ];
  const selectedDomains: OpsDomain[] = ["orders", "audit"];

  if (
    context.signals.mentionsPayment ||
    context.signals.mentionsBilling ||
    context.signals.mentionsFailure ||
    context.signals.mentionsWhatHappened
  ) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getBillingOrder,
        "Fetch billing data to compare payment state with order and audit activity.",
        { orderId: context.orderId }
      )
    );
  }

  tools.push(
    buildToolCall(
      OPS_TOOL_NAMES.getAuditLogs,
      "Fetch audit activity related to the requested order id.",
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

  return createCandidate({
    ruleName: "order_audit_activity",
    entityStrength: 4,
    unnecessaryToolPenalty: getCrossDomainPenalty(context, {
      supportsAudit: true,
    }),
    plan: createExecutionPlan({
      intent: "order_audit_activity",
      domain: "orders",
      entities: {
        orderId: context.orderId,
        includeAudit: true,
        mentionsPayment: context.signals.mentionsPayment || context.signals.mentionsBilling,
        mentionsFailure: context.signals.mentionsFailure,
      },
      tools,
      confidence: 0.93,
      matchedSignals: [
        "order_id",
        "audit",
        "audit_activity",
        ...(context.signals.mentionsFailure ? ["failed"] : []),
        ...(context.signals.mentionsPayment || context.signals.mentionsBilling ? ["payment"] : []),
        ...(context.signals.mentionsWhatHappened ? ["what_happened"] : []),
      ],
      selectedDomains: mergeSelectedDomains(selectedDomains, tools.length > 2 ? ["billing"] : undefined),
      notes: ["Question asks what happened or mentions audit activity, so audit logs were selected."],
    }),
  });
}

function buildCombinedIssueAuditCandidate(context: PlannerQuestionContext) {
  if (!context.orderId) {
    return undefined;
  }

  const tools = [
    buildToolCall(
      OPS_TOOL_NAMES.getOrderDetails,
      "Fetch the order detail record as the main reference for the failed order investigation.",
      { orderId: context.orderId }
    ),
    buildToolCall(
      OPS_TOOL_NAMES.getBillingOrder,
      "Fetch billing data because the question mentions failure or payment-related behavior.",
      { orderId: context.orderId }
    ),
    buildToolCall(
      OPS_TOOL_NAMES.getAuditLogs,
      "Fetch related audit activity to see what happened around this order.",
      {
        OrderId: context.orderId,
        EntityId: context.orderId,
        EntityType: "order",
        SearchText: context.orderId,
        PageSize: 20,
        PageIndex: 0,
      }
    ),
  ];

  if (context.signals.mentionsCards) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getOrderCards,
        "Fetch card details because the mixed investigation also mentions cards.",
        { orderId: context.orderId }
      )
    );
  }

  return createCandidate({
    ruleName: "order_issue_audit_combined",
    entityStrength: 5,
    unnecessaryToolPenalty: getCrossDomainPenalty(context, {
      supportsAudit: true,
    }),
    plan: createExecutionPlan({
      intent: "order_audit_activity",
      domain: "orders",
      entities: {
        orderId: context.orderId,
        includeAudit: true,
        includeBilling: true,
        mentionsPayment: context.signals.mentionsPayment || context.signals.mentionsBilling,
        mentionsFailure: context.signals.mentionsFailure,
      },
      tools,
      confidence: 0.96,
      matchedSignals: [
        "order_id",
        "audit",
        "issue_investigation",
        "audit_activity",
        ...(context.signals.mentionsFailure ? ["failed"] : []),
        ...(context.signals.mentionsPayment || context.signals.mentionsBilling ? ["payment"] : []),
        ...(context.signals.mentionsWhatHappened ? ["what_happened"] : []),
        ...(context.signals.mentionsCards ? ["cards"] : []),
      ],
      selectedDomains: ["orders", "billing", "audit"],
      notes: [
        "Question mentions a failed order and audit activity, so order, billing, and audit tools were combined.",
      ],
    }),
  });
}

export function buildOrderRuleCandidates(context: PlannerQuestionContext): PlannerCandidate[] {
  const candidates: PlannerCandidate[] = [];

  if (context.signals.asksForHistory || context.normalizedQuestion.includes("today") || context.normalizedQuestion.includes("yesterday")) {
    candidates.push(buildHistoryCandidate(context));
  }

  if (context.signals.asksForSpecificOrder || (context.orderId && context.signals.hasOrderCue)) {
    candidates.push(buildDetailCandidate(context));
  }

  if (context.signals.asksForIssueInvestigation) {
    candidates.push(buildIssueCandidate(context));
  }

  if (context.signals.asksForAuditActivity) {
    candidates.push(buildAuditCandidate(context));
  }

  if (context.signals.asksForIssueInvestigation && context.signals.asksForAuditActivity) {
    const combinedCandidate = buildCombinedIssueAuditCandidate(context);

    if (combinedCandidate) {
      candidates.push(combinedCandidate);
    }
  }

  return candidates;
}
