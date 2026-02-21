import { customers as mockCustomers, orders as mockOrders, suppliers as mockSuppliers } from "@/features/operations/mock";
import type { AIResponse, Customer, Order, Supplier } from "@/features/operations/types";

interface BackendOrder {
  id: string;
  order_number: string;
  customer_id: string;
  supplier_id: string;
  customer_name: string;
  customer_email: string | null;
  supplier_name: string;
  amount: number | string;
  currency: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface BackendCustomer {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  tier: string;
  created_at: string;
  updated_at: string;
}

interface BackendSupplier {
  id: string;
  name: string;
  domain: string | null;
  health: string;
  updated_at: string;
}

interface BackendAskResponse {
  answer: string;
  structured: {
    summary: string;
    key_findings: string[];
    evidence: string[];
    recommended_actions: Array<{ label: string; href: string }>;
  };
  entities: {
    orders: Array<{ order_number: string; status: string }>;
    customers: Array<{ id: string; name: string }>;
    suppliers: Array<{ id: string; name: string }>;
  };
  citations: Array<{ source_id: string; chunk_id: string; snippet: string }>;
}

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

function isApiConfigured() {
  return API_BASE_URL.length > 0;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  if (!isApiConfigured()) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 8000);

  const method = (init?.method ?? "GET").toUpperCase();
  const shouldSetJsonHeader = method !== "GET" && method !== "HEAD";

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(shouldSetJsonHeader ? { "Content-Type": "application/json" } : {}),
        ...(init?.headers ?? {}),
      },
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`API request failed (${response.status}): ${message}`);
    }

    return response.json() as Promise<T>;
  } finally {
    window.clearTimeout(timeout);
  }
}

function mapCustomerTier(value: string): "VIP" | "Standard" {
  return value.toLowerCase() === "vip" ? "VIP" : "Standard";
}

function mapSupplierHealth(value: string): "healthy" | "warn" | "critical" {
  if (value === "warn" || value === "critical" || value === "healthy") {
    return value;
  }

  return "healthy";
}

function mapOrderStatus(value: string): "delivered" | "delayed" | "failed" | "refund" {
  if (value === "delivered" || value === "delayed" || value === "failed" || value === "refund") {
    return value;
  }

  return "delivered";
}

function mapBackendOrder(order: BackendOrder): Order {
  const mockOrder = mockOrders.find((item) => item.orderNumber === order.order_number);

  return {
    id: mockOrder?.id ?? order.order_number,
    orderNumber: order.order_number,
    customerName: order.customer_name,
    customerEmail: order.customer_email ?? undefined,
    supplierName: order.supplier_name,
    amount: typeof order.amount === "number" ? order.amount : Number(order.amount),
    currency: order.currency,
    status: mapOrderStatus(order.status),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    tags: mockOrder?.tags ?? [order.status],
  };
}

function mapBackendCustomer(customer: BackendCustomer): Customer {
  const mockCustomer = mockCustomers.find(
    (item) => item.email.toLowerCase() === customer.email.toLowerCase() || item.name === customer.name
  );

  return {
    id: mockCustomer?.id ?? customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone ?? undefined,
    tier: mapCustomerTier(customer.tier),
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
    tags: mockCustomer?.tags ?? [customer.tier.toLowerCase()],
  };
}

function mapBackendSupplier(supplier: BackendSupplier): Supplier {
  const mockSupplier = mockSuppliers.find(
    (item) => item.name === supplier.name || (item.domain && item.domain === (supplier.domain ?? ""))
  );

  return {
    id: mockSupplier?.id ?? supplier.id,
    name: supplier.name,
    domain: supplier.domain ?? undefined,
    health: mapSupplierHealth(supplier.health),
    lastPayoutAt: mockSupplier?.lastPayoutAt,
    updatedAt: supplier.updated_at,
    tags: mockSupplier?.tags ?? [supplier.health],
  };
}

export async function fetchOperationsData(query: string): Promise<{
  orders: Order[];
  customers: Customer[];
  suppliers: Supplier[];
}> {
  const searchParams = new URLSearchParams();
  if (query.trim()) {
    searchParams.set("query", query.trim());
  }
  searchParams.set("limit", "80");

  const suffix = searchParams.toString();
  const path = suffix ? `?${suffix}` : "";

  const [ordersResponse, customersResponse, suppliersResponse] = await Promise.all([
    requestJson<BackendOrder[]>(`/api/operations/orders${path}`),
    requestJson<BackendCustomer[]>(`/api/operations/customers${path}`),
    requestJson<BackendSupplier[]>(`/api/operations/suppliers${path}`),
  ]);

  return {
    orders: ordersResponse.map(mapBackendOrder),
    customers: customersResponse.map(mapBackendCustomer),
    suppliers: suppliersResponse.map(mapBackendSupplier),
  };
}

export async function askOpsBrain(question: string): Promise<AIResponse> {
  const payload = await requestJson<BackendAskResponse>("/api/ask", {
    method: "POST",
    body: JSON.stringify({
      question,
      entity_hints: {
        order_numbers: [],
        customer_ids: [],
        supplier_ids: [],
      },
      k: 6,
    }),
  });

  return {
    answerMarkdown: payload.answer,
    structured: {
      diagnosis: payload.structured.summary,
      keyFindings: payload.structured.key_findings,
      evidence: [
        ...payload.structured.evidence,
        ...payload.citations.map((citation) => `[citation:${citation.chunk_id}] ${citation.snippet}`),
      ],
      recommendedActions: payload.structured.recommended_actions,
    },
    entities: {
      orders: payload.entities.orders.map((order) => order.order_number),
      customers: payload.entities.customers.map((customer) => customer.name),
      suppliers: payload.entities.suppliers.map((supplier) => supplier.name),
    },
    suggestedPrompts: [
      "Which supplier signal is driving repeat delays?",
      "Summarize operational risk for finance handoff",
      "What should be escalated first?",
    ],
  };
}

export function canUseBackendApi() {
  return isApiConfigured();
}
