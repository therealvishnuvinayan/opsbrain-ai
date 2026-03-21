import { FeatureReadinessView } from "@/components/product/feature-readiness-view";

interface AssistantDetailPageProps {
  params: Promise<{ assistantId: string }>;
}

export default async function AssistantDetailPage({ params }: AssistantDetailPageProps) {
  const { assistantId } = await params;
  const label = assistantId
    .split("-")
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");

  return (
    <FeatureReadinessView
      eyebrow="Assistant"
      title={`${label || "Assistant"} is unavailable.`}
      description="OpsBrain no longer renders hardcoded assistant profiles."
      detail="This route should only become active again when assistant metadata, capabilities, and execution paths are sourced from a live backend."
      primaryHref="/assistants"
      primaryLabel="Assistant Overview"
      secondaryHref="/"
      secondaryLabel="Open Workspace"
    />
  );
}
