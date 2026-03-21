import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

interface OperationOrderProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function OperationOrderProfilePage({ params }: OperationOrderProfilePageProps) {
  const { id } = await params;

  return (
    <FeatureReadinessView
      eyebrow="Order Profile"
      title="Order profiles are unavailable."
      description={`OpsBrain no longer renders sample order profile ${id}.`}
      detail="Order detail pages should only be enabled when live order events, customer links, and supplier context can be loaded from the operations backend."
      primaryHref="/"
      primaryLabel="Open Workspace"
      secondaryHref="/runs"
      secondaryLabel="View Runs"
    />
  );
}
