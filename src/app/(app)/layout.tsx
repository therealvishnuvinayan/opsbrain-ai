import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

import { AppShellLayout } from "@/components/app-shell/app-shell-layout";
import { authOptions } from "@/lib/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/login");
  }

  return <AppShellLayout>{children}</AppShellLayout>;
}
