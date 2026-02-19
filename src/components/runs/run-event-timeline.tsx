import { AlertTriangle, CheckCircle2, CircleDashed, Clock3 } from "lucide-react";
import type { RunEvent } from "@prisma/client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RunEventTimelineProps {
  events: RunEvent[];
}

function iconForSeverity(severity: RunEvent["severity"]) {
  switch (severity) {
    case "CRITICAL":
      return <AlertTriangle className="h-4 w-4 text-danger" />;
    case "HIGH":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "MEDIUM":
      return <Clock3 className="h-4 w-4 text-primary" />;
    case "LOW":
    default:
      return <CheckCircle2 className="h-4 w-4 text-success" />;
  }
}

export function RunEventTimeline({ events }: RunEventTimelineProps) {
  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Event Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">No events recorded.</p>
        ) : (
          <ol className="space-y-4">
            {events.map((event) => (
              <li key={event.id} className="relative pl-7">
                <span className="absolute left-0 top-0 flex h-5 w-5 items-center justify-center">
                  {iconForSeverity(event.severity)}
                </span>
                <span className="absolute left-2.5 top-5 h-[calc(100%+0.75rem)] w-px bg-white/10" />

                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <CircleDashed className="h-3 w-3" />
                    <span>{event.type}</span>
                    <span>•</span>
                    <span>{event.at.toLocaleString("en-US")}</span>
                  </div>
                  <p className="mt-1 text-sm text-foreground">{event.message}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
