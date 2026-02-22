import { notFound } from "next/navigation";

import { AssistantDetailView } from "@/features/assistants/components/assistant-detail-view";
import { getAssistantById } from "@/features/assistants/data";

interface AssistantDetailPageProps {
  params: Promise<{ assistantId: string }>;
}

export default async function AssistantDetailPage({ params }: AssistantDetailPageProps) {
  const { assistantId } = await params;

  if (!getAssistantById(assistantId)) {
    notFound();
  }

  return <AssistantDetailView assistantId={assistantId} />;
}
