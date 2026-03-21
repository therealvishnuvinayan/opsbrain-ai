import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

export default function KnowledgeJobsPage() {
  return (
    <FeatureReadinessView
      eyebrow="Knowledge Jobs"
      title="Ingestion jobs are unavailable."
      description="No simulated indexing runs or sample logs remain in this module."
      detail="Job history should only be rendered from the ingestion backend once worker execution, retries, and failures are tracked in production."
      primaryHref="/knowledge"
      primaryLabel="Knowledge Overview"
      secondaryHref="/"
      secondaryLabel="Open Workspace"
    />
  );
}
