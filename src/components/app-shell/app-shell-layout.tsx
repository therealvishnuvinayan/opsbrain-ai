"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, ChevronRight, X } from "lucide-react";

import { Sidebar } from "@/components/app-shell/sidebar";
import {
  dashboardNavItem,
  navGroups,
  standaloneNavItems,
} from "@/components/app-shell/sidebar-nav";
import type { SidebarNavItem } from "@/components/app-shell/sidebar-nav";
import { Topbar } from "@/components/app-shell/topbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AppShellLayoutProps {
  children: React.ReactNode;
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

interface MobileNavItemProps {
  item: SidebarNavItem;
  pathname: string;
  onSelect: () => void;
  nested?: boolean;
}

function MobileNavItem({ item, pathname, onSelect, nested = false }: MobileNavItemProps) {
  const Icon = item.icon;
  const active = isActivePath(pathname, item.href);

  return (
    <Link
      href={item.href}
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors",
        nested ? "pl-5 pr-3" : "px-3",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-secondary/65 hover:text-foreground"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-70" />
    </Link>
  );
}

export function AppShellLayout({ children }: AppShellLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const toggleSidebar = () => setCollapsed((prev) => !prev);

  const prefetchRoutes = useMemo(
    () =>
      Array.from(
        new Set([
          dashboardNavItem.href,
          ...navGroups.flatMap((group) => group.items.map((item) => item.href)),
          ...standaloneNavItems.map((item) => item.href),
        ])
      ),
    []
  );

  useEffect(() => {
    const runPrefetch = () => {
      for (const href of prefetchRoutes) {
        router.prefetch(href);
      }
    };

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => runPrefetch(), { timeout: 1200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(runPrefetch, 350);
    return () => window.clearTimeout(timeoutId);
  }, [prefetchRoutes, router]);

  useEffect(() => {
    const onOpenMobileNav = () => setMobileOpen(true);
    window.addEventListener("opsbrain:open-mobile-nav", onOpenMobileNav);

    return () => {
      window.removeEventListener("opsbrain:open-mobile-nav", onOpenMobileNav);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const currentOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = currentOverflow;
    };
  }, [mobileOpen]);

  return (
    <div className="relative min-h-screen">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-soft-grid [background-size:32px_32px] opacity-40"
      />
      <div className="relative flex min-h-screen">
        <Sidebar collapsed={collapsed} onToggle={toggleSidebar} />
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-slate-950/65 backdrop-blur-[1px]"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-0 top-0 h-full w-[85%] max-w-sm border-r border-white/20 bg-slate-950/96 px-3 py-4 shadow-2xl">
              <div className="mb-6 flex items-center justify-between gap-2 px-2">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="truncate">
                    <p className="truncate text-sm font-semibold">OpsBrain AI</p>
                    <p className="text-xs text-muted-foreground">Command Center</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Close navigation"
                  className="h-8 w-8 text-muted-foreground hover:text-foreground"
                  onClick={() => setMobileOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <nav className="max-h-[calc(100vh-120px)] space-y-2 overflow-y-auto pb-4">
                <MobileNavItem
                  item={dashboardNavItem}
                  pathname={pathname}
                  onSelect={() => setMobileOpen(false)}
                />

                {navGroups.map((group) => (
                  <section key={group.key} className="space-y-1">
                    <p className="px-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.label}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item) => (
                        <MobileNavItem
                          key={item.href}
                          item={item}
                          pathname={pathname}
                          onSelect={() => setMobileOpen(false)}
                          nested
                        />
                      ))}
                    </div>
                  </section>
                ))}

                <div className="my-1 border-t border-white/10" />
                {standaloneNavItems.map((item) => (
                  <MobileNavItem
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onSelect={() => setMobileOpen(false)}
                  />
                ))}
              </nav>
            </aside>
          </div>
        ) : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar />
          <main className="flex-1 px-4 pb-8 pt-6 md:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
