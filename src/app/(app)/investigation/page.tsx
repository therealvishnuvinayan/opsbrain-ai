import { InvestigationSetup } from "@/components/investigation/investigation-setup";
import { prisma } from "@/lib/prisma";

interface InvestigationPageProps {
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

export default async function InvestigationPage({ searchParams }: InvestigationPageProps) {
  const params = searchParams ? await searchParams : {};
  const runId = readParam(params, "runId");

  const runs = await prisma.reconciliationRun.findMany({
    select: {
      id: true,
      processId: true,
      entityType: true,
      entityName: true,
      mode: true,
      status: true,
      severity: true,
      uploadedAt: true,
    },
    orderBy: {
      uploadedAt: "desc",
    },
    take: 200,
  });

  const initialRunId = runs.some((run) => run.id === runId) ? runId : runs[0]?.id;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
          Investigation Center
        </h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Deterministic investigation workflow for root-cause analysis, evidence synthesis, and action planning.
        </p>
      </section>

      <InvestigationSetup
        runs={runs.map((run) => ({
          ...run,
          uploadedAt: run.uploadedAt.toISOString(),
        }))}
        initialRunId={initialRunId}
      />
    </div>
  );
}
