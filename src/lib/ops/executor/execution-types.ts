import type { ExecutionPlan } from "@/lib/ops/planner/plan-types";

export type ToolExecutionStatus = "success" | "partial_success" | "error" | "skipped";

export type ToolExecutionErrorCode =
  | "network_error"
  | "permission_denied"
  | "not_found"
  | "validation_error"
  | "unknown_error";

export interface ToolExecutionError {
  code: ToolExecutionErrorCode;
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
  partialErrors?: ToolExecutionError[];
}
