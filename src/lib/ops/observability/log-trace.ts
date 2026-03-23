import type { OpsQueryTrace } from "@/lib/ops/observability/trace-types";

export function logOpsQueryTrace(trace: OpsQueryTrace) {
  console.info("Ops query trace", {
    queryId: trace.queryId,
    resultType: trace.resultType,
    intent: trace.intent,
    selectedDomains: trace.selectedDomains,
    matchedSignals: trace.matchedSignals,
    plannerConfidence: trace.plannerConfidence,
    toolCalls: trace.toolCalls.map((tool) => ({
      toolName: tool.toolName,
      status: tool.status,
      durationMs: tool.durationMs,
      domain: tool.domain,
      sourceType: tool.sourceType,
      errorCode: tool.errorCode,
    })),
    timings: trace.timings,
    flags: trace.flags,
    sourcesCount: trace.sourcesCount,
    notes: trace.notes.slice(0, 5),
    analyticsSummary: trace.analyticsSummary,
  });
}
