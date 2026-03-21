import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

export default function ActionsPage() {
  return (
    <FeatureReadinessView
      eyebrow="Actions"
      title="Actions is not connected yet."
      description="The local demo action catalog has been removed."
      detail="This area will return once action definitions, execution history, and approval controls are backed by live orchestration services instead of client-side sample data."
      secondaryHref="/investigation"
      secondaryLabel="Open Investigation"
    />
  );
}
