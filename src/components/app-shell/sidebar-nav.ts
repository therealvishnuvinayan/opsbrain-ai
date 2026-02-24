import type { LucideIcon } from "lucide-react";
import {
  Building2,
  BookOpen,
  Bot,
  FileSearch,
  LifeBuoy,
  LayoutGrid,
  Rocket,
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
  key: "reconciliation" | "operations" | "techTools";
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

export const techToolsNavGroup: SidebarNavGroup = {
  key: "techTools",
  label: "Tech Tools",
  defaultExpanded: false,
  items: [
    {
      label: "Feature Env Builder",
      href: "/tech/feature-env",
      icon: Rocket,
    },
  ],
};

export const knowledgeNavItem: SidebarNavItem = {
  label: "Knowledge",
  href: "/knowledge",
  icon: BookOpen,
};

export const assistantsNavItem: SidebarNavItem = {
  label: "Assistants",
  href: "/assistants",
  icon: Bot,
};

export const zendeskAutopilotNavItem: SidebarNavItem = {
  label: "Zendesk Autopilot",
  href: "/zendesk",
  icon: LifeBuoy,
};

export const standaloneNavItems: SidebarNavItem[] = [
  zendeskAutopilotNavItem,
  assistantsNavItem,
  knowledgeNavItem,
];

export const navGroups: SidebarNavGroup[] = [
  reconciliationNavGroup,
  operationsNavGroup,
  techToolsNavGroup,
];
