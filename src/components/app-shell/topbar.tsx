"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { Bell, Moon, Search, Sun } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/runs": "Runs",
  "/investigation": "Investigation",
  "/knowledge": "Knowledge",
  "/actions": "Actions",
};

export function Topbar() {
  const pathname = usePathname();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  const currentTitle = routeTitles[pathname] ?? "Command Center";

  const breadcrumb = useMemo(() => {
    if (pathname === "/") {
      return "OpsBrain / Dashboard";
    }
    return `OpsBrain / ${currentTitle}`;
  }, [currentTitle, pathname]);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("opsbrain-theme") as
      | "light"
      | "dark"
      | null;

    const initialTheme =
      savedTheme ??
      (window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light");

    setTheme(initialTheme);
    document.documentElement.classList.toggle("dark", initialTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    window.localStorage.setItem("opsbrain-theme", nextTheme);
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/40 bg-white/60 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/55">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{breadcrumb}</p>
          <h1 className="truncate text-base font-semibold md:text-lg">{currentTitle}</h1>
        </div>

        <div className="relative mx-auto hidden w-full max-w-md lg:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Global search"
            placeholder="Search runs, suppliers, incidents..."
            className="h-10 rounded-xl border-white/55 bg-white/70 pl-9 pr-12 dark:border-slate-700/80 dark:bg-slate-900/70"
          />
          <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md border border-border bg-secondary/70 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
            ⌘K
          </kbd>
        </div>

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <Button variant="ghost" size="icon" aria-label="Notifications">
            <Bell className="h-4 w-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {theme === "light" ? (
              <Moon className="h-4 w-4" />
            ) : (
              <Sun className="h-4 w-4" />
            )}
          </Button>

          <details className="relative">
            <summary className="list-none cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="sr-only">User menu</span>
              <Avatar>
                <AvatarFallback>VA</AvatarFallback>
              </Avatar>
            </summary>
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-white/50 bg-white/95 p-1 text-sm shadow-glass dark:border-slate-700 dark:bg-slate-900/95">
              <Link
                href="#"
                className="block rounded-lg px-3 py-2 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              >
                Profile
              </Link>
              <Link
                href="#"
                className="block rounded-lg px-3 py-2 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              >
                Settings
              </Link>
              <Link
                href="#"
                className="block rounded-lg px-3 py-2 text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
              >
                Sign out
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
