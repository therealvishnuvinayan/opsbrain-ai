import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

export default function KnowledgeGovernancePage() {
  return (
    <FeatureReadinessView
      eyebrow="Knowledge Governance"
      title="Governance controls are unavailable."
      description="The sample access matrix and policy toggles have been removed."
      detail="Show this surface again only when governance rules are coming from a real authorization model and audited policy store."
      primaryHref="/knowledge"
      primaryLabel="Knowledge Overview"
      secondaryHref="/"
      secondaryLabel="Open Workspace"
    />
  );
}
