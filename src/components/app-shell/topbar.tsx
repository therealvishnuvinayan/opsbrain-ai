"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { LogOut, Menu, Moon, Sun } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

const routeTitles: Record<string, string> = {
  "/": "Workspace",
  "/operations/search": "Search",
  "/operations/orders": "Orders",
  "/operations/customers": "Customers",
  "/operations/suppliers": "Suppliers",
  "/operations": "Operations",
  "/knowledge": "Knowledge",
  "/actions": "Actions",
  "/assistants": "Assistants",
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

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);

  const currentTitle = resolveRouteTitle(pathname);

  const breadcrumb = useMemo(() => {
    if (pathname === "/") {
      return "OpsBrain / Workspace";
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

    const initialTheme = savedTheme ?? "light";

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
    <header className="sticky top-0 z-30 px-4 pt-4 md:px-6 lg:px-8">
      <div className="flex h-16 items-center gap-3 rounded-[26px] border border-slate-200/80 bg-white/76 px-4 shadow-[0_22px_64px_-48px_rgba(16,24,40,0.2)] backdrop-blur-xl dark:border-white/[0.06] dark:bg-slate-950/80 md:px-5">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Open navigation"
          className="rounded-full md:hidden"
          onClick={() => {
            const event = new CustomEvent("opsbrain:open-mobile-nav");
            window.dispatchEvent(event);
          }}
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link
          href="/"
          className="min-w-0 rounded-2xl px-1 py-1 transition-colors hover:bg-white/55 dark:hover:bg-slate-900/70"
        >
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/85">
            {pathname === "/" ? "OpsBrain" : breadcrumb}
          </p>
          <h1 className="truncate text-sm font-semibold text-slate-900 md:text-base dark:text-white">
            {currentTitle}
          </h1>
        </Link>

        <div className="ml-auto flex items-center gap-1 md:gap-2">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            className="rounded-full"
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
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-black/[0.05] bg-white/95 p-1 text-sm shadow-[0_24px_80px_-48px_rgba(16,24,40,0.28)] dark:border-white/[0.06] dark:bg-slate-900/95">
              <div className="rounded-lg px-3 py-2">
                <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
                <p className="truncate text-xs text-muted-foreground">{displayEmail}</p>
              </div>

              <button
                type="button"
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-muted-foreground transition-colors hover:bg-secondary/70 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-70"
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
