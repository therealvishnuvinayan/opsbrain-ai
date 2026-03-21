"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, ChevronDown } from "lucide-react";

import {
  workspaceNavItem,
  navGroups,
  standaloneNavItems,
  type SidebarNavGroup,
  type SidebarNavItem,
} from "@/components/app-shell/sidebar-nav";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

type SidebarGroupKey = SidebarNavGroup["key"];
type GroupExpansionState = Record<SidebarGroupKey, boolean>;

const GROUP_STORAGE_KEY = "opsbrain.sidebar.groups";

const DEFAULT_GROUP_STATE: GroupExpansionState = {
  reconciliation: true,
  operations: false,
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function parseStoredGroupState(value: string | null): GroupExpansionState {
  if (!value) {
    return DEFAULT_GROUP_STATE;
  }

  try {
    const parsed = JSON.parse(value) as Partial<GroupExpansionState>;
    return {
      reconciliation:
        typeof parsed.reconciliation === "boolean"
          ? parsed.reconciliation
          : DEFAULT_GROUP_STATE.reconciliation,
      operations:
        typeof parsed.operations === "boolean"
          ? parsed.operations
          : DEFAULT_GROUP_STATE.operations,
    };
  } catch {
    return DEFAULT_GROUP_STATE;
  }
}

interface NavLinkItemProps {
  item: SidebarNavItem;
  collapsed: boolean;
  pathname: string;
  nested?: boolean;
  onPrefetch?: (href: string) => void;
}

function NavLinkItem({
  item,
  collapsed,
  pathname,
  nested = false,
  onPrefetch,
}: NavLinkItemProps) {
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch
      title={collapsed ? item.label : undefined}
      onMouseEnter={() => onPrefetch?.(item.href)}
      onFocus={() => onPrefetch?.(item.href)}
      className={cn(
        "group flex items-center gap-3 rounded-2xl py-2.5 text-sm font-medium transition-colors",
        collapsed ? "px-3" : nested ? "pl-7 pr-3" : "px-3",
        active
          ? "bg-white text-foreground shadow-[0_14px_32px_-24px_rgba(16,24,40,0.24)] ring-1 ring-black/[0.04] dark:bg-slate-900 dark:ring-white/[0.06]"
          : "text-muted-foreground hover:bg-white/72 hover:text-foreground dark:hover:bg-slate-900/72"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [groupState, setGroupState] = useState<GroupExpansionState>(DEFAULT_GROUP_STATE);
  const [hydrated, setHydrated] = useState(false);
  const prefetchedRef = useRef<Set<string>>(new Set());

  const prefetchHref = (href: string) => {
    if (prefetchedRef.current.has(href)) {
      return;
    }

    prefetchedRef.current.add(href);
    router.prefetch(href);
  };

  useEffect(() => {
    const stored = window.localStorage.getItem(GROUP_STORAGE_KEY);
    setGroupState(parseStoredGroupState(stored));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    window.localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groupState));
  }, [groupState, hydrated]);

  useEffect(() => {
    setGroupState((current) => {
      let next = current;

      for (const group of navGroups) {
        const isGroupActive = group.items.some((item) => isActivePath(pathname, item.href));

        if (isGroupActive && !next[group.key]) {
          next = {
            ...next,
            [group.key]: true,
          };
        }
      }

      return next;
    });
  }, [pathname]);

  const collapsedGroupItems = useMemo(
    () => navGroups.flatMap((group) => group.items),
    []
  );

  return (
    <motion.aside
      animate={{ width: collapsed ? 82 : 232 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="sticky top-4 z-40 m-4 hidden h-[calc(100vh-2rem)] shrink-0 rounded-[28px] border border-slate-200/72 bg-[linear-gradient(180deg,rgba(243,249,255,0.86),rgba(255,255,255,0.72))] px-2.5 py-4 shadow-[0_24px_70px_-54px_rgba(16,24,40,0.16)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-slate-950/72 md:block"
    >
      <div className="flex h-full flex-col">
        <div className="mb-6 flex items-center justify-between gap-2 px-2">
          <Link
            href="/"
            title="Go to workspace"
            className={cn(
              "flex min-w-0 items-center gap-3 overflow-hidden rounded-2xl transition-colors hover:bg-white/60 dark:hover:bg-slate-900/70",
              collapsed ? "p-1" : "px-1 py-1.5"
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,rgba(59,130,246,0.14),rgba(139,92,246,0.18))] text-primary dark:bg-[linear-gradient(135deg,rgba(59,130,246,0.24),rgba(139,92,246,0.26))]">
              <Bot className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <p className="truncate text-sm font-semibold">OpsBrain AI</p>
                <p className="text-xs text-muted-foreground">AI workspace</p>
              </div>
            )}
          </Link>
        </div>

        <nav className="space-y-2">
          <NavLinkItem
            item={workspaceNavItem}
            collapsed={collapsed}
            pathname={pathname}
            onPrefetch={prefetchHref}
          />

          {collapsed ? (
            <>
              {collapsedGroupItems.map((item) => (
                <NavLinkItem
                  key={item.href}
                  item={item}
                  collapsed={collapsed}
                  pathname={pathname}
                  onPrefetch={prefetchHref}
                />
              ))}
            </>
          ) : (
            navGroups.map((group) => (
              <section key={group.key} className="space-y-1">
                <button
                  type="button"
                  onClick={() =>
                    setGroupState((current) => ({
                      ...current,
                      [group.key]: !current[group.key],
                    }))
                  }
                  aria-expanded={groupState[group.key]}
                  className="flex w-full items-center justify-between rounded-xl px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-white/70 hover:text-foreground dark:hover:bg-slate-900/72"
                >
                  <span>{group.label}</span>
                  <ChevronDown
                    className={cn(
                      "h-3.5 w-3.5 transition-transform",
                      groupState[group.key] ? "rotate-0" : "-rotate-90"
                    )}
                  />
                </button>

                {groupState[group.key] ? (
                  <div className="space-y-1">
                    {group.items.map((item) => (
                      <NavLinkItem
                        key={item.href}
                        item={item}
                        collapsed={collapsed}
                        pathname={pathname}
                        nested
                        onPrefetch={prefetchHref}
                      />
                    ))}
                  </div>
                ) : null}
              </section>
            ))
          )}

          <div className="my-2 border-t border-slate-200/80 dark:border-white/[0.06]" />
          {standaloneNavItems.map((item) => (
            <NavLinkItem
              key={item.href}
              item={item}
              collapsed={collapsed}
              pathname={pathname}
              onPrefetch={prefetchHref}
            />
          ))}
        </nav>

        <div className="mt-auto flex justify-center">
          <div className="rounded-full border border-emerald-500/16 bg-white/72 px-3 py-2 shadow-[0_18px_40px_-34px_rgba(16,24,40,0.16)] dark:bg-slate-950/72">
            <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" aria-hidden />
            {!collapsed && (
              <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                System: Healthy
              </p>
            )}
          </div>
        </div>
        </div>
      </div>
    </motion.aside>
  );
}
