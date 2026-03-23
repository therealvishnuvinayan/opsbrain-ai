import type { AnswerConfidenceLevel } from "@/lib/ops/answer/answer-types";
import type { OpsQueryTrace } from "@/lib/ops/observability/trace-types";

export function deriveAnswerConfidence(trace: OpsQueryTrace): AnswerConfidenceLevel {
  const successfulTools = trace.toolCalls.filter((tool) => tool.status === "success").length;

  if (
    trace.flags.noMeaningfulData ||
    trace.flags.onlyFallbackUsed ||
    trace.flags.tooManyToolFailures ||
    trace.flags.lowPlannerConfidence
  ) {
    return "limited";
  }

  if (
    trace.flags.usedFallback ||
    trace.flags.partialData ||
    trace.flags.onlyKnowledgeUsed ||
    trace.flags.noLiveDataUsed ||
    successfulTools <= 1 ||
    (trace.plannerConfidence ?? 1) < 0.8
  ) {
    return "medium";
  }

  return "high";
}
