import { redirect } from "next/navigation";

interface ZendeskCaseDetailPageProps {
  params: Promise<{ ticketId: string }>;
}

export default async function ZendeskCaseDetailPage({ params }: ZendeskCaseDetailPageProps) {
  await params;
  redirect("/");
}
