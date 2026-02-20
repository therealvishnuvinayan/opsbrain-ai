"use client";

import { Search } from "lucide-react";

import { Input } from "@/components/ui/input";

interface OperationsSearchBarProps {
  value: string;
  onChange: (value: string) => void;
  showShortcutHint?: boolean;
}

export function OperationsSearchBar({
  value,
  onChange,
  showShortcutHint = false,
}: OperationsSearchBarProps) {
  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search orders, customers, suppliers..."
        className="h-11 rounded-xl border-white/15 bg-white/[0.03] pl-9 pr-16"
        aria-label="Search entities"
      />
      {showShortcutHint ? (
        <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-secondary/70 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
          Cmd+K
        </kbd>
      ) : null}
    </div>
  );
}
