import {
  FileText,
  Globe,
  NotebookPen,
  PlugZap,
  type LucideIcon,
} from "lucide-react";

import type {
  ConnectorStatus,
  IngestionJobStatus,
  KnowledgeAccess,
  KnowledgeSourceStatus,
  KnowledgeSourceType,
} from "@/features/knowledge/types";

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatBytes(bytes: number) {
  if (bytes <= 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB"];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** exponent;

  return `${value.toFixed(value >= 100 ? 0 : 1)} ${units[exponent]}`;
}

export function titleCase(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

export function sourceStatusBadgeVariant(status: KnowledgeSourceStatus) {
  switch (status) {
    case "INDEXED":
      return "success" as const;
    case "PROCESSING":
      return "warning" as const;
    case "FAILED":
      return "danger" as const;
    case "STALE":
    default:
      return "neutral" as const;
  }
}

export function jobStatusBadgeVariant(status: IngestionJobStatus) {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "RUNNING":
    case "QUEUED":
      return "warning" as const;
    case "FAILED":
    default:
      return "danger" as const;
  }
}

export function accessBadgeVariant(access: KnowledgeAccess) {
  switch (access) {
    case "PUBLIC":
      return "success" as const;
    case "RESTRICTED":
      return "danger" as const;
    case "INTERNAL":
    default:
      return "neutral" as const;
  }
}

export function connectorStatusBadgeVariant(status: ConnectorStatus) {
  switch (status) {
    case "CONNECTED":
      return "success" as const;
    case "NOT_CONNECTED":
      return "warning" as const;
    case "COMING_SOON":
    default:
      return "neutral" as const;
  }
}

export function sourceTypeLabel(type: KnowledgeSourceType) {
  switch (type) {
    case "UPLOAD":
      return "Upload";
    case "URL":
      return "Web URL";
    case "NOTE":
      return "Note";
    case "CONNECTOR":
    default:
      return "Connector";
  }
}

export function sourceTypeIcon(type: KnowledgeSourceType): LucideIcon {
  switch (type) {
    case "UPLOAD":
      return FileText;
    case "URL":
      return Globe;
    case "NOTE":
      return NotebookPen;
    case "CONNECTOR":
    default:
      return PlugZap;
  }
}

export function generateId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function toDurationLabel(durationSec?: number) {
  if (!durationSec || durationSec <= 0) {
    return "-";
  }

  if (durationSec < 60) {
    return `${durationSec}s`;
  }

  const minutes = Math.floor(durationSec / 60);
  const seconds = durationSec % 60;
  return `${minutes}m ${seconds}s`;
}
