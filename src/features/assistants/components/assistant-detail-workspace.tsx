"use client";

import { useState } from "react";
import { Paperclip, PlayCircle } from "lucide-react";

import type { AssistantAgent } from "@/features/assistants/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

interface AssistantDetailWorkspaceProps {
  assistant: AssistantAgent;
}

export function AssistantDetailWorkspace({ assistant }: AssistantDetailWorkspaceProps) {
  const [prompt, setPrompt] = useState("");
  const [attachedContext, setAttachedContext] = useState<string[]>([]);
  const [contextCursor, setContextCursor] = useState(0);

  const attachContext = () => {
    const next = assistant.dataSources[contextCursor % assistant.dataSources.length];
    setAttachedContext((current) => (current.includes(next) ? current : [...current, next]));
    setContextCursor((current) => current + 1);
  };

  return (
    <section className="grid gap-4 xl:grid-cols-[1.08fr_1fr]">
      <Card className="border-white/15 bg-white/[0.04] shadow-glass backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <CardTitle className="text-base">Command Workspace</CardTitle>
          <p className="text-sm text-muted-foreground">
            Compose investigation prompts and attach context packets before running this assistant.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            aria-label={`${assistant.title} prompt`}
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder={`Ask ${assistant.title}...`}
            className="min-h-[180px] resize-none border-white/45 bg-white/[0.05]"
          />

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="secondary" onClick={attachContext}>
              <Paperclip className="h-4 w-4" />
              Attach context
            </Button>
            <Button type="button" disabled title="Coming soon">
              <PlayCircle className="h-4 w-4" />
              Run
            </Button>
            <span className="text-xs text-muted-foreground">Coming soon</span>
          </div>

          {attachedContext.length > 0 ? (
            <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.02] p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Attached Context
              </p>
              <div className="flex flex-wrap gap-2">
                {attachedContext.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() =>
                      setAttachedContext((current) =>
                        current.filter((contextItem) => contextItem !== item)
                      )
                    }
                    className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-muted-foreground transition hover:border-white/30 hover:text-foreground"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              Attach context to pre-load data scopes for this assistant.
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-white/15 bg-white/[0.04] shadow-glass backdrop-blur-xl">
        <CardHeader className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="text-base">Structured Response</CardTitle>
            <Badge variant="neutral">Preview</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Summary, diagnosis, and recommended actions will appear here after backend activation.
          </p>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          <div className="space-y-2">
            <p className="font-semibold">Summary</p>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-10/12" />
          </div>

          <div className="space-y-2">
            <p className="font-semibold">Diagnosis</p>
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          <div className="space-y-2">
            <p className="font-semibold">Evidence</p>
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-9 w-11/12" />
          </div>

          <div className="space-y-2">
            <p className="font-semibold">Recommended Actions</p>
            <div className="grid gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" disabled title="Coming soon">
                Open profile
              </Button>
              <Button type="button" variant="outline" disabled title="Coming soon">
                Start investigation
              </Button>
              <Button type="button" variant="outline" disabled title="Coming soon">
                Create action
              </Button>
              <Button type="button" variant="outline" disabled title="Coming soon">
                Export summary
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
