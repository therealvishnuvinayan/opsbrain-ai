import type { IssueType } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatNumber, getIssueTypeLabel } from "@/lib/reconciliation";

interface RunMismatchBreakdownProps {
  breakdown: Array<{
    issueType: IssueType;
    _count: {
      _all: number;
    };
  }>;
}

export function RunMismatchBreakdown({ breakdown }: RunMismatchBreakdownProps) {
  const total = breakdown.reduce((sum, item) => sum + item._count._all, 0);

  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Mismatch Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {breakdown.length === 0 ? (
          <p className="text-sm text-muted-foreground">No issues detected for this run.</p>
        ) : (
          <div className="space-y-3">
            {breakdown.map((item) => {
              const percentage = total === 0 ? 0 : (item._count._all / total) * 100;

              return (
                <div key={item.issueType} className="space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-medium">{getIssueTypeLabel(item.issueType)}</p>
                    <p className="text-muted-foreground">{formatNumber(item._count._all)}</p>
                  </div>
                  <div className="h-2 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${Math.max(percentage, 3)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
