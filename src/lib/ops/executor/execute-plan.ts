import type { ExecutionPlan, PlannedToolCall } from "@/lib/ops/planner/plan-types";
import type { RegisteredToolDefinition } from "@/lib/ops/tools/tool-types";

import type {
  ExecutionRunResult,
  ToolExecutionError,
  ToolExecutionResult,
  ToolExecutionSource,
} from "@/lib/ops/executor/execution-types";

export interface ExecutePlanOptions {
  resolveToolDefinition?: (
    toolName: string
  ) => RegisteredToolDefinition | undefined | Promise<RegisteredToolDefinition | undefined>;
}

interface ToolOutputShape {
  data?: unknown;
  sources?: ToolExecutionSource[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toExecutionError(
  code: string,
  message: string,
  details?: Record<string, unknown>
): ToolExecutionError {
  return {
    code,
    message,
    details,
  };
}

function isMissingParamValue(value: unknown) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "string" && value.trim().length === 0)
  );
}

function normalizeSources(value: unknown) {
  if (!Array.isArray(value)) {
    return undefined;
  }

  const sources = value.filter(isRecord).map((source) => ({
    ...source,
    type: typeof source.type === "string" ? source.type : "unknown",
    endpoint: typeof source.endpoint === "string" ? source.endpoint : undefined,
  }));

  return sources.length > 0 ? sources : undefined;
}

function normalizeToolOutput(output: unknown): ToolOutputShape {
  if (!isRecord(output)) {
    return { data: output };
  }

  const sources = normalizeSources(output.sources);
  const data = Object.prototype.hasOwnProperty.call(output, "context") ? output.context : output;

  return { data, sources };
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unknown tool execution error.";
}

export function validateToolParams(
  tool: RegisteredToolDefinition,
  params: Record<string, unknown>
) {
  const missingParams = tool.requiredParams.filter((paramName) =>
    isMissingParamValue(params[paramName])
  );

  return {
    isValid: missingParams.length === 0,
    missingParams,
  };
}

async function resolveRegisteredTool(
  toolName: string,
  options: ExecutePlanOptions
): Promise<RegisteredToolDefinition | undefined> {
  if (options.resolveToolDefinition) {
    return options.resolveToolDefinition(toolName);
  }

  const { getToolDefinition } = await import("@/lib/ops/tools/tool-registry");
  return getToolDefinition(toolName);
}

export async function executeToolCall(
  toolCall: PlannedToolCall,
  options: ExecutePlanOptions = {}
): Promise<ToolExecutionResult> {
  const startedAt = Date.now();
  const params = { ...toolCall.params };
  const tool = await resolveRegisteredTool(toolCall.toolName, options);

  if (!tool) {
    return {
      toolName: toolCall.toolName,
      status: "error",
      params,
      durationMs: Date.now() - startedAt,
      error: toExecutionError("tool_not_found", `Tool "${toolCall.toolName}" is not registered.`, {
        toolName: toolCall.toolName,
      }),
    };
  }

  const validation = validateToolParams(tool, params);
  if (!validation.isValid) {
    return {
      toolName: toolCall.toolName,
      status: "error",
      params,
      durationMs: Date.now() - startedAt,
      error: toExecutionError(
        "missing_required_params",
        `Tool "${toolCall.toolName}" is missing required params: ${validation.missingParams.join(", ")}.`,
        {
          toolName: toolCall.toolName,
          missingParams: validation.missingParams,
        }
      ),
    };
  }

  try {
    const output = await tool.execute(params);
    const normalized = normalizeToolOutput(output);

    return {
      toolName: toolCall.toolName,
      status: "success",
      params,
      data: normalized.data,
      sources: normalized.sources,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    return {
      toolName: toolCall.toolName,
      status: "error",
      params,
      durationMs: Date.now() - startedAt,
      error: toExecutionError(
        "tool_execution_failed",
        `Tool "${toolCall.toolName}" failed: ${getErrorMessage(error)}.`,
        {
          toolName: toolCall.toolName,
        }
      ),
    };
  }
}

export function summarizeExecutionFailures(results: ToolExecutionResult[]) {
  const errors = results
    .filter((result) => result.status === "error" && result.error)
    .map((result) => result.error as ToolExecutionError);

  return errors.length > 0 ? errors : undefined;
}

export async function executePlan(
  plan: ExecutionPlan,
  options: ExecutePlanOptions = {}
): Promise<ExecutionRunResult> {
  const results: ToolExecutionResult[] = [];

  for (const toolCall of plan.tools) {
    results.push(await executeToolCall(toolCall, options));
  }

  return {
    plan,
    results,
    errors: summarizeExecutionFailures(results),
  };
}
