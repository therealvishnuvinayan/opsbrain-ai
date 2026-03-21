"use client";

import type { ReactNode } from "react";

interface CenteredHeroLayoutProps {
  header: ReactNode;
  composer: ReactNode;
  controls?: ReactNode;
  suggestions?: ReactNode;
  notice?: ReactNode;
}

export function CenteredHeroLayout({
  header,
  composer,
  controls,
  suggestions,
  notice,
}: CenteredHeroLayoutProps) {
  return (
    <section className="relative mx-auto flex min-h-[calc(100vh-10rem)] w-full max-w-6xl items-center justify-center pb-14 pt-4">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-8 h-[28rem] rounded-[56px] bg-[radial-gradient(circle_at_20%_20%,rgba(103,232,249,0.18),transparent_32%),radial-gradient(circle_at_80%_14%,rgba(196,181,253,0.2),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(255,255,255,0))] blur-2xl dark:bg-[radial-gradient(circle_at_20%_20%,rgba(34,211,238,0.12),transparent_32%),radial-gradient(circle_at_80%_14%,rgba(168,85,247,0.14),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.24),rgba(15,23,42,0))]"
      />

      <div className="relative z-10 w-full space-y-8 text-center">
        {header}
        {notice ? <div className="mx-auto max-w-2xl">{notice}</div> : null}

        <div className="mx-auto w-full max-w-[52rem] space-y-5">
          {composer}
          {controls}
          {suggestions}
        </div>
      </div>
    </section>
  );
}
