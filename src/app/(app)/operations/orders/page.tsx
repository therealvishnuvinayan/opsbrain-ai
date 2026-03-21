import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

export default function OperationsOrdersPage() {
  return (
    <FeatureReadinessView
      eyebrow="Operations Orders"
      title="Order diagnostics are not connected yet."
      description="The roadmap placeholder has been removed."
      detail="This route should only show order-level operations data when a live backend can provide real order events, retries, and incident context."
      secondaryHref="/"
      secondaryLabel="Open Workspace"
    />
  );
}
