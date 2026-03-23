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
  "failed",
  "failure",
  "reconciliation",
  "buffered",
  "reconciled",
]);

const INVALID_HISTORY_ID_TOKENS = new Set([
  "history",
  "reconciliation",
  "status",
  "buffered",
  "reconciled",
  "records",
  "record",
  "invalid",
  "expired",
  "cards",
  "card",
  "issue",
  "issues",
]);

const INVALID_SERVICE_NAME_TOKENS = new Set([
  "service",
  "services",
  "backend",
  "system",
  "errors",
  "error",
  "fail",
  "failed",
  "issue",
  "issues",
  "cloudwatch",
  "logs",
  "recent",
  "last",
  "check",
  "show",
  "any",
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

  return undefined;
}

function normalizeCandidateHistoryId(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/[.,!?]+$/, "");

  if (!normalized) {
    return undefined;
  }

  if (INVALID_HISTORY_ID_TOKENS.has(normalized.toLowerCase())) {
    return undefined;
  }

  return normalized;
}

function extractHistoryId(question: string) {
  const explicitPatterns = [
    /\breconciliation\s+history\s+(?:id|number|no\.?)\s*[:#-]?\s*([a-z0-9-]{1,})\b/i,
    /\bhistory\s+(?:id|number|no\.?)\s*[:#-]?\s*([a-z0-9-]{1,})\b/i,
    /\bhistory\s+([a-z0-9-]{1,})\b/i,
    /\bfor\s+history\s+([a-z0-9-]{1,})\b/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = question.match(pattern);
    const candidate = normalizeCandidateHistoryId(match?.[1]);

    if (candidate) {
      return candidate;
    }
  }

  return undefined;
}

function normalizeCandidateServiceName(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/[.,!?]+$/, "");

  if (!normalized) {
    return undefined;
  }

  if (INVALID_SERVICE_NAME_TOKENS.has(normalized.toLowerCase())) {
    return undefined;
  }

  return normalized;
}

function extractServiceName(question: string) {
  const explicitPatterns = [
    /\bfor\s+([a-z0-9-]{3,})\s+service\b/i,
    /\b([a-z0-9-]{3,})\s+service\b/i,
    /\bservice\s+([a-z0-9-]{3,})\b/i,
  ];

  for (const pattern of explicitPatterns) {
    const match = question.match(pattern);
    const candidate = normalizeCandidateServiceName(match?.[1]);

    if (candidate) {
      return candidate;
    }
  }

  return undefined;
}

function extractAwsMinutes(question: string) {
  const normalized = question.trim().toLowerCase();
  const minuteMatch = normalized.match(/\blast\s+(\d{1,3})\s+minutes?\b/);

  if (minuteMatch?.[1]) {
    return Number.parseInt(minuteMatch[1], 10);
  }

  const hourMatch = normalized.match(/\blast\s+(\d{1,2})\s+hours?\b/);

  if (hourMatch?.[1]) {
    return Number.parseInt(hourMatch[1], 10) * 60;
  }

  if (normalized.includes("last hour")) {
    return 60;
  }

  if (normalized.includes("last 30 min")) {
    return 30;
  }

  if (normalized.includes("today")) {
    return 24 * 60;
  }

  return 60;
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

function buildReconciliationPlan(
  question: string,
  historyId: string | undefined,
  options?: {
    orderId?: string;
    includeAudit?: boolean;
  }
): ExecutionPlan {
  const normalized = question.trim().toLowerCase();
  const orderId = options?.orderId;
  const includeAudit = Boolean(options?.includeAudit);

  if (!historyId) {
    return {
      intent: "reconciliation_investigation",
      domain: "reconciliation",
      entities: {},
      tools: [],
      confidence: 0.28,
      notes: ["Reconciliation query matched, but no reconciliation history id could be extracted."],
    };
  }

  const asksForBufferedRecords = hasAnyKeyword(normalized, [
    "buffered record",
    "buffered records",
    "buffered",
  ]);
  const asksForReconciledRecords = hasAnyKeyword(normalized, [
    "reconciled record",
    "reconciled records",
    "reconciled",
  ]);
  const asksForInvalidProductBrandCards = hasAnyKeyword(normalized, [
    "invalid product brand",
    "invalid product-brand",
    "invalid product",
    "product brand",
  ]);
  const asksForExpiredCards = hasAnyKeyword(normalized, [
    "expired card",
    "expired cards",
  ]);
  const asksForSupplierSummary = hasAnyKeyword(normalized, [
    "supplier summary",
    "supplier",
    "system cards summary",
    "summary",
  ]);
  const asksForStatus = hasAnyKeyword(normalized, [
    "reconciliation status",
    "status for history",
    "show reconciliation status",
  ]);
  const asksWhyFailing = hasAnyKeyword(normalized, [
    "why is reconciliation failing",
    "reconciliation failing",
    "reconciliation issue",
    "reconciliation problem",
    "any reconciliation issue",
    "failed",
  ]);

  let intent = "reconciliation_investigation";

  if (asksForBufferedRecords && !asksForReconciledRecords && !asksWhyFailing) {
    intent = "reconciliation_buffered_records";
  } else if (asksForReconciledRecords && !asksForBufferedRecords && !asksWhyFailing) {
    intent = "reconciliation_reconciled_records";
  } else if (
    asksForStatus &&
    !asksForBufferedRecords &&
    !asksForReconciledRecords &&
    !asksForInvalidProductBrandCards &&
    !asksForExpiredCards
  ) {
    intent = "reconciliation_status";
  }

  const tools: PlannedToolCall[] = [];

  if (orderId) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getOrderDetails,
        "Fetch the linked order detail record so reconciliation findings can be interpreted against the order state.",
        { orderId }
      )
    );

    if (
      normalized.includes("payment") ||
      normalized.includes("billing") ||
      normalized.includes("failed") ||
      normalized.includes("fail")
    ) {
      tools.push(
        buildToolCall(
          OPS_TOOL_NAMES.getBillingOrder,
          "Fetch billing data to compare payment state with reconciliation findings.",
          { orderId }
        )
      );
    }
  }

  if (asksForStatus || asksWhyFailing || asksForBufferedRecords || asksForReconciledRecords) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getReconciliationStatus,
        "Fetch the overall reconciliation status for the requested history id.",
        { historyId }
      )
    );
  }

  if (asksForBufferedRecords || asksWhyFailing) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getBufferedRecords,
        "Fetch buffered reconciliation records to see whether this history is still waiting on unresolved items.",
        { historyId }
      )
    );
  }

  if (asksForReconciledRecords || asksWhyFailing) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getReconciledRecords,
        "Fetch reconciled records to compare completed activity against unresolved reconciliation items.",
        { historyId }
      )
    );
  }

  if (asksForInvalidProductBrandCards || asksWhyFailing || intent === "reconciliation_status") {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getInvalidProductBrandCards,
        "Fetch invalid product-brand card issues related to this reconciliation history.",
        { historyId }
      )
    );
  }

  if (asksForExpiredCards || asksWhyFailing || intent === "reconciliation_status") {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getExpiredCards,
        "Fetch expired card issues related to this reconciliation history.",
        { historyId }
      )
    );
  }

  if (asksForSupplierSummary || asksWhyFailing || intent === "reconciliation_status") {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getSystemCardsSummaryReconcileSupplier,
        "Fetch supplier-level reconciliation summary signals for this history.",
        { historyId }
      )
    );
  }

  if (orderId && includeAudit) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getAuditLogs,
        "Fetch audit activity so reconciliation findings can be compared with order activity.",
        {
          OrderId: orderId,
          EntityId: orderId,
          EntityType: "order",
          SearchText: orderId,
          PageSize: 20,
          PageIndex: 0,
        }
      )
    );
  }

  return {
    intent,
    domain: orderId ? "orders" : "reconciliation",
    entities: {
      historyId,
      orderId: orderId ?? null,
      includeAudit,
      asksForBufferedRecords,
      asksForReconciledRecords,
      asksForInvalidProductBrandCards,
      asksForExpiredCards,
    },
    tools,
    confidence: 0.91,
    notes: ["Deterministic reconciliation plan for a single reconciliation history id."],
  };
}

function buildAwsPlan(
  question: string,
  options?: {
    orderId?: string;
    historyId?: string;
  }
): ExecutionPlan {
  const normalized = question.trim().toLowerCase();
  const serviceName = extractServiceName(question);
  const minutes = extractAwsMinutes(question);
  const asksForExplicitLogs = hasAnyKeyword(normalized, [
    "cloudwatch",
    "cloudwatch logs",
    "logs",
  ]);
  const asksForServiceSummary = hasAnyKeyword(normalized, [
    "errors",
    "error",
    "issue",
    "issues",
    "fail",
    "failed",
    "service health",
    "system issue",
    "system error",
    "backend error",
    "backend errors",
  ]);
  const orderId = options?.orderId;
  const historyId = options?.historyId;
  const tools: PlannedToolCall[] = [];

  if (orderId) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getOrderDetails,
        "Fetch the order detail record so system findings can be compared with the order state.",
        { orderId }
      )
    );
  }

  if (historyId) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getReconciliationStatus,
        "Fetch the reconciliation status so system findings can be compared with reconciliation activity.",
        { historyId }
      )
    );
  }

  const awsParams = {
    serviceName,
    minutes,
    limit: asksForExplicitLogs ? 25 : 15,
    queryText:
      normalized.includes("payment") && !serviceName
        ? "payment"
        : normalized.includes("reconcil")
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

  if (asksForExplicitLogs || normalized.includes("cloudwatch")) {
    tools.push(
      buildToolCall(
        OPS_TOOL_NAMES.getCloudWatchLogs,
        "Fetch recent CloudWatch log entries to inspect the latest infrastructure-side signals.",
        awsParams
      )
    );
  }

  return {
    intent: asksForExplicitLogs ? "aws_logs" : "aws_service_errors",
    domain: orderId ? "orders" : historyId ? "reconciliation" : "aws",
    entities: {
      orderId: orderId ?? null,
      historyId: historyId ?? null,
      serviceName: serviceName ?? null,
      minutes,
      includeAws: true,
    },
    tools,
    confidence: 0.9,
    notes: ["Deterministic AWS / CloudWatch plan based on system-health keywords."],
  };
}

export function buildOrderPlan(question: string): ExecutionPlan {
  const normalized = question.trim().toLowerCase();
  const hasOrderCue = normalized.includes("order") || /\bO-\d{3,}\b/i.test(question);
  const orderId = hasOrderCue ? extractOrderId(question) : undefined;
  const historyId =
    normalized.includes("history") || normalized.includes("reconciliation")
      ? extractHistoryId(question)
      : undefined;
  const serviceName = extractServiceName(question);
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
  const asksForReconciliation = hasAnyKeyword(normalized, [
    "reconciliation",
    "buffered records",
    "buffered",
    "reconciled records",
    "invalid product brand",
    "invalid product-brand",
    "expired cards",
    "expired card",
  ]);
  const asksForAws = hasAnyKeyword(normalized, [
    "cloudwatch",
    "backend error",
    "backend errors",
    "system issue",
    "system issues",
    "system error",
    "system errors",
    "service health",
    "service fail",
    "service failed",
  ]) || ((normalized.includes("error") || normalized.includes("errors") || normalized.includes("issue")) && Boolean(serviceName));

  if (asksForAws) {
    return buildAwsPlan(question, {
      orderId,
      historyId,
    });
  }

  if (asksForReconciliation) {
    return buildReconciliationPlan(question, historyId, {
      orderId,
      includeAudit: asksForAuditActivity,
    });
  }

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
