import "server-only";

import { getBambooJson } from "@/lib/bamboo/client";

export interface AuditLogFilters {
  PageSize?: number;
  PageIndex?: number;
  OrderId?: string;
  EntityId?: string;
  EntityType?: string;
  SearchText?: string;
  DateFrom?: string;
  DateTo?: string;
  EventType?: string;
  Severity?: string;
}

export interface NormalizedAuditLogEntry {
  id: string;
  eventType: string;
  entityType?: string;
  entityId?: string;
  createdAt?: string;
  actor?: string;
  severity?: string;
  status?: string;
  message?: string;
}

export interface NormalizedAuditLogs {
  checkedAt: string;
  querySummary: {
    pageSize: number;
    pageIndex: number;
    orderId?: string;
    entityId?: string;
    entityType?: string;
    searchText?: string;
    dateFrom?: string;
    dateTo?: string;
    eventType?: string;
    severity?: string;
  };
  totalCount?: number;
  returnedCount: number;
  eventTypeCounts: Record<string, number>;
  severityCounts: Record<string, number>;
  latestEvent?: {
    id: string;
    eventType: string;
    createdAt?: string;
    severity?: string;
    message?: string;
  };
  notableEvents: string[];
  logs: NormalizedAuditLogEntry[];
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function toRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => asRecord(item))
    .filter((item): item is Record<string, unknown> => item !== null);
}

function firstRecordArray(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const items = toRecordArray(record[key]);
    if (items.length > 0) {
      return items;
    }
  }

  return [];
}

function getString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function getNumber(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim()) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return undefined;
}

function normalizeEventType(value: string | undefined) {
  return value?.trim() || "unknown";
}

function isProblemAuditEntry(entry: NormalizedAuditLogEntry) {
  const value = `${entry.eventType} ${entry.severity ?? ""} ${entry.status ?? ""} ${entry.message ?? ""}`.toLowerCase();

  return (
    value.includes("fail") ||
    value.includes("error") ||
    value.includes("block") ||
    value.includes("deny") ||
    value.includes("cancel")
  );
}

function normalizeAuditLogEntry(record: Record<string, unknown>, index: number): NormalizedAuditLogEntry {
  const id =
    getString(record, ["id", "auditLogId", "eventId", "logId"]) ??
    getString(record, ["entityId", "orderId"]) ??
    `audit-${index + 1}`;
  const eventType = normalizeEventType(
    getString(record, ["eventType", "action", "type", "eventName", "activityType"])
  );

  return {
    id,
    eventType,
    entityType: getString(record, ["entityType", "resourceType", "objectType", "subjectType"]),
    entityId: getString(record, ["entityId", "orderId", "resourceId", "subjectId"]),
    createdAt: getString(record, ["createdAt", "created_at", "timestamp", "eventDate", "dateCreated"]),
    actor: getString(record, ["actor", "actorName", "userName", "createdBy", "email"]),
    severity: getString(record, ["severity", "level", "priority"]),
    status: getString(record, ["status", "state", "result"]),
    message: getString(record, ["message", "summary", "description", "details"]),
  };
}

function normalizeAuditLogsPayload(raw: unknown, filters: AuditLogFilters): NormalizedAuditLogs {
  const root = asRecord(raw) ?? {};
  const preferredLogs = firstRecordArray(root, [
    "items",
    "results",
    "logs",
    "auditLogs",
    "events",
    "data",
    "value",
  ]);
  const logs = preferredLogs.length > 0 ? preferredLogs : toRecordArray(raw);
  const normalizedLogs = logs.map(normalizeAuditLogEntry);
  const eventTypeCounts = normalizedLogs.reduce<Record<string, number>>((accumulator, log) => {
    accumulator[log.eventType] = (accumulator[log.eventType] ?? 0) + 1;
    return accumulator;
  }, {});
  const severityCounts = normalizedLogs.reduce<Record<string, number>>((accumulator, log) => {
    const severity = log.severity?.trim();
    if (!severity) {
      return accumulator;
    }

    accumulator[severity] = (accumulator[severity] ?? 0) + 1;
    return accumulator;
  }, {});
  const latestEvent = [...normalizedLogs]
    .sort((left, right) => {
      const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
      const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
      return rightTime - leftTime;
    })[0];
  const notableEvents = normalizedLogs
    .filter((log) => isProblemAuditEntry(log))
    .map((log) => {
      const details = [log.eventType, log.message].filter(Boolean).join(": ");
      return log.entityId ? `${log.entityId}: ${details}` : details;
    })
    .slice(0, 6);

  return {
    checkedAt: new Date().toISOString(),
    querySummary: {
      pageSize: filters.PageSize ?? 20,
      pageIndex: filters.PageIndex ?? 0,
      orderId: filters.OrderId,
      entityId: filters.EntityId,
      entityType: filters.EntityType,
      searchText: filters.SearchText,
      dateFrom: filters.DateFrom,
      dateTo: filters.DateTo,
      eventType: filters.EventType,
      severity: filters.Severity,
    },
    totalCount: getNumber(root, ["totalCount", "total", "count", "recordsTotal"]),
    returnedCount: normalizedLogs.length,
    eventTypeCounts,
    severityCounts,
    latestEvent: latestEvent
      ? {
          id: latestEvent.id,
          eventType: latestEvent.eventType,
          createdAt: latestEvent.createdAt,
          severity: latestEvent.severity,
          message: latestEvent.message,
        }
      : undefined,
    notableEvents,
    logs: normalizedLogs.slice(0, filters.PageSize ?? 20),
  };
}

function buildAuditQuery(filters: AuditLogFilters) {
  return {
    PageSize: filters.PageSize ?? 20,
    PageIndex: filters.PageIndex ?? 0,
    SearchText: filters.SearchText ?? filters.OrderId,
    DateFrom: filters.DateFrom,
    DateTo: filters.DateTo,
    EventType: filters.EventType,
    Severity: filters.Severity,
    EntityId: filters.EntityId ?? filters.OrderId,
    EntityType: filters.EntityType ?? (filters.OrderId ? "order" : undefined),
    OrderId: filters.OrderId,
  };
}

async function getAuditJson<T>(filters: AuditLogFilters) {
  const query = buildAuditQuery(filters);
  const candidateEndpoints = [
    "/api/AuditLogs/history",
    "/api/AuditLogs",
    "/api/Audit/history",
    "/api/Audit",
  ];
  let lastError: unknown;

  for (const endpoint of candidateEndpoints) {
    try {
      const value = await getBambooJson<T>(endpoint, query);
      return { value, endpoint };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("status 404")) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No working Bamboo audit endpoint was found.");
}

export async function getAuditLogs(filters: AuditLogFilters = {}) {
  const result = await getAuditJson<unknown>(filters);

  return {
    context: normalizeAuditLogsPayload(result.value, filters),
    sources: [{ type: "swagger" as const, endpoint: result.endpoint }],
  };
}

export async function getAuditLogById(id: string) {
  const candidateEndpoints = [
    `/api/AuditLogs/${id}`,
    `/api/Audit/${id}`,
  ];
  let lastError: unknown;

  for (const endpoint of candidateEndpoints) {
    try {
      const raw = await getBambooJson<unknown>(endpoint);
      const logs = normalizeAuditLogsPayload(raw, { PageSize: 1, PageIndex: 0 }).logs;
      return {
        context: logs[0],
        sources: [{ type: "swagger" as const, endpoint }],
      };
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : "";
      if (!message.includes("status 404")) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No working Bamboo audit detail endpoint was found.");
}
