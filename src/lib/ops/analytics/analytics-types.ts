import type { OpsDomain } from "@/lib/ops/types";

export interface OrderStatusCount {
  status: string;
  count: number;
  share?: number;
}

export interface OrderStatusSummary {
  totalReturned?: number;
  totalAvailable?: number;
  dominantStatus?: string;
  dominantStatusShare?: number;
  allSameStatus?: boolean;
  hasConcentratedFailures?: boolean;
  failureCount?: number;
  blockedCount?: number;
  pendingCount?: number;
  missingCardsCount?: number;
  statusBreakdown: OrderStatusCount[];
}

export interface OrderDetailSummary {
  orderId?: string;
  status?: string;
  billingStatus?: string;
  itemCount?: number;
  cardCount?: number;
  missingCards?: boolean;
  problematicCardStatuses: string[];
  problematicItemStatuses: string[];
}

export interface OrderTrendSummary {
  metric: string;
  direction?: "up" | "down" | "flat";
  delta?: number;
  percentChange?: number;
  recentLabel?: string;
  previousLabel?: string;
}

export interface AuditSummary {
  totalEvents: number;
  latestEventType?: string;
  latestEventAt?: string;
  latestMessage?: string;
  errorEvents: number;
  repeatedErrorEvents: boolean;
  noEvents: boolean;
}

export interface ReconciliationSummary {
  historyId?: string;
  status?: string;
  totalBufferedRecords?: number;
  totalReconciledRecords?: number;
  invalidProductBrandCardCount?: number;
  expiredCardCount?: number;
  supplierRows?: number;
  appearsIncomplete: boolean;
  hasInvalidProductBrandCards: boolean;
  hasExpiredCards: boolean;
}

export interface AwsSummary {
  serviceName?: string;
  logGroupCount: number;
  errorCount: number;
  hasRecentErrors: boolean;
  noLogGroups: boolean;
  latestErrorService?: string;
  latestErrorAt?: string;
}

export interface KnowledgeSummary {
  returnedCount: number;
  hasRunbookMatch: boolean;
  bestScore?: number;
  topTitles: string[];
  guidancePoints: string[];
}

export interface OpsAnalytics {
  domain: OpsDomain;
  intent: string;
  summary: string;
  patterns: string[];
  nextChecks: string[];
  examples: string[];
  trends?: OrderTrendSummary[];
  notes: string[];
  statusSummary?: OrderStatusSummary;
  detailSummary?: OrderDetailSummary;
  auditSummary?: AuditSummary;
  reconciliationSummary?: ReconciliationSummary;
  awsSummary?: AwsSummary;
  knowledgeSummary?: KnowledgeSummary;
}

export type OrderAnalytics = OpsAnalytics;
