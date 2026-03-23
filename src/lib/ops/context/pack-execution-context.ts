import type { ExecutionRunResult, ToolExecutionResult, ToolExecutionSource } from "@/lib/ops/executor/execution-types";
import type { ExecutionPlan } from "@/lib/ops/planner/plan-types";
import { OPS_TOOL_NAMES } from "@/lib/ops/tools/tool-types";

import type {
  PackedExecutionSummary,
  PackedOpsContext,
  PackedOrderData,
  PackedSource,
} from "@/lib/ops/context/context-types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function buildExecutionSummary(results: ToolExecutionResult[]): PackedExecutionSummary {
  const successfulTools = results
    .filter((result) => result.status === "success")
    .map((result) => result.toolName);
  const partialSuccessTools = results
    .filter((result) => result.status === "partial_success")
    .map((result) => result.toolName);
  const failedTools = results
    .filter((result) => result.status === "error")
    .map((result) => result.toolName);
  const skippedTools = results
    .filter((result) => result.status === "skipped")
    .map((result) => result.toolName);

  return {
    successfulTools,
    partialSuccessTools: partialSuccessTools.length > 0 ? partialSuccessTools : undefined,
    failedTools,
    skippedTools: skippedTools.length > 0 ? skippedTools : undefined,
    totalTools: results.length,
  };
}

function getSourceLabel(toolName: string) {
  switch (toolName) {
    case OPS_TOOL_NAMES.getOrderHistory:
      return "Order history";
    case OPS_TOOL_NAMES.getClientOrderHistory:
      return "Client order history";
    case OPS_TOOL_NAMES.getOrderDetails:
      return "Order details";
    case OPS_TOOL_NAMES.getBillingOrder:
      return "Billing";
    case OPS_TOOL_NAMES.getOrderCards:
      return "Cards";
    case OPS_TOOL_NAMES.getOrderItemsInfo:
      return "Items";
    case OPS_TOOL_NAMES.getAuditLogs:
      return "Audit logs";
    case OPS_TOOL_NAMES.getAuditLogById:
      return "Audit event";
    case OPS_TOOL_NAMES.getReconciliationStatus:
      return "Reconciliation status";
    case OPS_TOOL_NAMES.getBufferedRecords:
      return "Buffered reconciliation records";
    case OPS_TOOL_NAMES.getReconciledRecords:
      return "Reconciled records";
    case OPS_TOOL_NAMES.getInvalidProductBrandCards:
      return "Invalid product-brand cards";
    case OPS_TOOL_NAMES.getExpiredCards:
      return "Expired cards";
    case OPS_TOOL_NAMES.getSystemCardsSummaryReconcileSupplier:
      return "Reconciliation supplier summary";
    case OPS_TOOL_NAMES.getCloudWatchLogs:
      return "CloudWatch logs";
    case OPS_TOOL_NAMES.getServiceErrorSummary:
      return "Service error summary";
    default:
      return undefined;
  }
}

function collectPackedSources(results: ToolExecutionResult[]): PackedSource[] {
  const seen = new Set<string>();
  const packedSources: PackedSource[] = [];

  for (const result of results) {
    for (const source of result.sources ?? []) {
      const packedSource: PackedSource = {
        type: typeof source.type === "string" ? source.type : "unknown",
        endpoint: typeof source.endpoint === "string" ? source.endpoint : undefined,
        label: typeof source.label === "string" ? source.label : getSourceLabel(result.toolName),
      };
      const key = `${packedSource.type}|${packedSource.endpoint ?? ""}|${packedSource.label ?? ""}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      packedSources.push(packedSource);
    }
  }

  return packedSources;
}

function buildDerivedItems(orderRecord: Record<string, unknown>) {
  if (!Array.isArray(orderRecord.items) && orderRecord.itemCount === undefined) {
    return undefined;
  }

  return {
    checkedAt: typeof orderRecord.checkedAt === "string" ? orderRecord.checkedAt : undefined,
    orderId: typeof orderRecord.orderId === "string" ? orderRecord.orderId : undefined,
    itemCount: typeof orderRecord.itemCount === "number" ? orderRecord.itemCount : undefined,
    items: Array.isArray(orderRecord.items) ? orderRecord.items : [],
    problematicItemStatuses: toStringArray(orderRecord.problematicItemStatuses),
    notableIssues: toStringArray(orderRecord.notableIssues),
  };
}

function buildDerivedCards(orderRecord: Record<string, unknown>) {
  if (!Array.isArray(orderRecord.cards) && orderRecord.cardCount === undefined) {
    return undefined;
  }

  return {
    checkedAt: typeof orderRecord.checkedAt === "string" ? orderRecord.checkedAt : undefined,
    orderId: typeof orderRecord.orderId === "string" ? orderRecord.orderId : undefined,
    cardCount: typeof orderRecord.cardCount === "number" ? orderRecord.cardCount : undefined,
    cards: Array.isArray(orderRecord.cards) ? orderRecord.cards : [],
    cardStatusCounts: isRecord(orderRecord.cardStatusCounts) ? orderRecord.cardStatusCounts : {},
    problematicCardStatuses: toStringArray(orderRecord.problematicCardStatuses),
    missingCards: Boolean(orderRecord.missingCards),
    notableIssues: toStringArray(orderRecord.notableIssues),
  };
}

function buildDerivedBilling(orderRecord: Record<string, unknown>) {
  if (!Object.prototype.hasOwnProperty.call(orderRecord, "billingSummary")) {
    return undefined;
  }

  return {
    checkedAt: typeof orderRecord.checkedAt === "string" ? orderRecord.checkedAt : undefined,
    orderId: typeof orderRecord.orderId === "string" ? orderRecord.orderId : undefined,
    billingSummary: orderRecord.billingSummary,
    notableIssues: toStringArray(orderRecord.notableIssues),
  };
}

function packOrderData(results: ToolExecutionResult[]): PackedOrderData {
  const data: PackedOrderData = {};

  for (const result of results) {
    if (result.status !== "success" || result.data === undefined) {
      continue;
    }

    switch (result.toolName) {
      case OPS_TOOL_NAMES.getOrderHistory:
      case OPS_TOOL_NAMES.getClientOrderHistory:
        data.history = result.data;
        break;
      case OPS_TOOL_NAMES.getOrderDetails:
        data.order = result.data;
        break;
      case OPS_TOOL_NAMES.getBillingOrder:
        data.billing = result.data;
        break;
      case OPS_TOOL_NAMES.getOrderCards:
        data.cards = result.data;
        break;
      case OPS_TOOL_NAMES.getOrderItemsInfo:
        data.items = result.data;
        break;
      case OPS_TOOL_NAMES.getAuditLogs:
      case OPS_TOOL_NAMES.getAuditLogById:
        data.audit = result.data;
        break;
      case OPS_TOOL_NAMES.getReconciliationStatus:
        data.reconciliationStatus = result.data;
        break;
      case OPS_TOOL_NAMES.getBufferedRecords:
        data.bufferedRecords = result.data;
        break;
      case OPS_TOOL_NAMES.getReconciledRecords:
        data.reconciledRecords = result.data;
        break;
      case OPS_TOOL_NAMES.getInvalidProductBrandCards:
        data.invalidProductBrandCards = result.data;
        break;
      case OPS_TOOL_NAMES.getExpiredCards:
        data.expiredCards = result.data;
        break;
      case OPS_TOOL_NAMES.getSystemCardsSummaryReconcileSupplier:
        data.reconciliationSummary = result.data;
        break;
      case OPS_TOOL_NAMES.getCloudWatchLogs:
        data.awsLogs = result.data;
        break;
      case OPS_TOOL_NAMES.getServiceErrorSummary:
        data.serviceHealth = result.data;
        data.infraSummary ??= result.data;
        break;
      default:
        break;
    }
  }

  if (isRecord(data.order)) {
    data.items ??= buildDerivedItems(data.order);
    data.cards ??= buildDerivedCards(data.order);
    data.billing ??= buildDerivedBilling(data.order);
  }

  return data;
}

function packGenericData(results: ToolExecutionResult[]) {
  const data: Record<string, unknown> = {};

  for (const result of results) {
    if (result.status !== "success" || result.data === undefined) {
      continue;
    }

    data[result.toolName] = result.data;
  }

  return data;
}

function appendNote(notes: string[], note: string) {
  if (!notes.includes(note)) {
    notes.push(note);
  }
}

function getToolResult(results: ToolExecutionResult[], toolName: string) {
  return results.find((result) => result.toolName === toolName);
}

function buildOrderNotes(
  plan: ExecutionPlan,
  summary: PackedExecutionSummary,
  results: ToolExecutionResult[],
  data: PackedOrderData
) {
  const notes = [...(plan.notes ?? [])];
  const hasMissingData =
    summary.failedTools.length > 0 ||
    (summary.partialSuccessTools?.length ?? 0) > 0 ||
    (summary.skippedTools?.length ?? 0) > 0;
  const reconciliationStatusResult = getToolResult(results, OPS_TOOL_NAMES.getReconciliationStatus);
  const cloudWatchLogsResult = getToolResult(results, OPS_TOOL_NAMES.getCloudWatchLogs);
  const serviceHealthResult = getToolResult(results, OPS_TOOL_NAMES.getServiceErrorSummary);

  if (
    cloudWatchLogsResult?.error?.code === "permission_denied"
  ) {
    appendNote(notes, "CloudWatch logs could not be accessed due to permissions.");
  } else if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getCloudWatchLogs) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getCloudWatchLogs)) &&
    data.awsLogs === undefined
  ) {
    appendNote(notes, "CloudWatch log data was unavailable.");
  }

  if (
    serviceHealthResult?.error?.code === "permission_denied"
  ) {
    appendNote(notes, "Service health data could not be accessed due to permissions.");
  } else if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getServiceErrorSummary) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getServiceErrorSummary)) &&
    data.serviceHealth === undefined
  ) {
    appendNote(notes, "Service health data was unavailable.");
  }

  if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getAuditLogs) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getAuditLogs)) &&
    data.audit === undefined
  ) {
    appendNote(notes, "Audit log data was unavailable.");
  }

  if (
    reconciliationStatusResult?.error?.code === "permission_denied"
  ) {
    appendNote(notes, "Reconciliation status could not be accessed due to permissions.");
  } else if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getReconciliationStatus) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getReconciliationStatus)) &&
    data.reconciliationStatus === undefined
  ) {
    appendNote(notes, "Reconciliation status data was unavailable.");
  }

  if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getBufferedRecords) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getBufferedRecords)) &&
    data.bufferedRecords === undefined
  ) {
    appendNote(notes, "Buffered reconciliation records were unavailable.");
  }

  if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getReconciledRecords) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getReconciledRecords)) &&
    data.reconciledRecords === undefined
  ) {
    appendNote(notes, "Reconciled records were unavailable.");
  }

  if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getInvalidProductBrandCards) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getInvalidProductBrandCards)) &&
    data.invalidProductBrandCards === undefined
  ) {
    appendNote(notes, "Invalid product-brand card data was unavailable.");
  }

  if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getExpiredCards) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getExpiredCards)) &&
    data.expiredCards === undefined
  ) {
    appendNote(notes, "Expired card data was unavailable.");
  }

  if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getSystemCardsSummaryReconcileSupplier) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getSystemCardsSummaryReconcileSupplier)) &&
    data.reconciliationSummary === undefined
  ) {
    appendNote(notes, "Reconciliation supplier summary data was unavailable.");
  }

  if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getBillingOrder) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getBillingOrder)) &&
    data.billing === undefined
  ) {
    appendNote(notes, "Billing data was unavailable.");
  }

  if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getOrderCards) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getOrderCards)) &&
    data.cards === undefined
  ) {
    appendNote(notes, "Card data could not be retrieved.");
  }

  if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getOrderItemsInfo) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getOrderItemsInfo)) &&
    data.items === undefined
  ) {
    appendNote(notes, "Item data could not be retrieved.");
  }

  if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getOrderDetails) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getOrderDetails)) &&
    data.order === undefined
  ) {
    appendNote(notes, "Order detail data was unavailable.");
  }

  if (
    (summary.failedTools.includes(OPS_TOOL_NAMES.getOrderHistory) ||
      summary.failedTools.includes(OPS_TOOL_NAMES.getClientOrderHistory) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getOrderHistory) ||
      summary.partialSuccessTools?.includes(OPS_TOOL_NAMES.getClientOrderHistory)) &&
    data.history === undefined
  ) {
    appendNote(notes, "Order history data was unavailable.");
  }

  if (
    data.history !== undefined &&
    data.order === undefined &&
    data.billing === undefined &&
    data.reconciliationStatus === undefined &&
    data.bufferedRecords === undefined &&
    data.reconciledRecords === undefined &&
    data.invalidProductBrandCards === undefined &&
    data.expiredCards === undefined &&
    data.reconciliationSummary === undefined &&
    data.awsLogs === undefined &&
    data.serviceHealth === undefined &&
    data.infraSummary === undefined
  ) {
    appendNote(notes, "Only order history data was available.");
  }

  if (
    data.history === undefined &&
    data.order === undefined &&
    data.billing === undefined &&
    data.reconciliationStatus !== undefined &&
    data.bufferedRecords === undefined &&
    data.reconciledRecords === undefined &&
    data.invalidProductBrandCards === undefined &&
    data.expiredCards === undefined &&
    data.reconciliationSummary === undefined &&
    data.awsLogs === undefined &&
    data.serviceHealth === undefined &&
    data.infraSummary === undefined
  ) {
    appendNote(notes, "Only reconciliation status data was available.");
  }

  if (
    data.history === undefined &&
    data.order === undefined &&
    data.billing === undefined &&
    data.reconciliationStatus === undefined &&
    data.bufferedRecords === undefined &&
    data.reconciledRecords === undefined &&
    data.invalidProductBrandCards === undefined &&
    data.expiredCards === undefined &&
    data.reconciliationSummary === undefined &&
    data.awsLogs !== undefined &&
    data.serviceHealth === undefined
  ) {
    appendNote(notes, "Only CloudWatch log data was available.");
  }

  if (
    data.history === undefined &&
    data.order === undefined &&
    data.billing === undefined &&
    data.cards === undefined &&
    data.items === undefined &&
    data.audit === undefined &&
    data.reconciliationStatus === undefined &&
    data.bufferedRecords === undefined &&
    data.reconciledRecords === undefined &&
    data.invalidProductBrandCards === undefined &&
    data.expiredCards === undefined &&
    data.reconciliationSummary === undefined &&
    data.awsLogs === undefined &&
    data.serviceHealth === undefined &&
    data.infraSummary === undefined
  ) {
    appendNote(notes, "No successful tool data was available.");
  }

  if (hasMissingData) {
    appendNote(notes, "Some data could not be fetched.");
  }

  return notes;
}

function buildGenericNotes(plan: ExecutionPlan, summary: PackedExecutionSummary) {
  const notes = [...(plan.notes ?? [])];

  if (
    summary.failedTools.length > 0 ||
    (summary.partialSuccessTools?.length ?? 0) > 0 ||
    (summary.skippedTools?.length ?? 0) > 0
  ) {
    appendNote(notes, "Some data could not be fetched.");
  }

  return notes;
}

export function packExecutionContext(
  plan: ExecutionPlan,
  execution: ExecutionRunResult
): PackedOpsContext<Record<string, unknown> | PackedOrderData> {
  const summary = buildExecutionSummary(execution.results);
  const sources = collectPackedSources(execution.results);

  if (plan.domain === "orders" || plan.domain === "reconciliation" || plan.domain === "aws") {
    const data = packOrderData(execution.results);

    return {
      domain: plan.domain,
      intent: plan.intent,
      entities: plan.entities,
      executionSummary: summary,
      data,
      sources,
      notes: buildOrderNotes(plan, summary, execution.results, data),
    };
  }

  return {
    domain: plan.domain,
    intent: plan.intent,
    entities: plan.entities,
    executionSummary: summary,
    data: packGenericData(execution.results),
    sources,
    notes: buildGenericNotes(plan, summary),
  };
}
