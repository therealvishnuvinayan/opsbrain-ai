"use client";

import { Select } from "@/components/ui/select";
import type {
  SearchDateRange,
  SearchEntityType,
  SearchStatusFilter,
} from "@/features/operations/types";

interface SearchFiltersProps {
  entityType: SearchEntityType;
  status: SearchStatusFilter;
  dateRange: SearchDateRange;
  onEntityTypeChange: (value: SearchEntityType) => void;
  onStatusChange: (value: SearchStatusFilter) => void;
  onDateRangeChange: (value: SearchDateRange) => void;
}

export function SearchFilters({
  entityType,
  status,
  dateRange,
  onEntityTypeChange,
  onStatusChange,
  onDateRangeChange,
}: SearchFiltersProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      <label className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Entity type
        </span>
        <Select
          value={entityType}
          onChange={(event) => onEntityTypeChange(event.target.value as SearchEntityType)}
        >
          <option value="all">All</option>
          <option value="order">Orders</option>
          <option value="customer">Customers</option>
          <option value="supplier">Suppliers</option>
        </Select>
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Status
        </span>
        <Select
          value={status}
          onChange={(event) => onStatusChange(event.target.value as SearchStatusFilter)}
        >
          <option value="any">Any</option>
          <option value="active">Active</option>
          <option value="delayed">Delayed</option>
          <option value="failed">Failed</option>
        </Select>
      </label>

      <label className="space-y-1.5">
        <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Date range
        </span>
        <Select
          value={dateRange}
          onChange={(event) => onDateRangeChange(event.target.value as SearchDateRange)}
        >
          <option value="24h">Last 24h</option>
          <option value="7d">Last 7d</option>
          <option value="30d">Last 30d</option>
        </Select>
      </label>
    </div>
  );
}
