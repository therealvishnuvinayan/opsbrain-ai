"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { OperationsSearchBar } from "@/features/operations/components/operations-search-bar";
import { PreviewPanel } from "@/features/operations/components/preview-panel";
import { ResultsList } from "@/features/operations/components/results-list";
import { SearchFilters } from "@/features/operations/components/search-filters";
import { customers, orders, suppliers } from "@/features/operations/mock";
import type {
  SearchDateRange,
  SearchEntityType,
  SearchResult,
  SearchStatusFilter,
} from "@/features/operations/types";
import { searchEntities } from "@/features/operations/utils";
import { Card, CardContent } from "@/components/ui/card";

const RECENT_SEARCHES_KEY = "opsbrain.operations.recentSearches";

const SUGGESTED_QUERIES = [
  "OB-24831",
  "Eneba",
  "vip",
  "failed",
  "runa.io",
  "refund",
];

function resultKey(result: SearchResult) {
  return `${result.type}:${result.id}`;
}

function parseRecentSearches(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 6);
  } catch {
    return [];
  }
}

export function OperationsSearchView() {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [entityType, setEntityType] = useState<SearchEntityType>("all");
  const [statusFilter, setStatusFilter] = useState<SearchStatusFilter>("any");
  const [dateRange, setDateRange] = useState<SearchDateRange>("30d");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedResultKey, setSelectedResultKey] = useState<string | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const hasInitialized = useRef(false);

  const data = useMemo(
    () => ({
      orders,
      customers,
      suppliers,
    }),
    []
  );

  useEffect(() => {
    const stored = window.localStorage.getItem(RECENT_SEARCHES_KEY);
    setRecentSearches(parseRecentSearches(stored));
  }, []);

  useEffect(() => {
    if (!hasInitialized.current) {
      hasInitialized.current = true;
      setDebouncedQuery(query);
      return;
    }

    setIsSearching(true);

    const timeout = window.setTimeout(() => {
      setDebouncedQuery(query);
      setIsSearching(false);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [dateRange, entityType, query, statusFilter]);

  useEffect(() => {
    const normalized = debouncedQuery.trim();

    if (normalized.length < 2) {
      return;
    }

    setRecentSearches((current) => {
      const next = [normalized, ...current.filter((item) => item.toLowerCase() !== normalized.toLowerCase())].slice(0, 6);
      window.localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, [debouncedQuery]);

  const results = useMemo(
    () => searchEntities(data, debouncedQuery, entityType, statusFilter, dateRange),
    [data, dateRange, debouncedQuery, entityType, statusFilter]
  );

  useEffect(() => {
    if (!debouncedQuery.trim()) {
      if (selectedResultKey !== null) {
        setSelectedResultKey(null);
      }
      return;
    }

    const currentList =
      entityType === "all"
        ? results.all
        : entityType === "order"
          ? results.orders
          : entityType === "customer"
            ? results.customers
            : results.suppliers;

    if (currentList.length === 0) {
      if (selectedResultKey !== null) {
        setSelectedResultKey(null);
      }
      return;
    }

    if (!selectedResultKey || !currentList.some((item) => resultKey(item) === selectedResultKey)) {
      setSelectedResultKey(resultKey(currentList[0]));
    }
  }, [debouncedQuery, entityType, results, selectedResultKey]);

  const selectedResult = useMemo(
    () => results.all.find((result) => resultKey(result) === selectedResultKey) ?? null,
    [results.all, selectedResultKey]
  );

  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Search</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Entity lookup across orders, customers, and supplier operations.
        </p>
      </section>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardContent className="space-y-3 p-4">
          <OperationsSearchBar value={query} onChange={setQuery} />
          <SearchFilters
            entityType={entityType}
            status={statusFilter}
            dateRange={dateRange}
            onEntityTypeChange={setEntityType}
            onStatusChange={setStatusFilter}
            onDateRangeChange={setDateRange}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_1fr]">
        <ResultsList
          entityType={entityType}
          results={results}
          query={debouncedQuery}
          isLoading={isSearching}
          selectedKey={selectedResultKey}
          recentSearches={recentSearches}
          suggestions={SUGGESTED_QUERIES}
          onEntityTypeChange={setEntityType}
          onSelect={(result) => setSelectedResultKey(resultKey(result))}
          onUseSuggestion={(value) => {
            setQuery(value);
          }}
        />

        <PreviewPanel selectedResult={selectedResult} />
      </div>
    </div>
  );
}
