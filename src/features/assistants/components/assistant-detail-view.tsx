"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getAssistantById } from "@/features/assistants/data";
import { AssistantsAgentNav } from "@/features/assistants/components/assistants-agent-nav";
import { AssistantDetailWorkspace } from "@/features/assistants/components/assistant-detail-workspace";

interface AssistantDetailViewProps {
  assistantId: string;
}

export function AssistantDetailView({ assistantId }: AssistantDetailViewProps) {
  const assistant = getAssistantById(assistantId);

  if (!assistant) {
    return null;
  }

  const Icon = assistant.icon;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <section className="space-y-2">
        <p className="text-xs text-muted-foreground">
          OpsBrain / Assistants / {assistant.title}
        </p>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
                <Icon className="h-4.5 w-4.5" />
              </span>
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {assistant.title}
              </h2>
            </div>
            <p className="text-sm text-muted-foreground md:text-base">
              {assistant.subtitle}
            </p>
          </div>
          <Badge variant="warning">Coming Soon</Badge>
        </div>
      </section>

      <Card className="border-white/15 bg-white/[0.04] shadow-glass backdrop-blur-xl">
        <CardContent className="p-4">
          <AssistantsAgentNav activeId={assistant.id} />
        </CardContent>
      </Card>

      <AssistantDetailWorkspace assistant={assistant} />
    </div>
  );
}
