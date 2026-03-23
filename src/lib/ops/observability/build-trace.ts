import { getToolDefinition } from "@/lib/ops/tools/tool-registry";

import type { BuildTraceInput, OpsQueryTrace, QueryResultFlags, ToolTrace } from "@/lib/ops/observability/trace-types";

function dedupeNotes(values: string[]) {
  return values.filter((value, index) => values.indexOf(value) === index);
}

function buildToolTraces(input: BuildTraceInput): ToolTrace[] {
  return (input.execution?.results ?? []).map((result) => {
    const toolDefinition = getToolDefinition(result.toolName);

    return {
      toolName: result.toolName,
      status: result.status,
      durationMs: result.durationMs,
      domain: toolDefinition?.domain,
      sourceType: toolDefinition?.sourceType,
      errorCode: result.error?.code,
      sourceCount: result.sources?.length ?? 0,
      partialSuccess: result.status === "partial_success",
    };
  });
}

function hasMeaningfulPackedData(input: BuildTraceInput) {
  return Boolean(
    input.packedContext?.data.history ||
      input.packedContext?.data.order ||
      input.packedContext?.data.billing ||
      input.packedContext?.data.cards ||
      input.packedContext?.data.items ||
      input.packedContext?.data.audit ||
      input.packedContext?.data.reconciliationStatus ||
      input.packedContext?.data.bufferedRecords ||
      input.packedContext?.data.reconciledRecords ||
      input.packedContext?.data.invalidProductBrandCards ||
      input.packedContext?.data.expiredCards ||
      input.packedContext?.data.reconciliationSummary ||
      input.packedContext?.data.awsLogs ||
      input.packedContext?.data.serviceHealth ||
      input.packedContext?.data.infraSummary ||
      input.packedContext?.data.knowledgeResults ||
      input.packedContext?.data.docGuidance ||
      input.packedContext?.data.runbookMatches
  );
}

function buildFlags(input: BuildTraceInput, toolCalls: ToolTrace[]): QueryResultFlags {
  const failedToolCount = toolCalls.filter((tool) => tool.status === "error").length;
  const partialToolCount = toolCalls.filter((tool) => tool.partialSuccess).length;
  const knowledgeOnly =
    (input.plan?.selectedDomains?.length ?? 0) === 1 && input.plan?.selectedDomains?.[0] === "knowledge";
  const liveDataUsed = toolCalls.some((tool) => tool.domain !== "knowledge" && tool.status !== "error");
  const noMeaningfulData = input.noMeaningfulData ?? !hasMeaningfulPackedData(input);
  const usedFallback = Boolean(input.usedFallback);

  return {
    usedFallback,
    partialData: partialToolCount > 0 || failedToolCount > 0,
    noMeaningfulData,
    plannerUnsupported: input.resultType === "unsupported",
    knowledgeOnly,
    liveDataUsed,
    tooManyToolFailures: toolCalls.length > 0 && failedToolCount >= Math.ceil(toolCalls.length / 2),
    onlyFallbackUsed: usedFallback && noMeaningfulData,
    onlyKnowledgeUsed: knowledgeOnly && !liveDataUsed,
    noLiveDataUsed: !liveDataUsed,
    lowPlannerConfidence: (input.plan?.confidence ?? 1) < 0.55,
  };
}

export function buildOpsQueryTrace(input: BuildTraceInput): OpsQueryTrace {
  const toolCalls = buildToolTraces(input);
  const flags = buildFlags(input, toolCalls);

  return {
    queryId: input.queryId,
    question: input.question,
    resultType: input.resultType,
    intent: input.plan?.intent,
    selectedDomains: input.plan?.selectedDomains ?? (input.plan?.domain ? [input.plan.domain] : []),
    matchedSignals: input.plan?.matchedSignals ?? [],
    plannerConfidence: input.plan?.confidence,
    toolCalls,
    timings: {
      planningMs: input.timings.planningMs,
      executionMs: input.timings.executionMs,
      packingMs: input.timings.packingMs,
      analyticsMs: input.timings.analyticsMs,
      llmMs: input.llmMs ?? 0,
      totalMs: input.totalMs,
    },
    flags,
    sourcesCount: input.packedContext?.sources.length ?? 0,
    notes: dedupeNotes([
      ...(input.plan?.notes ?? []),
      ...(input.packedContext?.notes ?? []),
    ]).slice(0, 10),
    analyticsSummary: input.analytics?.summary,
  };
}

export function withTraceLlmResult(
  trace: OpsQueryTrace,
  input: {
    llmMs: number;
    totalMs: number;
    usedFallback: boolean;
    noMeaningfulData?: boolean;
  }
): OpsQueryTrace {
  const nextTrace: OpsQueryTrace = {
    ...trace,
    timings: {
      ...trace.timings,
      llmMs: input.llmMs,
      totalMs: input.totalMs,
    },
  };

  nextTrace.flags = {
    ...nextTrace.flags,
    usedFallback: input.usedFallback,
    noMeaningfulData: input.noMeaningfulData ?? nextTrace.flags.noMeaningfulData,
    onlyFallbackUsed:
      input.usedFallback && (input.noMeaningfulData ?? nextTrace.flags.noMeaningfulData),
  };

  return nextTrace;
}
