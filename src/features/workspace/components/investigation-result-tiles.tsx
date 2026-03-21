"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { OpsWorkspaceResponse } from "@/features/workspace/types";

interface InvestigationResultTilesProps {
  response?: OpsWorkspaceResponse;
  isLoading?: boolean;
  onPromptSelect: (prompt: string) => void;
}

function LoadingTile() {
  return (
    <div className="rounded-[28px] bg-white/84 p-5 shadow-[0_24px_70px_-52px_rgba(16,24,40,0.22)] ring-1 ring-slate-200/72 dark:bg-slate-950/70 dark:ring-white/[0.08]">
      <div className="space-y-3">
        <div className="h-4 w-28 rounded-full bg-slate-200/88 dark:bg-slate-800" />
        <div className="h-3 w-full rounded-full bg-slate-200/72 dark:bg-slate-800/90" />
        <div className="h-3 w-10/12 rounded-full bg-slate-200/72 dark:bg-slate-800/90" />
        <div className="h-3 w-8/12 rounded-full bg-slate-200/72 dark:bg-slate-800/90" />
      </div>
    </div>
  );
}

export function InvestigationResultTiles({
  response,
  isLoading = false,
  onPromptSelect,
}: InvestigationResultTilesProps) {
  if (isLoading || !response) {
    return (
      <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
        <LoadingTile />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
          <LoadingTile />
          <LoadingTile />
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1.45fr_1fr]">
      <section className="rounded-[30px] bg-white/86 p-6 shadow-[0_28px_80px_-56px_rgba(16,24,40,0.22)] ring-1 ring-slate-200/72 dark:bg-slate-950/72 dark:ring-white/[0.08]">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 dark:bg-slate-900 dark:text-slate-300">
            {response.sourceLabel}
          </span>
          {response.diagnosis ? (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-500/20 dark:text-amber-200">
              {response.diagnosis}
            </span>
          ) : null}
        </div>

        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          Operational summary
        </h3>
        <p className="mt-3 whitespace-pre-wrap text-[15px] leading-7 text-slate-600 dark:text-slate-300/88">
          {response.narrative}
        </p>

        {response.followUpPrompts.length > 0 ? (
          <div className="mt-6 flex flex-wrap gap-2">
            {response.followUpPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => onPromptSelect(prompt)}
                className="rounded-full bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200/78 transition-colors hover:bg-white hover:text-slate-900 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/[0.08] dark:hover:bg-slate-800"
              >
                {prompt}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {response.keyFindings.length > 0 ? (
          <section className="rounded-[28px] bg-white/82 p-5 shadow-[0_24px_70px_-52px_rgba(16,24,40,0.2)] ring-1 ring-slate-200/72 dark:bg-slate-950/70 dark:ring-white/[0.08]">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Key findings
            </h4>
            <ul className="mt-3 space-y-3">
              {response.keyFindings.slice(0, 4).map((finding, index) => (
                <li
                  key={`${finding}-${index}`}
                  className="flex gap-2.5 text-sm leading-6 text-slate-600 dark:text-slate-300/86"
                >
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                  <span>{finding}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {response.evidence.length > 0 ? (
          <section className="rounded-[28px] bg-white/82 p-5 shadow-[0_24px_70px_-52px_rgba(16,24,40,0.2)] ring-1 ring-slate-200/72 dark:bg-slate-950/70 dark:ring-white/[0.08]">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
              Evidence
            </h4>
            <div className="mt-3 space-y-3">
              {response.evidence.slice(0, 3).map((item) => (
                <div
                  key={item.id}
                  className="rounded-[20px] bg-slate-50/92 px-4 py-3 text-sm leading-6 text-slate-600 ring-1 ring-slate-200/76 dark:bg-slate-900/84 dark:text-slate-300/86 dark:ring-white/[0.06]"
                >
                  {item.snippet}
                </div>
              ))}
            </div>
          </section>
        ) : null}

        {response.recommendedActions.length > 0 || response.relatedEntities.length > 0 ? (
          <section className="rounded-[28px] bg-white/82 p-5 shadow-[0_24px_70px_-52px_rgba(16,24,40,0.2)] ring-1 ring-slate-200/72 dark:bg-slate-950/70 dark:ring-white/[0.08]">
            {response.recommendedActions.length > 0 ? (
              <>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Next actions
                </h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {response.recommendedActions.map((action) => (
                    <Link
                      key={`${action.href}-${action.label}`}
                      href={action.href}
                      className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-200/78 transition-colors hover:bg-white hover:text-slate-900 dark:bg-slate-900 dark:text-slate-200 dark:ring-white/[0.08] dark:hover:bg-slate-800"
                    >
                      {action.label}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </Link>
                  ))}
                </div>
              </>
            ) : null}

            {response.relatedEntities.length > 0 ? (
              <div className={response.recommendedActions.length > 0 ? "mt-5" : ""}>
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Related entities
                </h4>
                <div className="mt-3 flex flex-wrap gap-2">
                  {response.relatedEntities.map((entity) => (
                    <span
                      key={`${entity.type}-${entity.id}`}
                      className="rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200/78 dark:bg-slate-900 dark:text-slate-300 dark:ring-white/[0.08]"
                    >
                      {entity.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        ) : null}
      </div>
    </div>
  );
}
