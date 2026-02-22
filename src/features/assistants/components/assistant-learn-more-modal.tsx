"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

import type { AssistantAgent } from "@/features/assistants/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface AssistantLearnMoreModalProps {
  agent: AssistantAgent | null;
  open: boolean;
  onClose: () => void;
}

export function AssistantLearnMoreModal({
  agent,
  open,
  onClose,
}: AssistantLearnMoreModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [onClose, open]);

  if (!open || !agent) {
    return null;
  }

  const Icon = agent.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/65 p-4 backdrop-blur-sm md:items-center">
      <div className="w-full max-w-3xl rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-primary/20 bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </span>
              <h3 className="text-base font-semibold">{agent.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{agent.subtitle}</p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close assistant details"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="grid gap-4 p-5 md:grid-cols-[1.2fr_1fr]">
          <section className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </p>
              <p className="mt-2 text-sm text-muted-foreground">{agent.description}</p>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Example Queries
              </p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {agent.exampleQueries.map((item) => (
                  <li key={item} className="rounded-lg bg-white/[0.03] px-2.5 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Data Inputs (Mock)
              </p>
              <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                {agent.dataSources.map((source) => (
                  <li key={source}>• {source}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Release Status
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Badge variant="warning">Coming Soon</Badge>
                <p className="text-xs text-muted-foreground">
                  Backend activation is planned in phased rollout.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
