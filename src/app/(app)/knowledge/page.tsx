import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

export default function KnowledgePage() {
  return (
    <FeatureReadinessView
      eyebrow="Knowledge"
      title="Knowledge is not connected yet."
      description="The local sample collections and source catalog have been removed."
      detail="Re-enable this workspace when sources, ingestion jobs, access controls, and retrieval diagnostics are backed by real connector and indexing services."
      secondaryHref="/"
      secondaryLabel="Open Workspace"
    />
  );
}
