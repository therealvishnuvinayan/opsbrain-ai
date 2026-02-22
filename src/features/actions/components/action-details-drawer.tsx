"use client";

import { useEffect, useMemo, useState } from "react";
import { PlayCircle, X } from "lucide-react";

import type { ActionDefinition, ActionRun } from "@/features/actions/types";
import {
  actionDomainLabel,
  actionRiskBadgeVariant,
  actionRiskLabel,
  actionStatusBadgeVariant,
  actionStatusLabel,
  actionTypeLabel,
  formatDateTime,
  runStatusBadgeVariant,
  runStatusLabel,
} from "@/features/actions/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type DrawerTab = "overview" | "steps" | "triggers" | "inputs" | "safety" | "run";

interface ActionDetailsDrawerProps {
  open: boolean;
  action: ActionDefinition | null;
  runs: ActionRun[];
  onClose: () => void;
  onRunNow: () => void;
}

const tabs: DrawerTab[] = ["overview", "steps", "triggers", "inputs", "safety", "run"];

function tabLabel(tab: DrawerTab) {
  return tab[0].toUpperCase() + tab.slice(1);
}

export function ActionDetailsDrawer({
  open,
  action,
  runs,
  onClose,
  onRunNow,
}: ActionDetailsDrawerProps) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("overview");

  useEffect(() => {
    if (!open) {
      return;
    }

    setActiveTab("overview");
  }, [open, action?.id]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open, onClose]);

  const actionRuns = useMemo(() => {
    if (!action) {
      return [];
    }

    return runs
      .filter((run) => run.actionId === action.id)
      .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
      .slice(0, 8);
  }, [action, runs]);

  if (!open || !action) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/75 backdrop-blur-[2px]">
      <aside className="flex h-full w-full max-w-2xl flex-col border-l border-slate-700/80 bg-slate-950 shadow-2xl">
        <div className="flex items-start justify-between border-b border-white/10 px-5 py-4">
          <div className="space-y-2">
            <h3 className="text-base font-semibold">{action.name}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge variant="neutral">{actionTypeLabel(action.type)}</Badge>
              <Badge variant="neutral">{actionDomainLabel(action.domain)}</Badge>
              <Badge variant={actionRiskBadgeVariant(action.risk)}>{actionRiskLabel(action.risk)}</Badge>
              <Badge variant={actionStatusBadgeVariant(action.status)}>{actionStatusLabel(action.status)}</Badge>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close action drawer">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-white/10 px-5 py-3">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={cn(
                "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-white/10 bg-white/[0.03] text-muted-foreground"
              )}
            >
              {tabLabel(tab)}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {activeTab === "overview" ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">{action.description}</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-muted-foreground">Owner</p>
                  <p className="text-sm font-medium">{action.owner}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-muted-foreground">Last modified</p>
                  <p className="text-sm font-medium">{formatDateTime(action.updatedAt)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-muted-foreground">Triggers</p>
                  <p className="text-sm font-medium">{action.triggers.length}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-muted-foreground">Inputs</p>
                  <p className="text-sm font-medium">{action.inputsSchema.length}</p>
                </div>
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {action.tags.length === 0 ? (
                    <Badge variant="neutral">No tags</Badge>
                  ) : (
                    action.tags.map((tag) => (
                      <Badge key={tag} variant="neutral">
                        {tag}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === "steps" ? (
            <div className="space-y-2">
              {action.steps.map((step, index) => (
                <article key={step.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="text-xs text-muted-foreground">Step {index + 1}</p>
                  <p className="font-medium">{step.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
                  <Badge variant="neutral" className="mt-2">
                    {step.kind}
                  </Badge>
                </article>
              ))}
            </div>
          ) : null}

          {activeTab === "triggers" ? (
            <div className="space-y-2">
              {action.triggers.map((trigger, index) => (
                <div key={`${trigger.kind}-${index}`} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <p className="font-medium">{trigger.kind.toUpperCase()}</p>
                  {trigger.schedule ? (
                    <p className="text-sm text-muted-foreground">Schedule: {trigger.schedule}</p>
                  ) : null}
                  {trigger.eventType ? (
                    <p className="text-sm text-muted-foreground">Event: {trigger.eventType}</p>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {activeTab === "inputs" ? (
            <div className="space-y-2">
              {action.inputsSchema.length === 0 ? (
                <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">
                  No inputs configured.
                </p>
              ) : (
                action.inputsSchema.map((input) => (
                  <div key={input.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="font-medium">{input.label}</p>
                    <p className="text-xs text-muted-foreground">
                      key: {input.key} • type: {input.type} • {input.required ? "required" : "optional"}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      default: {input.defaultValue || "-"}
                    </p>
                  </div>
                ))
              )}
            </div>
          ) : null}

          {activeTab === "safety" ? (
            <div className="space-y-2">
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="font-medium">Approval</p>
                <p className="text-sm text-muted-foreground">
                  {action.safety.requiresApproval
                    ? `Required (${action.safety.approverRole || "Approver"})`
                    : "Not required"}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="font-medium">Allowed environments</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {action.safety.allowedEnvs.map((env) => (
                    <Badge key={env} variant="neutral">
                      {env.toUpperCase()}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <p className="font-medium">Max scope</p>
                <p className="text-sm text-muted-foreground">{action.safety.maxScope ?? "-"} records</p>
              </div>
            </div>
          ) : null}

          {activeTab === "run" ? (
            <div className="space-y-3">
              <Button onClick={onRunNow}>
                <PlayCircle className="h-4 w-4" />
                Run now
              </Button>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Recent runs
                </p>
                {actionRuns.length === 0 ? (
                  <p className="rounded-xl border border-white/10 bg-white/[0.03] p-3 text-sm text-muted-foreground">
                    No execution history for this action.
                  </p>
                ) : (
                  actionRuns.map((run) => (
                    <div key={run.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{run.id}</p>
                        <Badge variant={runStatusBadgeVariant(run.status)}>
                          {runStatusLabel(run.status)}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDateTime(run.startedAt)} • {run.environment.toUpperCase()} • {run.operator}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
