import type { LucideIcon } from "lucide-react";

export interface AssistantAgent {
  id: string;
  href: string;
  title: string;
  subtitle: string;
  description: string;
  capabilities: string[];
  dataSources: string[];
  exampleQueries: string[];
  icon: LucideIcon;
}

export interface AssistantRoadmapItem {
  id: string;
  phase: string;
  title: string;
  detail: string;
}
