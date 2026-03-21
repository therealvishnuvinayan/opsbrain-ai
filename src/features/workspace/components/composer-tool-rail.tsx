"use client";

import { BookOpen, Boxes, ReceiptText, ShieldAlert } from "lucide-react";

import { cn } from "@/lib/utils";

export type ComposerTool = "reconciliation" | "suppliers" | "orders" | "knowledge";

interface ComposerToolRailProps {
  value: ComposerTool;
  onChange: (value: ComposerTool) => void;
}

const items = [
  { value: "reconciliation", label: "Reconciliation", icon: ShieldAlert },
  { value: "suppliers", label: "Suppliers", icon: Boxes },
  { value: "orders", label: "Orders", icon: ReceiptText },
  { value: "knowledge", label: "Knowledge", icon: BookOpen },
] satisfies Array<{
  value: ComposerTool;
  label: string;
  icon: typeof ShieldAlert;
}>;

export function ComposerToolRail({ value, onChange }: ComposerToolRailProps) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {items.map((item) => {
        const Icon = item.icon;
        const active = item.value === value;

        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            aria-pressed={active}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-sm font-medium transition-all duration-200",
              active
                ? "border-transparent bg-[linear-gradient(135deg,rgba(139,92,246,0.16),rgba(34,211,238,0.18))] text-slate-900 shadow-[0_16px_36px_-30px_rgba(99,102,241,0.34)] ring-1 ring-slate-200/78 dark:text-white dark:ring-white/[0.08]"
                : "border-slate-200/82 bg-white/88 text-slate-600 hover:bg-white hover:text-slate-900 dark:border-white/[0.08] dark:bg-slate-950/76 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-white"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
