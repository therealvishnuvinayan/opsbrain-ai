"use client";

import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PolicySimulatorProps {
  runId: string;
  onSimulationChange?: (_result: unknown) => void;
}

export function PolicySimulator({ runId }: PolicySimulatorProps) {
  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="h-4 w-4 text-primary" />
          Policy Simulator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm text-muted-foreground">
        <Badge variant="neutral">Simulation only</Badge>
        <p>
          Policy simulation UI is available in this environment as a placeholder component.
        </p>
        <p>Selected run: {runId || "Not selected"}</p>
      </CardContent>
    </Card>
  );
}
