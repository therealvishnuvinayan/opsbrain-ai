"use client";

import { motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Clock3 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const timelineEvents = [
  {
    id: 1,
    message: "Run #8293 moved to UploadCompleted",
    timestamp: "2m ago",
    severity: "neutral" as const,
    icon: CheckCircle2,
  },
  {
    id: 2,
    message: "Supplier fetch failed: Runa",
    timestamp: "12m ago",
    severity: "danger" as const,
    icon: AlertCircle,
  },
  {
    id: 3,
    message: "12 rows flagged as ambiguous match",
    timestamp: "1h ago",
    severity: "warning" as const,
    icon: Clock3,
  },
  {
    id: 4,
    message: "Auto-reconciliation rerun queued for Supplier Delta",
    timestamp: "2h ago",
    severity: "success" as const,
    icon: CheckCircle2,
  },
];

const iconStyles = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  neutral: "bg-secondary/70 text-muted-foreground",
};

export function EventTimeline() {
  return (
    <Card className="h-full border-white/55 dark:border-slate-800/85">
      <CardHeader>
        <CardTitle>Event Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          <span
            aria-hidden
            className="absolute left-[12px] top-1 h-[calc(100%-16px)] w-px bg-border"
          />
          <ol className="space-y-4">
            {timelineEvents.map((event) => {
              const Icon = event.icon;
              return (
                <motion.li
                  key={event.id}
                  whileHover={{ x: 2 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="relative pl-9"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "absolute left-0 top-1 flex h-6 w-6 items-center justify-center rounded-full border border-white/30",
                      iconStyles[event.severity]
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="rounded-xl border border-white/40 bg-white/65 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/45">
                    <p className="text-sm font-medium leading-relaxed">{event.message}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">{event.timestamp}</p>
                      <Badge
                        variant={
                          event.severity === "danger"
                            ? "danger"
                            : event.severity === "warning"
                              ? "warning"
                              : event.severity === "success"
                                ? "success"
                                : "neutral"
                        }
                      >
                        {event.severity}
                      </Badge>
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
