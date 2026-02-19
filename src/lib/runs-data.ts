import {
  IssueType,
  RunMode,
  RunStatus,
  Severity,
  type Prisma,
} from "@prisma/client";

import { prisma } from "@/lib/prisma";
import {
  isIssueType,
  isRunMode,
  isRunStatus,
  isSeverity,
} from "@/lib/reconciliation";

export interface RunListFilters {
  status?: string | null;
  mode?: string | null;
  entity?: string | null;
  q?: string | null;
  from?: string | null;
  to?: string | null;
  page?: string | null;
  pageSize?: string | null;
}

export interface RunIssuesFilters {
  type?: string | null;
  severity?: string | null;
  q?: string | null;
  page?: string | null;
  pageSize?: string | null;
}

export function parsePositiveInt(value: string | null | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

export function parseDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
}

export async function getRunsList(filters: RunListFilters) {
  const pageIndex = parsePositiveInt(filters.page, 1);
  const pageSize = Math.min(parsePositiveInt(filters.pageSize, 20), 100);

  const where: Prisma.ReconciliationRunWhereInput = {};

  if (filters.status && isRunStatus(filters.status)) {
    where.status = filters.status as RunStatus;
  }

  if (filters.mode && isRunMode(filters.mode)) {
    where.mode = filters.mode as RunMode;
  }

  if (filters.entity) {
    where.entityName = {
      equals: filters.entity,
      mode: "insensitive",
    };
  }

  if (filters.q) {
    const query = filters.q.trim();

    if (query.length > 0) {
      where.OR = [
        {
          processId: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          entityName: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          events: {
            some: {
              message: {
                contains: query,
                mode: "insensitive",
              },
            },
          },
        },
      ];
    }
  }

  const fromDate = parseDate(filters.from);
  const toDate = parseDate(filters.to);

  if (fromDate || toDate) {
    where.uploadedAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: new Date(toDate.getTime() + 24 * 60 * 60 * 1000) } : {}),
    };
  }

  const [count, items] = await prisma.$transaction([
    prisma.reconciliationRun.count({ where }),
    prisma.reconciliationRun.findMany({
      where,
      orderBy: {
        uploadedAt: "desc",
      },
      skip: (pageIndex - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items,
    count,
    pageIndex,
    pageSize,
  };
}

export async function getRunById(id: string) {
  return prisma.reconciliationRun.findUnique({
    where: { id },
  });
}

export async function getRunEvents(runId: string) {
  return prisma.runEvent.findMany({
    where: { runId },
    orderBy: {
      at: "desc",
    },
  });
}

export async function getRunIssues(runId: string, filters: RunIssuesFilters) {
  const pageIndex = parsePositiveInt(filters.page, 1);
  const pageSize = Math.min(parsePositiveInt(filters.pageSize, 25), 200);

  const where: Prisma.RunIssueWhereInput = {
    runId,
  };

  if (filters.type && isIssueType(filters.type)) {
    where.issueType = filters.type as IssueType;
  }

  if (filters.severity && isSeverity(filters.severity)) {
    where.severity = filters.severity as Severity;
  }

  if (filters.q) {
    const query = filters.q.trim();

    if (query.length > 0) {
      where.OR = [
        {
          supplierIdentifier: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          supplierOrderNumber: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          cardId: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          orderId: {
            contains: query,
            mode: "insensitive",
          },
        },
        {
          errorMessage: {
            contains: query,
            mode: "insensitive",
          },
        },
      ];
    }
  }

  const [count, items] = await prisma.$transaction([
    prisma.runIssue.count({ where }),
    prisma.runIssue.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip: (pageIndex - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return {
    items,
    count,
    pageIndex,
    pageSize,
  };
}

export async function getRunIssueBreakdown(runId: string) {
  return prisma.runIssue.groupBy({
    by: ["issueType"],
    where: {
      runId,
    },
    _count: {
      _all: true,
    },
    orderBy: {
      _count: {
        issueType: "desc",
      },
    },
  });
}

export async function getDashboardMetrics() {
  const now = Date.now();
  const twentyFourHoursAgo = new Date(now - 24 * 60 * 60 * 1000);
  const twoHoursAgo = new Date(now - 2 * 60 * 60 * 1000);

  const [stuckRuns, recentRuns, exposureAggregate] = await prisma.$transaction([
    prisma.reconciliationRun.count({
      where: {
        status: {
          in: [RunStatus.UPLOAD_COMPLETED, RunStatus.IN_PROGRESS],
        },
        uploadedAt: {
          lt: twoHoursAgo,
        },
      },
    }),
    prisma.reconciliationRun.findMany({
      where: {
        uploadedAt: {
          gte: twentyFourHoursAgo,
        },
      },
      select: {
        mismatchRate: true,
        status: true,
        failedRecords: true,
        totalRecords: true,
      },
    }),
    prisma.reconciliationRun.aggregate({
      where: {
        uploadedAt: {
          gte: twentyFourHoursAgo,
        },
      },
      _sum: {
        estimatedExposure: true,
      },
    }),
  ]);

  const mismatchRateAvg24h =
    recentRuns.length === 0
      ? 0
      : Number(
          (
            recentRuns.reduce((sum, run) => sum + run.mismatchRate, 0) / recentRuns.length
          ).toFixed(2)
        );

  const failedRatio =
    recentRuns.reduce((sum, run) => sum + run.failedRecords, 0) /
    Math.max(
      recentRuns.reduce((sum, run) => sum + run.totalRecords, 0),
      1
    );

  const penaltyFromFailures = failedRatio * 60;
  const penaltyFromStuck = Math.min(stuckRuns * 2.5, 25);

  const supplierHealthScore = Math.max(
    0,
    Math.min(100, Math.round(100 - penaltyFromFailures - penaltyFromStuck))
  );

  return {
    stuckRuns,
    mismatchRateAvg24h,
    supplierHealthScore,
    estimatedExposure24h: exposureAggregate._sum.estimatedExposure ?? 0,
  };
}
