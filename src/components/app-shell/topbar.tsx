"use client";

import { useEffect, useMemo, useState } from "react";
import { Bell, LogOut, Menu, Moon, Search, Sun, UserCircle2 } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const routeTitles: Record<string, string> = {
  "/": "Dashboard",
  "/runs": "Runs",
  "/investigation": "Investigation",
  "/operations/search": "Search",
  "/operations/orders": "Orders",
  "/operations/customers": "Customers",
  "/operations/suppliers": "Suppliers",
  "/operations": "Operations",
  "/knowledge": "Knowledge",
  "/actions": "Actions",
  "/assistants": "Assistants",
  "/zendesk": "Zendesk Autopilot",
};

function resolveRouteTitle(pathname: string) {
  if (pathname === "/") {
    return routeTitles["/"];
  }

  const matched = Object.entries(routeTitles)
    .filter(
      ([route]) =>
        route !== "/" && (pathname === route || pathname.startsWith(`${route}/`))
    )
    .sort((a, b) => b[0].length - a[0].length)[0];

  return matched?.[1] ?? "Command Center";
}

function getInitials(value: string) {
  const initials = value
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return initials || "OB";
}

export function Topbar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  const [theme, setTheme] = useState<"light" | "dark">("dark");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);

  const currentTitle = resolveRouteTitle(pathname);

  const breadcrumb = useMemo(() => {
    if (pathname === "/") {
      return "OpsBrain / Dashboard";
    }

    return `OpsBrain / ${currentTitle}`;
  }, [currentTitle, pathname]);

  const displayName = session?.user?.name?.trim() || "Ops Operator";
  const displayEmail = session?.user?.email || "Authenticated session";
  const avatarImage = session?.user?.image?.trim() || "";
  const showAvatarImage = avatarImage.length > 0 && !avatarImageFailed;
  const initials = getInitials(displayName);

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [avatarImage]);

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
    document.documentElement.style.colorScheme = initialTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    document.documentElement.style.colorScheme = nextTheme;
    window.localStorage.setItem("opsbrain-theme", nextTheme);
  };

  const handleSignOut = async () => {
    try {
      setIsSigningOut(true);
      await signOut({ callbackUrl: "/auth/login" });
    } finally {
      setIsSigningOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 border-b border-white/40 bg-white/60 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/55">
      <div className="flex h-16 items-center gap-3 px-4 md:px-8">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          className="md:hidden"
          onClick={() => {
            const event = new CustomEvent("opsbrain:open-mobile-nav");
            window.dispatchEvent(event);
          }}
        >
          <Menu className="h-5 w-5" />
        </Button>

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
            <summary className="flex list-none cursor-pointer items-center gap-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="sr-only">User menu</span>
              <div className="hidden text-right sm:block">
                <p className="max-w-[160px] truncate text-sm font-medium text-foreground">
                  {displayName}
                </p>
                <p className="max-w-[160px] truncate text-xs text-muted-foreground">
                  {displayEmail}
                </p>
              </div>
              <Avatar>
                {showAvatarImage ? (
                  <AvatarImage
                    src={avatarImage}
                    alt={displayName}
                    onError={() => setAvatarImageFailed(true)}
                  />
                ) : null}
                {!showAvatarImage ? <AvatarFallback>{initials}</AvatarFallback> : null}
              </Avatar>
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-white/50 bg-white/95 p-1 text-sm shadow-glass dark:border-slate-700 dark:bg-slate-900/95">
              <div className="rounded-lg px-3 py-2">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
              </div>

              <button
                type="button"
                disabled
                className="flex w-full cursor-default items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground"
              >
                <UserCircle2 className="h-4 w-4" />
                Profile (coming soon)
              </button>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
              >
                <LogOut className="h-4 w-4" />
                {isSigningOut ? "Signing out..." : "Sign out"}
              </button>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
