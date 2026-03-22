import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import {
  getNormalizedSystemHealth,
  isSystemHealthQuestion,
} from "@/lib/bamboo/system-health";
import {
  buildSystemHealthFallbackAnswer,
  buildSystemHealthPrompt,
} from "@/lib/ai/system-health-prompt";

interface QueryRequestBody {
  question?: string;
  conversationId?: string;
}

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

async function generateSystemHealthAnswer(question: string) {
  const context = await getNormalizedSystemHealth();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!apiKey) {
    return {
      answer: buildSystemHealthFallbackAnswer(context),
      sources: [{ type: "swagger" as const, endpoint: "/api/v1.0/BackgroundJob/state" }],
    };
  }

  const prompt = buildSystemHealthPrompt(question, context);

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
          { role: "system", content: prompt.system },
          { role: "user", content: prompt.user },
        ],
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const message = await response.text().catch(() => "");
      console.error("OpenAI system-health generation failed", {
        status: response.status,
        body: message.slice(0, 400),
      });
      return {
        answer: buildSystemHealthFallbackAnswer(context),
        sources: [{ type: "swagger" as const, endpoint: "/api/v1.0/BackgroundJob/state" }],
      };
    }

    const payload = (await response.json()) as OpenAIChatCompletionResponse;
    const answer = extractAssistantText(payload) || buildSystemHealthFallbackAnswer(context);

    return {
      answer,
      sources: [{ type: "swagger" as const, endpoint: "/api/v1.0/BackgroundJob/state" }],
    };
  } catch (error) {
    console.error("OpenAI system-health generation error", {
      message: error instanceof Error ? error.message : "Unknown OpenAI error",
    });

    return {
      answer: buildSystemHealthFallbackAnswer(context),
      sources: [{ type: "swagger" as const, endpoint: "/api/v1.0/BackgroundJob/state" }],
    };
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

  if (!isSystemHealthQuestion(question)) {
    return NextResponse.json({
      answer:
        "Phase 1 currently supports only Bamboo system health questions using the BackgroundJob state endpoint. Try asking about system status, health checks, or background job health.",
      sources: [],
    });
  }

  try {
    const result = await generateSystemHealthAnswer(question);
    return NextResponse.json(result);
  } catch (error) {
    console.error("AI query route failed", {
      message: error instanceof Error ? error.message : "Unknown AI query failure",
    });

    return NextResponse.json({
      answer:
        "I couldn't retrieve Bamboo system health right now. Please try again in a moment.",
      sources: [{ type: "swagger", endpoint: "/api/v1.0/BackgroundJob/state" }],
    });
  }
}
