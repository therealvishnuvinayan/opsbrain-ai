import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

export default function KnowledgeCollectionsPage() {
  return (
    <FeatureReadinessView
      eyebrow="Knowledge Collections"
      title="Collections are unavailable."
      description="OpsBrain no longer renders sample collection structures."
      detail="Collections should only appear here when they are sourced from a live knowledge service with real ownership, access policy, and ingestion metadata."
      primaryHref="/knowledge"
      primaryLabel="Knowledge Overview"
      secondaryHref="/"
      secondaryLabel="Open Workspace"
    />
  );
}
