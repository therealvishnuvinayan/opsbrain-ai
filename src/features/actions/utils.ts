import type {
  ActionDefinition,
  ActionDomain,
  ActionEnvironment,
  ActionRisk,
  ActionRun,
  ActionRunStatus,
  ActionStatus,
  ActionType,
} from "@/features/actions/types";

export function actionTypeLabel(value: ActionType) {
  if (value === "runbook") {
    return "Runbook";
  }

  if (value === "automation") {
    return "Automation";
  }

  return "Agent";
}

export function actionDomainLabel(value: ActionDomain) {
  return value[0].toUpperCase() + value.slice(1);
}

export function actionRiskLabel(value: ActionRisk) {
  return value[0].toUpperCase() + value.slice(1);
}

export function actionStatusLabel(value: ActionStatus) {
  return value[0].toUpperCase() + value.slice(1);
}

export function actionStatusBadgeVariant(status: ActionStatus) {
  if (status === "enabled") {
    return "success" as const;
  }

  if (status === "draft") {
    return "warning" as const;
  }

  return "neutral" as const;
}

export function actionRiskBadgeVariant(risk: ActionRisk) {
  if (risk === "high") {
    return "danger" as const;
  }

  if (risk === "medium") {
    return "warning" as const;
  }

  return "success" as const;
}

export function runStatusBadgeVariant(status: ActionRunStatus) {
  if (status === "success") {
    return "success" as const;
  }

  if (status === "running") {
    return "warning" as const;
  }

  if (status === "failed") {
    return "danger" as const;
  }

  return "neutral" as const;
}

export function runStatusLabel(status: ActionRunStatus) {
  if (status === "running") {
    return "Running";
  }

  if (status === "success") {
    return "Success";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Cancelled";
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

export function durationLabel(value?: number) {
  if (!value || value <= 0) {
    return "-";
  }

  if (value < 60) {
    return `${value}s`;
  }

  const mins = Math.floor(value / 60);
  const secs = value % 60;
  return `${mins}m ${secs}s`;
}

export function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function runId() {
  return `ARUN-${Math.floor(Math.random() * 90000 + 10000)}`;
}

export function successRateForAction(runs: ActionRun[], actionId: string) {
  const history = runs.filter((run) => run.actionId === actionId && run.status !== "running");

  if (history.length === 0) {
    return 100;
  }

  const successCount = history.filter((run) => run.status === "success").length;
  return Math.round((successCount / history.length) * 100);
}

export function lastRunForAction(runs: ActionRun[], actionId: string) {
  return [...runs]
    .filter((run) => run.actionId === actionId)
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())[0];
}

export function defaultInputs(action: ActionDefinition) {
  return action.inputsSchema.reduce<Record<string, string>>((acc, input) => {
    acc[input.key] = input.defaultValue ?? "";
    return acc;
  }, {});
}

export function environmentLabel(value: ActionEnvironment) {
  if (value === "dev") {
    return "Dev";
  }

  if (value === "staging") {
    return "Staging";
  }

  return "Prod";
}
