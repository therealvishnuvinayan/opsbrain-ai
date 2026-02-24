"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import {
  dashboardNavItem,
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
  techTools: false,
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
      techTools:
        typeof parsed.techTools === "boolean"
          ? parsed.techTools
          : DEFAULT_GROUP_STATE.techTools,
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
        "group flex items-center gap-3 rounded-xl py-2.5 text-sm font-medium transition-colors",
        collapsed ? "px-3" : nested ? "pl-7 pr-3" : "px-3",
        active
          ? "bg-primary/12 text-primary"
          : "text-muted-foreground hover:bg-secondary/65 hover:text-foreground"
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
      animate={{ width: collapsed ? 92 : 272 }}
      transition={{ duration: 0.22, ease: "easeInOut" }}
      className="sticky top-0 z-40 hidden h-screen shrink-0 border-r border-white/45 bg-white/65 px-3 py-4 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/60 md:block"
    >
      <div className="flex h-full flex-col">
        <div className="mb-6 flex items-center justify-between gap-2 px-2">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Bot className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="truncate">
                <p className="truncate text-sm font-semibold">OpsBrain AI</p>
                <p className="text-xs text-muted-foreground">Command Center</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={onToggle}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronLeft className="h-4 w-4" />
            )}
          </Button>
        </div>

        <nav className="space-y-2">
          <NavLinkItem
            item={dashboardNavItem}
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
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground transition-colors hover:bg-secondary/40 hover:text-foreground"
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

          <div className="my-1 border-t border-white/10" />
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

        <div className="mt-auto rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-3">
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
    </motion.aside>
  );
}
