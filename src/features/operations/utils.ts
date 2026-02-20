import type {
  AISummary,
  Customer,
  Order,
  SearchDateRange,
  SearchEntityType,
  SearchResult,
  SearchStatusFilter,
  Supplier,
  TimelineEvent,
} from "@/features/operations/types";

interface SearchData {
  orders: Order[];
  customers: Customer[];
  suppliers: Supplier[];
}

function normalize(value: string) {
  return value.toLowerCase().trim();
}

function dateRangeThreshold(range: SearchDateRange) {
  const now = Date.now();

  if (range === "24h") {
    return now - 24 * 60 * 60 * 1000;
  }

  if (range === "7d") {
    return now - 7 * 24 * 60 * 60 * 1000;
  }

  return now - 30 * 24 * 60 * 60 * 1000;
}

function computeMatchScore(value: string, query: string) {
  const normalizedValue = normalize(value);
  const normalizedQuery = normalize(query);

  if (!normalizedQuery) {
    return 1;
  }

  if (normalizedValue.startsWith(normalizedQuery)) {
    return 100;
  }

  const includes = normalizedValue.includes(normalizedQuery);
  if (includes) {
    return 58;
  }

  return 0;
}

function maxScore(scores: number[]) {
  return scores.reduce((max, current) => (current > max ? current : max), 0);
}

function orderStatusBucket(status: Order["status"]): Exclude<SearchStatusFilter, "any"> {
  if (status === "delayed") {
    return "delayed";
  }

  if (status === "failed" || status === "refund") {
    return "failed";
  }

  return "active";
}

function customerStatusBucket(customer: Customer): Exclude<SearchStatusFilter, "any"> {
  const hasIssueTag = customer.tags.some((tag) =>
    ["frequent-refunds", "chargeback-risk"].includes(tag)
  );

  return hasIssueTag ? "delayed" : "active";
}

function supplierStatusBucket(health: Supplier["health"]): Exclude<SearchStatusFilter, "any"> {
  if (health === "critical") {
    return "failed";
  }

  if (health === "warn") {
    return "delayed";
  }

  return "active";
}

function toOrderResult(order: Order, query: string): SearchResult | null {
  const score = maxScore([
    computeMatchScore(order.orderNumber, query),
    computeMatchScore(order.customerName, query),
    computeMatchScore(order.customerEmail ?? "", query),
    computeMatchScore(order.supplierName, query),
  ]);

  if (query.trim() && score === 0) {
    return null;
  }

  const statusBucket = orderStatusBucket(order.status);

  return {
    type: "order",
    id: order.id,
    title: `Order ${order.orderNumber}`,
    subtitle: `${formatCurrency(order.amount, order.currency)} • ${order.supplierName} • ${order.status}`,
    badges: [...order.tags.slice(0, 2), order.status],
    updatedAt: order.updatedAt,
    statusBucket,
    score,
  };
}

function toCustomerResult(customer: Customer, query: string): SearchResult | null {
  const score = maxScore([
    computeMatchScore(customer.name, query),
    computeMatchScore(customer.email, query),
    computeMatchScore(customer.phone ?? "", query),
  ]);

  if (query.trim() && score === 0) {
    return null;
  }

  const statusBucket = customerStatusBucket(customer);

  return {
    type: "customer",
    id: customer.id,
    title: customer.name,
    subtitle: `${customer.email}${customer.phone ? ` • ${customer.phone}` : ""}`,
    badges: [customer.tier, ...customer.tags.slice(0, 1)],
    updatedAt: customer.updatedAt,
    statusBucket,
    score,
  };
}

function toSupplierResult(supplier: Supplier, query: string): SearchResult | null {
  const score = maxScore([
    computeMatchScore(supplier.name, query),
    computeMatchScore(supplier.domain ?? "", query),
  ]);

  if (query.trim() && score === 0) {
    return null;
  }

  const statusBucket = supplierStatusBucket(supplier.health);

  return {
    type: "supplier",
    id: supplier.id,
    title: supplier.name,
    subtitle: `${supplier.domain ?? "No domain"} • ${supplier.health}`,
    badges: [supplier.health, ...supplier.tags.slice(0, 1)],
    updatedAt: supplier.updatedAt,
    statusBucket,
    score,
  };
}

function byScoreThenUpdated(a: SearchResult, b: SearchResult) {
  if (b.score !== a.score) {
    return b.score - a.score;
  }

  return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
}

export function searchEntities(
  data: SearchData,
  query: string,
  entityType: SearchEntityType,
  status: SearchStatusFilter,
  range: SearchDateRange
) {
  const threshold = dateRangeThreshold(range);

  const orderResults =
    entityType === "all" || entityType === "order"
      ? data.orders
          .map((order) => toOrderResult(order, query))
          .filter((result): result is SearchResult => Boolean(result))
      : [];

  const customerResults =
    entityType === "all" || entityType === "customer"
      ? data.customers
          .map((customer) => toCustomerResult(customer, query))
          .filter((result): result is SearchResult => Boolean(result))
      : [];

  const supplierResults =
    entityType === "all" || entityType === "supplier"
      ? data.suppliers
          .map((supplier) => toSupplierResult(supplier, query))
          .filter((result): result is SearchResult => Boolean(result))
      : [];

  const all = [...orderResults, ...customerResults, ...supplierResults]
    .filter((result) => {
      if (status !== "any" && result.statusBucket !== status) {
        return false;
      }

      if (new Date(result.updatedAt).getTime() < threshold) {
        return false;
      }

      return true;
    })
    .sort(byScoreThenUpdated);

  const orders = all.filter((result) => result.type === "order");
  const customers = all.filter((result) => result.type === "customer");
  const suppliers = all.filter((result) => result.type === "supplier");

  return {
    all,
    orders,
    customers,
    suppliers,
    counts: {
      all: all.length,
      orders: orders.length,
      customers: customers.length,
      suppliers: suppliers.length,
    },
  };
}

export function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function relativeFromNow(value: string) {
  const deltaMs = Date.now() - new Date(value).getTime();
  const minutes = Math.floor(deltaMs / (1000 * 60));

  if (minutes < 1) {
    return "just now";
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function timelineBase(updatedAt: string) {
  const updatedAtMs = new Date(updatedAt).getTime();
  return [
    updatedAtMs - 5 * 60 * 60 * 1000,
    updatedAtMs - 4 * 60 * 60 * 1000,
    updatedAtMs - 3 * 60 * 60 * 1000,
    updatedAtMs - 2 * 60 * 60 * 1000,
    updatedAtMs - 70 * 60 * 1000,
    updatedAtMs - 25 * 60 * 1000,
    updatedAtMs,
  ];
}

export function buildTimelineForOrder(order: Order): TimelineEvent[] {
  const marks = timelineBase(order.updatedAt);

  return [
    { id: `${order.id}-1`, at: new Date(marks[0]).toISOString(), type: "info", message: `Order ${order.orderNumber} created.` },
    { id: `${order.id}-2`, at: new Date(marks[1]).toISOString(), type: "info", message: `Customer verified: ${order.customerName}.` },
    { id: `${order.id}-3`, at: new Date(marks[2]).toISOString(), type: "info", message: `Supplier routing assigned to ${order.supplierName}.` },
    { id: `${order.id}-4`, at: new Date(marks[3]).toISOString(), type: order.status === "failed" ? "error" : "warning", message: `Settlement checkpoint marked ${order.status}.` },
    { id: `${order.id}-5`, at: new Date(marks[4]).toISOString(), type: "info", message: "Reconciliation sync executed." },
    { id: `${order.id}-6`, at: new Date(marks[5]).toISOString(), type: order.status === "delayed" ? "warning" : "info", message: "Monitoring policy evaluated for anomalies." },
    { id: `${order.id}-7`, at: new Date(marks[6]).toISOString(), type: order.status === "failed" ? "error" : "info", message: "Current operational state recorded." },
  ];
}

export function buildTimelineForCustomer(customer: Customer): TimelineEvent[] {
  const marks = timelineBase(customer.updatedAt);

  return [
    { id: `${customer.id}-1`, at: new Date(marks[0]).toISOString(), type: "info", message: "Profile onboarding completed." },
    { id: `${customer.id}-2`, at: new Date(marks[1]).toISOString(), type: "info", message: "Fraud score refresh executed." },
    { id: `${customer.id}-3`, at: new Date(marks[2]).toISOString(), type: customer.tier === "VIP" ? "info" : "warning", message: `${customer.tier} support policy attached.` },
    { id: `${customer.id}-4`, at: new Date(marks[3]).toISOString(), type: "info", message: "Recent order interaction evaluated." },
    { id: `${customer.id}-5`, at: new Date(marks[4]).toISOString(), type: customer.tags.includes("frequent-refunds") ? "warning" : "info", message: "Risk labels recalculated." },
    { id: `${customer.id}-6`, at: new Date(marks[5]).toISOString(), type: "info", message: "Engagement score updated." },
    { id: `${customer.id}-7`, at: new Date(marks[6]).toISOString(), type: "info", message: "Current customer state available for operations." },
  ];
}

export function buildTimelineForSupplier(supplier: Supplier): TimelineEvent[] {
  const marks = timelineBase(supplier.updatedAt);

  return [
    { id: `${supplier.id}-1`, at: new Date(marks[0]).toISOString(), type: "info", message: "Supplier connector heartbeat received." },
    { id: `${supplier.id}-2`, at: new Date(marks[1]).toISOString(), type: "info", message: "Settlement feed parsed." },
    { id: `${supplier.id}-3`, at: new Date(marks[2]).toISOString(), type: supplier.health === "critical" ? "error" : "warning", message: `Health shifted to ${supplier.health}.` },
    { id: `${supplier.id}-4`, at: new Date(marks[3]).toISOString(), type: "info", message: "Policy simulator baseline refreshed." },
    { id: `${supplier.id}-5`, at: new Date(marks[4]).toISOString(), type: "warning", message: "Latency guardrail evaluated." },
    { id: `${supplier.id}-6`, at: new Date(marks[5]).toISOString(), type: supplier.health === "healthy" ? "info" : "warning", message: "Operational checklist rerun." },
    { id: `${supplier.id}-7`, at: new Date(marks[6]).toISOString(), type: supplier.health === "critical" ? "error" : "info", message: "Current supplier state recorded." },
  ];
}

export function buildOrderSummary(order: Order): AISummary {
  const risk = order.status === "failed" ? "High" : order.status === "delayed" ? "Medium" : "Low";

  return {
    summary:
      `Order ${order.orderNumber} is linked to ${order.supplierName} and currently marked ${order.status}. ` +
      `Latest update suggests ${risk.toLowerCase()} operational impact for payout flow continuity.`,
    risk,
    nextSteps: [
      "Validate settlement payload against supplier event timeline.",
      "Cross-check related reconciliation run for mismatch spikes.",
      "Trigger runbook action if status remains unchanged for 2 hours.",
    ],
  };
}

export function buildCustomerSummary(customer: Customer): AISummary {
  const risk = customer.tags.includes("frequent-refunds") ? "Medium" : customer.tier === "VIP" ? "Low" : "Low";

  return {
    summary:
      `${customer.name} (${customer.tier}) has recent activity aligned to current operations filters. ` +
      `Profile markers indicate ${risk.toLowerCase()} risk with available escalation context.`,
    risk,
    nextSteps: [
      "Review last 3 related orders for payment anomalies.",
      "Confirm support notes and refund patterns.",
      "Escalate to incident triage if repeated failures appear.",
    ],
  };
}

export function buildSupplierSummary(supplier: Supplier): AISummary {
  const risk = supplier.health === "critical" ? "High" : supplier.health === "warn" ? "Medium" : "Low";

  return {
    summary:
      `${supplier.name} connector health is ${supplier.health}. ` +
      `Signal pattern indicates ${risk.toLowerCase()} risk for order settlement reliability and payout SLA compliance.`,
    risk,
    nextSteps: [
      "Inspect connector logs for fetch and validation failures.",
      "Compare recent payout timestamps against baseline cadence.",
      "Run supplier-focused remediation action if degradation persists.",
    ],
  };
}
