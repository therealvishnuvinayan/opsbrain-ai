import type {
  NormalizedCloudWatchLogs,
  NormalizedCloudWatchLogEntry,
} from "@/lib/aws/cloudwatch";
import type { NormalizedServiceErrorSummary } from "@/lib/aws/service-health";
import type { AwsSummary, OpsAnalytics } from "@/lib/ops/analytics/analytics-types";
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

export function isNormalizedCloudWatchLogs(
  value: unknown
): value is NormalizedCloudWatchLogs {
  return (
    isRecord(value) &&
    typeof value.logGroupCount === "number" &&
    typeof value.returnedCount === "number" &&
    Array.isArray(value.entries)
  );
}

export function isNormalizedServiceErrorSummary(
  value: unknown
): value is NormalizedServiceErrorSummary {
  return (
    isRecord(value) &&
    typeof value.logGroupCount === "number" &&
    typeof value.errorCount === "number" &&
    Array.isArray(value.repeatedMessages)
  );
}

export function hasAwsPackedData(data: PackedOrderData) {
  return Boolean(data.awsLogs || data.serviceHealth || data.infraSummary);
}

function isErrorLikeEntry(entry: NormalizedCloudWatchLogEntry) {
  return entry.severity === "error" || entry.severity === "warning";
}

export function analyzeAwsContext(
  context: PackedOpsContext<PackedOrderData>
): OpsAnalytics {
  const awsLogs = isNormalizedCloudWatchLogs(context.data.awsLogs) ? context.data.awsLogs : undefined;
  const serviceHealth = isNormalizedServiceErrorSummary(context.data.serviceHealth)
    ? context.data.serviceHealth
    : undefined;
  const latestError = serviceHealth?.latestError ?? awsLogs?.latestError;
  const summaryData: AwsSummary = {
    serviceName: serviceHealth?.serviceName ?? awsLogs?.serviceName,
    logGroupCount: serviceHealth?.logGroupCount ?? awsLogs?.logGroupCount ?? 0,
    errorCount:
      serviceHealth?.errorCount ??
      awsLogs?.entries.filter((entry) => isErrorLikeEntry(entry)).length ??
      0,
    hasRecentErrors:
      (serviceHealth?.errorCount ?? awsLogs?.entries.filter((entry) => isErrorLikeEntry(entry)).length ?? 0) > 0,
    noLogGroups: serviceHealth?.noLogGroups ?? awsLogs?.noLogGroups ?? false,
    latestErrorService: latestError?.service,
    latestErrorAt: latestError?.timestamp,
  };
  const patterns: string[] = [];
  const nextChecks: string[] = [];
  const examples: string[] = [];

  if (summaryData.noLogGroups) {
    addUnique(patterns, "No CloudWatch log groups were available in the checked account and region.");
    addUnique(nextChecks, "CloudWatch log group configuration");
  } else if (summaryData.hasRecentErrors) {
    addUnique(
      patterns,
      summaryData.serviceName
        ? `I found recent backend errors for the ${summaryData.serviceName} service.`
        : "I found recent backend errors in CloudWatch."
    );
    addUnique(nextChecks, summaryData.serviceName ? `${summaryData.serviceName} service logs` : "recent backend logs");
  } else {
    addUnique(patterns, "There were no recent system errors in the checked time range.");
  }

  for (const repeatedMessage of serviceHealth?.repeatedMessages ?? awsLogs?.repeatedMessages ?? []) {
    addUnique(patterns, `Repeated log pattern: ${repeatedMessage}`);
    if (patterns.length >= 4) {
      break;
    }
  }

  if (latestError) {
    addUnique(
      patterns,
      latestError.service
        ? `Latest significant error came from ${latestError.service}: ${latestError.messageSummary}`
        : `Latest significant error: ${latestError.messageSummary}`
    );
  }

  if (awsLogs?.entries) {
    for (const entry of awsLogs.entries) {
      if (examples.length >= 3) {
        break;
      }

      if (entry.requestId) {
        addUnique(examples, entry.requestId);
      } else if (entry.correlationId) {
        addUnique(examples, entry.correlationId);
      } else if (entry.service) {
        addUnique(examples, entry.service);
      }
    }
  }

  if (summaryData.hasRecentErrors) {
    addUnique(nextChecks, "the latest significant backend error");
  }

  if (
    context.notes.some((note) => {
      const normalized = note.toLowerCase();
      return normalized.includes("cloudwatch") && (normalized.includes("unavailable") || normalized.includes("permission"));
    })
  ) {
    addUnique(nextChecks, "the unavailable AWS data");
  }

  return {
    domain: context.domain,
    intent: context.intent,
    summary: patterns[0] ?? "No successful AWS data was available.",
    patterns: patterns.slice(1),
    nextChecks,
    examples,
    notes: context.notes,
    awsSummary: summaryData,
  };
}
