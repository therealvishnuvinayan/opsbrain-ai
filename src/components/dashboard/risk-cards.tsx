"use client";

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
import { cn } from "@/lib/utils";

const riskMetrics = [
  {
    title: "Stuck Runs",
    value: "42",
    trend: "+12%",
    trendDirection: "up" as const,
    trendTone: "danger" as const,
    caption: "vs last 24h",
    severity: "danger" as const,
    icon: AlertTriangle,
  },
  {
    title: "Mismatch Rate",
    value: "3.8%",
    trend: "-0.4%",
    trendDirection: "down" as const,
    trendTone: "success" as const,
    caption: "vs last 24h",
    severity: "warning" as const,
    icon: Activity,
  },
  {
    title: "Supplier Health",
    value: "92 / 100",
    trend: "+1.2",
    trendDirection: "up" as const,
    trendTone: "success" as const,
    caption: "vs last 24h",
    severity: "success" as const,
    icon: ShieldCheck,
  },
  {
    title: "Estimated Exposure",
    value: "$126,400",
    trend: "+8.1%",
    trendDirection: "up" as const,
    trendTone: "warning" as const,
    caption: "vs last 24h",
    severity: "warning" as const,
    icon: Wallet,
  },
];

const mismatchTrendData = [
  { day: "Mon", rate: 2.7 },
  { day: "Tue", rate: 2.9 },
  { day: "Wed", rate: 3.2 },
  { day: "Thu", rate: 3.7 },
  { day: "Fri", rate: 3.5 },
  { day: "Sat", rate: 3.9 },
  { day: "Sun", rate: 3.8 },
];

const sparklineValues = [14, 16, 15, 18, 17, 21, 19, 22, 20];

function Sparkline() {
  const points = sparklineValues
    .map((value, index) => `${index * 15},${28 - value}`)
    .join(" ");

  return (
    <svg viewBox="0 0 120 30" className="h-7 w-24" aria-hidden>
      <polyline
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        points={points}
        className="text-warning"
      />
    </svg>
  );
}

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

export function RiskCards() {
  return (
    <section className="space-y-6" aria-label="Risk indicators">
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
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-medium">
                      {metric.trendDirection === "up" ? (
                        <ArrowUpRight className={cn("h-3.5 w-3.5", trendStyles[metric.trendTone])} />
                      ) : (
                        <ArrowDownRight className={cn("h-3.5 w-3.5", trendStyles[metric.trendTone])} />
                      )}
                      <span className={trendStyles[metric.trendTone]}>{metric.trend}</span>
                    </div>
                    {metric.title === "Mismatch Rate" ? <Sparkline /> : null}
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

      <motion.div
        whileHover={{ y: -4 }}
        transition={{ duration: 0.18, ease: "easeOut" }}
      >
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
