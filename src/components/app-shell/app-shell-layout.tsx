"use client";

import { useState } from "react";

import { Sidebar } from "@/components/app-shell/sidebar";
import { Topbar } from "@/components/app-shell/topbar";

interface AppShellLayoutProps {
  children: React.ReactNode;
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);

  const toggleSidebar = () => setCollapsed((prev) => !prev);

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-soft-grid [background-size:32px_32px] opacity-40"
      />
      <div className="relative flex min-h-screen">
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 pb-8 pt-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
