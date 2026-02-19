import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { RUN_MODE_OPTIONS, RUN_STATUS_OPTIONS } from "@/lib/reconciliation";
import { cn } from "@/lib/utils";

interface RunsFiltersProps {
  entities: string[];
  values: {
    range: string;
    status: string;
    mode: string;
    entity: string;
    q: string;
    from: string;
    to: string;
    pageSize: number;
  };
}

export function RunsFilters({ entities, values }: RunsFiltersProps) {
  const customRange = values.range === "custom";

  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardContent className="p-4">
        <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-6" method="get">
          <div className="space-y-1.5">
            <label htmlFor="range" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Date Range
            </label>
            <Select id="range" name="range" defaultValue={values.range}>
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="custom">Custom range</option>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="status" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Status
            </label>
            <Select id="status" name="status" defaultValue={values.status}>
              <option value="">All statuses</option>
              {RUN_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="mode" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Mode
            </label>
            <Select id="mode" name="mode" defaultValue={values.mode}>
              <option value="">All modes</option>
              {RUN_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="entity" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Entity
            </label>
            <Select id="entity" name="entity" defaultValue={values.entity}>
              <option value="">All entities</option>
              {entities.map((entity) => (
                <option key={entity} value={entity}>
                  {entity}
                </option>
              ))}
            </Select>
          </div>

          <div className="space-y-1.5 xl:col-span-2">
            <label htmlFor="q" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Search
            </label>
            <Input
              id="q"
              name="q"
              placeholder="Process ID, entity, event message"
              defaultValue={values.q}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="from" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              From
            </label>
            <Input
              id="from"
              name="from"
              type="date"
              defaultValue={values.from}
              disabled={!customRange}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="to" className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              To
            </label>
            <Input
              id="to"
              name="to"
              type="date"
              defaultValue={values.to}
              disabled={!customRange}
            />
          </div>

          <input type="hidden" name="pageSize" value={values.pageSize} />

          <div className="flex items-end gap-2 xl:col-span-4 xl:justify-end">
            <Button type="submit" className="h-10 px-5">
              Apply filters
            </Button>
            <Link
              href="/runs"
              className={cn(buttonVariants({ variant: "outline" }), "h-10 px-5")}
            >
              Reset
            </Link>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
