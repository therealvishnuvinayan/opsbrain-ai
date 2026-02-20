"use client";

import { CircleDashed, Search } from "lucide-react";

import { ResultRow } from "@/features/operations/components/result-row";
import { SearchTabs } from "@/features/operations/components/search-tabs";
import type { SearchEntityType, SearchResult } from "@/features/operations/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface SearchResultsPayload {
  all: SearchResult[];
  orders: SearchResult[];
  customers: SearchResult[];
  suppliers: SearchResult[];
  counts: {
    all: number;
    orders: number;
    customers: number;
    suppliers: number;
  };
}

interface ResultsListProps {
  entityType: SearchEntityType;
  results: SearchResultsPayload;
  query: string;
  isLoading: boolean;
  selectedKey: string | null;
  recentSearches: string[];
  suggestions: string[];
  onEntityTypeChange: (value: SearchEntityType) => void;
  onSelect: (result: SearchResult) => void;
  onUseSuggestion: (value: string) => void;
}

function keyForResult(result: SearchResult) {
  return `${result.type}:${result.id}`;
}

function LoadingList() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={`operations-search-skeleton-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-full" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function GroupSection({
  title,
  items,
  selectedKey,
  onSelect,
}: {
  title: string;
  items: SearchResult[];
  selectedKey: string | null;
  onSelect: (result: SearchResult) => void;
}) {
  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <span className="text-xs text-muted-foreground">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-white/10 bg-white/[0.03] px-3 py-3 text-xs text-muted-foreground">
          No matches in this group.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((result) => (
            <ResultRow
              key={keyForResult(result)}
              result={result}
              selected={selectedKey === keyForResult(result)}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function EmptySuggestions({
  title,
  description,
  suggestions,
  recentSearches,
  onUseSuggestion,
}: {
  title: string;
  description: string;
  suggestions: string[];
  recentSearches: string[];
  onUseSuggestion: (value: string) => void;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-6">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04]">
          <CircleDashed className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <p className="text-sm font-medium">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Quick suggestions
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((chip) => (
                <Button
                  key={chip}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onUseSuggestion(chip)}
                >
                  {chip}
                </Button>
              ))}
            </div>
          </div>

          {recentSearches.length > 0 ? (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Recent searches
              </p>
              <div className="flex flex-wrap gap-2">
                {recentSearches.slice(0, 6).map((recent) => (
                  <Button
                    key={recent}
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onUseSuggestion(recent)}
                    className="border border-white/10 bg-white/[0.03]"
                  >
                    {recent}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function ResultsList({
  entityType,
  results,
  query,
  isLoading,
  selectedKey,
  recentSearches,
  suggestions,
  onEntityTypeChange,
  onSelect,
  onUseSuggestion,
}: ResultsListProps) {
  const trimmedQuery = query.trim();

  const tabItems =
    entityType === "all"
      ? results.all
      : entityType === "order"
        ? results.orders
        : entityType === "customer"
          ? results.customers
          : results.suppliers;

  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle>Results</CardTitle>
          <div className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.03] px-2 py-1 text-xs text-muted-foreground">
            <Search className="h-3.5 w-3.5" />
            {results.counts.all} matches
          </div>
        </div>

        <SearchTabs value={entityType} counts={results.counts} onChange={onEntityTypeChange} />
      </CardHeader>

      <CardContent className="space-y-4">
        {isLoading ? <LoadingList /> : null}

        {!isLoading && !trimmedQuery ? (
          <EmptySuggestions
            title="Start with an entity signal"
            description="Search by order number, customer email, supplier name, or domain."
            suggestions={suggestions}
            recentSearches={recentSearches}
            onUseSuggestion={onUseSuggestion}
          />
        ) : null}

        {!isLoading && Boolean(trimmedQuery) && tabItems.length === 0 ? (
          <EmptySuggestions
            title="No results found"
            description="Try a shorter keyword, switch entity type, or widen the date range."
            suggestions={suggestions}
            recentSearches={recentSearches}
            onUseSuggestion={onUseSuggestion}
          />
        ) : null}

        {!isLoading && Boolean(trimmedQuery) && tabItems.length > 0 ? (
          entityType === "all" ? (
            <div className="space-y-4">
              <GroupSection
                title={`Orders (${results.orders.length})`}
                items={results.orders}
                selectedKey={selectedKey}
                onSelect={onSelect}
              />
              <GroupSection
                title={`Customers (${results.customers.length})`}
                items={results.customers}
                selectedKey={selectedKey}
                onSelect={onSelect}
              />
              <GroupSection
                title={`Suppliers (${results.suppliers.length})`}
                items={results.suppliers}
                selectedKey={selectedKey}
                onSelect={onSelect}
              />
            </div>
          ) : (
            <div className="space-y-2">
              {tabItems.map((result) => (
                <ResultRow
                  key={keyForResult(result)}
                  result={result}
                  selected={selectedKey === keyForResult(result)}
                  onSelect={onSelect}
                />
              ))}
            </div>
          )
        ) : null}
      </CardContent>
    </Card>
  );
}
