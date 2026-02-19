import { ChevronDown } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HypothesesAccordionProps {
  hypotheses: Array<{
    title: string;
    rationale: string;
    evidence: string[];
    probability: number;
  }>;
}

export function HypothesesAccordion({ hypotheses }: HypothesesAccordionProps) {
  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Hypotheses</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hypotheses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No ranked hypotheses were generated.</p>
        ) : (
          hypotheses.map((hypothesis, index) => (
            <details
              key={`${hypothesis.title}-${index}`}
              className="group rounded-xl border border-white/10 bg-white/[0.03] open:bg-white/[0.05]"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-sm font-medium">{hypothesis.title}</p>
                  <p className="text-xs text-muted-foreground">Rank #{index + 1}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={hypothesis.probability >= 50 ? "warning" : "neutral"}>
                    {hypothesis.probability}%
                  </Badge>
                  <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                </div>
              </summary>

              <div className="space-y-3 border-t border-white/10 px-4 py-3">
                <p className="text-sm text-muted-foreground">{hypothesis.rationale}</p>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Supporting Evidence
                  </p>
                  <ul className="space-y-1 text-sm text-foreground/90">
                    {hypothesis.evidence.map((item) => (
                      <li key={item} className="rounded-lg bg-white/[0.03] px-2.5 py-1.5">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </details>
          ))
        )}
      </CardContent>
    </Card>
  );
}
