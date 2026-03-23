import type { OrderHistoryFilters } from "@/lib/bamboo/orders";
import type { ExecutionPlan, PlannedToolCall } from "@/lib/ops/planner/plan-types";
import { OPS_TOOL_NAMES } from "@/lib/ops/tools/tool-types";

const INVALID_ORDER_ID_TOKENS = new Set([
  "order",
  "orders",
  "id",
  "number",
  "details",
  "detail",
  "status",
  "cards",
  "card",
]);

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(23, 59, 59, 999);
  return next;
}

function normalizeCandidateOrderId(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/[.,!?]+$/, "");

  if (!normalized) {
    return undefined;
  }

  if (INVALID_ORDER_ID_TOKENS.has(normalized.toLowerCase())) {
    return undefined;
  }

  return normalized;
}

function extractOrderId(question: string) {
  const explicitPatterns = [
    /\border\s+(?:id|number|no\.?)\s*[:#-]?\s*([a-z0-9-]{3,})\b/i,
    /\border\s+details\s+for\s+([a-z0-9-]{3,})\b/i,
    /\bstatus\s+of\s+order\s+([a-z0-9-]{3,})\b/i,
    /\bshow\s+order\s+([a-z0-9-]{3,})\b/i,
    /\bcards\s+for\s+order\s+([a-z0-9-]{3,})\b/i,
    /\b(?:for|with)\s+order\s+([a-z0-9-]{3,})\b/i,
    /\border\s+([a-z0-9-]{3,})\b/i,
    /\bfor\s+order\s+([a-z0-9-]{3,})\b/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = question.match(pattern);
    const candidate = normalizeCandidateOrderId(match?.[1]);

    if (candidate) {
      return candidate;
    }
  }

  const orderNumberMatch = question.match(/\b(O-\d{3,})\b/i);
  if (orderNumberMatch?.[1]) {
    return orderNumberMatch[1];
  }

  const bareIdMatch = question.match(/\b(\d{3,}|[a-z0-9]{8,})\b/i);
  return normalizeCandidateOrderId(bareIdMatch?.[1]);
}

function applyDateWindow(question: string, filters: OrderHistoryFilters = {}) {
  const normalized = question.trim().toLowerCase();
  const nextFilters: OrderHistoryFilters = {
    PageSize: filters.PageSize ?? 20,
    PageIndex: filters.PageIndex ?? 0,
    SearchText: filters.SearchText,
    DateFrom: filters.DateFrom,
    DateTo: filters.DateTo,
    Status: filters.Status,
    SupplierId: filters.SupplierId,
  };

  if (normalized.includes("today")) {
    const now = new Date();
    nextFilters.DateFrom = startOfDay(now).toISOString();
    nextFilters.DateTo = endOfDay(now).toISOString();
    return nextFilters;
  }

  if (normalized.includes("yesterday")) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    nextFilters.DateFrom = startOfDay(yesterday).toISOString();
    nextFilters.DateTo = endOfDay(yesterday).toISOString();
    return nextFilters;
  }

  if (normalized.includes("last 30 days")) {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 30);
    nextFilters.DateFrom = from.toISOString();
    nextFilters.DateTo = now.toISOString();
    return nextFilters;
  }

  if (normalized.includes("last 7 days")) {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    nextFilters.DateFrom = from.toISOString();
    nextFilters.DateTo = now.toISOString();
    return nextFilters;
  }

  return nextFilters;
}

function hasAnyKeyword(normalizedQuestion: string, keywords: string[]) {
  return keywords.some((keyword) => normalizedQuestion.includes(keyword));
}

function buildToolCall(toolName: string, reason: string, params: Record<string, unknown>): PlannedToolCall {
  return {
    toolName,
    reason,
    params,
  };
}

function buildHistoryPlan(question: string, useClientHistory: boolean): ExecutionPlan {
  const normalized = question.trim().toLowerCase();
  const filters = applyDateWindow(question, {
    PageSize: normalized.includes("status of recent orders") ? 10 : 20,
    PageIndex: 0,
  });

  if (normalized.includes("failed")) {
    filters.Status = "failed";
  } else if (normalized.includes("blocked")) {
    filters.Status = "blocked";
  } else if (normalized.includes("pending")) {
    filters.Status = "pending";
  }

  return {
    intent: "order_history",
    domain: "orders",
    entities: {
      orderId: null,
      status: filters.Status ?? null,
      dateFrom: filters.DateFrom ?? null,
      dateTo: filters.DateTo ?? null,
      useClientHistory,
    },
    tools: [
      buildToolCall(
        useClientHistory ? OPS_TOOL_NAMES.getClientOrderHistory : OPS_TOOL_NAMES.getOrderHistory,
        "Fetch recent order history to inspect the requested order set and current statuses.",
        { ...filters }
      ),
    ],
    confidence: 0.9,
    notes: ["Deterministic keyword match for orders history."],
  };
}

function buildOrderDetailPlan(question: string, orderId?: string): ExecutionPlan {
  const normalized = question.trim().toLowerCase();

  if (!orderId) {
    return {
      intent: "order_detail",
      domain: "orders",
      entities: {},
      tools: [],
      confidence: 0.25,
      notes: ["Order detail query matched, but no order id could be extracted."],
    };
  }

  const tools: PlannedToolCall[] = [
    buildToolCall(
      OPS_TOOL_NAMES.getOrderDetails,
      "Fetch the core order detail record for the requested order id.",
      { orderId }
    ),
  ];

  if (normalized.includes("cards")) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getOrderCards,
        "Fetch card-level details because the question explicitly asks about cards.",
        { orderId }
      )
    );
  }

  if (normalized.includes("items")) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getOrderItemsInfo,
        "Fetch item-level details because the question explicitly asks about order items.",
        { orderId }
      )
    );
  }

  return {
    intent: "order_detail",
    domain: "orders",
    entities: {
      orderId,
      includeCards: normalized.includes("cards"),
      includeItems: normalized.includes("items"),
    },
    tools,
    confidence: 0.95,
    notes: ["Deterministic order-id match for an order detail request."],
  };
}

function buildIssueInvestigationPlan(question: string, orderId?: string): ExecutionPlan {
  const normalized = question.trim().toLowerCase();

  if (!orderId) {
    return {
      intent: "order_issue_investigation",
      domain: "orders",
      entities: {},
      tools: [],
      confidence: 0.3,
      notes: ["Issue investigation matched, but no order id could be extracted."],
    };
  }

  const tools: PlannedToolCall[] = [
    buildToolCall(
      OPS_TOOL_NAMES.getOrderDetails,
      "Fetch the order detail record to inspect status, items, cards, and notable issues.",
      { orderId }
    ),
    buildToolCall(
      OPS_TOOL_NAMES.getBillingOrder,
      "Fetch billing data to compare payment state against the operational order state.",
      { orderId }
    ),
  ];

  if (normalized.includes("card")) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getOrderCards,
        "Fetch card details because the investigation mentions card-related behavior.",
        { orderId }
      )
    );
  }

  return {
    intent: "order_issue_investigation",
    domain: "orders",
    entities: {
      orderId,
      mentionsPayment: normalized.includes("payment") || normalized.includes("billing"),
      mentionsFailure: normalized.includes("fail"),
    },
    tools,
    confidence: 0.92,
    notes: ["Deterministic issue investigation plan for a single order id."],
  };
}

function buildAuditActivityPlan(question: string, orderId?: string): ExecutionPlan {
  const normalized = question.trim().toLowerCase();

  if (!orderId) {
    return {
      intent: "order_audit_activity",
      domain: "orders",
      entities: {},
      tools: [],
      confidence: 0.3,
      notes: ["Audit activity query matched, but no order id could be extracted."],
    };
  }

  const tools: PlannedToolCall[] = [
    buildToolCall(
      OPS_TOOL_NAMES.getOrderDetails,
      "Fetch the order detail record so audit activity can be interpreted against the order state.",
      { orderId }
    ),
    buildToolCall(
      OPS_TOOL_NAMES.getAuditLogs,
      "Fetch audit activity related to the requested order id.",
      {
        OrderId: orderId,
        EntityId: orderId,
        EntityType: "order",
        SearchText: orderId,
        PageSize: 20,
        PageIndex: 0,
      }
    ),
  ];

  if (
    normalized.includes("payment") ||
    normalized.includes("billing") ||
    normalized.includes("fail") ||
    normalized.includes("happened")
  ) {
    tools.splice(
      1,
      0,
      buildToolCall(
        OPS_TOOL_NAMES.getBillingOrder,
        "Fetch billing data to compare payment state with order and audit activity.",
        { orderId }
      )
    );
  }

  return {
    intent: "order_audit_activity",
    domain: "orders",
    entities: {
      orderId,
      includeAudit: true,
      mentionsPayment: normalized.includes("payment") || normalized.includes("billing"),
      mentionsFailure: normalized.includes("fail") || normalized.includes("error"),
    },
    tools,
    confidence: 0.93,
    notes: ["Deterministic audit activity plan for a single order id."],
  };
}

export function buildOrderPlan(question: string): ExecutionPlan {
  const normalized = question.trim().toLowerCase();
  const orderId = normalized.includes("order") ? extractOrderId(question) : extractOrderId(question);
  const useClientHistory = normalized.includes("client order");
  const asksForHistory = hasAnyKeyword(normalized, [
    "recent order",
    "recent orders",
    "order history",
    "failed orders",
    "blocked orders",
    "list orders",
    "show orders",
    "status of recent orders",
  ]);
  const asksForSpecificOrder = hasAnyKeyword(normalized, [
    "show order",
    "order details",
    "show order details",
    "status of order",
    "show cards for order",
    "cards for order",
  ]);
  const asksForIssueInvestigation =
    Boolean(orderId) &&
    hasAnyKeyword(normalized, [
      "customer says",
      "failed",
      "payment was taken",
      "payment taken",
      "investigate",
      "issue",
      "problem",
    ]);
  const asksForAuditActivity =
    Boolean(orderId) &&
    hasAnyKeyword(normalized, [
      "audit",
      "audit log",
      "audit logs",
      "activity",
      "what happened",
      "happened",
      "log",
      "logs",
    ]);

  if (asksForAuditActivity) {
    return buildAuditActivityPlan(question, orderId);
  }

  if (asksForIssueInvestigation) {
    return buildIssueInvestigationPlan(question, orderId);
  }

  if (asksForSpecificOrder || (orderId && normalized.includes("order"))) {
    return buildOrderDetailPlan(question, orderId);
  }

  if (asksForHistory || normalized.includes("today") || normalized.includes("yesterday")) {
    return buildHistoryPlan(question, useClientHistory);
  }

  return {
    intent: "unsupported",
    domain: "orders",
    entities: {
      extractedOrderId: orderId ?? null,
    },
    tools: [],
    confidence: 0.1,
    notes: ["No supported orders-only planning heuristic matched the question."],
  };
}
