import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

export default function KnowledgeConnectorsPage() {
  return (
    <FeatureReadinessView
      eyebrow="Knowledge Connectors"
      title="Connectors are unavailable."
      description="No sample connector statuses or fake sync states are shown anymore."
      detail="This route should stay empty until each connector reports real status, sync health, and configuration metadata from backend services."
      primaryHref="/knowledge"
      primaryLabel="Knowledge Overview"
      secondaryHref="/zendesk"
      secondaryLabel="Open Zendesk"
    />
  );
}
