export type ActionType = "runbook" | "automation" | "agent";

export type ActionDomain =
  | "reconciliation"
  | "supplier"
  | "incident"
  | "governance";

export type ActionRisk = "low" | "medium" | "high";

export type ActionStatus = "enabled" | "disabled" | "draft";

export type ActionStepKind = "query" | "api" | "notify" | "approve" | "script";

export interface ActionStep {
  id: string;
  title: string;
  description: string;
  kind: ActionStepKind;
  config: Record<string, unknown>;
}

export type ActionTriggerKind = "manual" | "schedule" | "event";

export interface ActionTrigger {
  kind: ActionTriggerKind;
  schedule?: string;
  eventType?: string;
}

export type ActionInputType = "text" | "number" | "date" | "boolean";

export interface ActionInputDefinition {
  key: string;
  label: string;
  type: ActionInputType;
  required: boolean;
  defaultValue?: string;
}

export type ActionEnvironment = "dev" | "staging" | "prod";

export interface ActionSafety {
  requiresApproval: boolean;
  approverRole?: string;
  allowedEnvs: ActionEnvironment[];
  maxScope?: number;
}

export interface ActionDefinition {
  id: string;
  name: string;
  description: string;
  type: ActionType;
  domain: ActionDomain;
  risk: ActionRisk;
  status: ActionStatus;
  owner: string;
  tags: string[];
  steps: ActionStep[];
  triggers: ActionTrigger[];
  inputsSchema: ActionInputDefinition[];
  safety: ActionSafety;
  createdAt: string;
  updatedAt: string;
}

export type ActionRunStatus = "running" | "success" | "failed" | "cancelled";

export type ActionRunLogLevel = "info" | "warn" | "error";

export interface ActionRunLog {
  t: string;
  level: ActionRunLogLevel;
  message: string;
}

export interface ActionRun {
  id: string;
  actionId: string;
  actionName: string;
  triggerKind: ActionTriggerKind;
  environment: ActionEnvironment;
  startedAt: string;
  finishedAt?: string;
  durationSec?: number;
  status: ActionRunStatus;
  operator: string;
  inputs: Record<string, string>;
  logs: ActionRunLog[];
  resultSummary?: string;
  errorMessage?: string;
}

export interface RiskPolicyRule {
  requiresApproval: boolean;
  approverRole: string;
  maxScope: number;
  allowedEnvs: ActionEnvironment[];
}

export interface GuardrailsConfig {
  dryRunRequiredHighRisk: boolean;
  prodRunsRequireFinanceApproval: boolean;
  max1000RecordsPerRun: boolean;
  blockIfAnomalyConfidenceLow: boolean;
}

export interface PolicyConfig {
  byRisk: Record<ActionRisk, RiskPolicyRule>;
  guardrails: GuardrailsConfig;
}

export interface ActionRunRequest {
  actionId: string;
  triggerKind: ActionTriggerKind;
  environment: ActionEnvironment;
  operator: string;
  inputs: Record<string, string>;
}
