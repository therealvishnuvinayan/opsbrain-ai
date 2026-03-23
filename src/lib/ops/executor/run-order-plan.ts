import { executePlan, type ExecutePlanOptions } from "@/lib/ops/executor/execute-plan";
import type { ExecutionRunResult } from "@/lib/ops/executor/execution-types";
import { buildOpsPlan } from "@/lib/ops/planner/build-ops-plan";

export async function buildAndExecuteOrderPlan(
  question: string,
  options?: ExecutePlanOptions
): Promise<ExecutionRunResult> {
  const plan = buildOpsPlan(question);
  return executePlan(plan, options);
}
