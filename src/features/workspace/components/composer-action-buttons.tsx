"use client";

import { Loader2, Mic, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ComposerActionButtonsProps {
  submitLabel: string;
  canSubmit: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
}

export function ComposerActionButtons({
  submitLabel,
  canSubmit,
  isSubmitting,
  onSubmit,
}: ComposerActionButtonsProps) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <button
        type="button"
        aria-label="Voice input coming soon"
        disabled
        className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/82 bg-white/92 text-slate-500 shadow-[0_16px_34px_-28px_rgba(15,23,42,0.24)] disabled:cursor-not-allowed dark:border-white/[0.08] dark:bg-slate-900/84 dark:text-slate-300"
      >
        <Mic className="h-5 w-5" />
      </button>

      <Button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit || isSubmitting}
        className="h-12 rounded-full border border-white/70 bg-[linear-gradient(135deg,#8648ff_0%,#5d92ff_100%)] px-5 text-white shadow-[0_22px_44px_-28px_rgba(116,78,255,0.62)] transition-transform duration-200 hover:scale-[1.02] hover:opacity-95 disabled:hover:scale-100 dark:border-white/[0.08]"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <SendHorizontal className="h-4 w-4" />
        )}
        {submitLabel}
      </Button>
    </div>
  );
}
