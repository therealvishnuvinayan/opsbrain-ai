import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

export default function ActionsRunsPage() {
  return (
    <FeatureReadinessView
      eyebrow="Action Runs"
      title="Action run history is unavailable."
      description="OpsBrain no longer shows simulated orchestration runs."
      detail="Enable this view only when action execution records are sourced from the backend and tied to real operator workflows."
      primaryHref="/actions"
      primaryLabel="Actions Overview"
      secondaryHref="/runs"
      secondaryLabel="View Runs"
    />
  );
}
