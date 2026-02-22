"use client";

import Link from "next/link";

import { assistants } from "@/features/assistants/data";
import { cn } from "@/lib/utils";

interface AssistantsAgentNavProps {
  activeId: string;
}

export function AssistantsAgentNav({ activeId }: AssistantsAgentNavProps) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Assistant agents">
      {assistants.map((agent) => {
        const Icon = agent.icon;

        return (
          <Link
            key={agent.id}
            href={agent.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
              agent.id === activeId
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {agent.title}
          </Link>
        );
      })}
    </nav>
  );
}
