import { AppShellLayout } from "@/components/app-shell/app-shell-layout";
import { CommandConsole } from "@/components/dashboard/command-console";
import { EventTimeline } from "@/components/dashboard/event-timeline";
import { InvestigationCenter } from "@/components/dashboard/investigation-center";
import { RiskCards } from "@/components/dashboard/risk-cards";

export default function DashboardPage() {
  return (
    <AppShellLayout>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Welcome back, Vishnu
          </h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Operational Intelligence Layer — Reconciliation Autopilot + Investigator
          </p>
        </section>

        <RiskCards />
        <CommandConsole />

        <section className="grid gap-6 xl:grid-cols-[1.25fr_1fr]">
          <EventTimeline />
          <InvestigationCenter />
        </section>
      </div>
    </AppShellLayout>
  );
}
