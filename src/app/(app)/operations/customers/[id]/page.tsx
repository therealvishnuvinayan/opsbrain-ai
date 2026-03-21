import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

interface OperationCustomerProfilePageProps {
  params: Promise<{ id: string }>;
}

export default async function OperationCustomerProfilePage({ params }: OperationCustomerProfilePageProps) {
  const { id } = await params;

  return (
    <FeatureReadinessView
      eyebrow="Customer Profile"
      title="Customer profiles are unavailable."
      description={`OpsBrain no longer renders sample customer profile ${id}.`}
      detail="Customer detail pages should stay disabled until a live backend can supply profile, risk, and interaction context from production systems."
      primaryHref="/"
      primaryLabel="Open Workspace"
      secondaryHref="/investigation"
      secondaryLabel="Open Investigation"
    />
  );
}
