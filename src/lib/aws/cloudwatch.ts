import "server-only";

import {
  CloudWatchLogsClient,
  DescribeLogGroupsCommand,
  FilterLogEventsCommand,
} from "@aws-sdk/client-cloudwatch-logs";
import { retryAsync, withTimeout } from "@/lib/ops/runtime/external-request";
import { buildCacheKey, getOrSetMemoryCache } from "@/lib/ops/runtime/memory-cache";

export interface CloudWatchLogFilters {
  serviceName?: string;
  queryText?: string;
  minutes?: number;
  startTime?: string;
  endTime?: string;
  limit?: number;
  logGroupPrefix?: string;
}

export interface NormalizedCloudWatchLogEntry {
  timestamp: string;
  service?: string;
  logGroup: string;
  severity?: "error" | "warning" | "info" | "unknown";
  messageSummary: string;
  requestId?: string;
  correlationId?: string;
}

export interface NormalizedCloudWatchLogs {
  checkedAt: string;
  timeRange: {
    startTime: string;
    endTime: string;
    minutes: number;
  };
  serviceName?: string;
  queryText?: string;
  logGroupCount: number;
  returnedCount: number;
  repeatedMessages: string[];
  latestError?: {
    timestamp: string;
    service?: string;
    logGroup: string;
    messageSummary: string;
  };
  noLogGroups: boolean;
  entries: NormalizedCloudWatchLogEntry[];
}

function getAwsRegion() {
  return (
    process.env.AWS_REGION?.trim() ||
    process.env.AWS_DEFAULT_REGION?.trim() ||
    "us-east-1"
  );
}

let cloudWatchLogsClient: CloudWatchLogsClient | undefined;

function getCloudWatchLogsClient() {
  cloudWatchLogsClient ??= new CloudWatchLogsClient({
    region: getAwsRegion(),
    maxAttempts: 2,
  });

  return cloudWatchLogsClient;
}

async function sendCloudWatchCommand<T>(command: { input: object }, factory: () => Promise<T>) {
  return retryAsync({
    attempts: 2,
    retryDelayMs: 250,
    factory: async () =>
      withTimeout(
        async () => factory(),
        10_000,
        `CloudWatch request timed out for ${command.constructor.name}.`
      ),
  });
}

function normalizeToken(value?: string) {
  return value?.trim().toLowerCase().replace(/[\s_/-]+/g, " ") ?? "";
}

function summarizeMessage(message: string) {
  const firstLine = message
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);

  if (!firstLine) {
    return "Log message was empty.";
  }

  return firstLine.length > 280 ? `${firstLine.slice(0, 277)}...` : firstLine;
}

function deriveSeverity(message: string): NormalizedCloudWatchLogEntry["severity"] {
  const normalized = message.toLowerCase();

  if (
    normalized.includes("error") ||
    normalized.includes("exception") ||
    normalized.includes("failed") ||
    normalized.includes("fatal") ||
    normalized.includes("timeout")
  ) {
    return "error";
  }

  if (
    normalized.includes("warn") ||
    normalized.includes("retry") ||
    normalized.includes("throttle")
  ) {
    return "warning";
  }

  if (normalized.includes("info")) {
    return "info";
  }

  return "unknown";
}

function extractPattern(message: string, pattern: RegExp) {
  const match = message.match(pattern);
  const value = match?.[1]?.trim();
  return value ? value.slice(0, 128) : undefined;
}

function inferServiceName(logGroup: string, explicitServiceName?: string) {
  if (explicitServiceName) {
    return explicitServiceName;
  }

  const cleaned = logGroup
    .split("/")
    .filter(Boolean)
    .map((part) => part.trim())
    .find((part) => normalizeToken(part) && !["aws", "lambda", "ecs", "ecs containerinsights"].includes(normalizeToken(part)));

  return cleaned;
}

function toIsoString(value: Date | string | undefined) {
  if (!value) {
    return undefined;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function buildTimeRange(filters: CloudWatchLogFilters) {
  const endTime = toIsoString(filters.endTime) ?? new Date().toISOString();
  const minutes = filters.minutes && filters.minutes > 0 ? filters.minutes : 60;
  const startTime =
    toIsoString(filters.startTime) ??
    new Date(Date.parse(endTime) - minutes * 60 * 1000).toISOString();

  return {
    startTime,
    endTime,
    minutes: Math.max(1, Math.round((Date.parse(endTime) - Date.parse(startTime)) / 60000)),
  };
}

function getConfiguredLogGroups() {
  const configured = process.env.AWS_CLOUDWATCH_LOG_GROUPS?.trim();

  if (!configured) {
    return [];
  }

  return configured
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function includesServiceName(logGroup: string, serviceName?: string) {
  if (!serviceName) {
    return true;
  }

  return normalizeToken(logGroup).includes(normalizeToken(serviceName));
}

async function listRelevantLogGroups(filters: CloudWatchLogFilters) {
  const configuredLogGroups = getConfiguredLogGroups().filter((logGroup) =>
    includesServiceName(logGroup, filters.serviceName)
  );

  if (configuredLogGroups.length > 0) {
    return configuredLogGroups.slice(0, 10);
  }

  const client = getCloudWatchLogsClient();
  const discovered: string[] = [];
  let nextToken: string | undefined;
  let pageCount = 0;

  while (pageCount < 3) {
    const command = new DescribeLogGroupsCommand({
      nextToken,
      limit: 50,
      logGroupNamePrefix: filters.logGroupPrefix,
    });
    const response = await sendCloudWatchCommand(command, () => client.send(command));

    for (const logGroup of response.logGroups ?? []) {
      const name = logGroup.logGroupName?.trim();
      if (!name || !includesServiceName(name, filters.serviceName)) {
        continue;
      }

      discovered.push(name);

      if (discovered.length >= 10) {
        return discovered;
      }
    }

    if (!response.nextToken) {
      break;
    }

    nextToken = response.nextToken;
    pageCount += 1;
  }

  return discovered;
}

function shouldKeepEntry(
  entry: NormalizedCloudWatchLogEntry,
  filters: CloudWatchLogFilters
) {
  if (!filters.queryText) {
    return true;
  }

  return `${entry.messageSummary} ${entry.service ?? ""} ${entry.logGroup}`
    .toLowerCase()
    .includes(filters.queryText.toLowerCase());
}

function buildRepeatedMessages(entries: NormalizedCloudWatchLogEntry[]) {
  const counts = new Map<string, number>();

  for (const entry of entries) {
    if (entry.severity !== "error" && entry.severity !== "warning") {
      continue;
    }

    counts.set(entry.messageSummary, (counts.get(entry.messageSummary) ?? 0) + 1);
  }

  return [...counts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([message, count]) => `${count}x ${message}`);
}

export async function getCloudWatchLogs(filters: CloudWatchLogFilters = {}) {
  const cacheKey = buildCacheKey(["cloudwatch", filters]);

  return getOrSetMemoryCache(cacheKey, 20_000, async () => {
    const client = getCloudWatchLogsClient();
    const timeRange = buildTimeRange(filters);
    const logGroups = await listRelevantLogGroups(filters);

    if (logGroups.length === 0) {
      return {
        context: {
          checkedAt: new Date().toISOString(),
          timeRange,
          serviceName: filters.serviceName,
          queryText: filters.queryText,
          logGroupCount: 0,
          returnedCount: 0,
          repeatedMessages: [],
          noLogGroups: true,
          entries: [],
        } satisfies NormalizedCloudWatchLogs,
        sources: [
          {
            type: "aws" as const,
            endpoint: "cloudwatch:DescribeLogGroups",
          },
        ],
      };
    }

    const maxEntries = Math.min(filters.limit && filters.limit > 0 ? filters.limit : 25, 25);
    const perGroupLimit = Math.max(5, Math.ceil(maxEntries / logGroups.length));
    const collectedEntries: NormalizedCloudWatchLogEntry[] = [];
    const sources = new Set<string>(["cloudwatch:DescribeLogGroups"]);

    for (const logGroup of logGroups) {
      const command = new FilterLogEventsCommand({
        logGroupName: logGroup,
        startTime: Date.parse(timeRange.startTime),
        endTime: Date.parse(timeRange.endTime),
        limit: perGroupLimit,
      });
      const response = await sendCloudWatchCommand(command, () => client.send(command));

      sources.add("cloudwatch:FilterLogEvents");

      for (const event of response.events ?? []) {
        const message = event.message?.trim();
        if (!message || event.timestamp === undefined) {
          continue;
        }

        const entry: NormalizedCloudWatchLogEntry = {
          timestamp: new Date(event.timestamp).toISOString(),
          service: inferServiceName(logGroup, filters.serviceName),
          logGroup,
          severity: deriveSeverity(message),
          messageSummary: summarizeMessage(message),
          requestId:
            extractPattern(message, /\brequest(?:id)?[:= ]+([a-z0-9-]{6,})\b/i) ??
            extractPattern(message, /\brequestId[:= ]+([a-z0-9-]{6,})\b/i),
          correlationId: extractPattern(
            message,
            /\bcorrelation(?:id)?[:= ]+([a-z0-9-]{6,})\b/i
          ),
        };

        if (shouldKeepEntry(entry, filters)) {
          collectedEntries.push(entry);
        }
      }
    }

    const entries = collectedEntries
      .sort((left, right) => Date.parse(right.timestamp) - Date.parse(left.timestamp))
      .slice(0, maxEntries);
    const latestError = entries.find((entry) => entry.severity === "error");

    return {
      context: {
        checkedAt: new Date().toISOString(),
        timeRange,
        serviceName: filters.serviceName,
        queryText: filters.queryText,
        logGroupCount: logGroups.length,
        returnedCount: entries.length,
        repeatedMessages: buildRepeatedMessages(entries),
        latestError: latestError
          ? {
              timestamp: latestError.timestamp,
              service: latestError.service,
              logGroup: latestError.logGroup,
              messageSummary: latestError.messageSummary,
            }
          : undefined,
        noLogGroups: false,
        entries,
      } satisfies NormalizedCloudWatchLogs,
      sources: [...sources].map((endpoint) => ({
        type: "aws" as const,
        endpoint,
      })),
    };
  });
}
