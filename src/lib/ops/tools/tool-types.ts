import type { OpsDomain, ToolSourceType } from "@/lib/ops/types";

export const OPS_TOOL_NAMES = {
  getOrderHistory: "getOrderHistory",
  getClientOrderHistory: "getClientOrderHistory",
  getOrderDetails: "getOrderDetails",
  getOrderItemsInfo: "getOrderItemsInfo",
  getOrderCards: "getOrderCards",
  getBillingOrder: "getBillingOrder",
  getAuditLogs: "getAuditLogs",
  getAuditLogById: "getAuditLogById",
  getReconciliationStatus: "getReconciliationStatus",
  getBufferedRecords: "getBufferedRecords",
  getReconciledRecords: "getReconciledRecords",
  getInvalidProductBrandCards: "getInvalidProductBrandCards",
  getExpiredCards: "getExpiredCards",
  getSystemCardsSummaryReconcileSupplier: "getSystemCardsSummaryReconcileSupplier",
} as const;

type ToolParameterName<TParams extends object> = Extract<keyof TParams, string>;
type ToolParameterNames<TParams extends object> = readonly ToolParameterName<TParams>[];

export interface ToolDefinition<TParams extends object = Record<string, unknown>, TResult = unknown> {
  name: string;
  domain: OpsDomain;
  description: string;
  requiredParams: ToolParameterNames<TParams>;
  optionalParams?: ToolParameterNames<TParams>;
  sourceType: ToolSourceType;
  execute: (params: TParams) => Promise<TResult>;
}

export type RegisteredToolDefinition = ToolDefinition<any, any>;
