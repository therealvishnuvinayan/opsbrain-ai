"use client";

import { FileSearch } from "lucide-react";

import type { ActionRun } from "@/features/actions/types";
import {
  durationLabel,
  formatDateTime,
  runStatusBadgeVariant,
  runStatusLabel,
} from "@/features/actions/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface RunsTableProps {
  runs: ActionRun[];
  isLoading?: boolean;
  onViewLogs: (runId: string) => void;
}

export function RunsTable({ runs, isLoading = false, onViewLogs }: RunsTableProps) {
  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-base">Execution History</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Run ID</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Trigger</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Duration</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Operator</TableHead>
              <TableHead>Environment</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading
              ? Array.from({ length: 7 }).map((_, index) => (
                  <TableRow key={`run-skeleton-${index}`}>
                    <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-48" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-36" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                    <TableCell><Skeleton className="ml-auto h-8 w-20" /></TableCell>
                  </TableRow>
                ))
              : null}

            {!isLoading && runs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="py-10 text-center text-sm text-muted-foreground">
                  No action runs yet. Start a manual run from the catalog.
                </TableCell>
              </TableRow>
            ) : null}

            {!isLoading
              ? runs.map((run) => (
                  <TableRow key={run.id}>
                    <TableCell className="font-medium">{run.id}</TableCell>
                    <TableCell>{run.actionName}</TableCell>
                    <TableCell>{run.triggerKind}</TableCell>
                    <TableCell>{formatDateTime(run.startedAt)}</TableCell>
                    <TableCell>{durationLabel(run.durationSec)}</TableCell>
                    <TableCell>
                      <Badge variant={runStatusBadgeVariant(run.status)}>{runStatusLabel(run.status)}</Badge>
                    </TableCell>
                    <TableCell>{run.operator}</TableCell>
                    <TableCell>{run.environment.toUpperCase()}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => onViewLogs(run.id)}>
                        <FileSearch className="h-3.5 w-3.5" />
                        View logs
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              : null}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
