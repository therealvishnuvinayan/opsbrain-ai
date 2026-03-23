import type { OrderHistoryFilters } from "@/lib/bamboo/orders";
import type { ExecutionPlan, PlannerQuestionContext } from "@/lib/ops/planner/plan-types";

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

export function hasAnyKeyword(normalizedQuestion: string, keywords: string[]) {
  return keywords.some((keyword) => normalizedQuestion.includes(keyword));
}

function normalizeCandidateOrderId(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/[.,!?]+$/, "");

  if (!normalized || INVALID_ORDER_ID_TOKENS.has(normalized.toLowerCase())) {
    return undefined;
  }

  return normalized;
}

export function extractOrderId(question: string) {
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
    const candidate = normalizeCandidateOrderId(question.match(pattern)?.[1]);

    if (candidate) {
      return candidate;
    }
  }

  const orderNumberMatch = question.match(/\b(O-\d{3,})\b/i);
  return orderNumberMatch?.[1];
}

function normalizeCandidateHistoryId(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().replace(/[.,!?]+$/, "");

  if (!normalized || INVALID_HISTORY_ID_TOKENS.has(normalized.toLowerCase())) {
    return undefined;
  }

  return normalized;
}

export function extractHistoryId(question: string) {
  const explicitPatterns = [
    /\breconciliation\s+history\s+(?:id|number|no\.?)\s*[:#-]?\s*([a-z0-9-]{1,})\b/i,
    /\bhistory\s+(?:id|number|no\.?)\s*[:#-]?\s*([a-z0-9-]{1,})\b/i,
    /\bhistory\s+([a-z0-9-]{1,})\b/i,
    /\bfor\s+history\s+([a-z0-9-]{1,})\b/i,
  ];

  for (const pattern of explicitPatterns) {
    const candidate = normalizeCandidateHistoryId(question.match(pattern)?.[1]);

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

  if (!normalized || INVALID_SERVICE_NAME_TOKENS.has(normalized.toLowerCase())) {
    return undefined;
  }

  return normalized;
}

export function extractServiceName(question: string) {
  const explicitPatterns = [
    /\bfor\s+([a-z0-9-]{3,})\s+service\b/i,
    /\b([a-z0-9-]{3,})\s+service\b/i,
    /\bservice\s+([a-z0-9-]{3,})\b/i,
  ];

  for (const pattern of explicitPatterns) {
    const candidate = normalizeCandidateServiceName(question.match(pattern)?.[1]);

    if (candidate) {
      return candidate;
    }
  }

  return undefined;
}

export function extractAwsMinutes(question: string) {
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

export function applyDateWindow(question: string, filters: OrderHistoryFilters = {}) {
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

export function buildKnowledgeTags(question: string) {
  const normalized = question.trim().toLowerCase();
  const tags: string[] = [];

  if (normalized.includes("payment")) {
    tags.push("payment");
  }

  if (normalized.includes("order")) {
    tags.push("orders");
  }

  if (normalized.includes("reconcil")) {
    tags.push("reconciliation");
  }

  if (normalized.includes("cloudwatch") || normalized.includes("backend")) {
    tags.push("cloudwatch");
  }

  if (normalized.includes("runbook")) {
    tags.push("runbook");
  }

  if (normalized.includes("sop")) {
    tags.push("sop");
  }

  if (normalized.includes("product-brand") || normalized.includes("product brand")) {
    tags.push("product-brand");
  }

  return tags;
}

export function inferKnowledgeDomain(
  question: string,
  fallbackDomain?: ExecutionPlan["domain"]
) {
  const normalized = question.trim().toLowerCase();

  if (
    normalized.includes("reconcil") ||
    normalized.includes("product-brand") ||
    normalized.includes("product brand")
  ) {
    return "reconciliation";
  }

  if (
    normalized.includes("cloudwatch") ||
    normalized.includes("backend") ||
    normalized.includes("service")
  ) {
    return "aws";
  }

  if (normalized.includes("payment") || normalized.includes("billing")) {
    return "billing";
  }

  if (normalized.includes("audit")) {
    return "audit";
  }

  if (normalized.includes("order")) {
    return "orders";
  }

  return fallbackDomain === "knowledge" ? undefined : fallbackDomain;
}

function collectMatchedSignals(
  orderId: string | undefined,
  historyId: string | undefined,
  serviceName: string | undefined,
  signals: PlannerQuestionContext["signals"],
  normalizedQuestion: string
) {
  const matchedSignals: string[] = [];

  if (orderId) {
    matchedSignals.push("order_id");
  }

  if (historyId) {
    matchedSignals.push("history_id");
  }

  if (serviceName) {
    matchedSignals.push("service_name");
  }

  if (signals.mentionsFailure) {
    matchedSignals.push("failed");
  }

  if (signals.mentionsPayment || signals.mentionsBilling) {
    matchedSignals.push("payment");
  }

  if (signals.asksForAuditActivity) {
    matchedSignals.push("audit");
  }

  if (signals.asksForReconciliation) {
    matchedSignals.push("reconciliation");
  }

  if (signals.asksForAws) {
    matchedSignals.push("aws");
  }

  if (signals.asksForKnowledge) {
    matchedSignals.push("knowledge");
  }

  if (signals.mentionsCards || normalizedQuestion.includes("invalid product brand")) {
    matchedSignals.push("cards");
  }

  if (signals.mentionsWhatHappened) {
    matchedSignals.push("what_happened");
  }

  return matchedSignals;
}

export function buildPlannerQuestionContext(question: string): PlannerQuestionContext {
  const normalizedQuestion = question.trim().toLowerCase();
  const hasOrderCue = normalizedQuestion.includes("order") || /\bO-\d{3,}\b/i.test(question);
  const orderId = hasOrderCue ? extractOrderId(question) : undefined;
  const historyId =
    normalizedQuestion.includes("history") || normalizedQuestion.includes("reconciliation")
      ? extractHistoryId(question)
      : undefined;
  const serviceName = extractServiceName(question);
  const signals: PlannerQuestionContext["signals"] = {
    hasOrderCue,
    useClientHistory: normalizedQuestion.includes("client order"),
    asksForHistory: hasAnyKeyword(normalizedQuestion, [
      "recent order",
      "recent orders",
      "order history",
      "failed orders",
      "blocked orders",
      "list orders",
      "show orders",
      "status of recent orders",
    ]),
    asksForSpecificOrder: hasAnyKeyword(normalizedQuestion, [
      "show order",
      "order details",
      "show order details",
      "status of order",
      "show cards for order",
      "cards for order",
    ]),
    asksForIssueInvestigation:
      Boolean(orderId) &&
      hasAnyKeyword(normalizedQuestion, [
        "customer says",
        "failed",
        "payment was taken",
        "payment taken",
        "investigate",
        "issue",
        "problem",
      ]),
    asksForAuditActivity:
      Boolean(orderId) &&
      hasAnyKeyword(normalizedQuestion, [
        "audit",
        "audit log",
        "audit logs",
        "activity",
        "what happened",
        "happened",
        "log",
        "logs",
      ]),
    asksForReconciliation: hasAnyKeyword(normalizedQuestion, [
      "reconciliation",
      "buffered records",
      "buffered",
      "reconciled records",
      "invalid product brand",
      "invalid product-brand",
      "expired cards",
      "expired card",
    ]),
    asksForBufferedRecords: hasAnyKeyword(normalizedQuestion, [
      "buffered record",
      "buffered records",
      "buffered",
    ]),
    asksForReconciledRecords: hasAnyKeyword(normalizedQuestion, [
      "reconciled record",
      "reconciled records",
      "reconciled",
    ]),
    asksForInvalidProductBrandCards: hasAnyKeyword(normalizedQuestion, [
      "invalid product brand",
      "invalid product-brand",
      "invalid product",
      "product brand",
      "invalid cards",
    ]),
    asksForExpiredCards: hasAnyKeyword(normalizedQuestion, [
      "expired card",
      "expired cards",
    ]),
    asksForSupplierSummary: hasAnyKeyword(normalizedQuestion, [
      "supplier summary",
      "supplier",
      "system cards summary",
      "summary",
    ]),
    asksForReconciliationStatus: hasAnyKeyword(normalizedQuestion, [
      "reconciliation status",
      "status for history",
      "show reconciliation status",
    ]),
    asksWhyReconciliationFailing: hasAnyKeyword(normalizedQuestion, [
      "why is reconciliation failing",
      "reconciliation failing",
      "reconciliation issue",
      "reconciliation problem",
      "any reconciliation issue",
      "failed",
    ]),
    asksForAws:
      hasAnyKeyword(normalizedQuestion, [
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
      ]) ||
      ((normalizedQuestion.includes("error") ||
        normalizedQuestion.includes("errors") ||
        normalizedQuestion.includes("issue")) &&
        Boolean(serviceName)),
    asksForExplicitLogs: hasAnyKeyword(normalizedQuestion, [
      "cloudwatch",
      "cloudwatch logs",
      "logs",
    ]),
    asksForServiceSummary: hasAnyKeyword(normalizedQuestion, [
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
    ]),
    asksForKnowledge: hasAnyKeyword(normalizedQuestion, [
      "what should ops do",
      "what should we do",
      "what should we check next",
      "what should we check",
      "what is the process",
      "how do we handle",
      "runbook",
      "sop",
      "troubleshooting guide",
      "guide for",
      "process for",
    ]),
    mentionsPayment:
      normalizedQuestion.includes("payment") || normalizedQuestion.includes("captured"),
    mentionsBilling: normalizedQuestion.includes("billing"),
    mentionsFailure: normalizedQuestion.includes("fail") || normalizedQuestion.includes("error"),
    mentionsCards: normalizedQuestion.includes("card"),
    mentionsItems: normalizedQuestion.includes("item"),
    mentionsWhatHappened:
      normalizedQuestion.includes("what happened") || normalizedQuestion.includes("happened"),
  };

  return {
    question,
    normalizedQuestion,
    orderId,
    historyId,
    serviceName,
    minutes: extractAwsMinutes(question),
    signals,
    matchedSignals: collectMatchedSignals(
      orderId,
      historyId,
      serviceName,
      signals,
      normalizedQuestion
    ),
  };
}
