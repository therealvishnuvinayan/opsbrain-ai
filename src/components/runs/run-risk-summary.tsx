import { Clock3, ShieldAlert, Wallet } from "lucide-react";
import type { ReconciliationRun } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { badgeVariantForSeverity, formatCurrencyUsd, formatNumber } from "@/lib/reconciliation";

interface RunRiskSummaryProps {
  run: ReconciliationRun;
}

function getStuckDuration(run: ReconciliationRun) {
  if (!(run.status === "UPLOAD_COMPLETED" || run.status === "IN_PROGRESS")) {
    return null;
  }

  const durationMs = Date.now() - run.uploadedAt.getTime();

  if (durationMs < 2 * 60 * 60 * 1000) {
    return null;
  }

  const hours = Math.floor(durationMs / (60 * 60 * 1000));
  const minutes = Math.floor((durationMs % (60 * 60 * 1000)) / (60 * 1000));

  return `${hours}h ${minutes}m`;
}

export function RunRiskSummary({ run }: RunRiskSummaryProps) {
  const stuckDuration = getStuckDuration(run);

  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Risk Summary</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Risk Score</p>
          <div className="mt-2 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-danger" />
            <p className="text-2xl font-semibold">{run.riskScore} / 100</p>
          </div>
          <Badge className="mt-3" variant={badgeVariantForSeverity(run.severity)}>
            {run.severity}
          </Badge>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Estimated Exposure</p>
          <div className="mt-2 flex items-center gap-2">
            <Wallet className="h-4 w-4 text-warning" />
            <p className="text-2xl font-semibold">{formatCurrencyUsd(run.estimatedExposure)}</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Based on failed + unmatched records.</p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Mismatch Rate</p>
          <p className="mt-2 text-2xl font-semibold">{run.mismatchRate.toFixed(2)}%</p>
          <p className="mt-3 text-xs text-muted-foreground">
            {formatNumber(run.unmatchedRecords)} unmatched / {formatNumber(run.totalRecords)} total
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Stuck Duration</p>
          <div className="mt-2 flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <p className="text-2xl font-semibold">{stuckDuration ?? "N/A"}</p>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Tracked from upload timestamp to current status.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
