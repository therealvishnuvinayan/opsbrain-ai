import { type ExecutePlanOptions } from "@/lib/ops/executor/execute-plan";
import { buildAndExecuteOrderPlan } from "@/lib/ops/executor/run-order-plan";

import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";
import { packExecutionContext } from "@/lib/ops/context/pack-execution-context";

export async function buildAndPackOrderContext(
  question: string,
  options?: ExecutePlanOptions
): Promise<PackedOpsContext<PackedOrderData>> {
  const execution = await buildAndExecuteOrderPlan(question, options);
  return packExecutionContext(execution.plan, execution) as PackedOpsContext<PackedOrderData>;
}
