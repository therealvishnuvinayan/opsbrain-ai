"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Bot, ChevronDown, ChevronLeft, ChevronRight, Moon, Sun } from "lucide-react";

import {
  dashboardNavItem,
  type SidebarNavItem,
} from "@/components/app-shell/sidebar-nav";
import { Button } from "@/components/ui/button";
import { applyTheme, getInitialTheme, THEME_STORAGE_KEY, type AppTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  variant?: "default" | "canva";
}

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
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

const canvaRailItems: SidebarNavItem[] = [dashboardNavItem];

function CanvaRailItem({
  item,
  pathname,
  onPrefetch,
}: {
  item: SidebarNavItem;
  pathname: string;
  onPrefetch?: (href: string) => void;
}) {
  const active = isActivePath(pathname, item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      prefetch
      title={item.label}
      onMouseEnter={() => onPrefetch?.(item.href)}
      onFocus={() => onPrefetch?.(item.href)}
      className="group flex w-full flex-col items-center gap-1.5 rounded-[20px] px-1 py-1 text-center transition-colors"
    >
      <span
        className={cn(
          "flex h-10 w-10 items-center justify-center rounded-[18px] border transition-all",
          active
            ? "border-[rgba(206,192,244,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(247,242,255,0.96)_100%)] text-[#6e49ff] shadow-[0_12px_24px_-22px_rgba(109,77,255,0.34)] dark:border-[rgba(130,97,255,0.52)] dark:bg-[linear-gradient(180deg,rgba(72,46,141,0.94)_0%,rgba(52,39,94,0.96)_100%)] dark:text-white dark:shadow-[0_0_18px_rgba(128,99,255,0.24)]"
            : "border-transparent text-[#817e97] group-hover:bg-white/62 group-hover:text-[#595571] dark:text-white/[0.68] dark:group-hover:bg-white/[0.04] dark:group-hover:text-white/90"
        )}
      >
        <Icon className="h-[17px] w-[17px]" />
      </span>
      <span
        className={cn(
          "line-clamp-2 text-[10px] font-medium leading-[1.1]",
          active ? "text-[#5f42cf] dark:text-white/[0.94]" : "text-[#817e97] dark:text-white/[0.62]"
        )}
      >
        {item.label}
      </span>
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle, variant = "default" }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState<AppTheme>("dark");
  const prefetchedRef = useRef<Set<string>>(new Set());

  const prefetchHref = (href: string) => {
    if (prefetchedRef.current.has(href)) {
      return;
    }

    prefetchedRef.current.add(href);
    router.prefetch(href);
  };

  useEffect(() => {
    const initialTheme = getInitialTheme();
    setTheme(initialTheme);
    applyTheme(initialTheme);
  }, []);

  const toggleTheme = () => {
    const nextTheme: AppTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    applyTheme(nextTheme);
    window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
  };

  if (variant === "canva") {
    return (
      <aside className="sticky top-0 z-40 hidden h-full w-[76px] shrink-0 rounded-[28px] border border-[rgba(231,226,243,0.88)] bg-[linear-gradient(180deg,rgba(253,252,255,0.98)_0%,rgba(247,243,252,0.98)_100%)] px-1.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] dark:border-white/8 dark:bg-[linear-gradient(180deg,#191521_0%,#17131f_100%)] md:block">
        <div className="flex h-full flex-col items-center">
          <Link
            href="/"
            className="mb-3 flex h-10 w-10 items-center justify-center rounded-[18px] border border-[rgba(232,226,243,0.92)] bg-white/92 text-[#765cff] shadow-[0_10px_20px_-20px_rgba(113,88,255,0.28)] dark:border-white/8 dark:bg-white/[0.03] dark:text-white"
            aria-label="Offspring AI home"
          >
            <Bot className="h-[18px] w-[18px]" />
          </Link>

          <nav className="flex w-full flex-col items-center gap-1">
            {canvaRailItems.map((item) => (
              <CanvaRailItem
                key={item.href}
                item={item}
                pathname={pathname}
                onPrefetch={prefetchHref}
              />
            ))}
          </nav>

          <div className="mt-auto flex flex-col items-center gap-2 pb-1">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-[rgba(232,226,243,0.88)] bg-white/86 text-[#74708b] transition-colors hover:bg-white dark:border-white/8 dark:bg-white/[0.03] dark:text-white/88"
            >
              {theme === "light" ? (
                <Moon className="h-[17px] w-[17px]" />
              ) : (
                <Sun className="h-[17px] w-[17px]" />
              )}
            </button>
            <span className="h-2 w-2 rounded-full bg-emerald-500/90" aria-hidden />
            <div className="h-9 w-9 rounded-full border border-[rgba(232,226,243,0.88)] bg-[linear-gradient(135deg,#ffe1c6,#fff8ed)] dark:border-white/10 dark:bg-[linear-gradient(135deg,#2a2237,#15131f)]" />
          </div>
        </div>
      </aside>
    );
  }

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
                <p className="text-xs text-muted-foreground">Home</p>
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
