import { Skeleton } from "@/components/ui/skeleton";

export default function ActionsLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-9 w-28" />
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-9 w-28" />
      </div>

      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-[520px]" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Skeleton className="h-[420px] w-full" />
        <div className="space-y-3">
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    </div>
  );
}
