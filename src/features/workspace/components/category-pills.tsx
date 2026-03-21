"use client";

import { Box, Sparkles, Workflow } from "lucide-react";

import { cn } from "@/lib/utils";

export type WorkspaceCategory = "runs" | "suppliers" | "ops_ai";

interface CategoryPillsProps {
  value: WorkspaceCategory;
  onChange: (value: WorkspaceCategory) => void;
}

const items = [
  { value: "runs", label: "Runs", icon: Workflow },
  { value: "suppliers", label: "Suppliers", icon: Box },
  { value: "ops_ai", label: "Ops AI", icon: Sparkles },
] satisfies Array<{
  value: WorkspaceCategory;
  label: string;
  icon: typeof Workflow;
}>;

export function CategoryPills({ value, onChange }: CategoryPillsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2.5">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-[0_18px_40px_-34px_rgba(16,24,40,0.18)] transition-all duration-200",
              active
                ? "bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(168,85,247,0.14))] text-slate-900 dark:text-white"
                : "bg-white/76 text-slate-600 ring-1 ring-slate-200/78 hover:bg-white hover:text-slate-900 dark:bg-slate-950/70 dark:text-slate-300 dark:ring-white/[0.08] dark:hover:bg-slate-900 dark:hover:text-white"
            )}
          >
            {active ? (
              <span className="absolute inset-0 rounded-full bg-[linear-gradient(135deg,rgba(34,211,238,0.94),rgba(124,58,237,0.94))] p-px">
                <span className="block h-full w-full rounded-full bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(168,85,247,0.14))] dark:bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(168,85,247,0.18))]" />
              </span>
            ) : null}
            <span
              className={cn(
                "relative inline-flex items-center gap-2 rounded-full",
                active ? "px-0.5" : ""
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
