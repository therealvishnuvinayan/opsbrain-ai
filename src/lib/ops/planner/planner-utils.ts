import { OPS_TOOL_NAMES } from "@/lib/ops/tools/tool-types";
import type { OpsDomain } from "@/lib/ops/types";

import type {
  ExecutionPlan,
  PlannedToolCall,
  PlannerCandidate,
  PlannerQuestionContext,
} from "@/lib/ops/planner/plan-types";
import { buildKnowledgeTags, inferKnowledgeDomain } from "@/lib/ops/planner/planner-context";

function addUnique(values: string[], value: string | undefined) {
  if (!value || values.includes(value)) {
    return;
  }

  values.push(value);
}

export function buildToolCall(
  toolName: string,
  reason: string,
  params: Record<string, unknown>
): PlannedToolCall {
  return {
    toolName,
    reason,
    params,
  };
}

function dedupeToolCalls(tools: PlannedToolCall[]) {
  const seen = new Set<string>();
  const deduped: PlannedToolCall[] = [];

  for (const tool of tools) {
    const key = `${tool.toolName}:${JSON.stringify(tool.params)}`;

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    deduped.push(tool);
  }

  return deduped;
}

export function createExecutionPlan(input: {
  intent: string;
  domain: OpsDomain;
  entities?: Record<string, unknown>;
  tools?: PlannedToolCall[];
  confidence: number;
  matchedSignals?: string[];
  selectedDomains?: OpsDomain[];
  notes?: string[];
}): ExecutionPlan {
  return {
    intent: input.intent,
    domain: input.domain,
    entities: input.entities ?? {},
    tools: dedupeToolCalls(input.tools ?? []),
    confidence: input.confidence,
    matchedSignals: input.matchedSignals ?? [],
    selectedDomains: input.selectedDomains ?? [input.domain],
    notes: input.notes ?? [],
  };
}

export function createCandidate(input: {
  ruleName: string;
  plan: ExecutionPlan;
  entityStrength: number;
  unnecessaryToolPenalty?: number;
  scoreAdjustment?: number;
}): PlannerCandidate {
  const unnecessaryToolPenalty = input.unnecessaryToolPenalty ?? 0;
  const toolPenalty = Math.max(0, input.plan.tools.length - 2) * 0.01;
  const score =
    (input.plan.confidence ?? 0) +
    input.entityStrength * 0.02 +
    (input.scoreAdjustment ?? 0) -
    unnecessaryToolPenalty -
    toolPenalty;

  return {
    ruleName: input.ruleName,
    plan: input.plan,
    score: Number(score.toFixed(4)),
    entityStrength: input.entityStrength,
    unnecessaryToolPenalty,
  };
}

export function mergeSelectedDomains(...domainLists: Array<OpsDomain[] | undefined>) {
  const selectedDomains: OpsDomain[] = [];

  for (const domainList of domainLists) {
    for (const domain of domainList ?? []) {
      if (!selectedDomains.includes(domain)) {
        selectedDomains.push(domain);
      }
    }
  }

  return selectedDomains;
}

export function withKnowledgeCandidate(
  candidate: PlannerCandidate,
  context: PlannerQuestionContext
): PlannerCandidate {
  const tags = buildKnowledgeTags(context.question);
  const knowledgeTool = buildToolCall(
    OPS_TOOL_NAMES.searchKnowledgeDocs,
    "Search internal runbooks, SOPs, and troubleshooting docs relevant to this question.",
    {
      query: context.question,
      maxResults: candidate.plan.tools.length > 0 ? 4 : 5,
      domain: inferKnowledgeDomain(context.question, candidate.plan.domain),
      tags: tags.length > 0 ? tags : undefined,
    }
  );

  const matchedSignals = [...(candidate.plan.matchedSignals ?? [])];
  addUnique(matchedSignals, "knowledge");
  const notes = [...(candidate.plan.notes ?? [])];
  notes.push("Deterministic knowledge-doc retrieval added because the question asks for guidance.");
  notes.push(`Candidate selected from ${candidate.ruleName} and augmented with knowledge guidance.`);

  const plan = createExecutionPlan({
    ...candidate.plan,
    tools: [...candidate.plan.tools, knowledgeTool],
    matchedSignals,
    selectedDomains: mergeSelectedDomains(candidate.plan.selectedDomains, ["knowledge"]),
    notes,
    confidence: Math.min(0.99, (candidate.plan.confidence ?? 0) + 0.03),
  });

  return createCandidate({
    ruleName: `${candidate.ruleName}+knowledge`,
    plan,
    entityStrength: candidate.entityStrength,
    scoreAdjustment: 0.03,
  });
}

export function createKnowledgeOnlyPlan(context: PlannerQuestionContext): ExecutionPlan {
  const tags = buildKnowledgeTags(context.question);

  return createExecutionPlan({
    intent: "knowledge_guidance",
    domain: "knowledge",
    entities: {
      domain: inferKnowledgeDomain(context.question, "knowledge") ?? null,
      includeKnowledge: true,
    },
    tools: [
      buildToolCall(
        OPS_TOOL_NAMES.searchKnowledgeDocs,
        "Search internal runbooks, SOPs, and troubleshooting docs relevant to the question.",
        {
          query: context.question,
          maxResults: 5,
          domain: inferKnowledgeDomain(context.question, "knowledge"),
          tags: tags.length > 0 ? tags : undefined,
        }
      ),
    ],
    confidence: 0.82,
    matchedSignals: context.matchedSignals,
    selectedDomains: ["knowledge"],
    notes: ["Deterministic knowledge guidance plan based on runbook and SOP keywords."],
  });
}

export function buildUnsupportedPlan(context: PlannerQuestionContext): ExecutionPlan {
  return createExecutionPlan({
    intent: "unsupported",
    domain: "orders",
    entities: {
      extractedOrderId: context.orderId ?? null,
      extractedHistoryId: context.historyId ?? null,
      extractedServiceName: context.serviceName ?? null,
    },
    tools: [],
    confidence: 0.1,
    matchedSignals: context.matchedSignals,
    selectedDomains: ["orders"],
    notes: ["No supported deterministic planning rule matched the question."],
  });
}

export function selectBestCandidate(
  candidates: PlannerCandidate[],
  context: PlannerQuestionContext
): ExecutionPlan | undefined {
  if (candidates.length === 0) {
    return undefined;
  }

  const scoreWithCoverage = (candidate: PlannerCandidate) => {
    const coveredSignals = (candidate.plan.matchedSignals ?? []).filter((signal) =>
      context.matchedSignals.includes(signal)
    ).length;
    const coverageBonus = coveredSignals * 0.02;
    return candidate.score + coverageBonus;
  };

  const sorted = [...candidates].sort((left, right) => {
    const rightSelectionScore = scoreWithCoverage(right);
    const leftSelectionScore = scoreWithCoverage(left);

    if (rightSelectionScore !== leftSelectionScore) {
      return rightSelectionScore - leftSelectionScore;
    }

    if (right.entityStrength !== left.entityStrength) {
      return right.entityStrength - left.entityStrength;
    }

    const leftDomainCount = left.plan.selectedDomains?.length ?? 1;
    const rightDomainCount = right.plan.selectedDomains?.length ?? 1;

    if (leftDomainCount !== rightDomainCount) {
      return leftDomainCount - rightDomainCount;
    }

    if (left.plan.tools.length !== right.plan.tools.length) {
      return left.plan.tools.length - right.plan.tools.length;
    }

    return (right.plan.confidence ?? 0) - (left.plan.confidence ?? 0);
  });

  const selectedCandidate = sorted[0];
  const shouldTrimTools =
    (selectedCandidate.plan.confidence ?? 0) < 0.9 && selectedCandidate.plan.tools.length > 4;
  const trimmedTools = shouldTrimTools
    ? selectedCandidate.plan.tools.slice(0, 4)
    : selectedCandidate.plan.tools;

  return createExecutionPlan({
    ...selectedCandidate.plan,
    tools: trimmedTools,
    notes: [
      ...(selectedCandidate.plan.notes ?? []),
      ...(shouldTrimTools
        ? ["Tool selection was capped to keep a weak-confidence plan compact and relevant."]
        : []),
      `Deterministic candidate selection chose ${selectedCandidate.ruleName} from ${sorted.length} candidate plans.`,
      `Matched signals: ${(selectedCandidate.plan.matchedSignals ?? context.matchedSignals).join(", ") || "none"}.`,
      `Selected domains: ${(selectedCandidate.plan.selectedDomains ?? [selectedCandidate.plan.domain]).join(", ")}.`,
    ],
    confidence: Math.min(0.99, Number(scoreWithCoverage(selectedCandidate).toFixed(4))),
  });
}
