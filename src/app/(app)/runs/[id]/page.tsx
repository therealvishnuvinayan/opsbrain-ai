import { redirect } from "next/navigation";

interface RunDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function RunDetailPage({ params }: RunDetailPageProps) {
  await params;
  redirect("/");
}
