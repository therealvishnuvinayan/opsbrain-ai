"use client";

import { useEffect, useRef, type KeyboardEvent } from "react";
import { Loader2, Mic, SendHorizontal, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AIComposerProps {
  value: string;
  submitLabel: string;
  isDisabled: boolean;
  isSubmitting: boolean;
  variant?: "hero" | "conversation";
  onChange: (value: string) => void;
  onSubmit: () => void;
}

export function AIComposer({
  value,
  submitLabel,
  isDisabled,
  isSubmitting,
  variant = "hero",
  onChange,
  onSubmit,
}: AIComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";

    const minHeight = variant === "hero" ? 184 : 132;
    const maxHeight = variant === "hero" ? 320 : 240;
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
          "pointer-events-none absolute inset-x-6 -top-4 bottom-0 rounded-[42px] bg-[radial-gradient(circle_at_left,rgba(34,211,238,0.34),transparent_42%),radial-gradient(circle_at_right,rgba(192,132,252,0.34),transparent_40%)] blur-[34px] transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-[radial-gradient(circle_at_left,rgba(56,189,248,0.28),transparent_42%),radial-gradient(circle_at_right,rgba(168,85,247,0.26),transparent_40%)]",
          variant === "conversation" ? "opacity-70" : "opacity-90"
        )}
      />

      <div
        className={cn(
          "relative rounded-[34px] p-[1.5px] shadow-[0_38px_90px_-58px_rgba(61,72,120,0.4)] transition-all duration-300 hover:shadow-[0_44px_104px_-60px_rgba(61,72,120,0.46)] focus-within:shadow-[0_48px_108px_-56px_rgba(94,92,230,0.42)]",
          variant === "conversation" ? "rounded-[30px]" : ""
        )}
      >
        <div
          aria-hidden
          className={cn(
            "animate-opsbrain-gradient absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,#21d4fd_0%,#67e8f9_16%,#ffffff_34%,#c4b5fd_56%,#8b5cf6_78%,#22d3ee_100%)] bg-[length:240%_240%] dark:bg-[linear-gradient(115deg,rgba(34,211,238,0.78)_0%,rgba(96,165,250,0.5)_18%,rgba(15,23,42,0.92)_40%,rgba(196,181,253,0.38)_58%,rgba(168,85,247,0.74)_82%,rgba(34,211,238,0.72)_100%)]"
          )}
        />

        <div
          className={cn(
            "relative overflow-hidden bg-white/[0.985] ring-1 ring-slate-200/85 backdrop-blur-xl dark:bg-slate-950/[0.97] dark:ring-white/[0.06]",
            variant === "conversation" ? "rounded-[28px]" : "rounded-[32px]"
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(255,255,255,0.08))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.42),rgba(15,23,42,0))]"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-[linear-gradient(180deg,rgba(255,255,255,0),rgba(238,241,255,0.42))] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0),rgba(30,41,59,0.22))]"
          />

          <div
            className={cn(
              "relative",
              variant === "hero"
                ? "px-7 pt-6 md:px-8 md:pt-7"
                : "px-5 pt-4.5 md:px-6 md:pt-5.5"
            )}
          >
            <div className="mb-4 flex items-center gap-2 text-[12px] font-medium text-slate-500 dark:text-slate-300">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(34,211,238,0.18),rgba(168,85,247,0.18))] text-primary dark:bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(168,85,247,0.24))]">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <span>Ask OpsBrain</span>
            </div>

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
                "w-full resize-none rounded-none border-0 bg-transparent px-0 py-0 text-foreground shadow-none placeholder:text-slate-400 focus-visible:ring-0 dark:placeholder:text-slate-500",
                variant === "hero"
                  ? "min-h-[188px] max-h-[312px] text-[20px] leading-8 md:text-[22px] md:leading-9"
                  : "min-h-[128px] max-h-[228px] text-[17px] leading-7 md:text-[18px]"
              )}
            />
          </div>

          <div
            className={cn(
              "relative mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 bg-[linear-gradient(180deg,rgba(248,250,255,0.74),rgba(239,236,255,0.96))] px-4 py-3.5 dark:border-white/[0.08] dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.74),rgba(28,31,54,0.94))]",
              variant === "hero" ? "md:px-5" : "md:px-4"
            )}
          >
            <div className="flex min-w-0 items-center gap-2 text-xs text-slate-500 dark:text-slate-300/84">
              <span className="hidden h-2 w-2 rounded-full bg-[linear-gradient(135deg,#22d3ee,#8b5cf6)] sm:block" />
              <p className="truncate">Press Enter to send. Shift+Enter adds a new line.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Voice input coming soon"
                disabled
                className="flex h-11 w-11 items-center justify-center rounded-full border border-white/70 bg-white/78 text-slate-500 shadow-[0_14px_34px_-28px_rgba(15,23,42,0.34)] transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-80 dark:border-white/[0.08] dark:bg-slate-900/84 dark:text-slate-300"
              >
                <Mic className="h-[18px] w-[18px]" />
              </button>

              <Button
                type="button"
                onClick={onSubmit}
                disabled={isDisabled || isSubmitting || !value.trim()}
                className={cn(
                  "rounded-full border border-white/70 bg-[linear-gradient(135deg,#7c5cff_0%,#5b8fff_100%)] text-white shadow-[0_18px_38px_-24px_rgba(96,83,255,0.64)] transition-transform duration-200 hover:scale-[1.01] hover:opacity-95 disabled:hover:scale-100 dark:border-white/[0.08]",
                  variant === "hero" ? "h-11 px-5.5" : "h-10 px-4.5"
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
