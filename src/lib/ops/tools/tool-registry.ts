import "server-only";

import {
  getClientOrderHistory,
  getOrderDetails,
  getOrderHistory,
  type NormalizedOrderDetail,
  type OrderHistoryFilters,
} from "@/lib/bamboo/orders";
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

export const opsToolRegistry = [
  getOrderHistoryTool,
  getClientOrderHistoryTool,
  getOrderDetailsTool,
  getOrderItemsInfoTool,
  getOrderCardsTool,
  getBillingOrderTool,
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
