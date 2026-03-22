import "server-only";

import {
  analyzeOrderPatterns,
  analyzeOrderTrend,
  getClientOrderHistory,
  getOrderDetails,
  getOrderHistory,
  type OrderHistoryFilters,
} from "@/lib/bamboo/orders";
import {
  buildOrderDetailFallbackAnswer,
  buildOrderDetailPrompt,
  buildFailedOrdersFallbackAnswer,
  buildOrderPatternAnalysisFallbackAnswer,
  buildOrderPatternAnalysisPrompt,
  buildOrderTrendAnalysisFallbackAnswer,
  buildOrderTrendAnalysisPrompt,
  buildOrderHistoryFallbackAnswer,
  buildOrderHistoryPrompt,
} from "@/lib/ai/order-prompt";

export interface AiQuerySource {
  type: string;
  endpoint?: string;
}

export type ResolvedAiQuery =
  | {
      type: "unsupported";
      answer: string;
      sources: AiQuerySource[];
    }
  | {
      type: "missing_order_id";
      answer: string;
      sources: AiQuerySource[];
    }
  | {
      type: "resolved";
      prompt: {
        system: string;
        user: string;
      };
      fallbackAnswer: string;
      sources: AiQuerySource[];
    };

type QueryIntent =
  | {
      type: "recent_orders_summary";
      filters: OrderHistoryFilters;
      useClientHistory: boolean;
    }
  | {
      type: "failed_orders_summary";
      filters: OrderHistoryFilters;
      useClientHistory: boolean;
    }
  | {
      type: "order_pattern_analysis";
      filters: OrderHistoryFilters;
      useClientHistory: boolean;
    }
  | {
      type: "order_trend_analysis";
      recentFilters: OrderHistoryFilters;
      previousFilters: OrderHistoryFilters;
      recentLabel: string;
      previousLabel: string;
      useClientHistory: boolean;
    }
  | {
      type: "order_detail";
      orderId: string;
    }
  | {
      type: "missing_order_id";
    }
  | {
      type: "unsupported";
    };

interface OpenAIChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?:
        | string
        | Array<{
            type?: string;
            text?: string;
          }>;
    };
  }>;
}

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

function applyQuestionFilters(question: string, baseFilters: OrderHistoryFilters = {}) {
  const normalized = question.trim().toLowerCase();
  const filters: OrderHistoryFilters = {
    PageSize: baseFilters.PageSize ?? 10,
    PageIndex: baseFilters.PageIndex ?? 0,
    SearchText: baseFilters.SearchText,
    DateFrom: baseFilters.DateFrom,
    DateTo: baseFilters.DateTo,
    Status: baseFilters.Status,
    SupplierId: baseFilters.SupplierId,
  };

  if (normalized.includes("today")) {
    const now = new Date();
    filters.DateFrom = startOfDay(now).toISOString();
    filters.DateTo = endOfDay(now).toISOString();
    return filters;
  }

  if (normalized.includes("yesterday")) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    filters.DateFrom = startOfDay(yesterday).toISOString();
    filters.DateTo = endOfDay(yesterday).toISOString();
    return filters;
  }

  if (normalized.includes("last 30 days")) {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 30);
    filters.DateFrom = from.toISOString();
    filters.DateTo = now.toISOString();
    return filters;
  }

  if (normalized.includes("last 7 days")) {
    const now = new Date();
    const from = new Date(now);
    from.setDate(now.getDate() - 7);
    filters.DateFrom = from.toISOString();
    filters.DateTo = now.toISOString();
  }

  return filters;
}

function buildTrendWindow(days: number) {
  const now = new Date();
  const recentTo = now;
  const recentFrom = new Date(now);
  recentFrom.setDate(now.getDate() - days);

  const previousTo = new Date(recentFrom);
  previousTo.setMilliseconds(previousTo.getMilliseconds() - 1);
  const previousFrom = new Date(previousTo);
  previousFrom.setDate(previousTo.getDate() - days);

  return {
    recentFilters: {
      PageSize: 50,
      PageIndex: 0,
      Status: "failed",
      DateFrom: recentFrom.toISOString(),
      DateTo: recentTo.toISOString(),
    } satisfies OrderHistoryFilters,
    previousFilters: {
      PageSize: 50,
      PageIndex: 0,
      Status: "failed",
      DateFrom: previousFrom.toISOString(),
      DateTo: previousTo.toISOString(),
    } satisfies OrderHistoryFilters,
    recentLabel: `Last ${days} days`,
    previousLabel: `Previous ${days} days`,
  };
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
  const candidate = normalizeCandidateOrderId(bareIdMatch?.[1]);

  return candidate;
}

function parseQuestionIntent(question: string): QueryIntent {
  const normalized = question.trim().toLowerCase();
  const orderId = normalized.includes("order") ? extractOrderId(question) : undefined;
  const asksForHistory =
    normalized.includes("recent order") ||
    normalized.includes("order history") ||
    normalized.includes("recent orders") ||
    normalized.includes("failed orders") ||
    normalized.includes("blocked orders") ||
    normalized.includes("list orders") ||
    normalized.includes("show orders");
  const asksForClientOrders = normalized.includes("client order");
  const asksForPatternAnalysis =
    normalized.includes("common problem") ||
    normalized.includes("common issue") ||
    normalized.includes("pattern") ||
    normalized.includes("across failed orders");
  const asksForTrendAnalysis =
    normalized.includes("increasing") ||
    normalized.includes("going up") ||
    normalized.includes("going down") ||
    normalized.includes("trend");
  const asksForFailedOrders =
    normalized.includes("failed orders") ||
    normalized.includes("failing orders") ||
    normalized.includes("failures");
  const asksForSpecificOrder =
    normalized.includes("order details") ||
    normalized.includes("order status") ||
    normalized.includes("status of order") ||
    normalized.includes("show order") ||
    normalized.includes("show cards for order") ||
    normalized.includes("cards for order");

  if (asksForSpecificOrder && !orderId) {
    return { type: "missing_order_id" };
  }

  if (orderId && (asksForSpecificOrder || normalized.includes("order"))) {
    return {
      type: "order_detail",
      orderId,
    };
  }

  if (asksForTrendAnalysis && (asksForFailedOrders || normalized.includes("recently"))) {
    const days = normalized.includes("30") ? 30 : 7;
    const window = buildTrendWindow(days);

    return {
      type: "order_trend_analysis",
      recentFilters: window.recentFilters,
      previousFilters: window.previousFilters,
      recentLabel: window.recentLabel,
      previousLabel: window.previousLabel,
      useClientHistory: asksForClientOrders,
    };
  }

  if (asksForPatternAnalysis) {
    return {
      type: "order_pattern_analysis",
      filters: applyQuestionFilters(question, {
        PageSize: 25,
        PageIndex: 0,
        Status: asksForFailedOrders ? "failed" : undefined,
      }),
      useClientHistory: asksForClientOrders,
    };
  }

  if (asksForFailedOrders) {
    return {
      type: "failed_orders_summary",
      filters: applyQuestionFilters(question, {
        PageSize: 25,
        PageIndex: 0,
        Status: "failed",
      }),
      useClientHistory: asksForClientOrders,
    };
  }

  if (asksForHistory || normalized.includes("today")) {
    const filters = applyQuestionFilters(question, {
      PageSize: 20,
      PageIndex: 0,
    });

    if (normalized.includes("blocked")) {
      filters.Status = "blocked";
    } else if (normalized.includes("pending")) {
      filters.Status = "pending";
    }

    return {
      type: "recent_orders_summary",
      filters,
      useClientHistory: asksForClientOrders,
    };
  }

  return { type: "unsupported" };
}

export function extractAssistantText(payload: OpenAIChatCompletionResponse) {
  const content = payload.choices?.[0]?.message?.content;

  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => (item.type === "text" ? item.text ?? "" : ""))
      .join("")
      .trim();
  }

  return "";
}

export async function generateCompletion(options: {
  system: string;
  user: string;
  fallbackAnswer: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return options.fallbackAnswer;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_CHAT_MODEL?.trim() || "gpt-4o-mini",
        temperature: 0.2,
        messages: [
          { role: "system", content: options.system },
          { role: "user", content: options.user },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      console.error("OpenAI order generation failed", {
        status: response.status,
        body: message.slice(0, 400),
      });
      return options.fallbackAnswer;
    }

    const payload = (await response.json()) as OpenAIChatCompletionResponse;
    return extractAssistantText(payload) || options.fallbackAnswer;
  } catch (error) {
    console.error("OpenAI order generation error", {
      message: error instanceof Error ? error.message : "Unknown OpenAI error",
    });
    return options.fallbackAnswer;
  }
}

export async function resolveAiQuery(question: string): Promise<ResolvedAiQuery> {
  const intent = parseQuestionIntent(question);

  if (intent.type === "missing_order_id") {
    return {
      type: "missing_order_id",
      answer:
        "Please include the order id. This first version supports order history and order detail queries by order id.",
      sources: [],
    };
  }

  if (intent.type === "unsupported") {
    return {
      type: "unsupported",
      answer:
        "This first version currently supports recent orders, failed orders, order patterns, trend checks, and order details.",
      sources: [],
    };
  }

  if (intent.type === "recent_orders_summary") {
    const result = intent.useClientHistory
      ? await getClientOrderHistory(intent.filters)
      : await getOrderHistory(intent.filters);
    const prompt = buildOrderHistoryPrompt(question, result.context, {
      mode: "recent_orders_summary",
    });

    return {
      type: "resolved",
      prompt,
      fallbackAnswer: buildOrderHistoryFallbackAnswer(result.context),
      sources: result.sources,
    };
  }

  if (intent.type === "failed_orders_summary") {
    const result = intent.useClientHistory
      ? await getClientOrderHistory(intent.filters)
      : await getOrderHistory(intent.filters);
    const prompt = buildOrderHistoryPrompt(question, result.context, {
      mode: "failed_orders_summary",
    });

    return {
      type: "resolved",
      prompt,
      fallbackAnswer: buildFailedOrdersFallbackAnswer(result.context),
      sources: result.sources,
    };
  }

  if (intent.type === "order_pattern_analysis") {
    const result = intent.useClientHistory
      ? await getClientOrderHistory(intent.filters)
      : await getOrderHistory(intent.filters);
    const analysis = analyzeOrderPatterns(result.context);
    const prompt = buildOrderPatternAnalysisPrompt(question, analysis);

    return {
      type: "resolved",
      prompt,
      fallbackAnswer: buildOrderPatternAnalysisFallbackAnswer(analysis),
      sources: result.sources,
    };
  }

  if (intent.type === "order_trend_analysis") {
    const [recentResult, previousResult] = await Promise.all([
      intent.useClientHistory
        ? getClientOrderHistory(intent.recentFilters)
        : getOrderHistory(intent.recentFilters),
      intent.useClientHistory
        ? getClientOrderHistory(intent.previousFilters)
        : getOrderHistory(intent.previousFilters),
    ]);
    const trend = analyzeOrderTrend({
      recent: recentResult.context,
      previous: previousResult.context,
      recentLabel: intent.recentLabel,
      previousLabel: intent.previousLabel,
    });
    const prompt = buildOrderTrendAnalysisPrompt(question, trend);

    return {
      type: "resolved",
      prompt,
      fallbackAnswer: buildOrderTrendAnalysisFallbackAnswer(trend),
      sources: [...recentResult.sources, ...previousResult.sources],
    };
  }

  const result = await getOrderDetails(intent.orderId);
  const prompt = buildOrderDetailPrompt(question, result.context);

  return {
    type: "resolved",
    prompt,
    fallbackAnswer: buildOrderDetailFallbackAnswer(result.context),
    sources: result.sources,
  };
}
