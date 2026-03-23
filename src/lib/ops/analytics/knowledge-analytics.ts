import type { NormalizedKnowledgeSearchResults } from "@/lib/knowledge/types";
import type { KnowledgeSummary, OpsAnalytics } from "@/lib/ops/analytics/analytics-types";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function addUnique(values: string[], value: string | undefined) {
  if (!value || values.includes(value)) {
    return;
  }

  values.push(value);
}

export function isNormalizedKnowledgeSearchResults(
  value: unknown
): value is NormalizedKnowledgeSearchResults {
  return (
    isRecord(value) &&
    typeof value.query === "string" &&
    typeof value.returnedCount === "number" &&
    Array.isArray(value.results)
  );
}

export function hasKnowledgePackedData(data: PackedOrderData) {
  return Boolean(data.knowledgeResults || data.docGuidance || data.runbookMatches);
}

export function analyzeKnowledgeContext(
  context: PackedOpsContext<PackedOrderData>
): OpsAnalytics {
  const knowledgeResults = isNormalizedKnowledgeSearchResults(context.data.knowledgeResults)
    ? context.data.knowledgeResults
    : undefined;
  const topTitles = knowledgeResults?.results.slice(0, 3).map((result) => result.title) ?? [];
  const guidancePoints: string[] = [];

  for (const result of knowledgeResults?.results ?? []) {
    for (const point of result.guidancePoints) {
      addUnique(guidancePoints, point);
      if (guidancePoints.length >= 4) {
        break;
      }
    }

    if (guidancePoints.length >= 4) {
      break;
    }
  }

  const knowledgeSummary: KnowledgeSummary = {
    returnedCount: knowledgeResults?.returnedCount ?? 0,
    hasRunbookMatch: knowledgeResults?.hasRunbookMatch ?? false,
    bestScore: knowledgeResults?.bestScore,
    topTitles,
    guidancePoints,
  };
  const patterns: string[] = [];
  const nextChecks: string[] = [];
  const examples = topTitles.slice(0, 3);

  if (!knowledgeResults) {
    return {
      domain: context.domain,
      intent: context.intent,
      summary: "No successful knowledge-doc data was available.",
      patterns,
      nextChecks,
      examples: [],
      notes: context.notes,
      knowledgeSummary,
    };
  }

  if (knowledgeResults.returnedCount === 0) {
    addUnique(patterns, "I did not find a matching runbook or SOP in the current knowledge docs.");
  } else if (knowledgeResults.hasRunbookMatch) {
    addUnique(patterns, "I found a matching runbook or SOP in the internal knowledge docs.");
  } else {
    addUnique(patterns, "I found related internal knowledge docs for this issue.");
  }

  if (knowledgeResults.bestScore !== undefined) {
    addUnique(patterns, `Best document relevance score was ${knowledgeResults.bestScore}.`);
  }

  for (const title of topTitles) {
    addUnique(patterns, `Matching doc: ${title}`);
  }

  for (const point of guidancePoints) {
    addUnique(nextChecks, point);
  }

  if (
    context.notes.some((note) => {
      const normalized = note.toLowerCase();
      return normalized.includes("knowledge") && normalized.includes("unavailable");
    })
  ) {
    addUnique(nextChecks, "the internal docs that could not be retrieved");
  }

  return {
    domain: context.domain,
    intent: context.intent,
    summary: patterns[0] ?? "No successful knowledge-doc data was available.",
    patterns: patterns.slice(1),
    nextChecks,
    examples,
    notes: context.notes,
    knowledgeSummary,
  };
}
