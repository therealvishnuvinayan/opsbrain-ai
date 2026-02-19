import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function KnowledgePage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Knowledge</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Shared runbooks and reconciliation intelligence models are planned next.
        </p>
      </section>

      <Card className="border-white/55 dark:border-slate-800/85">
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Knowledge entities, supplier memory, and operational policy references will appear here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="outline">
            Preview roadmap
            <ArrowRight className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
