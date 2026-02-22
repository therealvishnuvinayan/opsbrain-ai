"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";

import { assistants, roadmap } from "@/features/assistants/data";
import { AssistantLearnMoreModal } from "@/features/assistants/components/assistant-learn-more-modal";
import type { AssistantAgent } from "@/features/assistants/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AssistantsView() {
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);

  const selectedAgent = useMemo<AssistantAgent | null>(
    () => assistants.find((agent) => agent.id === selectedAgentId) ?? null,
    [selectedAgentId]
  );

  return (
    <>
      <div className="mx-auto max-w-7xl space-y-6">
        <section className="rounded-2xl border border-white/15 bg-gradient-to-r from-blue-500/10 via-blue-400/[0.07] to-cyan-400/[0.08] p-5 shadow-glass backdrop-blur-xl">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
              <Sparkles className="h-4.5 w-4.5" />
            </span>
            <div className="space-y-1">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Assistants</h2>
              <p className="text-sm text-muted-foreground md:text-base">
                These agents will ship in phases. UI is ready; backend activation coming next.
              </p>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2" aria-label="Assistants catalog">
          {assistants.map((agent) => {
            const Icon = agent.icon;

            return (
              <Card
                key={agent.id}
                className="border-white/15 bg-white/[0.04] shadow-glass backdrop-blur-xl"
              >
                <CardHeader className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex items-center gap-2">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                        <Icon className="h-4 w-4" />
                      </span>
                      <CardTitle className="text-base">{agent.title}</CardTitle>
                    </div>
                    <Badge variant="warning">Coming Soon</Badge>
                  </div>
                  <CardDescription className="text-sm text-muted-foreground">
                    {agent.subtitle}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    {agent.capabilities.map((capability) => (
                      <li key={capability}>• {capability}</li>
                    ))}
                  </ul>

                  <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                    <Link href={agent.href}>
                      <Button type="button" aria-label={`Open ${agent.title}`}>
                        Open
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setSelectedAgentId(agent.id)}
                    >
                      Learn more
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground">Coming soon</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="space-y-3">
          <div className="space-y-1">
            <h3 className="text-lg font-semibold">Roadmap</h3>
            <p className="text-sm text-muted-foreground">
              Delivery sequence for assistant activation across OpsBrain domains.
            </p>
          </div>

          <Card className="border-white/15 bg-white/[0.04] shadow-glass backdrop-blur-xl">
            <CardContent className="p-5">
              <ol className="space-y-4">
                {roadmap.map((item, index) => (
                  <li key={item.id} className="relative pl-8">
                    {index < roadmap.length - 1 ? (
                      <span
                        aria-hidden
                        className="absolute left-2.5 top-5 h-[calc(100%+0.75rem)] w-px bg-white/15"
                      />
                    ) : null}
                    <span
                      aria-hidden
                      className="absolute left-0 top-1.5 h-5 w-5 rounded-full border border-primary/30 bg-primary/15"
                    />
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary/90">
                        {item.phase}
                      </p>
                      <p className="mt-1 text-sm font-medium">{item.title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        </section>
      </div>

      <AssistantLearnMoreModal
        open={Boolean(selectedAgent)}
        agent={selectedAgent}
        onClose={() => setSelectedAgentId(null)}
      />
    </>
  );
}
