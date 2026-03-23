import type { ExecutionPlan, PlannedToolCall } from "@/lib/ops/planner/plan-types";
import type { RegisteredToolDefinition } from "@/lib/ops/tools/tool-types";

import type {
  ExecutionRunResult,
  ToolExecutionErrorCode,
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
  code: ToolExecutionErrorCode,
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

function classifyExecutionError(error: unknown) {
  if (error instanceof Error) {
    const message = error.message.trim();
    const lowerMessage = message.toLowerCase();
    const bambooStatus = "status" in error && typeof error.status === "number" ? error.status : undefined;
    const bambooPath = "path" in error && typeof error.path === "string" ? error.path : undefined;

    if (
      bambooStatus === 401 ||
      bambooStatus === 403 ||
      lowerMessage.includes("not authorized") ||
      lowerMessage.includes("permission") ||
      lowerMessage.includes("status 401") ||
      lowerMessage.includes("status 403")
    ) {
      return toExecutionError("permission_denied", "Access to this Bamboo endpoint is not permitted.", {
        status: bambooStatus,
        path: bambooPath,
      });
    }

    if (bambooStatus === 404 || lowerMessage.includes("status 404")) {
      return toExecutionError("not_found", "The requested Bamboo data was not found.", {
        status: bambooStatus,
        path: bambooPath,
      });
    }

    if (
      lowerMessage.includes("abort") ||
      lowerMessage.includes("timeout") ||
      lowerMessage.includes("network") ||
      lowerMessage.includes("fetch failed") ||
      lowerMessage.includes("econn") ||
      lowerMessage.includes("enotfound")
    ) {
      return toExecutionError("network_error", "The Bamboo request could not be completed.", {
        path: bambooPath,
      });
    }
  }

  return toExecutionError("unknown_error", getErrorMessage(error));
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
      error: toExecutionError("not_found", `Tool "${toolCall.toolName}" is not registered.`, {
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
        "validation_error",
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
    const normalizedError = classifyExecutionError(error);
    const status = normalizedError.code === "permission_denied" ? "partial_success" : "error";

    return {
      toolName: toolCall.toolName,
      status,
      params,
      durationMs: Date.now() - startedAt,
      error: {
        ...normalizedError,
        message:
          status === "partial_success"
            ? `Tool "${toolCall.toolName}" returned partial access: ${normalizedError.message}`
            : `Tool "${toolCall.toolName}" failed: ${normalizedError.message}`,
        details: {
          toolName: toolCall.toolName,
          ...(normalizedError.details ?? {}),
        },
      },
    };
  }
}

export function summarizeExecutionFailures(results: ToolExecutionResult[]) {
  const errors = results
    .filter((result) => result.status === "error" && result.error)
    .map((result) => result.error as ToolExecutionError);

  return errors.length > 0 ? errors : undefined;
}

export function summarizeExecutionPartialFailures(results: ToolExecutionResult[]) {
  const partialErrors = results
    .filter((result) => result.status === "partial_success" && result.error)
    .map((result) => result.error as ToolExecutionError);

  return partialErrors.length > 0 ? partialErrors : undefined;
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
    partialErrors: summarizeExecutionPartialFailures(results),
  };
}
