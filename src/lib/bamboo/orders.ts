import "server-only";

import { getBambooJson } from "@/lib/bamboo/client";

export interface OrderHistoryFilters {
  PageSize?: number;
  PageIndex?: number;
  SearchText?: string;
  DateFrom?: string;
  DateTo?: string;
  Status?: string;
  SupplierId?: string;
}

export interface NormalizedOrderSummary {
  id: string;
  orderNumber: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  supplierName?: string;
  clientName?: string;
  brandName?: string;
  itemCount?: number;
  cardCount?: number;
  amount?: number;
  currency?: string;
  notableIssues: string[];
}

export interface NormalizedOrderHistory {
  checkedAt: string;
  querySummary: {
    pageSize: number;
    pageIndex: number;
    searchText?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    supplierId?: string;
  };
  totalCount?: number;
  returnedCount: number;
  statuses: Record<string, number>;
  notableIssues: string[];
  orders: NormalizedOrderSummary[];
}

export interface NormalizedOrderDetail {
  checkedAt: string;
  orderId: string;
  status: string;
  createdAt?: string;
  updatedAt?: string;
  supplierName?: string;
  clientName?: string;
  brandName?: string;
  itemCount?: number;
  cardCount?: number;
  cardStatusCounts: Record<string, number>;
  notableIssues: string[];
  items: Array<{
    id: string;
    name: string;
    status?: string;
    quantity?: number;
  }>;
  cards: Array<{
    id: string;
    status?: string;
    maskedNumber?: string;
  }>;
  billingSummary?: {
    amount?: number;
    currency?: string;
    status?: string;
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null);
}

function getString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function firstRecordArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const items = toRecordArray(record[key]);
    if (items.length > 0) {
      return items;
    }
  }

  return [];
}

function normalizeStatus(value: string | undefined) {
  return value?.trim() || "unknown";
}

function isIssueStatus(status: string) {
  const normalized = status.toLowerCase();
  return (
    normalized.includes("fail") ||
    normalized.includes("block") ||
    normalized.includes("error") ||
    normalized.includes("cancel") ||
    normalized.includes("delay") ||
    normalized.includes("pending")
  );
}

function summarizeOrderIssues(order: NormalizedOrderSummary) {
  const issues: string[] = [];
  const normalizedStatus = order.status.toLowerCase();

  if (normalizedStatus.includes("fail") || normalizedStatus.includes("error")) {
    issues.push("Order is in a failed state.");
  }

  if (normalizedStatus.includes("block")) {
    issues.push("Order appears blocked.");
  }

  if (normalizedStatus.includes("delay") || normalizedStatus.includes("pending")) {
    issues.push("Order may be delayed or still pending.");
  }

  if (order.cardCount === 0 && order.itemCount && order.itemCount > 0) {
    issues.push("Order has items but no cards were returned.");
  }

  return issues;
}

function normalizeOrderSummary(record: Record<string, unknown>): NormalizedOrderSummary {
  const id =
    getString(record, ["id", "orderId", "order_id"]) ??
    getString(record, ["orderNumber", "orderNo", "number"]) ??
    "unknown";
  const orderNumber =
    getString(record, ["orderNumber", "orderNo", "number"]) ??
    getString(record, ["id", "orderId", "order_id"]) ??
    id;
  const status = normalizeStatus(
    getString(record, ["status", "orderStatus", "state", "paymentStatus"])
  );
  const summary: NormalizedOrderSummary = {
    id,
    orderNumber,
    status,
    createdAt: getString(record, ["createdAt", "created_at", "creationDate", "dateCreated"]),
    updatedAt: getString(record, ["updatedAt", "updated_at", "modifiedAt", "lastUpdatedAt"]),
    supplierName: getString(record, ["supplierName", "providerName", "supplier"]),
    clientName: getString(record, ["clientName", "customerName", "client"]),
    brandName: getString(record, ["brandName", "programName", "brand"]),
    itemCount: getNumber(record, ["itemCount", "itemsCount", "orderItemsCount"]),
    cardCount: getNumber(record, ["cardCount", "cardsCount"]),
    amount: getNumber(record, ["amount", "totalAmount", "orderAmount"]),
    currency: getString(record, ["currency", "currencyCode"]),
    notableIssues: [],
  };

  summary.notableIssues = summarizeOrderIssues(summary);
  return summary;
}

function normalizeHistoryPayload(raw: unknown, filters: OrderHistoryFilters): NormalizedOrderHistory {
  const root = asRecord(raw) ?? {};
  const preferredOrders = firstRecordArray(root, ["items", "results", "orders", "data", "value"]);
  const orders = preferredOrders.length > 0 ? preferredOrders : toRecordArray(raw);
  const normalizedOrders = orders.map(normalizeOrderSummary);
  const statuses = normalizedOrders.reduce<Record<string, number>>((accumulator, order) => {
    accumulator[order.status] = (accumulator[order.status] ?? 0) + 1;
    return accumulator;
  }, {});
  const notableIssues = normalizedOrders.flatMap((order) =>
    order.notableIssues.map((issue) => `${order.orderNumber}: ${issue}`)
  );

  if (normalizedOrders.length === 0) {
    console.info("Bamboo order history normalization returned no orders", {
      keys: Object.keys(root),
    });
  }

  return {
    checkedAt: new Date().toISOString(),
    querySummary: {
      pageSize: filters.PageSize ?? 10,
      pageIndex: filters.PageIndex ?? 0,
      searchText: filters.SearchText,
      status: filters.Status,
      dateFrom: filters.DateFrom,
      dateTo: filters.DateTo,
      supplierId: filters.SupplierId,
    },
    totalCount: getNumber(root, ["totalCount", "total", "count", "recordsTotal"]),
    returnedCount: normalizedOrders.length,
    statuses,
    notableIssues: notableIssues.slice(0, 8),
    orders: normalizedOrders.slice(0, filters.PageSize ?? 10),
  };
}

function normalizeOrderItems(raw: unknown) {
  const root = asRecord(raw);
  const items = root
    ? firstRecordArray(root, ["items", "results", "orderItems", "data", "value"])
    : toRecordArray(raw);

  return items.map((item, index) => ({
    id: getString(item, ["id", "orderItemId", "itemId"]) ?? `item-${index + 1}`,
    name: getString(item, ["name", "productName", "title", "sku"]) ?? `Item ${index + 1}`,
    status: getString(item, ["status", "state"]),
    quantity: getNumber(item, ["quantity", "qty"]),
  }));
}

function normalizeCards(raw: unknown) {
  const root = asRecord(raw);
  const cards = root
    ? firstRecordArray(root, ["items", "results", "cards", "data", "value"])
    : toRecordArray(raw);

  return cards.map((card, index) => ({
    id: getString(card, ["id", "cardId"]) ?? `card-${index + 1}`,
    status: getString(card, ["status", "state"]),
    maskedNumber: getString(card, ["maskedNumber", "cardNumberMasked", "last4"]),
  }));
}

function normalizeCardStatuses(raw: unknown) {
  const items = toRecordArray(raw);

  return items.reduce<Record<string, number>>((accumulator, item) => {
    const status = normalizeStatus(getString(item, ["status", "state", "cardStatus"]));
    accumulator[status] = (accumulator[status] ?? 0) + 1;
    return accumulator;
  }, {});
}

function normalizeBilling(raw: unknown) {
  const record = asRecord(raw);
  if (!record) {
    return undefined;
  }

  return {
    amount: getNumber(record, ["amount", "totalAmount", "orderAmount"]),
    currency: getString(record, ["currency", "currencyCode"]),
    status: getString(record, ["status", "paymentStatus", "state"]),
  };
}

export async function getOrderHistory(filters: OrderHistoryFilters = {}) {
  const nextFilters: OrderHistoryFilters = {
    PageSize: filters.PageSize ?? 10,
    PageIndex: filters.PageIndex ?? 0,
    SearchText: filters.SearchText,
    DateFrom: filters.DateFrom,
    DateTo: filters.DateTo,
    Status: filters.Status,
    SupplierId: filters.SupplierId,
  };
  const raw = await getBambooJson<unknown>("/api/Orders/history", {
    PageSize: nextFilters.PageSize,
    PageIndex: nextFilters.PageIndex,
    SearchText: nextFilters.SearchText,
    DateFrom: nextFilters.DateFrom,
    DateTo: nextFilters.DateTo,
    Status: nextFilters.Status,
    SupplierId: nextFilters.SupplierId,
  });

  return {
    context: normalizeHistoryPayload(raw, nextFilters),
    sources: [{ type: "swagger" as const, endpoint: "/api/Orders/history" }],
  };
}

export async function getClientOrderHistory(filters: OrderHistoryFilters = {}) {
  const raw = await getBambooJson<unknown>("/api/Orders/client/history", {
    PageSize: filters.PageSize ?? 10,
    PageIndex: filters.PageIndex ?? 0,
    SearchText: filters.SearchText,
    DateFrom: filters.DateFrom,
    DateTo: filters.DateTo,
    Status: filters.Status,
    SupplierId: filters.SupplierId,
  });

  return {
    context: normalizeHistoryPayload(raw, filters),
    sources: [{ type: "swagger" as const, endpoint: "/api/Orders/client/history" }],
  };
}

export async function getOrderDetails(orderId: string) {
  const [detailsResult, itemsResult, cardsResult, statusesResult, billingResult] =
    await Promise.allSettled([
      getBambooJson<unknown>(`/api/Orders/order-details/${orderId}`),
      getBambooJson<unknown>(`/api/Orders/${orderId}/orderItems-info`),
      getBambooJson<unknown>(`/api/Orders/${orderId}/cards`),
      getBambooJson<unknown>(`/api/Orders/${orderId}/cards/statuses`),
      getBambooJson<unknown>(`/api/Billing/orders/${orderId}`),
    ]);

  if (detailsResult.status !== "fulfilled") {
    throw detailsResult.reason;
  }

  const detailRecord = asRecord(detailsResult.value) ?? {};
  const items = itemsResult.status === "fulfilled" ? normalizeOrderItems(itemsResult.value) : [];
  const cards = cardsResult.status === "fulfilled" ? normalizeCards(cardsResult.value) : [];
  const cardStatusCounts =
    statusesResult.status === "fulfilled" ? normalizeCardStatuses(statusesResult.value) : {};
  const billingSummary =
    billingResult.status === "fulfilled" ? normalizeBilling(billingResult.value) : undefined;
  const baseOrder = normalizeOrderSummary(detailRecord);
  const notableIssues = [...baseOrder.notableIssues];

  if (Object.keys(cardStatusCounts).some((status) => isIssueStatus(status))) {
    notableIssues.push("One or more cards are in a non-happy status.");
  }

  if (items.some((item) => item.status && isIssueStatus(item.status))) {
    notableIssues.push("One or more order items are in a problematic state.");
  }

  if (cards.length === 0 && items.length > 0) {
    notableIssues.push("No cards were returned for this order.");
  }

  return {
    context: {
      checkedAt: new Date().toISOString(),
      orderId: baseOrder.id,
      status: baseOrder.status,
      createdAt: baseOrder.createdAt,
      updatedAt: baseOrder.updatedAt,
      supplierName: baseOrder.supplierName,
      clientName: baseOrder.clientName,
      brandName: baseOrder.brandName,
      itemCount: baseOrder.itemCount ?? items.length,
      cardCount: baseOrder.cardCount ?? cards.length,
      cardStatusCounts,
      notableIssues,
      items: items.slice(0, 12),
      cards: cards.slice(0, 12),
      billingSummary,
    } satisfies NormalizedOrderDetail,
    sources: [
      { type: "swagger" as const, endpoint: "/api/Orders/order-details/{id}" },
      { type: "swagger" as const, endpoint: "/api/Orders/{id}/orderItems-info" },
      { type: "swagger" as const, endpoint: "/api/Orders/{id}/cards" },
      { type: "swagger" as const, endpoint: "/api/Orders/{id}/cards/statuses" },
      { type: "swagger" as const, endpoint: "/api/Billing/orders/{id}" },
    ],
  };
}
