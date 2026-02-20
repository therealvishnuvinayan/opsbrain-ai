export type OrderStatus = "delivered" | "delayed" | "failed" | "refund";

export interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail?: string;
  supplierName: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type CustomerTier = "VIP" | "Standard";

export interface Customer {
  id: string;
  name: string;
  email: string;
  phone?: string;
  tier: CustomerTier;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export type SupplierHealth = "healthy" | "warn" | "critical";

export interface Supplier {
  id: string;
  name: string;
  domain?: string;
  health: SupplierHealth;
  lastPayoutAt?: string;
  updatedAt: string;
  tags: string[];
}

export type SearchEntityType = "all" | "order" | "customer" | "supplier";

export type SearchStatusFilter = "any" | "active" | "delayed" | "failed";

export type SearchDateRange = "24h" | "7d" | "30d";

export interface SearchResult {
  type: "order" | "customer" | "supplier";
  id: string;
  title: string;
  subtitle: string;
  badges: string[];
  updatedAt: string;
  statusBucket: Exclude<SearchStatusFilter, "any">;
  score: number;
}

export interface TimelineEvent {
  id: string;
  at: string;
  type: "info" | "warning" | "error";
  message: string;
}

export interface AISummary {
  summary: string;
  risk: "Low" | "Medium" | "High";
  nextSteps: string[];
}
