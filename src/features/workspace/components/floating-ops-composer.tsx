"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { ChevronRight, Database, FileUp, Plus } from "lucide-react";

import { Textarea } from "@/components/ui/textarea";
import { ComposerActionButtons } from "@/features/workspace/components/composer-action-buttons";
import {
  ComposerToolRail,
  type ComposerTool,
} from "@/features/workspace/components/composer-tool-rail";
import type { OpsWorkspaceReasoningMode } from "@/features/workspace/types";
import { cn } from "@/lib/utils";

interface FloatingOpsComposerProps {
  value: string;
  submitLabel: string;
  isDisabled: boolean;
  isSubmitting: boolean;
  tool: ComposerTool;
  reasoningMode: OpsWorkspaceReasoningMode;
  variant?: "hero" | "conversation";
  onChange: (value: string) => void;
  onSubmit: () => void;
  onToolChange: (value: ComposerTool) => void;
  onReasoningChange: (value: OpsWorkspaceReasoningMode) => void;
}

const menuItems = [
  { label: "Upload file", icon: FileUp, badge: null },
  { label: "Add source IDs", icon: Database, badge: "Soon" },
  { label: "Attach evidence set", icon: Plus, badge: "Soon" },
] as const;

export function FloatingOpsComposer({
  value,
  submitLabel,
  isDisabled,
  isSubmitting,
  tool,
  reasoningMode,
  variant = "hero",
  onChange,
  onSubmit,
  onToolChange,
  onReasoningChange,
}: FloatingOpsComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    const minHeight = variant === "hero" ? 76 : 64;
    const maxHeight = variant === "hero" ? 138 : 112;
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
    <div className="group relative mx-auto w-full max-w-[58rem]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 -top-4 bottom-1 rounded-[44px] bg-[radial-gradient(circle_at_10%_18%,rgba(34,211,238,0.34),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(139,92,246,0.34),transparent_24%),radial-gradient(circle_at_16%_100%,rgba(34,211,238,0.14),transparent_24%),radial-gradient(circle_at_84%_100%,rgba(168,85,247,0.14),transparent_24%)] blur-[28px] opacity-90 transition-opacity duration-300 group-hover:opacity-100 group-focus-within:opacity-100 dark:bg-[radial-gradient(circle_at_10%_18%,rgba(34,211,238,0.22),transparent_24%),radial-gradient(circle_at_88%_18%,rgba(139,92,246,0.24),transparent_24%),radial-gradient(circle_at_16%_100%,rgba(34,211,238,0.1),transparent_24%),radial-gradient(circle_at_84%_100%,rgba(168,85,247,0.1),transparent_24%)]"
      />
      <div className="pointer-events-none absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-transparent via-slate-200/86 to-transparent dark:via-white/[0.08]" />

      <div
        className={cn(
          "relative isolate rounded-[40px] p-[1.75px] shadow-[0_30px_84px_-54px_rgba(59,72,120,0.26)] transition-all duration-300 focus-within:shadow-[0_36px_96px_-54px_rgba(94,92,230,0.3)]",
          variant === "conversation" ? "max-w-[54rem]" : ""
        )}
      >
        <div
          aria-hidden
          className="animate-opsbrain-gradient absolute inset-0 rounded-[inherit] bg-[linear-gradient(115deg,#1dddf7_0%,#54dfff_14%,#8fd3ff_30%,#bfd7ff_42%,#ddd6ff_58%,#b987ff_74%,#8a49ff_88%,#26d8ef_100%)] bg-[length:240%_240%] dark:bg-[linear-gradient(115deg,rgba(34,211,238,0.88)_0%,rgba(84,223,255,0.56)_14%,rgba(143,211,255,0.44)_30%,rgba(191,215,255,0.28)_42%,rgba(221,214,255,0.18)_58%,rgba(185,135,255,0.42)_74%,rgba(138,73,255,0.8)_88%,rgba(38,216,239,0.84)_100%)]"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_0%_0%,rgba(255,255,255,0.62),transparent_22%),radial-gradient(circle_at_100%_0%,rgba(255,255,255,0.28),transparent_20%)] opacity-75"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-2 rounded-[46px] bg-[radial-gradient(circle_at_left,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_right,rgba(139,92,246,0.16),transparent_34%)] blur-xl"
        />

        <div
          className={cn(
            "relative overflow-visible bg-white/[0.992] backdrop-blur-xl dark:bg-slate-950/[0.96]",
            variant === "hero" ? "rounded-[38px]" : "rounded-[34px]"
          )}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[1px] rounded-[inherit] border border-white/72 dark:border-white/[0.05]"
          />
          <div
            className={cn(
              "relative",
              variant === "hero"
                ? "px-6 pb-5 pt-5 md:px-7 md:pb-5 md:pt-5.5"
                : "px-5 pb-4 pt-4 md:px-6 md:pb-4 md:pt-4.5"
            )}
          >
            <Textarea
              ref={textareaRef}
              value={value}
              disabled={isDisabled || isSubmitting}
              onChange={(event) => onChange(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isDisabled
                  ? "Configure the OpsBrain backend to start querying live operational data."
                  : "Ask about runs, supplier anomalies, payouts, or operational issues..."
              }
              aria-label="Ask OpsBrain"
              className={cn(
                "w-full resize-none rounded-none border-0 bg-transparent px-0 py-0 text-left text-foreground shadow-none placeholder:text-slate-400 focus-visible:ring-0 dark:placeholder:text-slate-500",
                variant === "hero"
                  ? "min-h-[76px] max-h-[138px] pr-36 text-[1.02rem] leading-8 md:text-[1.08rem]"
                  : "min-h-[64px] max-h-[112px] pr-32 text-[0.98rem] leading-7"
              )}
            />

            <div className="pointer-events-none absolute bottom-4 left-6 right-6 flex items-end justify-between md:left-7 md:right-7">
              <div className="pointer-events-auto relative">
              <button
                type="button"
                onClick={() => setMenuOpen((current) => !current)}
                aria-haspopup="menu"
                aria-expanded={menuOpen}
                className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200/82 bg-white text-slate-700 shadow-[0_18px_36px_-24px_rgba(15,23,42,0.2)] transition-transform duration-200 hover:-translate-y-0.5 dark:border-white/[0.08] dark:bg-slate-900 dark:text-white"
              >
                <Plus className="h-5 w-5" />
              </button>

              {menuOpen ? (
                <div className="absolute left-0 top-[calc(100%+12px)] z-20 w-64 rounded-[24px] border border-slate-200/86 bg-white/96 p-2 shadow-[0_32px_80px_-42px_rgba(15,23,42,0.28)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-950/96">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.label}
                        type="button"
                        className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900"
                      >
                        <Icon className="h-4 w-4" />
                        <span className="flex-1">{item.label}</span>
                        {item.badge ? (
                          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:bg-violet-500/20 dark:text-violet-200">
                            {item.badge}
                          </span>
                        ) : null}
                        <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      </button>
                    );
                  })}
                </div>
              ) : null}
              </div>

              <div className="pointer-events-auto">
                <ComposerActionButtons
                  submitLabel={submitLabel}
                  canSubmit={!isDisabled && value.trim().length > 0}
                  isSubmitting={isSubmitting}
                  onSubmit={onSubmit}
                />
              </div>
            </div>
          </div>

          <div className="rounded-b-[inherit] border-t border-slate-200/78 bg-[linear-gradient(180deg,rgba(244,246,255,0.58),rgba(236,232,255,0.92))] px-4 py-2.5 dark:border-white/[0.08] dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.78),rgba(25,29,52,0.92))]">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <ComposerToolRail value={tool} onChange={onToolChange} />
              <div className="flex items-center gap-1 self-start md:self-auto">
                {(["quick", "standard", "deep"] as const).map((option) => {
                  const active = option === reasoningMode;

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => onReasoningChange(option)}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                        active
                          ? "bg-white text-slate-900 shadow-[0_12px_26px_-22px_rgba(79,70,229,0.44)] ring-1 ring-slate-200/76 dark:bg-slate-900 dark:text-white dark:ring-white/[0.08]"
                          : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                      )}
                    >
                      {option[0].toUpperCase() + option.slice(1)}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
