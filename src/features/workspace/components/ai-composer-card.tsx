"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { Loader2, Mic, Plus, SendHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AIComposerCardProps {
  value: string;
  submitLabel: string;
  isDisabled: boolean;
  isSubmitting: boolean;
  variant?: "hero" | "conversation";
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function AIComposerCard({
  value,
  submitLabel,
  isDisabled,
  isSubmitting,
  variant = "hero",
  onChange,
  onSubmit,
}: AIComposerCardProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";

    const minHeight = variant === "hero" ? 110 : 88;
    const maxHeight = variant === "hero" ? 220 : 180;
    const nextHeight = Math.min(Math.max(textarea.scrollHeight, minHeight), maxHeight);

    textarea.style.height = `${nextHeight}px`;
  }, [value, variant]);

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="group relative">
      <div
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-x-6 -top-5 bottom-0 rounded-[38px] bg-[radial-gradient(circle_at_left,rgba(34,211,238,0.28),transparent_38%),radial-gradient(circle_at_right,rgba(168,85,247,0.3),transparent_38%)] blur-[32px] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-[radial-gradient(circle_at_left,rgba(34,211,238,0.22),transparent_38%),radial-gradient(circle_at_right,rgba(168,85,247,0.2),transparent_38%)]",
          variant === "conversation" ? "opacity-70" : "opacity-95"
        )}
      />

      <div
        className={cn(
          "relative rounded-[34px] p-[1.5px] shadow-[0_42px_110px_-64px_rgba(60,72,120,0.42)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_46px_120px_-66px_rgba(60,72,120,0.48)] focus-within:shadow-[0_50px_126px_-62px_rgba(94,92,230,0.44)]",
          variant === "conversation" ? "rounded-[30px]" : ""
        )}
      >
        <div
          aria-hidden
          className="animate-opsbrain-gradient absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,#23d6ff_0%,#87efff_14%,#ffffff_34%,#d6c5ff_56%,#8b5cf6_78%,#23d6ff_100%)] bg-[length:240%_240%] dark:bg-[linear-gradient(115deg,rgba(34,211,238,0.74)_0%,rgba(96,165,250,0.48)_16%,rgba(15,23,42,0.92)_36%,rgba(196,181,253,0.32)_58%,rgba(168,85,247,0.72)_80%,rgba(34,211,238,0.7)_100%)]"
        />

        <div
          className={cn(
            "relative overflow-hidden bg-white/95 shadow-[inset_0_1px_0_rgba(255,255,255,0.95)] ring-1 ring-slate-200/80 backdrop-blur-xl dark:bg-slate-950/94 dark:ring-white/[0.06]",
            variant === "conversation" ? "rounded-[28px]" : "rounded-[32px]"
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[linear-gradient(180deg,rgba(255,255,255,0.88),rgba(255,255,255,0))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.3),rgba(15,23,42,0))]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(242,245,255,0.9))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0),rgba(30,41,59,0.28))]"
          />

          <div
            className={cn(
              "relative flex gap-4",
              variant === "hero"
                ? "items-end px-5 py-5 md:px-6 md:py-6"
                : "items-end px-4 py-4 md:px-5 md:py-5"
            )}
          >
            <button
              type="button"
              disabled
              aria-label="Add context soon"
              className="mt-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-slate-200/80 bg-white/88 text-slate-500 shadow-[0_18px_34px_-26px_rgba(15,23,42,0.28)] disabled:cursor-not-allowed dark:border-white/[0.08] dark:bg-slate-900/86 dark:text-slate-300"
            >
              <Plus className="h-5 w-5" />
            </button>

            <div className="min-w-0 flex-1 text-left">
              <Textarea
                ref={textareaRef}
                value={value}
                disabled={isDisabled || isSubmitting}
                onChange={(event) => onChange(event.target.value)}
                onKeyDown={handleKeyDown}
                aria-label="Ask OpsBrain"
                placeholder={
                  isDisabled
                    ? "Configure the OpsBrain backend to start querying live operational data."
                    : "Ask about runs, supplier anomalies, payouts, or operational issues..."
                }
                className={cn(
                  "w-full resize-none rounded-none border-0 bg-transparent px-0 py-0 text-foreground shadow-none placeholder:text-slate-400/95 focus-visible:ring-0 dark:placeholder:text-slate-500",
                  variant === "hero"
                    ? "min-h-[110px] max-h-[220px] text-[20px] leading-8 md:text-[22px] md:leading-9"
                    : "min-h-[88px] max-h-[180px] text-[17px] leading-7 md:text-[18px]"
                )}
              />
            </div>

            <div className="flex shrink-0 items-end gap-2 self-end pb-1">
              <button
                type="button"
                aria-label="Voice input coming soon"
                disabled
                className="flex h-11 w-11 items-center justify-center rounded-full border border-slate-200/80 bg-white/88 text-slate-500 shadow-[0_16px_32px_-26px_rgba(15,23,42,0.24)] disabled:cursor-not-allowed dark:border-white/[0.08] dark:bg-slate-900/84 dark:text-slate-300"
              >
                <Mic className="h-[18px] w-[18px]" />
              </button>

              <Button
                type="button"
                onClick={onSubmit}
                disabled={isDisabled || isSubmitting || !value.trim()}
                className={cn(
                  "h-11 rounded-full border border-white/70 bg-[linear-gradient(135deg,#7652ff_0%,#5791ff_100%)] px-5 text-white shadow-[0_20px_40px_-26px_rgba(96,83,255,0.62)] transition-transform duration-200 hover:scale-[1.01] hover:opacity-95 disabled:hover:scale-100 dark:border-white/[0.08]",
                  variant === "conversation" ? "px-4.5" : "px-5.5"
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizontal className="h-4 w-4" />
                )}
                {submitLabel}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
