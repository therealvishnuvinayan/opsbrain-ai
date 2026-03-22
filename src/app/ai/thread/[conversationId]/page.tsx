import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AppShellLayout } from "@/components/app-shell/app-shell-layout";
import { StartPage } from "@/components/start-page/start-page";
import { authOptions } from "@/lib/auth";

function getFirstName(name?: string | null) {
  return name?.trim().split(/\s+/)[0] ?? null;
}

interface ThreadPageProps {
  params: Promise<{
    conversationId: string;
  }>;
}

export default async function AiThreadPage({ params }: ThreadPageProps) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  const { conversationId } = await params;

  return (
    <AppShellLayout variant="canva">
      <StartPage
        userFirstName={getFirstName(session.user?.name)}
        threadConversationId={conversationId}
      />
    </AppShellLayout>
  );
}
