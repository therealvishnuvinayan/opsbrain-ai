export const ENTITY_NAMES = [
  "Runa",
  "Eneba",
  "Epay",
  "Incomm",
  "Diggecard",
  "Gamivo",
  "Kinguin",
  "G2A",
  "Ezpin",
  "Cadooz",
] as const;

export const RUN_MODE_VALUES = ["FILE", "SYSTEM"] as const;
export const RUN_STATUS_VALUES = [
  "INITIATED",
  "UPLOAD_COMPLETED",
  "IN_PROGRESS",
  "FETCHED_FROM_SUPPLIER",
  "VALIDATED",
  "BUFFER_IN_PROGRESS",
  "INSERTED_TO_BUFFER",
  "COMPLETED",
  "PARTIALLY_COMPLETED",
  "DISCARDED",
  "FAILED",
] as const;
export const SEVERITY_VALUES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const ISSUE_TYPE_VALUES = [
  "NOT_FOUND_IN_BAMBOO",
  "SUPPLIER_FETCH_FAILED",
  "ALREADY_PROCESSED",
  "EXPIRED",
  "INVALID_PRODUCT_BRAND",
  "INVALID_SUPPLIER",
  "DUPLICATE_CODE_OR_URL",
  "VALIDATION_ERROR",
  "AMBIGUOUS_MATCH",
] as const;

type RunModeValue = (typeof RUN_MODE_VALUES)[number];
type RunStatusValue = (typeof RUN_STATUS_VALUES)[number];
type SeverityValue = (typeof SEVERITY_VALUES)[number];
type IssueTypeValue = (typeof ISSUE_TYPE_VALUES)[number];

function titleCaseFromEnum(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export const RUN_STATUS_OPTIONS = RUN_STATUS_VALUES.map((status) => ({
  value: status,
  label: titleCaseFromEnum(status),
}));

export const RUN_MODE_OPTIONS = RUN_MODE_VALUES.map((mode) => ({
  value: mode,
  label: titleCaseFromEnum(mode),
}));

export const SEVERITY_OPTIONS = SEVERITY_VALUES.map((severity) => ({
  value: severity,
  label: titleCaseFromEnum(severity),
}));

export const ISSUE_TYPE_OPTIONS = ISSUE_TYPE_VALUES.map((issueType) => ({
  value: issueType,
  label: titleCaseFromEnum(issueType),
}));

export function getStatusLabel(status: string) {
  return titleCaseFromEnum(status);
}

export function getSeverityLabel(severity: string) {
  return titleCaseFromEnum(severity);
}

export function getIssueTypeLabel(issueType: string) {
  return titleCaseFromEnum(issueType);
}

export function badgeVariantForSeverity(severity: string) {
  switch (severity) {
    case "CRITICAL":
    case "HIGH":
      return "danger" as const;
    case "MEDIUM":
      return "warning" as const;
    case "LOW":
    default:
      return "success" as const;
  }
}

export function badgeVariantForStatus(status: string) {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "FAILED":
    case "DISCARDED":
      return "danger" as const;
    case "PARTIALLY_COMPLETED":
    case "BUFFER_IN_PROGRESS":
    case "UPLOAD_COMPLETED":
    case "IN_PROGRESS":
      return "warning" as const;
    default:
      return "neutral" as const;
  }
}

export function isRunStatus(value: string): value is RunStatusValue {
  return RUN_STATUS_VALUES.includes(value as RunStatusValue);
}

export function isRunMode(value: string): value is RunModeValue {
  return RUN_MODE_VALUES.includes(value as RunModeValue);
}

export function isSeverity(value: string): value is SeverityValue {
  return SEVERITY_VALUES.includes(value as SeverityValue);
}

export function isIssueType(value: string): value is IssueTypeValue {
  return ISSUE_TYPE_VALUES.includes(value as IssueTypeValue);
}

export function formatCurrencyUsd(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(value);
}

export function formatPercent(value: number) {
  return `${value.toFixed(2)}%`;
}
