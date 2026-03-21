"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, ChevronRight, X } from "lucide-react";

import { Sidebar } from "@/components/app-shell/sidebar";
import {
  workspaceNavItem,
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
  const [collapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const prefetchRoutes = useMemo(
    () =>
      Array.from(
        new Set([
          workspaceNavItem.href,
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
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(125,211,252,0.22),_transparent_22%),radial-gradient(circle_at_top_right,_rgba(221,214,254,0.24),_transparent_20%)] dark:bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_18%),radial-gradient(circle_at_top_right,_rgba(168,85,247,0.16),_transparent_18%)]"
      />
      <div className="relative flex min-h-screen">
        <Sidebar collapsed={collapsed} onToggle={() => {}} />
        {mobileOpen ? (
          <div className="fixed inset-0 z-50 md:hidden">
            <button
              type="button"
              aria-label="Close navigation"
              className="absolute inset-0 bg-slate-950/18 backdrop-blur-sm dark:bg-slate-950/55"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="absolute left-3 top-3 h-[calc(100%-24px)] w-[85%] max-w-sm rounded-[28px] border border-black/[0.05] bg-white/92 px-3 py-4 shadow-[0_28px_90px_-48px_rgba(16,24,40,0.42)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-slate-950/92">
              <div className="mb-6 flex items-center justify-between gap-2 px-2">
                <Link
                  href="/"
                  onClick={() => setMobileOpen(false)}
                  className="flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl px-1 py-1.5 transition-colors hover:bg-white/60 dark:hover:bg-slate-900/70"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(139,92,246,0.18))] text-primary dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(139,92,246,0.26))]">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div className="truncate">
                    <p className="truncate text-sm font-semibold">OpsBrain AI</p>
                    <p className="text-xs text-muted-foreground">AI workspace</p>
                  </div>
                </Link>
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
                  item={workspaceNavItem}
                  pathname={pathname}
                  onSelect={() => setMobileOpen(false)}
                />

                {navGroups.map((group) => (
                  <section key={group.key} className="space-y-1">
                    <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
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
          <main className="flex-1 px-4 pb-12 pt-5 md:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
