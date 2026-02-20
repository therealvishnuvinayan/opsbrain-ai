"use client";

import { Clock3, Database, FolderOpen, Pencil, Trash2, Users } from "lucide-react";

import type { KnowledgeCollection } from "@/features/knowledge/types";
import { formatDateTime } from "@/features/knowledge/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface CollectionsGridProps {
  collections: KnowledgeCollection[];
  isLoading?: boolean;
  onOpen: (collectionId: string) => void;
  onCreate: () => void;
  onEdit: (collectionId: string) => void;
  onDelete: (collectionId: string) => void;
}

export function CollectionsGrid({
  collections,
  isLoading = false,
  onOpen,
  onCreate,
  onEdit,
  onDelete,
}: CollectionsGridProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={`collection-skeleton-${index}`} className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
            <CardHeader>
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardContent className="py-10 text-center">
          <p className="text-sm font-medium">No collections yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first knowledge space to group and govern sources.
          </p>
          <Button className="mt-4" onClick={onCreate}>
            Create Collection
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {collections.map((collection) => (
        <Card key={collection.id} className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader className="space-y-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base">{collection.name}</CardTitle>
              <Badge variant="neutral">{collection.defaultAccess}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{collection.description}</p>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                <p className="text-xs text-muted-foreground">Sources</p>
                <p className="text-sm font-semibold">{collection.sourcesCount.toLocaleString("en-US")}</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5">
                <p className="text-xs text-muted-foreground">Chunks</p>
                <p className="text-sm font-semibold">{collection.chunksCount.toLocaleString("en-US")}</p>
              </div>
            </div>

            <div className="space-y-1 rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-xs text-muted-foreground">
              <p className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                {collection.owners.join(", ") || "No owners"}
              </p>
              <p className="inline-flex items-center gap-1.5">
                <Database className="h-3.5 w-3.5" />
                Updated {formatDateTime(collection.lastUpdatedAt)}
              </p>
              <p className="inline-flex items-center gap-1.5">
                <Clock3 className="h-3.5 w-3.5" />
                Active governance profile
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={() => onOpen(collection.id)}>
                <FolderOpen className="h-3.5 w-3.5" />
                Open
              </Button>
              <Button size="sm" variant="outline" onClick={() => onEdit(collection.id)}>
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="border-danger/40 text-danger hover:bg-danger/10"
                onClick={() => {
                  if (window.confirm(`Delete collection \"${collection.name}\"?`)) {
                    onDelete(collection.id);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
