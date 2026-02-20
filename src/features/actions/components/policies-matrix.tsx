"use client";

import type { ActionEnvironment, ActionRisk, PolicyConfig } from "@/features/actions/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface PoliciesMatrixProps {
  policy: PolicyConfig;
  onUpdateRule: (
    risk: ActionRisk,
    patch: Partial<PolicyConfig["byRisk"][ActionRisk]>
  ) => void;
}

const riskLevels: ActionRisk[] = ["low", "medium", "high"];
const envs: ActionEnvironment[] = ["dev", "staging", "prod"];

function riskLabel(risk: ActionRisk) {
  return risk[0].toUpperCase() + risk.slice(1);
}

export function PoliciesMatrix({ policy, onUpdateRule }: PoliciesMatrixProps) {
  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader>
        <CardTitle className="text-base">Approvals Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2 text-left">Risk</th>
                <th className="px-3 py-2 text-left">Requires approval?</th>
                <th className="px-3 py-2 text-left">Approver role</th>
                <th className="px-3 py-2 text-left">Max scope</th>
                <th className="px-3 py-2 text-left">Allowed environments</th>
              </tr>
            </thead>
            <tbody>
              {riskLevels.map((risk) => {
                const rule = policy.byRisk[risk];

                return (
                  <tr key={risk} className="border-b border-white/5">
                    <td className="px-3 py-3 font-medium">{riskLabel(risk)}</td>
                    <td className="px-3 py-3">
                      <label className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={rule.requiresApproval}
                          onChange={(event) =>
                            onUpdateRule(risk, { requiresApproval: event.target.checked })
                          }
                          className="h-4 w-4 rounded border-white/30 bg-transparent"
                        />
                        {rule.requiresApproval ? "Yes" : "No"}
                      </label>
                    </td>
                    <td className="px-3 py-3">
                      <Select
                        value={rule.approverRole}
                        onChange={(event) =>
                          onUpdateRule(risk, { approverRole: event.target.value })
                        }
                      >
                        <option value="Ops Supervisor">Ops Supervisor</option>
                        <option value="Ops Lead">Ops Lead</option>
                        <option value="Finance Manager">Finance Manager</option>
                        <option value="Compliance Lead">Compliance Lead</option>
                      </Select>
                    </td>
                    <td className="px-3 py-3">
                      <Input
                        value={String(rule.maxScope)}
                        onChange={(event) =>
                          onUpdateRule(risk, {
                            maxScope: Number.isFinite(Number(event.target.value))
                              ? Number(event.target.value)
                              : rule.maxScope,
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex flex-wrap gap-2">
                        {envs.map((env) => (
                          <label key={`${risk}-${env}`} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <input
                              type="checkbox"
                              checked={rule.allowedEnvs.includes(env)}
                              onChange={(event) =>
                                onUpdateRule(risk, {
                                  allowedEnvs: event.target.checked
                                    ? [...rule.allowedEnvs, env]
                                    : rule.allowedEnvs.filter((item) => item !== env),
                                })
                              }
                              className="h-4 w-4 rounded border-white/30 bg-transparent"
                            />
                            {env.toUpperCase()}
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
