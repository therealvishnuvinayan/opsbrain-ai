import { Skeleton } from "@/components/ui/skeleton";

export default function InvestigationLoading() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
        <Skeleton className="h-[380px] w-full" />
        <div className="space-y-4">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="h-56 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    </div>
  );
}
