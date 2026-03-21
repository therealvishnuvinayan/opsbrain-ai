"use client";

import type { OpsWorkspaceReasoningMode } from "@/features/workspace/types";
import { cn } from "@/lib/utils";

interface ReasoningSelectorProps {
  value: OpsWorkspaceReasoningMode;
  centered?: boolean;
  onChange: (value: OpsWorkspaceReasoningMode) => void;
}

const options: Array<{ value: OpsWorkspaceReasoningMode; label: string }> = [
  { value: "quick", label: "Quick" },
  { value: "standard", label: "Standard" },
  { value: "deep", label: "Deep" },
];

export function ReasoningSelector({
  value,
  centered = false,
  onChange,
}: ReasoningSelectorProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3",
        centered ? "justify-center" : ""
      )}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
        Reasoning
      </span>
      <div className="inline-flex items-center rounded-full bg-white/78 p-1 shadow-[0_22px_48px_-36px_rgba(16,24,40,0.22)] ring-1 ring-slate-200/80 backdrop-blur dark:bg-slate-950/76 dark:ring-white/[0.08]">
        {options.map((option) => {
          const active = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(option.value)}
              aria-pressed={active}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-white text-slate-900 shadow-[0_14px_30px_-24px_rgba(79,70,229,0.55)] ring-1 ring-slate-200/90 dark:bg-slate-900 dark:text-white dark:ring-white/[0.08]"
                  : "text-muted-foreground hover:text-foreground"
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
