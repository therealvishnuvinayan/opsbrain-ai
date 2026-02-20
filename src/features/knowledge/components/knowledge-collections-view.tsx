"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

import { CollectionsGrid } from "@/features/knowledge/components/collections-grid";
import { CreateCollectionModal } from "@/features/knowledge/components/create-collection-modal";
import { useKnowledgeStore } from "@/features/knowledge/store";
import { Button } from "@/components/ui/button";

export function KnowledgeCollectionsView() {
  const router = useRouter();
  const {
    collections,
    isHydrated,
    createCollection,
    updateCollection,
    deleteCollection,
  } = useKnowledgeStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCollectionId, setEditingCollectionId] = useState<string | null>(null);

  const editingCollection = useMemo(
    () =>
      editingCollectionId
        ? collections.find((collection) => collection.id === editingCollectionId) ?? null
        : null,
    [collections, editingCollectionId]
  );

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Collections</h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Knowledge spaces used to segment retrieval context, access controls, and ownership.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingCollectionId(null);
            setIsModalOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Create Collection
        </Button>
      </section>

      <CollectionsGrid
        collections={collections}
        isLoading={!isHydrated}
        onOpen={(collectionId) => router.push(`/knowledge?collection=${collectionId}`)}
        onCreate={() => {
          setEditingCollectionId(null);
          setIsModalOpen(true);
        }}
        onEdit={(collectionId) => {
          setEditingCollectionId(collectionId);
          setIsModalOpen(true);
        }}
        onDelete={deleteCollection}
      />

      <CreateCollectionModal
        open={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialCollection={editingCollection}
        onCreate={createCollection}
        onUpdate={updateCollection}
      />
    </div>
  );
}
