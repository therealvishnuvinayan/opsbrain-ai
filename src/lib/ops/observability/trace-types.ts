import type { OpsAnalytics } from "@/lib/ops/analytics/analytics-types";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";
import type { ExecutionRunResult, ToolExecutionStatus } from "@/lib/ops/executor/execution-types";
import type { ExecutionPlan } from "@/lib/ops/planner/plan-types";
import type { OpsDomain, ToolSourceType } from "@/lib/ops/types";

export interface ToolTrace {
  toolName: string;
  status: ToolExecutionStatus;
  durationMs?: number;
  domain?: OpsDomain;
  sourceType?: ToolSourceType;
  errorCode?: string;
  sourceCount: number;
  partialSuccess: boolean;
}

export interface QueryTimingSummary {
  planningMs: number;
  executionMs: number;
  packingMs: number;
  analyticsMs: number;
  llmMs: number;
  totalMs: number;
}

export interface QueryResultFlags {
  usedFallback: boolean;
  partialData: boolean;
  noMeaningfulData: boolean;
  plannerUnsupported: boolean;
  knowledgeOnly: boolean;
  liveDataUsed: boolean;
  tooManyToolFailures: boolean;
  onlyFallbackUsed: boolean;
  onlyKnowledgeUsed: boolean;
  noLiveDataUsed: boolean;
  lowPlannerConfidence: boolean;
}

export interface OpsQueryTrace {
  queryId: string;
  question: string;
  resultType: "resolved" | "unsupported" | "missing_order_id" | "missing_history_id" | "legacy_resolved";
  intent?: string;
  selectedDomains: OpsDomain[];
  matchedSignals: string[];
  plannerConfidence?: number;
  toolCalls: ToolTrace[];
  timings: QueryTimingSummary;
  flags: QueryResultFlags;
  sourcesCount: number;
  notes: string[];
  analyticsSummary?: string;
}

export interface BuildTraceInput {
  queryId: string;
  question: string;
  resultType: OpsQueryTrace["resultType"];
  plan?: ExecutionPlan;
  execution?: ExecutionRunResult;
  packedContext?: PackedOpsContext<PackedOrderData>;
  analytics?: OpsAnalytics;
  usedFallback?: boolean;
  llmMs?: number;
  totalMs: number;
  timings: Omit<QueryTimingSummary, "llmMs" | "totalMs">;
  noMeaningfulData?: boolean;
}
