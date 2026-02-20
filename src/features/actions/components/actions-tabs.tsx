"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Activity, ShieldCheck, Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/actions", label: "Catalog", icon: Sparkles },
  { href: "/actions/runs", label: "Runs", icon: Activity },
  { href: "/actions/policies", label: "Policies", icon: ShieldCheck },
];

function isActive(pathname: string, href: string) {
  if (href === "/actions") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function ActionsTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Action sections">
      {items.map((item) => {
        const Icon = item.icon;
        const active = isActive(pathname, item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition-colors",
              active
                ? "border-primary/40 bg-primary/15 text-primary"
                : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
