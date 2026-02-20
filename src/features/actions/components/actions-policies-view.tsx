"use client";

import { GuardrailsPanel } from "@/features/actions/components/guardrails-panel";
import { PoliciesMatrix } from "@/features/actions/components/policies-matrix";
import { useActionsStore } from "@/features/actions/store";

export function ActionsPoliciesView() {
  const { policy, updatePolicyRule, toggleGuardrail } = useActionsStore();

  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Approvals & Safety</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Configure approval flows and protective guardrails before actions can execute at scale.
        </p>
      </section>

      <PoliciesMatrix policy={policy} onUpdateRule={updatePolicyRule} />
      <GuardrailsPanel policy={policy} onToggle={toggleGuardrail} />
    </div>
  );
}
