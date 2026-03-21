import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

export default function ActionsPoliciesPage() {
  return (
    <FeatureReadinessView
      eyebrow="Action Policies"
      title="Policy controls are not connected yet."
      description="No demo guardrails or sample approval matrices are shown anymore."
      detail="This module should only surface once policy thresholds, approvals, and enforcement rules are loaded from a live governance backend."
      primaryHref="/actions"
      primaryLabel="Actions Overview"
      secondaryHref="/"
      secondaryLabel="Open Workspace"
    />
  );
}
