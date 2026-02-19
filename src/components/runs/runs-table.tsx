import Link from "next/link";
import type { ReconciliationRun } from "@prisma/client";
import { Microscope } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  badgeVariantForSeverity,
  badgeVariantForStatus,
  formatCurrencyUsd,
  formatNumber,
  getSeverityLabel,
  getStatusLabel,
} from "@/lib/reconciliation";
import { cn } from "@/lib/utils";

interface RunsTableProps {
  runs: ReconciliationRun[];
}

export function RunsTable({ runs }: RunsTableProps) {
  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Reconciliation Runs</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Process ID</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead>Mode</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Failed</TableHead>
              <TableHead className="text-right">Unmatched</TableHead>
              <TableHead className="text-right">Mismatch %</TableHead>
              <TableHead className="text-right">Exposure</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Uploaded At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={12} className="py-8 text-center text-sm text-muted-foreground">
                  No runs match the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              runs.map((run) => (
                <TableRow key={run.id}>
                  <TableCell>
                    <Link
                      href={`/runs/${run.id}`}
                      className="font-semibold text-primary transition-colors hover:text-primary/80"
                    >
                      {run.processId}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{run.entityName}</div>
                    <div className="text-xs text-muted-foreground">{run.entityType}</div>
                  </TableCell>
                  <TableCell>{run.mode}</TableCell>
                  <TableCell>
                    <Badge variant={badgeVariantForStatus(run.status)}>{getStatusLabel(run.status)}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatNumber(run.totalRecords)}</TableCell>
                  <TableCell className="text-right">{formatNumber(run.failedRecords)}</TableCell>
                  <TableCell className="text-right">{formatNumber(run.unmatchedRecords)}</TableCell>
                  <TableCell className="text-right font-medium">{run.mismatchRate.toFixed(2)}%</TableCell>
                  <TableCell className="text-right">{formatCurrencyUsd(run.estimatedExposure)}</TableCell>
                  <TableCell>
                    <Badge variant={badgeVariantForSeverity(run.severity)}>
                      {getSeverityLabel(run.severity)}
                    </Badge>
                  </TableCell>
                  <TableCell>{run.uploadedAt.toLocaleString("en-US")}</TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/investigation?runId=${run.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "inline-flex")}
                    >
                      <Microscope className="h-3.5 w-3.5" />
                      Investigate
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
