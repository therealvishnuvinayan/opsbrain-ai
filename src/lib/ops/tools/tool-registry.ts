import "server-only";

import {
  getAuditLogById,
  getAuditLogs,
  type AuditLogFilters,
  type NormalizedAuditLogEntry,
  type NormalizedAuditLogs,
} from "@/lib/bamboo/audit";
import {
  getCloudWatchLogs,
  type CloudWatchLogFilters,
  type NormalizedCloudWatchLogs,
} from "@/lib/aws/cloudwatch";
import {
  getServiceErrorSummary,
  type NormalizedServiceErrorSummary,
} from "@/lib/aws/service-health";
import {
  getClientOrderHistory,
  getOrderDetails,
  getOrderHistory,
  type NormalizedOrderDetail,
  type OrderHistoryFilters,
} from "@/lib/bamboo/orders";
import {
  getBufferedRecords,
  getExpiredCards,
  getInvalidProductBrandCards,
  getReconciledRecords,
  getReconciliationStatus,
  getSystemCardsSummaryReconcileSupplier,
  type NormalizedReconciliationRecords,
  type NormalizedReconciliationStatus,
  type NormalizedReconciliationSupplierSummary,
} from "@/lib/bamboo/reconciliation";
import {
  OPS_TOOL_NAMES,
  type RegisteredToolDefinition,
  type ToolDefinition,
} from "@/lib/ops/tools/tool-types";
import type { OpsDomain } from "@/lib/ops/types";

type OrderIdParams = {
  orderId: string;
};

type OrderHistoryResult = Awaited<ReturnType<typeof getOrderHistory>>;
type ClientOrderHistoryResult = Awaited<ReturnType<typeof getClientOrderHistory>>;
type OrderDetailResult = Awaited<ReturnType<typeof getOrderDetails>>;

type OrderItemsResult = {
  context: Pick<
    NormalizedOrderDetail,
    "checkedAt" | "orderId" | "itemCount" | "items" | "problematicItemStatuses" | "notableIssues"
  >;
  sources: OrderDetailResult["sources"];
};

type OrderCardsResult = {
  context: Pick<
    NormalizedOrderDetail,
    | "checkedAt"
    | "orderId"
    | "cardCount"
    | "cards"
    | "cardStatusCounts"
    | "problematicCardStatuses"
    | "missingCards"
    | "notableIssues"
  >;
  sources: OrderDetailResult["sources"];
};

type BillingOrderResult = {
  context: Pick<NormalizedOrderDetail, "checkedAt" | "orderId" | "billingSummary" | "notableIssues">;
  sources: OrderDetailResult["sources"];
};

type AuditLogByIdParams = {
  id: string;
};

type AuditLogsResult = Awaited<ReturnType<typeof getAuditLogs>>;
type AuditLogByIdResult = {
  context: NormalizedAuditLogEntry | undefined;
  sources: Array<{ type: "swagger"; endpoint: string }>;
};

type HistoryIdParams = {
  historyId: string;
};

type ReconciliationStatusResult = {
  context: NormalizedReconciliationStatus;
  sources: Array<{ type: "swagger"; endpoint: string }>;
};

type ReconciliationRecordsResult = {
  context: NormalizedReconciliationRecords;
  sources: Array<{ type: "swagger"; endpoint: string }>;
};

type ReconciliationSupplierSummaryResult = {
  context: NormalizedReconciliationSupplierSummary;
  sources: Array<{ type: "swagger"; endpoint: string }>;
};

type CloudWatchLogsResult = {
  context: NormalizedCloudWatchLogs;
  sources: Array<{ type: "aws"; endpoint: string }>;
};

type ServiceErrorSummaryResult = {
  context: NormalizedServiceErrorSummary;
  sources: Array<{ type: "aws"; endpoint: string }>;
};

function pickSources(
  sources: OrderDetailResult["sources"],
  matcher: (endpoint: string | undefined) => boolean
) {
  return sources.filter((source) => matcher(source.endpoint));
}

const getOrderHistoryTool: ToolDefinition<OrderHistoryFilters, OrderHistoryResult> = {
  name: OPS_TOOL_NAMES.getOrderHistory,
  domain: "orders",
  description: "Fetch recent Bamboo order history with optional filters.",
  requiredParams: [],
  optionalParams: ["PageSize", "PageIndex", "SearchText", "DateFrom", "DateTo", "Status", "SupplierId"],
  sourceType: "swagger",
  execute: getOrderHistory,
};

const getClientOrderHistoryTool: ToolDefinition<OrderHistoryFilters, ClientOrderHistoryResult> = {
  name: OPS_TOOL_NAMES.getClientOrderHistory,
  domain: "orders",
  description: "Fetch recent Bamboo client order history with optional filters.",
  requiredParams: [],
  optionalParams: ["PageSize", "PageIndex", "SearchText", "DateFrom", "DateTo", "Status", "SupplierId"],
  sourceType: "swagger",
  execute: getClientOrderHistory,
};

const getOrderDetailsTool: ToolDefinition<OrderIdParams, OrderDetailResult> = {
  name: OPS_TOOL_NAMES.getOrderDetails,
  domain: "orders",
  description: "Fetch a single Bamboo order and related order details by order id.",
  requiredParams: ["orderId"],
  sourceType: "swagger",
  execute: async ({ orderId }) => getOrderDetails(orderId),
};

const getOrderItemsInfoTool: ToolDefinition<OrderIdParams, OrderItemsResult> = {
  name: OPS_TOOL_NAMES.getOrderItemsInfo,
  domain: "orders",
  description: "Fetch item information for a Bamboo order.",
  requiredParams: ["orderId"],
  sourceType: "swagger",
  execute: async ({ orderId }) => {
    const result = await getOrderDetails(orderId);

    return {
      context: {
        checkedAt: result.context.checkedAt,
        orderId: result.context.orderId,
        itemCount: result.context.itemCount,
        items: result.context.items,
        problematicItemStatuses: result.context.problematicItemStatuses,
        notableIssues: result.context.notableIssues,
      },
      sources: pickSources(result.sources, (endpoint) => endpoint?.includes("orderItems-info") ?? false),
    };
  },
};

const getOrderCardsTool: ToolDefinition<OrderIdParams, OrderCardsResult> = {
  name: OPS_TOOL_NAMES.getOrderCards,
  domain: "orders",
  description: "Fetch card information and card status signals for a Bamboo order.",
  requiredParams: ["orderId"],
  sourceType: "swagger",
  execute: async ({ orderId }) => {
    const result = await getOrderDetails(orderId);

    return {
      context: {
        checkedAt: result.context.checkedAt,
        orderId: result.context.orderId,
        cardCount: result.context.cardCount,
        cards: result.context.cards,
        cardStatusCounts: result.context.cardStatusCounts,
        problematicCardStatuses: result.context.problematicCardStatuses,
        missingCards: result.context.missingCards,
        notableIssues: result.context.notableIssues,
      },
      sources: pickSources(result.sources, (endpoint) => endpoint?.includes("/cards") ?? false),
    };
  },
};

const getBillingOrderTool: ToolDefinition<OrderIdParams, BillingOrderResult> = {
  name: OPS_TOOL_NAMES.getBillingOrder,
  domain: "billing",
  description: "Fetch Bamboo billing information for an order by order id.",
  requiredParams: ["orderId"],
  sourceType: "swagger",
  execute: async ({ orderId }) => {
    const result = await getOrderDetails(orderId);

    return {
      context: {
        checkedAt: result.context.checkedAt,
        orderId: result.context.orderId,
        billingSummary: result.context.billingSummary,
        notableIssues: result.context.notableIssues,
      },
      sources: pickSources(result.sources, (endpoint) => endpoint?.includes("/Billing/orders/") ?? false),
    };
  },
};

const getAuditLogsTool: ToolDefinition<AuditLogFilters, AuditLogsResult> = {
  name: OPS_TOOL_NAMES.getAuditLogs,
  domain: "audit",
  description: "Fetch Bamboo audit logs with optional filters, including order-related activity.",
  requiredParams: [],
  optionalParams: [
    "PageSize",
    "PageIndex",
    "OrderId",
    "EntityId",
    "EntityType",
    "SearchText",
    "DateFrom",
    "DateTo",
    "EventType",
    "Severity",
  ],
  sourceType: "swagger",
  execute: getAuditLogs,
};

const getAuditLogByIdTool: ToolDefinition<AuditLogByIdParams, AuditLogByIdResult> = {
  name: OPS_TOOL_NAMES.getAuditLogById,
  domain: "audit",
  description: "Fetch a single Bamboo audit log event by id.",
  requiredParams: ["id"],
  sourceType: "swagger",
  execute: async ({ id }) => getAuditLogById(id),
};

const getReconciliationStatusTool: ToolDefinition<
  HistoryIdParams,
  ReconciliationStatusResult
> = {
  name: OPS_TOOL_NAMES.getReconciliationStatus,
  domain: "reconciliation",
  description: "Fetch the overall Bamboo reconciliation status for a reconciliation history id.",
  requiredParams: ["historyId"],
  sourceType: "swagger",
  execute: async ({ historyId }) => getReconciliationStatus(historyId),
};

const getBufferedRecordsTool: ToolDefinition<HistoryIdParams, ReconciliationRecordsResult> = {
  name: OPS_TOOL_NAMES.getBufferedRecords,
  domain: "reconciliation",
  description: "Fetch buffered reconciliation records for a reconciliation history id.",
  requiredParams: ["historyId"],
  sourceType: "swagger",
  execute: async ({ historyId }) => getBufferedRecords(historyId),
};

const getReconciledRecordsTool: ToolDefinition<HistoryIdParams, ReconciliationRecordsResult> = {
  name: OPS_TOOL_NAMES.getReconciledRecords,
  domain: "reconciliation",
  description: "Fetch reconciled records for a reconciliation history id.",
  requiredParams: ["historyId"],
  sourceType: "swagger",
  execute: async ({ historyId }) => getReconciledRecords(historyId),
};

const getInvalidProductBrandCardsTool: ToolDefinition<
  HistoryIdParams,
  ReconciliationRecordsResult
> = {
  name: OPS_TOOL_NAMES.getInvalidProductBrandCards,
  domain: "reconciliation",
  description: "Fetch invalid product-brand card issues for a reconciliation history id.",
  requiredParams: ["historyId"],
  sourceType: "swagger",
  execute: async ({ historyId }) => getInvalidProductBrandCards(historyId),
};

const getExpiredCardsTool: ToolDefinition<HistoryIdParams, ReconciliationRecordsResult> = {
  name: OPS_TOOL_NAMES.getExpiredCards,
  domain: "reconciliation",
  description: "Fetch expired card issues for a reconciliation history id.",
  requiredParams: ["historyId"],
  sourceType: "swagger",
  execute: async ({ historyId }) => getExpiredCards(historyId),
};

const getSystemCardsSummaryReconcileSupplierTool: ToolDefinition<
  HistoryIdParams,
  ReconciliationSupplierSummaryResult
> = {
  name: OPS_TOOL_NAMES.getSystemCardsSummaryReconcileSupplier,
  domain: "reconciliation",
  description: "Fetch supplier-level reconciliation summary signals for a reconciliation history id.",
  requiredParams: ["historyId"],
  sourceType: "swagger",
  execute: async ({ historyId }) => getSystemCardsSummaryReconcileSupplier(historyId),
};

const getCloudWatchLogsTool: ToolDefinition<CloudWatchLogFilters, CloudWatchLogsResult> = {
  name: OPS_TOOL_NAMES.getCloudWatchLogs,
  domain: "aws",
  description: "Fetch recent CloudWatch log entries with optional service and time filters.",
  requiredParams: [],
  optionalParams: ["serviceName", "queryText", "minutes", "startTime", "endTime", "limit", "logGroupPrefix"],
  sourceType: "aws",
  execute: getCloudWatchLogs,
};

const getServiceErrorSummaryTool: ToolDefinition<
  CloudWatchLogFilters,
  ServiceErrorSummaryResult
> = {
  name: OPS_TOOL_NAMES.getServiceErrorSummary,
  domain: "aws",
  description: "Fetch a compact service error summary from recent CloudWatch logs.",
  requiredParams: [],
  optionalParams: ["serviceName", "queryText", "minutes", "startTime", "endTime", "limit", "logGroupPrefix"],
  sourceType: "aws",
  execute: getServiceErrorSummary,
};

export const opsToolRegistry = [
  getOrderHistoryTool,
  getClientOrderHistoryTool,
  getOrderDetailsTool,
  getOrderItemsInfoTool,
  getOrderCardsTool,
  getBillingOrderTool,
  getAuditLogsTool,
  getAuditLogByIdTool,
  getReconciliationStatusTool,
  getBufferedRecordsTool,
  getReconciledRecordsTool,
  getInvalidProductBrandCardsTool,
  getExpiredCardsTool,
  getSystemCardsSummaryReconcileSupplierTool,
  getCloudWatchLogsTool,
  getServiceErrorSummaryTool,
] satisfies readonly RegisteredToolDefinition[];

const toolRegistryByName = new Map<string, RegisteredToolDefinition>(
  opsToolRegistry.map((tool) => [tool.name, tool])
);

export function listRegisteredTools(domain?: OpsDomain) {
  if (!domain) {
    return [...opsToolRegistry];
  }

  return opsToolRegistry.filter((tool) => tool.domain === domain);
}

export function getToolDefinition(name: string) {
  return toolRegistryByName.get(name);
}
