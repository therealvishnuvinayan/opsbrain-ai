import type { ExecutionPlan } from "@/lib/ops/planner/plan-types";
import { buildOpsPlan } from "@/lib/ops/planner/build-ops-plan";

export function buildOrderPlan(question: string): ExecutionPlan {
  return buildOpsPlan(question);
}
