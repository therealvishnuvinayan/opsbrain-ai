import type { LucideIcon } from "lucide-react";
import { Sparkles } from "lucide-react";

export interface SidebarNavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface SidebarNavGroup {
  key: "reconciliation" | "operations";
  label: string;
  items: SidebarNavItem[];
  defaultExpanded: boolean;
}

export const workspaceNavItem: SidebarNavItem = {
  label: "Workspace",
  href: "/",
  icon: Sparkles,
};

export const standaloneNavItems: SidebarNavItem[] = [];

export const navGroups: SidebarNavGroup[] = [];
