"use client";

import type { ReactNode } from "react";

import { CategoryPills, type WorkspaceCategory } from "@/features/workspace/components/category-pills";
import { GradientHeadline } from "@/features/workspace/components/gradient-headline";

interface WorkspaceHeroStageProps {
  category: WorkspaceCategory;
  composer: ReactNode;
  suggestions: ReactNode;
  notice?: ReactNode;
  onCategoryChange: (value: WorkspaceCategory) => void;
}

export function WorkspaceHeroStage({
  category,
  composer,
  suggestions,
  notice,
  onCategoryChange,
}: WorkspaceHeroStageProps) {
  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-9.5rem)] w-full max-w-6xl items-center justify-center pb-12 pt-6">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-2 inset-y-2 rounded-[64px] bg-[linear-gradient(90deg,rgba(209,250,250,0.84)_0%,rgba(255,255,255,0.82)_50%,rgba(238,222,255,0.84)_100%)] dark:bg-[linear-gradient(90deg,rgba(14,165,233,0.12)_0%,rgba(15,23,42,0.14)_50%,rgba(168,85,247,0.14)_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-10 top-[54%] h-px bg-gradient-to-r from-transparent via-slate-200/88 to-transparent dark:via-white/[0.08]"
      />

      <div className="relative z-10 w-full space-y-6 text-center">
        <GradientHeadline />
        <CategoryPills value={category} onChange={onCategoryChange} />
        {notice ? <div className="mx-auto max-w-2xl">{notice}</div> : null}
        <div>{composer}</div>
        {suggestions}
      </div>
    </section>
  );
}
