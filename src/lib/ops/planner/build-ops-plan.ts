import type { ExecutionPlan, PlannerCandidate } from "@/lib/ops/planner/plan-types";
import { buildPlannerQuestionContext } from "@/lib/ops/planner/planner-context";
import { buildAwsRuleCandidates } from "@/lib/ops/planner/rules/aws-rules";
import {
  augmentCandidatesWithKnowledge,
  buildKnowledgeRuleCandidates,
} from "@/lib/ops/planner/rules/knowledge-rules";
import { buildOrderRuleCandidates } from "@/lib/ops/planner/rules/order-rules";
import { buildReconciliationRuleCandidates } from "@/lib/ops/planner/rules/reconciliation-rules";
import { buildUnsupportedPlan, selectBestCandidate } from "@/lib/ops/planner/planner-utils";

function collectCandidates(question: string): PlannerCandidate[] {
  const context = buildPlannerQuestionContext(question);
  const baseCandidates = [
    ...buildOrderRuleCandidates(context),
    ...buildReconciliationRuleCandidates(context),
    ...buildAwsRuleCandidates(context),
    ...buildKnowledgeRuleCandidates(context),
  ];

  return augmentCandidatesWithKnowledge(baseCandidates, context);
}

export function buildOpsPlan(question: string): ExecutionPlan {
  const context = buildPlannerQuestionContext(question);
  const candidates = collectCandidates(question);
  const selectedPlan = selectBestCandidate(candidates, context);

  return selectedPlan ?? buildUnsupportedPlan(context);
}
