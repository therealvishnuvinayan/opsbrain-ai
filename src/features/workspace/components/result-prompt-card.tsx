"use client";

import { Sparkles } from "lucide-react";

interface ResultPromptCardProps {
  prompt: string;
}

export function ResultPromptCard({ prompt }: ResultPromptCardProps) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[42rem] rounded-[30px] bg-[linear-gradient(180deg,rgba(241,235,255,0.96),rgba(236,230,255,0.9))] px-5 py-4 text-left shadow-[0_24px_60px_-44px_rgba(99,102,241,0.3)] ring-1 ring-violet-100/80 dark:bg-[linear-gradient(180deg,rgba(88,28,135,0.18),rgba(30,41,59,0.42))] dark:ring-white/[0.08] md:px-6">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-violet-700 dark:text-violet-200">
          <Sparkles className="h-4 w-4" />
          Latest prompt
        </div>
        <p className="whitespace-pre-wrap text-base leading-7 text-slate-800 dark:text-slate-100">
          {prompt}
        </p>
      </div>
    </div>
  );
}
