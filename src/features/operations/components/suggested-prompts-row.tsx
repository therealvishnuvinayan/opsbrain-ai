"use client";

import { WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

interface SuggestedPromptsRowProps {
  prompts: string[];
  onSelect: (prompt: string) => void;
  title?: string;
}

export function SuggestedPromptsRow({
  prompts,
  onSelect,
  title = "Suggested prompts",
}: SuggestedPromptsRowProps) {
  if (prompts.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {prompts.map((prompt) => (
          <Button
            key={prompt}
            type="button"
            variant="outline"
            size="sm"
            className="justify-start"
            onClick={() => onSelect(prompt)}
          >
            <WandSparkles className="h-3.5 w-3.5" />
            {prompt}
          </Button>
        ))}
      </div>
    </div>
  );
}
