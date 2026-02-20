"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plus, Search } from "lucide-react";

import { AddSourceModal } from "@/features/knowledge/components/add-source-modal";
import { CreateCollectionModal } from "@/features/knowledge/components/create-collection-modal";
import { SourceDetailsDrawer } from "@/features/knowledge/components/source-details-drawer";
import { SourcesTable } from "@/features/knowledge/components/sources-table";
import { useKnowledgeStore } from "@/features/knowledge/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type DrawerTab = "OVERVIEW" | "PREVIEW" | "ERRORS" | "ASK";

export function KnowledgeOverview() {
  const searchParams = useSearchParams();
  const {
    sources,
    collections,
    connectors,
    isHydrated,
    addSource,
    updateSource,
    removeSource,
    resyncSource,
    createCollection,
  } = useKnowledgeStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [isSourceModalOpen, setIsSourceModalOpen] = useState(false);
  const [isCollectionModalOpen, setIsCollectionModalOpen] = useState(false);
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null);
  const [drawerSourceId, setDrawerSourceId] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("OVERVIEW");

  const initialCollectionId = searchParams.get("collection") ?? undefined;

  const editingSource = useMemo(
    () => (editingSourceId ? sources.find((source) => source.id === editingSourceId) ?? null : null),
    [editingSourceId, sources]
  );

  const drawerSource = useMemo(
    () => (drawerSourceId ? sources.find((source) => source.id === drawerSourceId) ?? null : null),
    [drawerSourceId, sources]
  );

  return (
    <div className="space-y-5">
      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Knowledge</h2>
            <p className="text-sm text-muted-foreground md:text-base">
              Manage enterprise knowledge sources powering investigations, policy context, and operational reasoning.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => setIsCollectionModalOpen(true)}>
              Create Collection
            </Button>
            <Button
              onClick={() => {
                setEditingSourceId(null);
                setIsSourceModalOpen(true);
              }}
            >
              <Plus className="h-4 w-4" />
              Add Source
            </Button>
          </div>
        </div>

        <div className="relative max-w-xl">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search knowledge…"
            className="pl-9"
          />
        </div>
      </section>

      <SourcesTable
        sources={sources}
        collections={collections}
        isLoading={!isHydrated}
        initialCollectionId={initialCollectionId}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        showSearchInput={false}
        onViewDetails={(sourceId, tab = "OVERVIEW") => {
          setDrawerSourceId(sourceId);
          setDrawerTab(tab);
        }}
        onEditSource={(sourceId) => {
          setEditingSourceId(sourceId);
          setIsSourceModalOpen(true);
        }}
        onResyncSource={resyncSource}
        onRemoveSource={removeSource}
        onAddSource={() => {
          setEditingSourceId(null);
          setIsSourceModalOpen(true);
        }}
      />

      <AddSourceModal
        open={isSourceModalOpen}
        onClose={() => setIsSourceModalOpen(false)}
        collections={collections}
        connectors={connectors}
        initialSource={editingSource}
        onSubmit={(input) => {
          if (editingSourceId) {
            updateSource(editingSourceId, {
              ...input,
              status: "STALE",
              errorMessage: undefined,
              lastSyncedAt: new Date().toISOString(),
              chunksCount: Math.max(
                editingSource?.chunksCount ?? 0,
                input.previewChunks.length * 12
              ),
            });
            return;
          }

          addSource(input);
        }}
      />

      <CreateCollectionModal
        open={isCollectionModalOpen}
        onClose={() => setIsCollectionModalOpen(false)}
        initialCollection={null}
        onCreate={createCollection}
        onUpdate={(_input) => {
          // Overview uses create-only action.
        }}
      />

      <SourceDetailsDrawer
        open={Boolean(drawerSource)}
        source={drawerSource}
        collections={collections}
        initialTab={drawerTab}
        onClose={() => setDrawerSourceId(null)}
      />
    </div>
  );
}
