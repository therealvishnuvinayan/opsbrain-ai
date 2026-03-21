"use client";

import type { OpsWorkspaceReasoningMode } from "@/features/workspace/types";
import { cn } from "@/lib/utils";

interface ReasoningPillsProps {
  value: OpsWorkspaceReasoningMode;
  centered?: boolean;
  onChange: (value: OpsWorkspaceReasoningMode) => void;
}

const options: Array<{ value: OpsWorkspaceReasoningMode; label: string }> = [
  { value: "quick", label: "Quick" },
  { value: "standard", label: "Standard" },
  { value: "deep", label: "Deep" },
];

export function ReasoningPills({
  value,
  centered = false,
  onChange,
}: ReasoningPillsProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2.5",
        centered ? "justify-center" : ""
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/78">
        Reasoning
      </span>
      <div className="flex flex-wrap items-center justify-center gap-2">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-white text-slate-900 shadow-[0_18px_40px_-28px_rgba(79,70,229,0.34)] ring-1 ring-slate-200/80 dark:bg-slate-900 dark:text-white dark:ring-white/[0.08]"
                  : "bg-white/62 text-slate-600 ring-1 ring-slate-200/70 hover:bg-white hover:text-slate-900 dark:bg-slate-950/72 dark:text-slate-300 dark:ring-white/[0.08] dark:hover:bg-slate-900 dark:hover:text-white"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
