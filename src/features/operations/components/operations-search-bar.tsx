"use client";

import { KeyboardEvent } from "react";
import { Loader2, Search, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { OperationsSearchMode } from "@/features/operations/types";

interface OperationsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  mode?: OperationsSearchMode;
  onSubmit?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  placeholder?: string;
  showShortcutHint?: boolean;
}

export function OperationsSearchBar({
  value,
  onChange,
  mode = "lookup",
  onSubmit,
  isSubmitting = false,
  submitLabel = "Ask OpsBrain",
  placeholder,
  showShortcutHint = false,
}: OperationsSearchBarProps) {
  const defaultPlaceholder =
    mode === "ask"
      ? "Ask OpsBrain about orders, customers, and supplier operations..."
      : "Search orders, customers, suppliers...";

  const inputPlaceholder = placeholder ?? defaultPlaceholder;

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mode !== "ask") {
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      onSubmit?.();
    }
  };

  return (
    <div className="relative">
      <Search
        className={
          mode === "ask"
            ? "pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground"
            : "pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        }
      />

      {mode === "ask" ? (
        <div className="relative">
          <Textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={inputPlaceholder}
            className="min-h-[92px] rounded-xl border-white/15 bg-white/[0.03] pl-9 pr-28 pt-2.5"
            aria-label="Ask OpsBrain"
          />
          <div className="absolute bottom-2 right-2 flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              onClick={onSubmit}
              disabled={isSubmitting || !value.trim()}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {submitLabel}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <Input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder={inputPlaceholder}
            className="h-11 rounded-xl border-white/15 bg-white/[0.03] pl-9 pr-16"
            aria-label="Search entities"
          />
          {showShortcutHint ? (
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-secondary/70 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
              Cmd+K
            </kbd>
          ) : null}
        </>
      )}
    </div>
  );
}
