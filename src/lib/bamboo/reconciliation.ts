import "server-only";

import { getBambooJson } from "@/lib/bamboo/client";

type BambooQueryValue = string | number | boolean | null | undefined;

export interface NormalizedReconciliationRecord {
  id: string;
  orderId?: string;
  cardId?: string;
  productName?: string;
  brandName?: string;
  supplierName?: string;
  status?: string;
  issueType?: string;
  createdAt?: string;
  message?: string;
}

export interface NormalizedReconciliationStatus {
  checkedAt: string;
  historyId: string;
  status?: string;
  checkedAtSource?: string;
  totalBufferedRecords?: number;
  totalReconciledRecords?: number;
  invalidProductBrandCardCount?: number;
  expiredCardCount?: number;
  notableIssues: string[];
}

export interface NormalizedReconciliationRecords {
  checkedAt: string;
  historyId: string;
  kind:
    | "buffered_records"
    | "reconciled_records"
    | "invalid_product_brand_cards"
    | "expired_cards";
  totalCount?: number;
  returnedCount: number;
  exampleIssues: string[];
  notableIssues: string[];
  records: NormalizedReconciliationRecord[];
}

export interface NormalizedReconciliationSupplierSummaryRow {
  supplierName?: string;
  status?: string;
  bufferedCount?: number;
  reconciledCount?: number;
  invalidProductBrandCardCount?: number;
  expiredCardCount?: number;
  totalCount?: number;
  message?: string;
}

export interface NormalizedReconciliationSupplierSummary {
  checkedAt: string;
  historyId: string;
  returnedCount: number;
  notableIssues: string[];
  suppliers: NormalizedReconciliationSupplierSummaryRow[];
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

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value);
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

function addUnique(values: string[], value?: string) {
  if (!value || values.includes(value)) {
    return;
  }

  values.push(value);
}

function trimStatus(value?: string) {
  return value?.trim() || undefined;
}

function isRetriableCandidateError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return message.includes("status 404") || message.includes("status 403");
}

async function getBambooJsonFromCandidates<T>(
  candidates: Array<{
    path: string;
    query?: Record<string, BambooQueryValue>;
  }>
) {
  let lastError: unknown;

  for (const candidate of candidates) {
    try {
      const value = await getBambooJson<T>(candidate.path, candidate.query);
      return {
        value,
        endpoint: candidate.path,
      };
    } catch (error) {
      lastError = error;
      if (!isRetriableCandidateError(error)) {
        throw error;
      }
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("No reconciliation endpoint candidate succeeded.");
}

function normalizeReconciliationRecord(
  record: Record<string, unknown>,
  index: number,
  fallbackIssueType?: string
): NormalizedReconciliationRecord {
  const id =
    getString(record, ["id", "recordId", "historyId", "cardId", "orderId"]) ??
    `reconciliation-record-${index + 1}`;

  return {
    id,
    orderId: getString(record, ["orderId", "orderNumber"]),
    cardId: getString(record, ["cardId", "cardNumber", "cardMaskedNumber"]),
    productName: getString(record, ["productName", "product", "productCode"]),
    brandName: getString(record, ["brandName", "brand", "brandCode"]),
    supplierName: getString(record, ["supplierName", "supplier", "providerName"]),
    status: trimStatus(getString(record, ["status", "state", "result"])),
    issueType:
      getString(record, ["issueType", "type", "reason", "validationIssue"]) ?? fallbackIssueType,
    createdAt: getString(record, ["createdAt", "created_at", "checkedAt", "date", "timestamp"]),
    message: getString(record, ["message", "summary", "description", "details"]),
  };
}

function buildExampleIssues(records: NormalizedReconciliationRecord[]) {
  const examples: string[] = [];

  for (const record of records) {
    const issue = [record.issueType, record.message].filter(Boolean).join(": ");
    const value = record.orderId ? `${record.orderId}: ${issue || record.id}` : issue || record.id;
    addUnique(examples, value);

    if (examples.length >= 6) {
      break;
    }
  }

  return examples;
}

function buildNotableIssues(records: NormalizedReconciliationRecord[]) {
  const notes: string[] = [];

  for (const record of records) {
    const combined = `${record.status ?? ""} ${record.issueType ?? ""} ${record.message ?? ""}`.toLowerCase();
    if (
      combined.includes("invalid") ||
      combined.includes("expired") ||
      combined.includes("buffer") ||
      combined.includes("fail") ||
      combined.includes("error")
    ) {
      addUnique(notes, [record.issueType, record.message].filter(Boolean).join(": ") || record.id);
    }

    if (notes.length >= 6) {
      break;
    }
  }

  return notes;
}

function normalizeReconciliationRecordsPayload(
  raw: unknown,
  historyId: string,
  kind: NormalizedReconciliationRecords["kind"],
  fallbackIssueType?: string
): NormalizedReconciliationRecords {
  const root = asRecord(raw) ?? {};
  const preferredRecords = firstRecordArray(root, [
    "items",
    "results",
    "records",
    "data",
    "value",
  ]);
  const rawRecords = preferredRecords.length > 0 ? preferredRecords : toRecordArray(raw);
  const records = rawRecords.map((record, index) =>
    normalizeReconciliationRecord(record, index, fallbackIssueType)
  );

  return {
    checkedAt: new Date().toISOString(),
    historyId,
    kind,
    totalCount: getNumber(root, ["totalCount", "total", "count", "recordsTotal"]) ?? records.length,
    returnedCount: records.length,
    exampleIssues: buildExampleIssues(records),
    notableIssues: buildNotableIssues(records),
    records: records.slice(0, 25),
  };
}

function normalizeReconciliationStatusPayload(
  raw: unknown,
  historyId: string
): NormalizedReconciliationStatus {
  const root = asRecord(raw) ?? {};
  const status = trimStatus(
    getString(root, [
      "status",
      "state",
      "reconciliationStatus",
      "runStatus",
    ])
  );
  const notableIssues: string[] = [];

  addUnique(notableIssues, getString(root, ["message", "summary", "description", "details"]));

  return {
    checkedAt: new Date().toISOString(),
    historyId,
    status,
    checkedAtSource: getString(root, ["checkedAt", "updatedAt", "createdAt", "processedAt"]),
    totalBufferedRecords: getNumber(root, [
      "totalBufferedRecords",
      "bufferedRecords",
      "bufferedCount",
    ]),
    totalReconciledRecords: getNumber(root, [
      "totalReconciledRecords",
      "reconciledRecords",
      "reconciledCount",
    ]),
    invalidProductBrandCardCount: getNumber(root, [
      "invalidProductBrandCardCount",
      "invalidProductBrandCards",
      "invalidCardsCount",
    ]),
    expiredCardCount: getNumber(root, [
      "expiredCardCount",
      "expiredCards",
      "expiredCardsCount",
    ]),
    notableIssues,
  };
}

function normalizeSupplierSummaryPayload(
  raw: unknown,
  historyId: string
): NormalizedReconciliationSupplierSummary {
  const root = asRecord(raw) ?? {};
  const preferredRows = firstRecordArray(root, [
    "items",
    "results",
    "records",
    "data",
    "value",
  ]);
  const rows = preferredRows.length > 0 ? preferredRows : toRecordArray(raw);
  const suppliers = rows.map((row) => ({
    supplierName: getString(row, ["supplierName", "supplier", "providerName"]),
    status: trimStatus(getString(row, ["status", "state", "result"])),
    bufferedCount: getNumber(row, ["bufferedCount", "totalBufferedRecords", "bufferedRecords"]),
    reconciledCount: getNumber(row, [
      "reconciledCount",
      "totalReconciledRecords",
      "reconciledRecords",
    ]),
    invalidProductBrandCardCount: getNumber(row, [
      "invalidProductBrandCardCount",
      "invalidCardsCount",
    ]),
    expiredCardCount: getNumber(row, ["expiredCardCount", "expiredCardsCount"]),
    totalCount: getNumber(row, ["totalCount", "count"]),
    message: getString(row, ["message", "summary", "description"]),
  }));
  const notableIssues: string[] = [];

  for (const supplier of suppliers) {
    if (
      (supplier.invalidProductBrandCardCount ?? 0) > 0 ||
      (supplier.expiredCardCount ?? 0) > 0 ||
      (supplier.bufferedCount ?? 0) > 0
    ) {
      addUnique(
        notableIssues,
        [
          supplier.supplierName,
          supplier.message,
          supplier.status,
        ]
          .filter(Boolean)
          .join(": ")
      );
    }
  }

  return {
    checkedAt: new Date().toISOString(),
    historyId,
    returnedCount: suppliers.length,
    notableIssues,
    suppliers: suppliers.slice(0, 20),
  };
}

function buildSwaggerSource(endpoint: string) {
  return [{ type: "swagger" as const, endpoint }];
}

export async function getReconciliationStatus(historyId: string | number) {
  const normalizedHistoryId = String(historyId);
  const result = await getBambooJsonFromCandidates<unknown>([
    { path: `/api/Reconciliation/status/${normalizedHistoryId}` },
    { path: `/api/Reconciliation/${normalizedHistoryId}/status` },
    { path: "/api/Reconciliation/status", query: { historyId: normalizedHistoryId } },
    { path: `/api/Reconciliation/${normalizedHistoryId}` },
  ]);

  return {
    context: normalizeReconciliationStatusPayload(result.value, normalizedHistoryId),
    sources: buildSwaggerSource(result.endpoint),
  };
}

export async function getBufferedRecords(historyId: string | number) {
  const normalizedHistoryId = String(historyId);
  const result = await getBambooJsonFromCandidates<unknown>([
    { path: `/api/Reconciliation/buffered-records/${normalizedHistoryId}` },
    { path: `/api/Reconciliation/${normalizedHistoryId}/buffered-records` },
    { path: "/api/Reconciliation/buffered-records", query: { historyId: normalizedHistoryId } },
  ]);

  return {
    context: normalizeReconciliationRecordsPayload(
      result.value,
      normalizedHistoryId,
      "buffered_records",
      "buffered_record"
    ),
    sources: buildSwaggerSource(result.endpoint),
  };
}

export async function getReconciledRecords(historyId: string | number) {
  const normalizedHistoryId = String(historyId);
  const result = await getBambooJsonFromCandidates<unknown>([
    { path: `/api/Reconciliation/reconciled-records/${normalizedHistoryId}` },
    { path: `/api/Reconciliation/${normalizedHistoryId}/reconciled-records` },
    { path: "/api/Reconciliation/reconciled-records", query: { historyId: normalizedHistoryId } },
  ]);

  return {
    context: normalizeReconciliationRecordsPayload(
      result.value,
      normalizedHistoryId,
      "reconciled_records",
      "reconciled_record"
    ),
    sources: buildSwaggerSource(result.endpoint),
  };
}

export async function getInvalidProductBrandCards(historyId: string | number) {
  const normalizedHistoryId = String(historyId);
  const endpoint = `/api/Reconciliation/invalid-product-brand-cards/${normalizedHistoryId}`;
  const raw = await getBambooJson<unknown>(endpoint);

  return {
    context: normalizeReconciliationRecordsPayload(
      raw,
      normalizedHistoryId,
      "invalid_product_brand_cards",
      "invalid_product_brand_card"
    ),
    sources: buildSwaggerSource(endpoint),
  };
}

export async function getExpiredCards(historyId: string | number) {
  const normalizedHistoryId = String(historyId);
  const endpoint = `/api/Reconciliation/expired-cards/${normalizedHistoryId}`;
  const raw = await getBambooJson<unknown>(endpoint);

  return {
    context: normalizeReconciliationRecordsPayload(
      raw,
      normalizedHistoryId,
      "expired_cards",
      "expired_card"
    ),
    sources: buildSwaggerSource(endpoint),
  };
}

export async function getSystemCardsSummaryReconcileSupplier(historyId: string | number) {
  const normalizedHistoryId = String(historyId);
  const endpoint = `/api/Reconciliation/system-cards-summary-reconcile-supplier/${normalizedHistoryId}`;
  const raw = await getBambooJson<unknown>(endpoint);

  return {
    context: normalizeSupplierSummaryPayload(raw, normalizedHistoryId),
    sources: buildSwaggerSource(endpoint),
  };
}
