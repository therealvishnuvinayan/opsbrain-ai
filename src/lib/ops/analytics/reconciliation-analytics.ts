import type {
  NormalizedReconciliationRecords,
  NormalizedReconciliationStatus,
  NormalizedReconciliationSupplierSummary,
} from "@/lib/bamboo/reconciliation";
import type { OpsAnalytics, ReconciliationSummary } from "@/lib/ops/analytics/analytics-types";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function addUnique(values: string[], value: string | undefined) {
  if (!value || values.includes(value)) {
    return;
  }

  values.push(value);
}

export function isNormalizedReconciliationStatus(
  value: unknown
): value is NormalizedReconciliationStatus {
  return isRecord(value) && typeof value.historyId === "string" && Array.isArray(value.notableIssues);
}

export function isNormalizedReconciliationRecords(
  value: unknown
): value is NormalizedReconciliationRecords {
  return (
    isRecord(value) &&
    typeof value.historyId === "string" &&
    typeof value.returnedCount === "number" &&
    Array.isArray(value.records)
  );
}

export function isNormalizedReconciliationSupplierSummary(
  value: unknown
): value is NormalizedReconciliationSupplierSummary {
  return (
    isRecord(value) &&
    typeof value.historyId === "string" &&
    typeof value.returnedCount === "number" &&
    Array.isArray(value.suppliers)
  );
}

export function hasReconciliationPackedData(data: PackedOrderData) {
  return Boolean(
    data.reconciliationStatus ||
      data.bufferedRecords ||
      data.reconciledRecords ||
      data.invalidProductBrandCards ||
      data.expiredCards ||
      data.reconciliationSummary
  );
}

function buildExamples(sections: Array<NormalizedReconciliationRecords | undefined>) {
  const examples: string[] = [];

  for (const section of sections) {
    if (!section) {
      continue;
    }

    for (const record of section.records) {
      addUnique(examples, record.orderId ?? record.id);
      if (examples.length >= 3) {
        return examples;
      }
    }
  }

  return examples;
}

export function analyzeReconciliationContext(
  context: PackedOpsContext<PackedOrderData>
): OpsAnalytics {
  const status = isNormalizedReconciliationStatus(context.data.reconciliationStatus)
    ? context.data.reconciliationStatus
    : undefined;
  const buffered = isNormalizedReconciliationRecords(context.data.bufferedRecords)
    ? context.data.bufferedRecords
    : undefined;
  const reconciled = isNormalizedReconciliationRecords(context.data.reconciledRecords)
    ? context.data.reconciledRecords
    : undefined;
  const invalidProductBrandCards = isNormalizedReconciliationRecords(
    context.data.invalidProductBrandCards
  )
    ? context.data.invalidProductBrandCards
    : undefined;
  const expiredCards = isNormalizedReconciliationRecords(context.data.expiredCards)
    ? context.data.expiredCards
    : undefined;
  const supplierSummary = isNormalizedReconciliationSupplierSummary(context.data.reconciliationSummary)
    ? context.data.reconciliationSummary
    : undefined;

  const historyId =
    status?.historyId ??
    buffered?.historyId ??
    reconciled?.historyId ??
    invalidProductBrandCards?.historyId ??
    expiredCards?.historyId ??
    supplierSummary?.historyId ??
    (typeof context.entities.historyId === "string" ? context.entities.historyId : undefined);
  const totalBufferedRecords =
    status?.totalBufferedRecords ?? buffered?.totalCount ?? buffered?.returnedCount;
  const totalReconciledRecords =
    status?.totalReconciledRecords ?? reconciled?.totalCount ?? reconciled?.returnedCount;
  const invalidProductBrandCardCount =
    status?.invalidProductBrandCardCount ??
    invalidProductBrandCards?.totalCount ??
    invalidProductBrandCards?.returnedCount ??
    0;
  const expiredCardCount =
    status?.expiredCardCount ?? expiredCards?.totalCount ?? expiredCards?.returnedCount ?? 0;
  const appearsIncomplete =
    (totalBufferedRecords ?? 0) > 0 ||
    (status?.status?.toLowerCase().includes("pending") ?? false) ||
    (status?.status?.toLowerCase().includes("progress") ?? false);
  const reconciliationSummary: ReconciliationSummary = {
    historyId,
    status: status?.status,
    totalBufferedRecords,
    totalReconciledRecords,
    invalidProductBrandCardCount,
    expiredCardCount,
    supplierRows: supplierSummary?.returnedCount,
    appearsIncomplete,
    hasInvalidProductBrandCards: invalidProductBrandCardCount > 0,
    hasExpiredCards: expiredCardCount > 0,
  };
  const patterns: string[] = [];
  const nextChecks: string[] = [];
  const notes = [...context.notes];
  const examples = buildExamples([
    invalidProductBrandCards,
    expiredCards,
    buffered,
    reconciled,
  ]);

  if (historyId && status?.status) {
    addUnique(patterns, `Reconciliation history ${historyId} is currently ${status.status}.`);
  } else if (historyId) {
    addUnique(patterns, `I checked reconciliation history ${historyId}.`);
  }

  if ((totalBufferedRecords ?? 0) > 0) {
    addUnique(patterns, `This reconciliation run still has ${totalBufferedRecords} buffered records.`);
    addUnique(nextChecks, "buffer handling");
  }

  if ((totalReconciledRecords ?? 0) > 0) {
    addUnique(patterns, `${totalReconciledRecords} records are already reconciled in the returned data.`);
  }

  if (invalidProductBrandCardCount > 0) {
    addUnique(patterns, `I found ${invalidProductBrandCardCount} invalid product-brand card issues.`);
    addUnique(nextChecks, "product-brand mapping");
  }

  if (expiredCardCount > 0) {
    addUnique(patterns, `I found ${expiredCardCount} expired card issues.`);
    addUnique(nextChecks, "expired card handling");
  }

  if (supplierSummary && supplierSummary.returnedCount > 0) {
    addUnique(patterns, `Supplier summary returned ${supplierSummary.returnedCount} supplier rows.`);
    addUnique(nextChecks, "supplier reconciliation summary");
  }

  if (
    (totalBufferedRecords ?? 0) === 0 &&
    invalidProductBrandCardCount === 0 &&
    expiredCardCount === 0 &&
    (totalReconciledRecords ?? 0) === 0 &&
    supplierSummary?.returnedCount !== undefined &&
    supplierSummary.returnedCount === 0
  ) {
    addUnique(patterns, "No visible reconciliation issues were returned for this history.");
    addUnique(nextChecks, "manual reconciliation review");
  }

  if (patterns.length === 0) {
    addUnique(patterns, "No successful reconciliation data was available.");
  }

  if (notes.some((note) => note.includes("unavailable"))) {
    addUnique(nextChecks, "the unavailable reconciliation endpoints");
  }

  return {
    domain: context.domain,
    intent: context.intent,
    summary: patterns[0] ?? "No successful reconciliation data was available.",
    patterns: patterns.slice(1),
    nextChecks,
    examples,
    notes,
    reconciliationSummary,
  };
}
