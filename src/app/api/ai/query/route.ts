import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import {
  getClientOrderHistory,
  getOrderDetails,
  getOrderHistory,
  type OrderHistoryFilters,
} from "@/lib/bamboo/orders";
import {
  buildOrderDetailFallbackAnswer,
  buildOrderDetailPrompt,
  buildOrderHistoryFallbackAnswer,
  buildOrderHistoryPrompt,
} from "@/lib/ai/order-prompt";

interface QueryRequestBody {
  question?: string;
  conversationId?: string;
}

type QueryIntent =
  | {
      type: "order_history";
      filters: OrderHistoryFilters;
      useClientHistory: boolean;
    }
  | {
      type: "order_lookup";
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

function extractAssistantText(payload: OpenAIChatCompletionResponse) {
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

function parseQuestionIntent(question: string): QueryIntent {
  const normalized = question.trim().toLowerCase();
  const orderIdMatch =
    question.match(/\border\s*(?:id|number|no\.?)?\s*[:#-]?\s*([a-z0-9-]{3,})\b/i) ??
    (normalized.includes("order") ? question.match(/\b([0-9]{3,}|[a-z0-9]{8,})\b/i) : null);
  const orderId = orderIdMatch?.[1];
  const asksForHistory =
    normalized.includes("recent order") ||
    normalized.includes("order history") ||
    normalized.includes("recent orders") ||
    normalized.includes("failed orders") ||
    normalized.includes("blocked orders") ||
    normalized.includes("list orders") ||
    normalized.includes("show orders");
  const asksForClientOrders = normalized.includes("client order");
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
      type: "order_lookup",
      orderId,
    };
  }

  if (asksForHistory) {
    const filters: OrderHistoryFilters = {
      PageSize: 10,
      PageIndex: 0,
    };

    if (normalized.includes("failed")) {
      filters.Status = "failed";
    } else if (normalized.includes("blocked")) {
      filters.Status = "blocked";
    } else if (normalized.includes("pending")) {
      filters.Status = "pending";
    }

    if (normalized.includes("last 7 days")) {
      const now = new Date();
      const sevenDaysAgo = new Date(now);
      sevenDaysAgo.setDate(now.getDate() - 7);
      filters.DateFrom = sevenDaysAgo.toISOString();
      filters.DateTo = now.toISOString();
    }

    return {
      type: "order_history",
      filters,
      useClientHistory: asksForClientOrders,
    };
  }

  return { type: "unsupported" };
}

async function generateCompletion(options: {
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

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getApiSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  if (!session) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as QueryRequestBody;
  const question = body.question?.trim();

  if (!question) {
    return NextResponse.json({ message: "question is required." }, { status: 400 });
  }

  const intent = parseQuestionIntent(question);

  try {
    if (intent.type === "missing_order_id") {
      return NextResponse.json({
        answer: "Please include the order id. This first version supports order history and order detail queries by order id.",
        sources: [],
      });
    }

    if (intent.type === "unsupported") {
      return NextResponse.json({
        answer:
          "This first version currently supports order history and order detail queries.",
        sources: [],
      });
    }

    if (intent.type === "order_history") {
      const result = intent.useClientHistory
        ? await getClientOrderHistory(intent.filters)
        : await getOrderHistory(intent.filters);
      const prompt = buildOrderHistoryPrompt(question, result.context);
      const answer = await generateCompletion({
        system: prompt.system,
        user: prompt.user,
        fallbackAnswer: buildOrderHistoryFallbackAnswer(result.context),
      });

      return NextResponse.json({
        answer,
        sources: result.sources,
      });
    }

    const result = await getOrderDetails(intent.orderId);
    const prompt = buildOrderDetailPrompt(question, result.context);
    const answer = await generateCompletion({
      system: prompt.system,
      user: prompt.user,
      fallbackAnswer: buildOrderDetailFallbackAnswer(result.context),
    });

    return NextResponse.json({
      answer,
      sources: result.sources,
    });
  } catch (error) {
    console.error("AI query route failed", {
      message: error instanceof Error ? error.message : "Unknown AI query failure",
    });

    return NextResponse.json({
      answer: "I couldn't retrieve Bamboo order data right now. Please try again in a moment.",
      sources: [],
    });
  }
}
