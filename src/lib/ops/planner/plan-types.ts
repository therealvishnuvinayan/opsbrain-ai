import type { OpsDomain } from "@/lib/ops/types";

export type PlanIntent = string;

export interface PlannedToolCall {
  toolName: string;
  reason: string;
  params: Record<string, unknown>;
}

export interface ExecutionPlan {
  intent: PlanIntent;
  domain: OpsDomain;
  entities: Record<string, unknown>;
  tools: PlannedToolCall[];
  confidence?: number;
  matchedSignals?: string[];
  selectedDomains?: OpsDomain[];
  notes?: string[];
}

export interface PlannerSignalFlags {
  hasOrderCue: boolean;
  useClientHistory: boolean;
  asksForHistory: boolean;
  asksForSpecificOrder: boolean;
  asksForIssueInvestigation: boolean;
  asksForAuditActivity: boolean;
  asksForReconciliation: boolean;
  asksForBufferedRecords: boolean;
  asksForReconciledRecords: boolean;
  asksForInvalidProductBrandCards: boolean;
  asksForExpiredCards: boolean;
  asksForSupplierSummary: boolean;
  asksForReconciliationStatus: boolean;
  asksWhyReconciliationFailing: boolean;
  asksForAws: boolean;
  asksForExplicitLogs: boolean;
  asksForServiceSummary: boolean;
  asksForKnowledge: boolean;
  mentionsPayment: boolean;
  mentionsBilling: boolean;
  mentionsFailure: boolean;
  mentionsCards: boolean;
  mentionsItems: boolean;
  mentionsWhatHappened: boolean;
}

export interface PlannerQuestionContext {
  question: string;
  normalizedQuestion: string;
  orderId?: string;
  historyId?: string;
  serviceName?: string;
  minutes: number;
  matchedSignals: string[];
  signals: PlannerSignalFlags;
}

export interface PlannerCandidate {
  ruleName: string;
  plan: ExecutionPlan;
  score: number;
  entityStrength: number;
  unnecessaryToolPenalty: number;
}
