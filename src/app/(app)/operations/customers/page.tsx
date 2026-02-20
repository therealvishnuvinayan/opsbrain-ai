import { ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function OperationsCustomersPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Customers</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Operational customer insights and incident-linked customer context are being added.
        </p>
      </section>

      <Card className="border-white/55 dark:border-slate-800/85">
        <CardHeader>
          <CardTitle>Coming soon</CardTitle>
          <CardDescription>
            Customer profile diagnostics, lifecycle events, and impact timelines will be available here.
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
