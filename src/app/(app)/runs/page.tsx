import Link from "next/link";

import { RunsFilters } from "@/components/runs/runs-filters";
import { RunsTable } from "@/components/runs/runs-table";
import { buttonVariants } from "@/components/ui/button";
import { getRunsList, type RunListFilters } from "@/lib/runs-data";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

interface RunsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

function readParam(
  params: Record<string, string | string[] | undefined>,
  key: string
): string {
  const value = params[key];

  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function toIsoDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function withSearchParams(basePath: string, params: Record<string, string | number | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === "") {
      continue;
    }

    search.set(key, String(value));
  }

  const queryString = search.toString();
  return queryString.length > 0 ? `${basePath}?${queryString}` : basePath;
}

export default async function RunsPage({ searchParams }: RunsPageProps) {
  const params = searchParams ? await searchParams : {};

  const range = readParam(params, "range") || "30d";
  const status = readParam(params, "status");
  const mode = readParam(params, "mode");
  const entity = readParam(params, "entity");
  const q = readParam(params, "q");
  const page = readParam(params, "page") || "1";
  const pageSize = readParam(params, "pageSize") || "20";

  const fromParam = readParam(params, "from");
  const toParam = readParam(params, "to");

  let from = fromParam;
  let to = toParam;

  if (range === "7d") {
    from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    to = new Date().toISOString();
  }

  if (range === "30d") {
    from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    to = new Date().toISOString();
  }

  const filters: RunListFilters = {
    status,
    mode,
    entity,
    q,
    from,
    to,
    page,
    pageSize,
  };

  const [runData, entities] = await Promise.all([
    getRunsList(filters),
    prisma.reconciliationRun.findMany({
      select: {
        entityName: true,
      },
      distinct: ["entityName"],
      orderBy: {
        entityName: "asc",
      },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(runData.count / runData.pageSize));

  const paginationFilters = {
    range,
    status: status || undefined,
    mode: mode || undefined,
    entity: entity || undefined,
    q: q || undefined,
    from: range === "custom" ? fromParam || undefined : undefined,
    to: range === "custom" ? toParam || undefined : undefined,
    pageSize: runData.pageSize,
  };

  const previousHref = withSearchParams("/runs", {
    ...paginationFilters,
    page: Math.max(1, runData.pageIndex - 1),
  });

  const nextHref = withSearchParams("/runs", {
    ...paginationFilters,
    page: Math.min(totalPages, runData.pageIndex + 1),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="space-y-1">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Runs</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Reconciliation process history
        </p>
      </section>

      <RunsFilters
        entities={entities.map((item) => item.entityName)}
        values={{
          range,
          status,
          mode,
          entity,
          q,
          from: fromParam ? toIsoDateInput(new Date(fromParam)) : "",
          to: toParam ? toIsoDateInput(new Date(toParam)) : "",
          pageSize: runData.pageSize,
        }}
      />

      <RunsTable runs={runData.items} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Showing {(runData.pageIndex - 1) * runData.pageSize + 1}-
          {Math.min(runData.pageIndex * runData.pageSize, runData.count)} of {runData.count} runs
        </p>

        <div className="flex items-center gap-2">
          <Link
            href={previousHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              runData.pageIndex <= 1 ? "pointer-events-none opacity-50" : ""
            )}
          >
            Previous
          </Link>

          <p className="text-xs text-muted-foreground">
            Page {runData.pageIndex} / {totalPages}
          </p>

          <Link
            href={nextHref}
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              runData.pageIndex >= totalPages ? "pointer-events-none opacity-50" : ""
            )}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}
