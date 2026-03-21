"use client";

import { cn } from "@/lib/utils";

interface SuggestionChipsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  centered?: boolean;
  disabled?: boolean;
}

export function SuggestionChips({
  prompts,
  onSelect,
  centered = false,
  disabled = false,
}: SuggestionChipsProps) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "flex flex-wrap gap-2.5",
        centered ? "justify-center" : "justify-start"
      )}
    >
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          className={cn(
            "rounded-full bg-white/72 px-4 py-2 text-sm font-medium text-foreground shadow-[0_18px_44px_-36px_rgba(16,24,40,0.18)] ring-1 ring-slate-200/70 transition-all duration-200 dark:bg-slate-950/72 dark:ring-white/[0.08]",
            disabled
              ? "cursor-not-allowed opacity-60"
              : "hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_22px_50px_-38px_rgba(16,24,40,0.22)] hover:ring-slate-300/85 dark:hover:bg-slate-900"
          )}
          onClick={() => onSelect(prompt)}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
