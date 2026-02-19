"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCompactNumber, formatCurrencyUsd } from "@/lib/reconciliation";
import { cn } from "@/lib/utils";

interface DashboardMetrics {
  stuckRuns: number;
  mismatchRateAvg24h: number;
  supplierHealthScore: number;
  estimatedExposure24h: number;
}

const mismatchTrendData = [
  { day: "Mon", rate: 2.7 },
  { day: "Tue", rate: 2.9 },
  { day: "Wed", rate: 3.2 },
  { day: "Thu", rate: 3.7 },
  { day: "Fri", rate: 3.5 },
  { day: "Sat", rate: 3.9 },
  { day: "Sun", rate: 3.8 },
];

const metricStyles = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

const trendStyles = {
  success: "text-success",
  warning: "text-warning",
  danger: "text-danger",
};

function MetricsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <Card key={index} className="border-white/55 dark:border-slate-800/85">
          <CardHeader className="pb-2">
            <Skeleton className="h-4 w-28" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-7 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function RiskCards() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadMetrics = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/dashboard/metrics", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Unable to load metrics.");
        }

        const data = (await response.json()) as DashboardMetrics;

        if (!cancelled) {
          setMetrics(data);
        }
      } catch {
        if (!cancelled) {
          setMetrics({
            stuckRuns: 0,
            mismatchRateAvg24h: 0,
            supplierHealthScore: 0,
            estimatedExposure24h: 0,
          });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadMetrics();

    return () => {
      cancelled = true;
    };
  }, []);

  const riskMetrics = useMemo(() => {
    const current = metrics ?? {
      stuckRuns: 0,
      mismatchRateAvg24h: 0,
      supplierHealthScore: 0,
      estimatedExposure24h: 0,
    };

    return [
      {
        title: "Stuck Runs",
        value: formatCompactNumber(current.stuckRuns),
        trend: current.stuckRuns > 10 ? "+elevated" : "stable",
        trendDirection: current.stuckRuns > 10 ? "up" : "down",
        trendTone: current.stuckRuns > 10 ? "danger" : "success",
        caption: "last 24h",
        severity: current.stuckRuns > 10 ? "danger" : "warning",
        icon: AlertTriangle,
      },
      {
        title: "Mismatch Rate",
        value: `${current.mismatchRateAvg24h.toFixed(2)}%`,
        trend: current.mismatchRateAvg24h > 5 ? "+high" : "improving",
        trendDirection: current.mismatchRateAvg24h > 5 ? "up" : "down",
        trendTone: current.mismatchRateAvg24h > 5 ? "danger" : "success",
        caption: "last 24h",
        severity: current.mismatchRateAvg24h > 5 ? "danger" : "warning",
        icon: Activity,
      },
      {
        title: "Supplier Health",
        value: `${current.supplierHealthScore} / 100`,
        trend: current.supplierHealthScore > 85 ? "strong" : "watch",
        trendDirection: current.supplierHealthScore > 85 ? "up" : "down",
        trendTone: current.supplierHealthScore > 85 ? "success" : "warning",
        caption: "quality index",
        severity: current.supplierHealthScore > 85 ? "success" : "warning",
        icon: ShieldCheck,
      },
      {
        title: "Estimated Exposure",
        value: formatCurrencyUsd(current.estimatedExposure24h),
        trend: current.estimatedExposure24h > 100000 ? "+high" : "controlled",
        trendDirection: current.estimatedExposure24h > 100000 ? "up" : "down",
        trendTone: current.estimatedExposure24h > 100000 ? "warning" : "success",
        caption: "last 24h",
        severity: current.estimatedExposure24h > 100000 ? "warning" : "success",
        icon: Wallet,
      },
    ] as const;
  }, [metrics]);

  return (
    <section className="space-y-6" aria-label="Risk indicators">
      {loading ? (
        <MetricsSkeleton />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {riskMetrics.map((metric) => {
            const Icon = metric.icon;

            return (
              <motion.div
                key={metric.title}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
              >
                <Card className="h-full border-white/55 p-0 dark:border-slate-800/85">
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm text-muted-foreground">{metric.title}</CardTitle>
                      <Icon className={cn("h-4 w-4", metricStyles[metric.severity])} />
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-2xl font-semibold tracking-tight">{metric.value}</p>
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {metric.trendDirection === "up" ? (
                        <ArrowUpRight className={cn("h-3.5 w-3.5", trendStyles[metric.trendTone])} />
                      ) : (
                        <ArrowDownRight className={cn("h-3.5 w-3.5", trendStyles[metric.trendTone])} />
                      )}
                      <span className={trendStyles[metric.trendTone]}>{metric.trend}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{metric.caption}</p>
                      <Badge
                        variant={
                          metric.severity === "danger"
                            ? "danger"
                            : metric.severity === "warning"
                              ? "warning"
                              : "success"
                        }
                      >
                        {metric.severity}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <motion.div whileHover={{ y: -4 }} transition={{ duration: 0.18, ease: "easeOut" }}>
        <Card className="border-white/55 dark:border-slate-800/85">
          <CardHeader>
            <CardTitle>Mismatch rate (7 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={mismatchTrendData} margin={{ left: -16, right: 12, top: 8 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="hsl(var(--border))"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="day"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  />
                  <YAxis
                    domain={[2, 4.5]}
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    tickFormatter={(value) => `${value}%`}
                  />
                  <Tooltip
                    formatter={(value) => [`${value}%`, "Mismatch rate"]}
                    cursor={{ stroke: "hsl(var(--primary))", strokeOpacity: 0.3 }}
                    contentStyle={{
                      borderRadius: "12px",
                      border: "1px solid hsl(var(--border))",
                      background: "hsl(var(--card))",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="rate"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2.4}
                    dot={{ r: 0 }}
                    activeDot={{ r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </section>
  );
}
