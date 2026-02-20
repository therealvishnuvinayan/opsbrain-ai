import { ShieldCheck } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface PolicyImpactProps {
  result: unknown;
  isLoading: boolean;
}

export function PolicyImpact({ isLoading }: PolicyImpactProps) {
  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="h-4 w-4 text-primary" />
          Impact Projection
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">
        {isLoading ? "Computing simulation impact..." : "Run a simulation to project policy impact."}
      </CardContent>
    </Card>
  );
}
