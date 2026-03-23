import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { generateCompletion } from "@/lib/ai/query";
import { runOpsQuery } from "@/lib/ops/orchestrator/run-ops-query";

interface QueryRequestBody {
  question?: string;
  conversationId?: string;
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

  try {
    const result = await runOpsQuery(question);

    if (
      result.type === "missing_order_id" ||
      result.type === "missing_history_id" ||
      result.type === "unsupported"
    ) {
      return NextResponse.json({
        answer: result.answer,
        sources: result.sources,
      });
    }

    if (result.useFallbackOnly) {
      return NextResponse.json({
        answer: result.fallbackAnswer,
        sources: result.sources,
      });
    }

    const answer = await generateCompletion({
      system: result.prompt.system,
      user: result.prompt.user,
      fallbackAnswer: result.fallbackAnswer,
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
      answer: "I couldn't retrieve Bamboo ops data right now. Please try again in a moment.",
      sources: [],
    });
  }
}
