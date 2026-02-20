"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronRight, MoreHorizontal, RefreshCw, Search, Trash2 } from "lucide-react";

import type {
  KnowledgeAccess,
  KnowledgeCollection,
  KnowledgeSource,
  KnowledgeSourceStatus,
  KnowledgeSourceType,
} from "@/features/knowledge/types";
import {
  accessBadgeVariant,
  formatDateTime,
  sourceStatusBadgeVariant,
  sourceTypeIcon,
  sourceTypeLabel,
} from "@/features/knowledge/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface SourcesTableProps {
  sources: KnowledgeSource[];
  collections: KnowledgeCollection[];
  isLoading?: boolean;
  initialCollectionId?: string;
  searchQuery?: string;
  onSearchQueryChange?: (value: string) => void;
  showSearchInput?: boolean;
  onViewDetails: (sourceId: string, tab?: "OVERVIEW" | "PREVIEW" | "ERRORS" | "ASK") => void;
  onEditSource: (sourceId: string) => void;
  onResyncSource: (sourceId: string) => void;
  onRemoveSource: (sourceId: string) => void;
  onAddSource: () => void;
}

function LoadingRows() {
  return (
    <TableBody>
      {Array.from({ length: 6 }).map((_, index) => (
        <TableRow key={`loading-source-${index}`}>
          <TableCell><Skeleton className="h-5 w-48" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-28" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-5 w-36" /></TableCell>
          <TableCell><Skeleton className="h-5 w-12" /></TableCell>
          <TableCell><Skeleton className="h-5 w-20" /></TableCell>
          <TableCell><Skeleton className="h-9 w-9" /></TableCell>
        </TableRow>
      ))}
    </TableBody>
  );
}

export function SourcesTable({
  sources,
  collections,
  isLoading = false,
  initialCollectionId,
  searchQuery,
  onSearchQueryChange,
  showSearchInput = true,
  onViewDetails,
  onEditSource,
  onResyncSource,
  onRemoveSource,
  onAddSource,
}: SourcesTableProps) {
  const [internalSearch, setInternalSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState(initialCollectionId ?? "ALL");
  const [typeFilter, setTypeFilter] = useState<KnowledgeSourceType | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<KnowledgeSourceStatus | "ALL">("ALL");
  const [accessFilter, setAccessFilter] = useState<KnowledgeAccess | "ALL">("ALL");
  const searchValue = searchQuery ?? internalSearch;

  useEffect(() => {
    if (!initialCollectionId) {
      return;
    }

    setCollectionFilter(initialCollectionId);
  }, [initialCollectionId]);

  const collectionById = useMemo(
    () => new Map(collections.map((collection) => [collection.id, collection])),
    [collections]
  );

  const filteredSources = useMemo(() => {
    return sources.filter((source) => {
      if (collectionFilter !== "ALL" && !source.collections.includes(collectionFilter)) {
        return false;
      }

      if (typeFilter !== "ALL" && source.type !== typeFilter) {
        return false;
      }

      if (statusFilter !== "ALL" && source.status !== statusFilter) {
        return false;
      }

      if (accessFilter !== "ALL" && source.access !== accessFilter) {
        return false;
      }

      if (searchValue.trim()) {
        const haystack = `${source.name} ${source.owner} ${source.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(searchValue.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [accessFilter, collectionFilter, searchValue, sources, statusFilter, typeFilter]);

  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader className="space-y-3 pb-2">
        <CardTitle className="text-base">All Sources</CardTitle>
        <div className={cn("grid gap-2 md:grid-cols-2", showSearchInput ? "xl:grid-cols-5" : "xl:grid-cols-4")}>
          {showSearchInput ? (
            <div className="relative xl:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchValue}
                onChange={(event) => {
                  if (onSearchQueryChange) {
                    onSearchQueryChange(event.target.value);
                    return;
                  }

                  setInternalSearch(event.target.value);
                }}
                placeholder="Search knowledge…"
                className="pl-9"
              />
            </div>
          ) : null}

          <Select value={collectionFilter} onChange={(event) => setCollectionFilter(event.target.value)}>
            <option value="ALL">All collections</option>
            {collections.map((collection) => (
              <option key={collection.id} value={collection.id}>
                {collection.name}
              </option>
            ))}
          </Select>

          <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as KnowledgeSourceType | "ALL")}>
            <option value="ALL">All types</option>
            <option value="UPLOAD">Upload</option>
            <option value="URL">Web URL</option>
            <option value="NOTE">Note</option>
            <option value="CONNECTOR">Connector</option>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as KnowledgeSourceStatus | "ALL")}>
              <option value="ALL">All status</option>
              <option value="INDEXED">Indexed</option>
              <option value="PROCESSING">Processing</option>
              <option value="FAILED">Failed</option>
              <option value="STALE">Stale</option>
            </Select>
            <Select value={accessFilter} onChange={(event) => setAccessFilter(event.target.value as KnowledgeAccess | "ALL")}>
              <option value="ALL">All access</option>
              <option value="PUBLIC">Public</option>
              <option value="INTERNAL">Internal</option>
              <option value="RESTRICTED">Restricted</option>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Source</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Collections</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Last Synced</TableHead>
              <TableHead className="text-right">Chunks</TableHead>
              <TableHead>Access</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>

          {isLoading ? <LoadingRows /> : null}

          {!isLoading ? (
            <TableBody>
              {filteredSources.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-10 text-center">
                    <div className="mx-auto max-w-sm space-y-2">
                      <p className="text-sm font-medium">No knowledge sources found</p>
                      <p className="text-sm text-muted-foreground">
                        Add your first source to start retrieval-ready indexing.
                      </p>
                      <Button onClick={onAddSource} className="mt-2">
                        Add Source
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredSources.map((source) => {
                  const SourceIcon = sourceTypeIcon(source.type);

                  return (
                    <TableRow
                      key={source.id}
                      className="cursor-pointer"
                      onClick={() => onViewDetails(source.id)}
                    >
                      <TableCell>
                        <div className="flex items-start gap-2">
                          <div className="mt-0.5 rounded-lg border border-white/10 bg-white/[0.03] p-1.5">
                            <SourceIcon className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <p className="font-medium">{source.name}</p>
                            <p className="text-xs text-muted-foreground">{source.owner}</p>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>{sourceTypeLabel(source.type)}</TableCell>

                      <TableCell>
                        <div className="flex flex-wrap gap-1.5">
                          {source.collections.length === 0 ? (
                            <Badge variant="neutral">Unassigned</Badge>
                          ) : (
                            source.collections.slice(0, 2).map((collectionId) => (
                              <Badge key={collectionId} variant="neutral">
                                {collectionById.get(collectionId)?.name ?? "Unknown"}
                              </Badge>
                            ))
                          )}
                          {source.collections.length > 2 ? (
                            <Badge variant="neutral">+{source.collections.length - 2}</Badge>
                          ) : null}
                        </div>
                      </TableCell>

                      <TableCell>
                        <Badge variant={sourceStatusBadgeVariant(source.status)}>{source.status}</Badge>
                      </TableCell>

                      <TableCell>{formatDateTime(source.lastSyncedAt)}</TableCell>
                      <TableCell className="text-right">{source.chunksCount.toLocaleString("en-US")}</TableCell>
                      <TableCell>
                        <Badge variant={accessBadgeVariant(source.access)}>{source.access}</Badge>
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <details className="relative inline-block text-left">
                          <summary
                            className={cn(
                              "inline-flex h-8 w-8 list-none items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground transition hover:text-foreground",
                              "cursor-pointer"
                            )}
                          >
                            <span className="sr-only">Open row actions</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </summary>
                          <div className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-white/15 bg-slate-950/95 p-1 shadow-xl">
                            <button
                              type="button"
                              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.08]"
                              onClick={() => onViewDetails(source.id, "OVERVIEW")}
                            >
                              View details
                            </button>
                            <button
                              type="button"
                              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.08]"
                              onClick={() => onViewDetails(source.id, "ASK")}
                            >
                              Ask this source
                            </button>
                            <button
                              type="button"
                              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.08]"
                              onClick={() => onResyncSource(source.id)}
                            >
                              <RefreshCw className="h-3.5 w-3.5" />
                              Re-sync
                            </button>
                            <button
                              type="button"
                              className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.08]"
                              onClick={() => onEditSource(source.id)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/15"
                              onClick={() => {
                                if (window.confirm(`Remove source \"${source.name}\"?`)) {
                                  onRemoveSource(source.id);
                                }
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </div>
                        </details>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          ) : null}
        </Table>
      </CardContent>
    </Card>
  );
}
