import type { OpsDomain } from "@/lib/ops/types";

export type PlanIntent = string;

export interface PlannedToolCall {
  toolName: string;
  reason: string;
  params: Record<string, unknown>;
}

export interface ExecutionPlan {
  intent: PlanIntent;
  domain: OpsDomain;
  entities: Record<string, unknown>;
  tools: PlannedToolCall[];
  confidence?: number;
  notes?: string[];
}
