import type { OpsDomain } from "@/lib/ops/types";

export interface PackedSource {
  type: string;
  endpoint?: string;
  label?: string;
}

export interface PackedExecutionSummary {
  successfulTools: string[];
  partialSuccessTools?: string[];
  failedTools: string[];
  skippedTools?: string[];
  totalTools: number;
}

export interface PackedOrderData {
  history?: unknown;
  order?: unknown;
  billing?: unknown;
  cards?: unknown;
  items?: unknown;
  audit?: unknown;
  reconciliationStatus?: unknown;
  bufferedRecords?: unknown;
  reconciledRecords?: unknown;
  invalidProductBrandCards?: unknown;
  expiredCards?: unknown;
  reconciliationSummary?: unknown;
}

export interface PackedOpsContext<TData = Record<string, unknown>> {
  domain: OpsDomain;
  intent: string;
  entities: Record<string, unknown>;
  executionSummary: PackedExecutionSummary;
  data: TData;
  sources: PackedSource[];
  notes: string[];
}
