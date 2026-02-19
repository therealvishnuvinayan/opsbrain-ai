import Link from "next/link";
import type { RunIssue, Severity, IssueType } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ISSUE_TYPE_OPTIONS,
  SEVERITY_OPTIONS,
  badgeVariantForSeverity,
  getIssueTypeLabel,
  getSeverityLabel,
} from "@/lib/reconciliation";
import { cn } from "@/lib/utils";

interface RunIssuesTableProps {
  runId: string;
  issues: RunIssue[];
  count: number;
  pageIndex: number;
  pageSize: number;
  filters: {
    type: string;
    severity: string;
    q: string;
  };
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

export function RunIssuesTable({
  runId,
  issues,
  count,
  pageIndex,
  pageSize,
  filters,
}: RunIssuesTableProps) {
  const totalPages = Math.max(1, Math.ceil(count / pageSize));

  const previousHref = withSearchParams(`/runs/${runId}`, {
    type: filters.type || undefined,
    severity: filters.severity || undefined,
    q: filters.q || undefined,
    page: pageIndex > 1 ? pageIndex - 1 : 1,
    pageSize,
  });

  const nextHref = withSearchParams(`/runs/${runId}`, {
    type: filters.type || undefined,
    severity: filters.severity || undefined,
    q: filters.q || undefined,
    page: pageIndex < totalPages ? pageIndex + 1 : totalPages,
    pageSize,
  });

  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader className="space-y-3">
        <CardTitle>Issues</CardTitle>

        <form className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5" method="get">
          <div className="lg:col-span-2">
            <Input name="q" defaultValue={filters.q} placeholder="Search issue fields or message" />
          </div>

          <Select name="type" defaultValue={filters.type}>
            <option value="">All issue types</option>
            {ISSUE_TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select name="severity" defaultValue={filters.severity}>
            <option value="">All severities</option>
            {SEVERITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <div className="flex gap-2">
            <input type="hidden" name="pageSize" value={pageSize} />
            <Button type="submit" className="w-full">
              Filter
            </Button>
            <Link
              href={`/runs/${runId}`}
              className={cn(buttonVariants({ variant: "outline" }), "w-full")}
            >
              Reset
            </Link>
          </div>
        </form>
      </CardHeader>

      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Issue Type</TableHead>
              <TableHead>Severity</TableHead>
              <TableHead>Supplier Ref</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Card</TableHead>
              <TableHead>SKU / Brand</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Created</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {issues.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-sm text-muted-foreground">
                  No issues match the selected filters.
                </TableCell>
              </TableRow>
            ) : (
              issues.map((issue) => (
                <TableRow key={issue.id}>
                  <TableCell>{getIssueTypeLabel(issue.issueType as IssueType)}</TableCell>
                  <TableCell>
                    <Badge variant={badgeVariantForSeverity(issue.severity as Severity)}>
                      {getSeverityLabel(issue.severity as Severity)}
                    </Badge>
                  </TableCell>
                  <TableCell>{issue.supplierIdentifier ?? "—"}</TableCell>
                  <TableCell>{issue.supplierOrderNumber ?? issue.orderId ?? "—"}</TableCell>
                  <TableCell>{issue.cardId ?? "—"}</TableCell>
                  <TableCell>
                    <div>{issue.productSku ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{issue.brandName ?? ""}</div>
                  </TableCell>
                  <TableCell className="max-w-[320px] truncate">{issue.errorMessage ?? "—"}</TableCell>
                  <TableCell>{issue.createdAt.toLocaleString("en-US")}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>

        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Showing {(pageIndex - 1) * pageSize + 1}-{Math.min(pageIndex * pageSize, count)} of {count}
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={previousHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                pageIndex <= 1 ? "pointer-events-none opacity-50" : ""
              )}
            >
              Previous
            </Link>
            <p className="text-xs text-muted-foreground">
              Page {pageIndex} / {totalPages}
            </p>
            <Link
              href={nextHref}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                pageIndex >= totalPages ? "pointer-events-none opacity-50" : ""
              )}
            >
              Next
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
