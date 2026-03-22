import type { ExecutionPlan } from "@/lib/ops/planner/plan-types";

export type ToolExecutionStatus = "success" | "error" | "skipped";

export interface ToolExecutionError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ToolExecutionSource {
  type: string;
  endpoint?: string;
  [key: string]: unknown;
}

export interface ToolExecutionResult {
  toolName: string;
  status: ToolExecutionStatus;
  params: Record<string, unknown>;
  data?: unknown;
  sources?: ToolExecutionSource[];
  error?: ToolExecutionError;
  durationMs?: number;
}

export interface ExecutionRunResult {
  plan: ExecutionPlan;
  results: ToolExecutionResult[];
  errors?: ToolExecutionError[];
}
