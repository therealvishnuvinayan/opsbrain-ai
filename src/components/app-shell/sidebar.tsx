"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  Bot,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  MessageSquareText,
  Moon,
  Plus,
  Sun,
} from "lucide-react";

import {
  dashboardNavItem,
  type SidebarNavItem,
} from "@/components/app-shell/sidebar-nav";
import { Button } from "@/components/ui/button";
import { useChatStore } from "@/lib/chat/chat.store";
import { groupConversationsByRecency } from "@/lib/chat/chat.utils";
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
  const displayLabel = item.href === "/" ? "Bamboo AI" : item.label;

  return (
    <Link
      href={item.href}
      prefetch
      title={displayLabel}
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
        {displayLabel}
      </span>
    </Link>
  );
}

export function Sidebar({ collapsed, onToggle, variant = "default" }: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [theme, setTheme] = useState<AppTheme>("light");
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const prefetchedRef = useRef<Set<string>>(new Set());
  const conversations = useChatStore((state) => state.conversations);
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const createConversation = useChatStore((state) => state.createConversation);
  const setActiveConversation = useChatStore((state) => state.setActiveConversation);
  const groupedConversations = groupConversationsByRecency(conversations);

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

  const startNewChat = () => {
    createConversation("New chat");
    setIsSidebarExpanded(true);
  };

  if (variant === "canva") {
    return (
      <aside className="sticky top-0 z-40 hidden h-full w-[76px] shrink-0 overflow-visible md:block">
        <div className="relative h-full">
          <div className="flex h-full flex-col items-center rounded-[28px] border border-[rgba(231,226,243,0.88)] bg-[linear-gradient(180deg,rgba(253,252,255,0.98)_0%,rgba(247,243,252,0.98)_100%)] px-1.5 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.92)] dark:border-white/8 dark:bg-[linear-gradient(180deg,#191521_0%,#17131f_100%)]">
            <div className="mb-3 flex w-full flex-col items-center gap-2">
              <div className="group/menu relative">
                <button
                  type="button"
                  aria-label="Open menu"
                  onClick={() => {
                    setIsSidebarExpanded((current) => !current);
                    setActiveTooltip(null);
                  }}
                  onMouseEnter={() => setActiveTooltip("open-menu")}
                  onMouseLeave={() => setActiveTooltip((current) => (current === "open-menu" ? null : current))}
                  onFocus={() => setActiveTooltip("open-menu")}
                  onBlur={() => setActiveTooltip((current) => (current === "open-menu" ? null : current))}
                  className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-[rgba(232,226,243,0.92)] bg-white/92 text-[#765cff] shadow-[0_10px_20px_-20px_rgba(113,88,255,0.28)] transition-colors hover:bg-white dark:border-white/8 dark:bg-white/[0.03] dark:text-white"
                >
                  <Menu className="h-[18px] w-[18px]" />
                </button>
                <span
                  className={cn(
                    "pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-50 w-max whitespace-nowrap -translate-x-1/2 rounded-[10px] bg-[#1f2330] px-3 py-1.5 text-[11.5px] font-medium tracking-[-0.01em] text-white shadow-[0_10px_24px_-16px_rgba(15,23,42,0.45)] transition-opacity duration-150 dark:bg-white dark:text-[#171923]",
                    activeTooltip === "open-menu" ? "opacity-100" : "opacity-0"
                  )}
                >
                  Open menu
                </span>
              </div>

              <Link
                href="/"
                className="flex h-10 w-10 items-center justify-center rounded-[18px] border border-[rgba(232,226,243,0.92)] bg-white/92 text-[#765cff] shadow-[0_10px_20px_-20px_rgba(113,88,255,0.28)] dark:border-white/8 dark:bg-white/[0.03] dark:text-white"
                aria-label="Bamboo AI home"
              >
                <Bot className="h-[18px] w-[18px]" />
              </Link>
            </div>

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

            <button
              type="button"
              onClick={startNewChat}
              className="mt-2 flex h-10 w-10 items-center justify-center rounded-[18px] bg-[linear-gradient(135deg,#7c3aed_0%,#9f67ff_100%)] text-white shadow-[0_16px_28px_-20px_rgba(124,58,237,0.58)] transition-transform hover:scale-[1.02] dark:shadow-[0_16px_28px_-18px_rgba(124,58,237,0.72)]"
              aria-label="Start new chat"
            >
              <Plus className="h-[18px] w-[18px]" />
            </button>

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

          <motion.section
            initial={false}
            animate={{
              x: isSidebarExpanded ? 0 : -18,
              opacity: isSidebarExpanded ? 1 : 0,
              pointerEvents: isSidebarExpanded ? "auto" : "none",
            }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="absolute left-[88px] top-0 z-30 h-full w-[288px]"
          >
            <div className="flex h-full flex-col rounded-[28px] border border-[rgba(231,226,243,0.88)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98)_0%,rgba(248,244,252,0.96)_100%)] px-4 py-4 shadow-[0_28px_48px_-36px_rgba(113,88,255,0.36)] dark:border-white/8 dark:bg-[linear-gradient(180deg,rgba(24,21,34,0.98)_0%,rgba(19,17,29,0.98)_100%)] dark:shadow-[0_28px_56px_-34px_rgba(8,10,22,0.8)]">
              <div className="flex items-center justify-between gap-3 pb-4">
                <div>
                  <p className="text-[15px] font-semibold tracking-[-0.03em] text-[#2e2b3e] dark:text-white/[0.94]">
                    Bamboo AI
                  </p>
                  <p className="text-[12px] font-medium text-[#85809b] dark:text-white/[0.5]">
                    Chat command center
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsSidebarExpanded(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-[16px] border border-[rgba(228,223,240,0.86)] bg-white/82 text-[#716e87] transition-colors hover:bg-white dark:border-white/8 dark:bg-white/[0.03] dark:text-white/[0.72] dark:hover:bg-white/[0.05]"
                  aria-label="Close menu"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={startNewChat}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[16px] bg-[linear-gradient(135deg,#7c3aed_0%,#9f67ff_100%)] px-4 text-[14px] font-semibold text-white shadow-[0_18px_28px_-20px_rgba(124,58,237,0.56)] transition-transform hover:scale-[1.01] dark:shadow-[0_18px_30px_-18px_rgba(124,58,237,0.66)]"
              >
                <Plus className="h-4 w-4" />
                Start new chat
              </button>

              <div className="mt-5 flex flex-1 flex-col overflow-hidden">
                {(["Today", "Yesterday", "Earlier"] as const).map((group) => {
                  const groupItems = groupedConversations[group];
                  if (groupItems.length === 0) {
                    return null;
                  }

                  return (
                    <section key={group} className="mt-4 first:mt-0">
                      <div className="mb-2 flex items-center justify-between px-1">
                        <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#8b86a1] dark:text-white/[0.42]">
                          {group}
                        </p>
                        <button
                          type="button"
                          onClick={startNewChat}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-[#7a7593] transition-colors hover:bg-white/80 hover:text-[#4e4966] dark:text-white/[0.54] dark:hover:bg-white/[0.05] dark:hover:text-white/[0.88]"
                          aria-label={`New chat in ${group.toLowerCase()}`}
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="space-y-1">
                        {groupItems.map((item) => {
                          const isActive = activeConversationId === item.id;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setActiveConversation(item.id);
                                router.push("/");
                              }}
                              className={cn(
                                "flex w-full items-center gap-3 rounded-[16px] px-3 py-2.5 text-left transition-colors",
                                isActive
                                  ? "bg-[linear-gradient(180deg,rgba(240,233,255,0.96)_0%,rgba(244,239,255,0.96)_100%)] text-[#5f42cf] dark:bg-[linear-gradient(180deg,rgba(72,46,141,0.46)_0%,rgba(52,39,94,0.42)_100%)] dark:text-white"
                                  : "text-[#4d4960] hover:bg-white/82 dark:text-white/[0.74] dark:hover:bg-white/[0.04]"
                              )}
                            >
                              <MessageSquareText className="h-4 w-4 shrink-0" />
                              <span className="truncate text-[14px] font-medium">{item.title}</span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
          </motion.section>
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
