"use client";

import { Loader2 } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export function AssistantThinking() {
  return (
    <div className="max-w-[92%] rounded-2xl border border-white/10 bg-white/[0.04] p-3">
      <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
        OpsBrain is reasoning over operational context...
      </div>
      <div className="space-y-2">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-11/12" />
        <Skeleton className="h-3 w-8/12" />
      </div>
    </div>
  );
}
