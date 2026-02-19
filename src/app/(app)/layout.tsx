import { AppShellLayout } from "@/components/app-shell/app-shell-layout";

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AppShellLayout>{children}</AppShellLayout>;
}
