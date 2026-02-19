import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EvidenceTimelineProps {
  timeline: Array<{
    at: string;
    severity: string;
    message: string;
  }>;
}

function timelineIconForSeverity(severity: string) {
  switch (severity) {
    case "CRITICAL":
      return <AlertTriangle className="h-4 w-4 text-danger" />;
    case "HIGH":
      return <AlertTriangle className="h-4 w-4 text-warning" />;
    case "MEDIUM":
      return <Clock3 className="h-4 w-4 text-primary" />;
    default:
      return <CheckCircle2 className="h-4 w-4 text-success" />;
  }
}

export function EvidenceTimeline({ timeline }: EvidenceTimelineProps) {
  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Evidence Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        {timeline.length === 0 ? (
          <p className="text-sm text-muted-foreground">No timeline events available.</p>
        ) : (
          <ol className="space-y-3">
            {timeline.slice(0, 20).map((entry, index) => (
              <li key={`${entry.at}-${index}`} className="relative pl-7">
                <span className="absolute left-0 top-0.5">{timelineIconForSeverity(entry.severity)}</span>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
                  <p className="text-xs text-muted-foreground">
                    {new Date(entry.at).toLocaleString("en-US")}
                  </p>
                  <p className="mt-1 text-sm text-foreground">{entry.message}</p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
