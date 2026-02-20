"use client";

import { cn } from "@/lib/utils";
import type { SearchEntityType } from "@/features/operations/types";

interface SearchCounts {
  all: number;
  orders: number;
  customers: number;
  suppliers: number;
}

interface SearchTabsProps {
  value: SearchEntityType;
  counts: SearchCounts;
  onChange: (value: SearchEntityType) => void;
}

const items: Array<{
  value: SearchEntityType;
  label: string;
  countKey: keyof SearchCounts;
}> = [
  { value: "all", label: "All", countKey: "all" },
  { value: "order", label: "Orders", countKey: "orders" },
  { value: "customer", label: "Customers", countKey: "customers" },
  { value: "supplier", label: "Suppliers", countKey: "suppliers" },
];

export function SearchTabs({ value, counts, onChange }: SearchTabsProps) {
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Search entity tabs">
      {items.map((item) => {
        const active = value === item.value;

        return (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition-colors",
              active
                ? "border-primary/45 bg-primary/15 text-primary"
                : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
            )}
          >
            <span>{item.label}</span>
            <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[11px]">
              {counts[item.countKey]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
