import { executePlan, type ExecutePlanOptions } from "@/lib/ops/executor/execute-plan";
import type { ExecutionRunResult } from "@/lib/ops/executor/execution-types";
import { buildOrderPlan } from "@/lib/ops/planner/build-order-plan";

export async function buildAndExecuteOrderPlan(
  question: string,
  options?: ExecutePlanOptions
): Promise<ExecutionRunResult> {
  const plan = buildOrderPlan(question);
  return executePlan(plan, options);
}
