import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

export default function AssistantsPage() {
  return (
    <FeatureReadinessView
      eyebrow="Assistants"
      title="Assistant profiles are unavailable."
      description="The canned assistant catalog has been removed."
      detail="Assistant cards and detail workspaces should only return when agent definitions, permissions, and tool contracts are loaded from a live registry."
      secondaryHref="/"
      secondaryLabel="Open Workspace"
    />
  );
}
