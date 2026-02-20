"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, BriefcaseBusiness, DatabaseZap, FolderKanban, ShieldCheck } from "lucide-react";

import { cn } from "@/lib/utils";

const items = [
  { href: "/knowledge", label: "Overview", icon: BookOpen },
  { href: "/knowledge/collections", label: "Collections", icon: FolderKanban },
  { href: "/knowledge/connectors", label: "Connectors", icon: DatabaseZap },
  { href: "/knowledge/jobs", label: "Ingestion Jobs", icon: BriefcaseBusiness },
  { href: "/knowledge/governance", label: "Governance", icon: ShieldCheck },
];

function isActive(pathname: string, href: string) {
  if (href === "/knowledge") {
    return pathname === href;
  }

  return pathname.startsWith(href);
}

export function KnowledgeSubnav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Knowledge sections">
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
