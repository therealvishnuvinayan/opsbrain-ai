export type OpsWorkspaceReasoningMode = "quick" | "standard" | "deep";

export type OpsWorkspaceBackendStatus =
  | "checking"
  | "connected"
  | "unavailable"
  | "not_configured";

export interface OpsWorkspaceStatus {
  status: OpsWorkspaceBackendStatus;
  headline: string;
  detail: string;
}

export interface OpsWorkspaceAction {
  label: string;
  href: string;
}

export interface OpsWorkspaceEvidenceItem {
  id: string;
  snippet: string;
  sourceId?: string;
  chunkId?: string;
}

export interface OpsWorkspaceRelatedEntity {
  id: string;
  label: string;
  type: "order" | "customer" | "supplier";
}

export interface OpsWorkspaceResponse {
  narrative: string;
  diagnosis: string | null;
  keyFindings: string[];
  evidence: OpsWorkspaceEvidenceItem[];
  recommendedActions: OpsWorkspaceAction[];
  relatedEntities: OpsWorkspaceRelatedEntity[];
  followUpPrompts: string[];
  reasoningMode: OpsWorkspaceReasoningMode;
  sourceLabel: string;
}

export interface OpsWorkspaceMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  response?: OpsWorkspaceResponse;
}

export interface OpsWorkspaceQueryInput {
  question: string;
  reasoningMode: OpsWorkspaceReasoningMode;
  history: OpsWorkspaceMessage[];
}
