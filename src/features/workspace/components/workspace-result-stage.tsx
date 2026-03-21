"use client";

import type { OpsWorkspaceMessage } from "@/features/workspace/types";
import { InvestigationResultTiles } from "@/features/workspace/components/investigation-result-tiles";
import { ResultPromptCard } from "@/features/workspace/components/result-prompt-card";

interface WorkspaceResultStageProps {
  prompt: OpsWorkspaceMessage;
  response?: OpsWorkspaceMessage;
  isLoading?: boolean;
  onPromptSelect: (prompt: string) => void;
}

export function WorkspaceResultStage({
  prompt,
  response,
  isLoading = false,
  onPromptSelect,
}: WorkspaceResultStageProps) {
  return (
    <section className="space-y-6">
      <ResultPromptCard prompt={prompt.content} />
      <div className="relative overflow-hidden rounded-[34px] bg-[linear-gradient(180deg,rgba(255,255,255,0.8),rgba(245,247,255,0.9))] p-6 shadow-[0_34px_90px_-64px_rgba(16,24,40,0.22)] ring-1 ring-slate-200/76 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.72),rgba(15,23,42,0.86))] dark:ring-white/[0.06] md:p-7">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-[radial-gradient(circle_at_left_top,rgba(103,232,249,0.16),transparent_36%),radial-gradient(circle_at_right_top,rgba(196,181,253,0.18),transparent_34%)] dark:bg-[radial-gradient(circle_at_left_top,rgba(34,211,238,0.12),transparent_36%),radial-gradient(circle_at_right_top,rgba(168,85,247,0.16),transparent_34%)]"
        />
        <div className="relative">
          <InvestigationResultTiles
            response={response?.response}
            isLoading={isLoading}
            onPromptSelect={onPromptSelect}
          />
        </div>
      </div>
    </section>
  );
}
