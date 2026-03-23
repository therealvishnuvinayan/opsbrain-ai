import "server-only";

import {
  getCloudWatchLogs,
  type CloudWatchLogFilters,
  type NormalizedCloudWatchLogs,
} from "@/lib/aws/cloudwatch";

export interface NormalizedServiceErrorSummary {
  checkedAt: string;
  serviceName?: string;
  logGroupCount: number;
  errorCount: number;
  repeatedMessages: string[];
  latestError?: {
    timestamp: string;
    service?: string;
    logGroup: string;
    messageSummary: string;
  };
  noLogGroups: boolean;
  noRecentErrors: boolean;
  timeRange: NormalizedCloudWatchLogs["timeRange"];
}

function isErrorLikeSeverity(value?: string) {
  return value === "error" || value === "warning";
}

export async function getServiceErrorSummary(filters: CloudWatchLogFilters = {}) {
  const logResult = await getCloudWatchLogs(filters);
  const errorEntries = logResult.context.entries.filter((entry) => isErrorLikeSeverity(entry.severity));

  return {
    context: {
      checkedAt: new Date().toISOString(),
      serviceName: filters.serviceName ?? logResult.context.serviceName,
      logGroupCount: logResult.context.logGroupCount,
      errorCount: errorEntries.length,
      repeatedMessages: logResult.context.repeatedMessages,
      latestError: logResult.context.latestError,
      noLogGroups: logResult.context.noLogGroups,
      noRecentErrors: errorEntries.length === 0,
      timeRange: logResult.context.timeRange,
    } satisfies NormalizedServiceErrorSummary,
    sources: logResult.sources,
  };
}
