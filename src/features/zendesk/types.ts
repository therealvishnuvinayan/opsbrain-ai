export type ZendeskAutopilotStatus =
  | "received"
  | "investigating"
  | "ready"
  | "failed";

export interface ZendeskDiagnosisItem {
  title: string;
  detail: string;
  confidence: number;
}

export interface ZendeskEvidenceItem {
  type: string;
  ref: string;
  detail: string;
}

export interface ZendeskRecommendedAction {
  label: string;
  action: string;
  params?: Record<string, unknown>;
}

export interface ZendeskInvestigation {
  summary: string;
  diagnosis: ZendeskDiagnosisItem[];
  evidence: ZendeskEvidenceItem[];
  recommendedActions: ZendeskRecommendedAction[];
  postback?: {
    attempted?: boolean;
    enabled?: boolean;
    ok?: boolean;
    error?: string;
  };
}

export interface ZendeskAutopilotCase {
  id: string;
  trace_id: string;
  ticket_id: string;
  status: ZendeskAutopilotStatus;
  subject: string;
  requester_email: string | null;
  description: string;
  extracted_entities: Record<string, unknown> | null;
  investigation: ZendeskInvestigation | Record<string, unknown> | null;
  suggested_reply: string | null;
  internal_note: string | null;
  confidence: number | null;
  created_at: string;
  updated_at: string;
  raw_payload?: Record<string, unknown> | null;
}

export interface ZendeskAutopilotListResponse {
  items: ZendeskAutopilotCase[];
  limit: number;
  offset: number;
  count: number;
}

export interface ZendeskAutopilotProcessResponse {
  ok: boolean;
  case: ZendeskAutopilotCase;
}

export interface ZendeskSimulateTicketInput {
  ticket_id: string;
  subject: string;
  description: string;
  requester_email?: string;
  status?: string;
  tags?: string[];
  custom_fields?: Record<string, unknown>;
}
