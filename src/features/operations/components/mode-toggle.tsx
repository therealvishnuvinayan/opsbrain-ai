"use client";

import { MessageSquareText, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import type { OperationsSearchMode } from "@/features/operations/types";

interface ModeToggleProps {
  mode: OperationsSearchMode;
  onChange: (mode: OperationsSearchMode) => void;
}

const items: Array<{
  value: OperationsSearchMode;
  label: string;
  icon: typeof Search;
}> = [
  {
    value: "lookup",
    label: "Lookup",
    icon: Search,
  },
  {
    value: "ask",
    label: "Ask OpsBrain",
    icon: MessageSquareText,
  },
];

export function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div
      className="inline-flex items-center gap-1 rounded-xl border border-white/10 bg-white/[0.03] p-1"
      role="tablist"
      aria-label="Search mode"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.value === mode;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
              active
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
