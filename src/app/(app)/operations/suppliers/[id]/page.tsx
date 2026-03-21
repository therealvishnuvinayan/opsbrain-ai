import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

interface OperationSupplierProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function OperationSupplierProfilePage({
  params,
}: OperationSupplierProfilePageProps) {
  const { id } = await params;

  return (
    <FeatureReadinessView
      eyebrow="Supplier Profile"
      title="Supplier profiles are unavailable."
      description={`OpsBrain no longer renders sample supplier profile ${id}.`}
      detail="Supplier detail pages should only return once live supplier health, connector state, and payout context are available from operational systems."
      primaryHref="/"
      primaryLabel="Open Workspace"
      secondaryHref="/investigation"
      secondaryLabel="Open Investigation"
    />
  );
}
