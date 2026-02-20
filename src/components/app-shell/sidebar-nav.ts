import type { LucideIcon } from "lucide-react";
import {
  Building2,
  BookOpen,
  FileSearch,
  LayoutGrid,
  PlayCircle,
  Search,
  ShoppingCart,
  Sparkles,
  Users,
} from "lucide-react";

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

export const dashboardNavItem: SidebarNavItem = {
  label: "Dashboard",
  href: "/",
  icon: LayoutGrid,
};

export const reconciliationNavGroup: SidebarNavGroup = {
  key: "reconciliation",
  label: "Reconciliation",
  defaultExpanded: true,
  items: [
    { label: "Runs", href: "/runs", icon: PlayCircle },
    { label: "Investigation", href: "/investigation", icon: FileSearch },
    { label: "Actions", href: "/actions", icon: Sparkles },
  ],
};

export const operationsNavGroup: SidebarNavGroup = {
  key: "operations",
  label: "Operations",
  defaultExpanded: false,
  items: [
    { label: "Search", href: "/operations/search", icon: Search },
    { label: "Orders", href: "/operations/orders", icon: ShoppingCart },
    { label: "Customers", href: "/operations/customers", icon: Users },
    { label: "Suppliers", href: "/operations/suppliers", icon: Building2 },
  ],
};

export const knowledgeNavItem: SidebarNavItem = {
  label: "Knowledge",
  href: "/knowledge",
  icon: BookOpen,
};

export const navGroups: SidebarNavGroup[] = [
  reconciliationNavGroup,
  operationsNavGroup,
];
