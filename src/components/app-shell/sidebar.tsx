"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  BookOpen,
  Bot,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  LayoutGrid,
  PlayCircle,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutGrid },
  { label: "Runs", href: "/runs", icon: PlayCircle },
  { label: "Investigation", href: "/investigation", icon: FileSearch },
  { label: "Knowledge", href: "/knowledge", icon: BookOpen },
  { label: "Actions", href: "/actions", icon: Sparkles },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

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

        <nav className="space-y-1">
          {navItems.map((item) => {
            const active =
              item.href === "/"
                ? pathname === item.href
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-primary/12 text-primary"
                    : "text-muted-foreground hover:bg-secondary/65 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );
          })}
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
