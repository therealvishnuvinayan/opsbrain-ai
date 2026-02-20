"use client";

import { useKnowledgeStore } from "@/features/knowledge/store";
import { GovernanceMatrix } from "@/features/knowledge/components/governance-matrix";

export function KnowledgeGovernanceView() {
  const { collections, sources, governance, isHydrated, toggleGovernance } = useKnowledgeStore();

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Governance</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Define role access across collections and monitor restricted knowledge assets.
        </p>
      </section>

      <GovernanceMatrix
        collections={collections}
        sources={sources}
        governance={governance}
        isLoading={!isHydrated}
        onToggle={toggleGovernance}
      />
    </div>
  );
}
