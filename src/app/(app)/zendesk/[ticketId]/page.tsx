import { ZendeskCaseDetailView } from "@/features/zendesk/components/zendesk-case-detail-view";

interface ZendeskCaseDetailPageProps {
  params: Promise<{
    ticketId: string;
  }>;
}

export default async function ZendeskCaseDetailPage({ params }: ZendeskCaseDetailPageProps) {
  const { ticketId } = await params;
  return <ZendeskCaseDetailView ticketId={ticketId} />;
}
