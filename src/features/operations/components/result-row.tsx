"use client";

import { Building2, ShoppingCart, UserRound } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { SearchResult } from "@/features/operations/types";
import { relativeFromNow } from "@/features/operations/utils";
import { cn } from "@/lib/utils";

interface ResultRowProps {
  result: SearchResult;
  selected: boolean;
  onSelect: (result: SearchResult) => void;
}

function badgeVariant(value: string) {
  const normalized = value.toLowerCase();

  if (normalized.includes("failed") || normalized.includes("critical") || normalized.includes("high")) {
    return "danger" as const;
  }

  if (normalized.includes("delayed") || normalized.includes("warn") || normalized.includes("vip")) {
    return "warning" as const;
  }

  if (normalized.includes("active") || normalized.includes("healthy")) {
    return "success" as const;
  }

  return "neutral" as const;
}

function entityIcon(type: SearchResult["type"]) {
  if (type === "order") {
    return ShoppingCart;
  }

  if (type === "customer") {
    return UserRound;
  }

  return Building2;
}

export function ResultRow({ result, selected, onSelect }: ResultRowProps) {
  const Icon = entityIcon(result.type);

  return (
    <button
      type="button"
      onClick={() => onSelect(result)}
      className={cn(
        "w-full rounded-xl border px-3 py-3 text-left transition-colors",
        selected
          ? "border-primary/45 bg-primary/10"
          : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06]"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </div>

          <div className="min-w-0 space-y-1">
            <p className="truncate text-sm font-medium">{result.title}</p>
            <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>

            {result.badges.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {result.badges.slice(0, 3).map((badge, index) => (
                  <Badge key={`${result.id}-${badge}-${index}`} variant={badgeVariant(badge)}>
                    {badge}
                  </Badge>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <p className="shrink-0 text-[11px] text-muted-foreground">{relativeFromNow(result.updatedAt)}</p>
      </div>
    </button>
  );
}
