"use client";

export function GradientHeadline() {
  return (
    <div className="space-y-3 text-center">
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-slate-500/86 dark:text-slate-400">
        OpsBrain Workspace
      </p>
      <h1 className="mx-auto max-w-4xl text-5xl font-semibold leading-[0.95] tracking-[-0.04em] text-transparent md:text-[5.9rem] md:leading-[0.92] bg-[linear-gradient(135deg,#19c2f2_0%,#3f83ff_38%,#6f45ff_74%,#8a3dff_100%)] bg-clip-text">
        <span className="block">What will you</span>
        <span className="block">investigate today?</span>
      </h1>
      <p className="mx-auto max-w-2xl text-sm leading-7 text-slate-600 md:text-base dark:text-slate-300/84">
        Investigate runs, suppliers, orders, and operational risk with natural
        language.
      </p>
    </div>
  );
}
