import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

export default function OperationsSuppliersPage() {
  return (
    <FeatureReadinessView
      eyebrow="Operations Suppliers"
      title="Supplier diagnostics are not connected yet."
      description="The previous roadmap placeholder has been removed."
      detail="Supplier run health, connector traces, and remediation controls should only return once they are sourced from live operational services."
      secondaryHref="/"
      secondaryLabel="Open Workspace"
    />
  );
}
