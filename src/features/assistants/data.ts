import {
  FileSearch,
  PackageCheck,
  SearchCheck,
  ShieldAlert,
} from "lucide-react";

import type { AssistantAgent, AssistantRoadmapItem } from "@/features/assistants/types";

export const assistants: AssistantAgent[] = [
  {
    id: "ops-intelligence",
    title: "Ops Intelligence Agent",
    subtitle: "Cross-entity investigation + narrative",
    description:
      "Builds investigation narratives across runs, orders, suppliers, and customers so operations leads can align quickly on root cause and response posture.",
    capabilities: [
      "Root-cause investigation across Orders/Suppliers/Runs",
      "Evidence + confidence scoring",
      "Recommended actions",
    ],
    dataSources: [
      "Reconciliation runs + issue timelines",
      "Operational orders, customer profiles, and supplier health",
      "Action history and escalation notes",
    ],
    exampleQueries: [
      "Why did delayed orders spike after the last supplier sync window?",
      "Summarize the highest-risk reconciliation runs for finance handoff.",
      "Which supplier events correlate with failed run stages this week?",
    ],
    icon: FileSearch,
  },
  {
    id: "governance-risk",
    title: "Governance & Risk Agent",
    subtitle: "Rule simulation + risk heatmap",
    description:
      "Evaluates control changes before rollout and visualizes projected exposure so governance teams can approve policy updates with confidence.",
    capabilities: [
      "Simulate rule changes",
      "Predict mismatch/exposure impact",
      "Risk heatmap for runs/suppliers",
    ],
    dataSources: [
      "Policy simulator configurations",
      "Run-level mismatch and exposure metrics",
      "Supplier risk history and operational controls",
    ],
    exampleQueries: [
      "How does strict matching impact exposure for high-collision suppliers?",
      "Show governance hotspots across suppliers with repeated ambiguity.",
      "Which controls should be tightened first without increasing unmatched drift?",
    ],
    icon: ShieldAlert,
  },
  {
    id: "autonomous-anomaly",
    title: "Autonomous Anomaly Agent",
    subtitle: "Pattern intelligence + early detection",
    description:
      "Continuously compares active runs against historical incident signatures to detect suspicious drift before failures cascade.",
    capabilities: [
      "Compare runs + similarity scoring",
      "Detect anomalies automatically",
      "Explain why it’s similar to past incidents",
    ],
    dataSources: [
      "Historical run events and issue clusters",
      "Supplier and order trend baselines",
      "Anomaly labels from prior investigations",
    ],
    exampleQueries: [
      "Which active runs look most similar to last month’s critical mismatch spike?",
      "Explain the strongest anomaly signatures in the last 24 hours.",
      "What early warning indicators should ops monitor now?",
    ],
    icon: SearchCheck,
  },
  {
    id: "tech-support-aws-logs",
    title: "Tech Support / AWS Logs Agent",
    subtitle: "Operational log triage + incident clustering",
    description:
      "Clusters infrastructure and application signals into incident signatures, then proposes likely causes and fast-path remediation guidance.",
    capabilities: [
      "Ingest AWS logs (CloudWatch style) + app logs",
      "Cluster incidents by signature",
      "Propose probable cause + next steps",
    ],
    dataSources: [
      "CloudWatch-like infra logs and app traces",
      "Deployment events and integration retries",
      "Incident runbooks and response outcomes",
    ],
    exampleQueries: [
      "Group repeated timeout incidents by signature from the last 6 hours.",
      "What likely caused the supplier fetch error cluster after deploy?",
      "Which logs should engineering inspect first for fastest recovery?",
    ],
    icon: PackageCheck,
  },
];

export const roadmap: AssistantRoadmapItem[] = [
  {
    id: "phase-1",
    phase: "Phase 1",
    title: "Ops Intelligence",
    detail: "Target: launch first for guided investigations and narrative synthesis.",
  },
  {
    id: "phase-2",
    phase: "Phase 2",
    title: "Governance & Risk",
    detail: "Activate policy simulation insights and proactive exposure forecasting.",
  },
  {
    id: "phase-3",
    phase: "Phase 3",
    title: "Anomaly + Tech Support",
    detail: "Roll out autonomous anomaly detection and AWS log triage clustering.",
  },
];
