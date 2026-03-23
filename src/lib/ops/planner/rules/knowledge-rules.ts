import type { PlannerCandidate, PlannerQuestionContext } from "@/lib/ops/planner/plan-types";
import {
  createCandidate,
  createKnowledgeOnlyPlan,
  withKnowledgeCandidate,
} from "@/lib/ops/planner/planner-utils";

export function buildKnowledgeRuleCandidates(
  context: PlannerQuestionContext
): PlannerCandidate[] {
  if (!context.signals.asksForKnowledge) {
    return [];
  }

  return [
    createCandidate({
      ruleName: "knowledge_only",
      entityStrength: context.orderId || context.historyId ? 1 : 0,
      plan: createKnowledgeOnlyPlan(context),
      scoreAdjustment: 0.01,
    }),
  ];
}

export function augmentCandidatesWithKnowledge(
  candidates: PlannerCandidate[],
  context: PlannerQuestionContext
) {
  if (!context.signals.asksForKnowledge) {
    return candidates;
  }

  const augmentedCandidates = candidates
    .filter((candidate) => candidate.plan.tools.length > 0)
    .map((candidate) => withKnowledgeCandidate(candidate, context));

  return [...candidates, ...augmentedCandidates];
}
