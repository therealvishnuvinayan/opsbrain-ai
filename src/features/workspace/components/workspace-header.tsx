"use client";

import { Loader2 } from "lucide-react";

import type { OpsWorkspaceStatus } from "@/features/workspace/types";
import { cn } from "@/lib/utils";

interface WorkspaceHeaderProps {
  centered: boolean;
  compact?: boolean;
  status: OpsWorkspaceStatus;
}

export function WorkspaceHeader({
  centered,
  compact = false,
  status,
}: WorkspaceHeaderProps) {
  if (compact) {
    return (
      <section className="max-w-2xl space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            OpsBrain Workspace
          </p>
          {status.status === "checking" ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-black/[0.05] backdrop-blur dark:bg-slate-950/70 dark:ring-white/[0.08]">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Connecting
            </span>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          Follow up, refine the question, or drill deeper into the evidence.
        </p>
      </section>
    );
  }

  return (
    <section
      className={cn(
        "relative isolate space-y-4",
        centered ? "mx-auto max-w-4xl text-center" : "max-w-3xl"
      )}
    >
      {centered ? (
        <div
          aria-hidden
          className="absolute inset-x-8 -top-8 h-44 rounded-[44px] bg-[linear-gradient(90deg,rgba(206,249,251,0.92)_0%,rgba(255,255,255,0.86)_46%,rgba(241,224,255,0.92)_100%)] opacity-95 dark:bg-[linear-gradient(90deg,rgba(14,165,233,0.12)_0%,rgba(15,23,42,0.16)_46%,rgba(168,85,247,0.14)_100%)]"
        />
      ) : null}

      <div
        className={cn(
          "relative flex flex-wrap items-center gap-3",
          centered ? "justify-center" : ""
        )}
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          OpsBrain Workspace
        </p>
        {status.status === "checking" ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-white/70 px-3 py-1 text-xs font-medium text-muted-foreground ring-1 ring-black/[0.05] backdrop-blur dark:bg-slate-950/70 dark:ring-white/[0.08]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Connecting
          </span>
        ) : null}
      </div>

      <div className="relative space-y-3">
        <h2
          className={cn(
            "font-semibold tracking-tight text-foreground",
            centered
              ? "text-5xl leading-[0.98] md:text-[5.35rem] md:leading-[0.94]"
              : "text-3xl md:text-4xl"
          )}
        >
          <span className="bg-[linear-gradient(135deg,#11bff2_0%,#4f7cff_45%,#8b5cf6_100%)] bg-clip-text text-transparent">
            What will you investigate today?
          </span>
        </h2>
        <p
          className={cn(
            "text-sm leading-7 text-muted-foreground/88 md:text-base",
            centered ? "mx-auto max-w-2xl" : "max-w-2xl"
          )}
        >
          Investigate runs, suppliers, orders, and operational risk with natural
          language.
        </p>
      </div>
    </section>
  );
}
