"use client";

import type { PolicyConfig } from "@/features/actions/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface GuardrailsPanelProps {
  policy: PolicyConfig;
  onToggle: (key: keyof PolicyConfig["guardrails"]) => void;
}

const guardrailRows: Array<{
  key: keyof PolicyConfig["guardrails"];
  label: string;
  description: string;
}> = [
  {
    key: "dryRunRequiredHighRisk",
    label: "Dry-run required for High risk",
    description: "Force dry-run simulation before executing high-risk actions.",
  },
  {
    key: "prodRunsRequireFinanceApproval",
    label: "Prod runs require Finance approval",
    description: "Any production action touching payouts requires Finance sign-off.",
  },
  {
    key: "max1000RecordsPerRun",
    label: "Max 1,000 records per run",
    description: "Guard against broad-scope executions that could impact large datasets.",
  },
  {
    key: "blockIfAnomalyConfidenceLow",
    label: "Block if anomaly confidence < threshold",
    description: "Prevents noisy actions from running on low-confidence anomaly signals.",
  },
];

export function GuardrailsPanel({ policy, onToggle }: GuardrailsPanelProps) {
  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-base">Guardrails</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {guardrailRows.map((row) => (
          <label
            key={row.key}
            className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3"
          >
            <span>
              <p className="text-sm font-medium">{row.label}</p>
              <p className="text-xs text-muted-foreground">{row.description}</p>
            </span>
            <input
              type="checkbox"
              checked={policy.guardrails[row.key]}
              onChange={() => onToggle(row.key)}
              className="mt-1 h-4 w-4 rounded border-white/30 bg-transparent"
            />
          </label>
        ))}
      </CardContent>
    </Card>
  );
}
