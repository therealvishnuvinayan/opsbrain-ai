import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { generateCompletion } from "@/lib/ai/query";
import { buildAnswerEnvelope } from "@/lib/ops/answer/build-answer-envelope";
import { logOpsQueryTrace } from "@/lib/ops/observability/log-trace";
import { withTraceLlmResult } from "@/lib/ops/observability/build-trace";
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
    const routeStartMs = performance.now();
    const result = await runOpsQuery(question);

    if (
      result.type === "missing_order_id" ||
      result.type === "missing_history_id" ||
      result.type === "unsupported"
    ) {
      const finalTrace = withTraceLlmResult(result.trace, {
        llmMs: 0,
        totalMs: Math.round(performance.now() - routeStartMs),
        usedFallback: false,
        noMeaningfulData: true,
      });
      const envelope = buildAnswerEnvelope({
        answer: result.answer,
        trace: finalTrace,
      });

      logOpsQueryTrace(
        finalTrace
      );
      console.info("AI query route completed", {
        resultType: result.type,
        sourceCount: result.sources.length,
      });
      return NextResponse.json({
        answer: envelope.answer,
        sources: result.sources,
        confidence: envelope.confidence,
        basedOn: envelope.basedOn,
        notes: envelope.notes,
        sourceLabels: envelope.sourceLabels,
        partialData: envelope.partialData,
      });
    }

    if (result.useFallbackOnly) {
      const finalTrace = withTraceLlmResult(result.trace, {
        llmMs: 0,
        totalMs: Math.round(performance.now() - routeStartMs),
        usedFallback: true,
        noMeaningfulData: true,
      });
      const envelope = buildAnswerEnvelope({
        answer: result.fallbackAnswer,
        trace: finalTrace,
        analytics: result.analytics,
        packedContext: result.packedContext,
      });

      logOpsQueryTrace(
        finalTrace
      );
      console.info("AI query route completed", {
        resultType: result.type,
        usedFallback: true,
        sourceCount: result.sources.length,
      });
      return NextResponse.json({
        answer: envelope.answer,
        sources: result.sources,
        confidence: envelope.confidence,
        basedOn: envelope.basedOn,
        notes: envelope.notes,
        sourceLabels: envelope.sourceLabels,
        partialData: envelope.partialData,
      });
    }

    const llmStartMs = performance.now();
    const rawAnswer = await generateCompletion({
      system: result.prompt.system,
      user: result.prompt.user,
      fallbackAnswer: result.fallbackAnswer,
    });
    const llmMs = Math.round(performance.now() - llmStartMs);
    const usedFallback = rawAnswer === result.fallbackAnswer;
    const finalTrace = withTraceLlmResult(result.trace, {
      llmMs,
      totalMs: Math.round(performance.now() - routeStartMs),
      usedFallback,
      noMeaningfulData: result.useFallbackOnly ?? false,
    });
    const envelope = buildAnswerEnvelope({
      answer: rawAnswer,
      trace: finalTrace,
      analytics: result.analytics,
      packedContext: result.packedContext,
    });

    logOpsQueryTrace(
      finalTrace
    );
    console.info("AI query route completed", {
      resultType: result.type,
      usedFallback,
      sourceCount: result.sources.length,
    });

    return NextResponse.json({
      answer: envelope.answer,
      sources: result.sources,
      confidence: envelope.confidence,
      basedOn: envelope.basedOn,
      notes: envelope.notes,
      sourceLabels: envelope.sourceLabels,
      partialData: envelope.partialData,
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
