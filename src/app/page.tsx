import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AppShellLayout } from "@/components/app-shell/app-shell-layout";
import { StartPage } from "@/components/start-page/start-page";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  return (
    <AppShellLayout>
      <StartPage />
    </AppShellLayout>
  );
}
