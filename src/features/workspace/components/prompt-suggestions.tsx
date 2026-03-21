"use client";

import { cn } from "@/lib/utils";

interface PromptSuggestionsProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

export function PromptSuggestions({
  prompts,
  onSelect,
  disabled = false,
}: PromptSuggestionsProps) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
      {prompts.map((prompt) => (
        <button
          key={prompt}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(prompt)}
          className={cn(
            "rounded-full bg-white/68 px-4 py-2 text-sm font-medium text-slate-700 shadow-[0_18px_42px_-36px_rgba(16,24,40,0.18)] ring-1 ring-slate-200/72 transition-all duration-200 dark:bg-slate-950/72 dark:text-slate-200 dark:ring-white/[0.08]",
            disabled
              ? "cursor-not-allowed opacity-60"
              : "hover:-translate-y-0.5 hover:bg-white hover:text-slate-900 dark:hover:bg-slate-900 dark:hover:text-white"
          )}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
}
