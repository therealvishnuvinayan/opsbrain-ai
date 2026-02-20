"use client";

import { useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import {
  CircleDashed,
  Copy,
  MoreHorizontal,
  PlayCircle,
  Plus,
  Search,
  ShieldAlert,
  Trash2,
} from "lucide-react";

import { ActionDetailsDrawer } from "@/features/actions/components/action-details-drawer";
import { CreateEditActionModal } from "@/features/actions/components/create-edit-action-modal";
import { RunActionModal } from "@/features/actions/components/run-action-modal";
import { useActionsStore } from "@/features/actions/store";
import type { ActionDefinition, ActionDomain, ActionRisk, ActionStatus, ActionType } from "@/features/actions/types";
import {
  actionDomainLabel,
  actionRiskBadgeVariant,
  actionRiskLabel,
  actionStatusBadgeVariant,
  actionStatusLabel,
  actionTypeLabel,
  formatDateTime,
  lastRunForAction,
  successRateForAction,
} from "@/features/actions/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function ActionsCatalog() {
  const { data: session } = useSession();
  const {
    actions,
    runs,
    isHydrated,
    createAction,
    updateAction,
    duplicateAction,
    deleteAction,
    toggleActionStatus,
    runActionNow,
  } = useActionsStore();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActionType | "all">("all");
  const [domainFilter, setDomainFilter] = useState<ActionDomain | "all">("all");
  const [riskFilter, setRiskFilter] = useState<ActionRisk | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ActionStatus | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);
  const [runActionId, setRunActionId] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const owners = useMemo(
    () => Array.from(new Set(actions.map((action) => action.owner))).sort(),
    [actions]
  );

  const filteredActions = useMemo(() => {
    return actions.filter((action) => {
      if (typeFilter !== "all" && action.type !== typeFilter) {
        return false;
      }

      if (domainFilter !== "all" && action.domain !== domainFilter) {
        return false;
      }

      if (riskFilter !== "all" && action.risk !== riskFilter) {
        return false;
      }

      if (statusFilter !== "all" && action.status !== statusFilter) {
        return false;
      }

      if (ownerFilter !== "all" && action.owner !== ownerFilter) {
        return false;
      }

      if (search.trim()) {
        const haystack = `${action.name} ${action.description} ${action.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(search.trim().toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [actions, domainFilter, ownerFilter, riskFilter, search, statusFilter, typeFilter]);

  const editingAction = useMemo(
    () => (editingActionId ? actions.find((action) => action.id === editingActionId) ?? null : null),
    [actions, editingActionId]
  );

  const selectedAction = useMemo(
    () => (selectedActionId ? actions.find((action) => action.id === selectedActionId) ?? null : null),
    [actions, selectedActionId]
  );

  const runAction = useMemo(
    () => (runActionId ? actions.find((action) => action.id === runActionId) ?? null : null),
    [actions, runActionId]
  );

  const showToast = (message: string) => {
    setToast(message);
    window.setTimeout(() => {
      setToast((current) => (current === message ? null : current));
    }, 2200);
  };

  return (
    <div className="space-y-5">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Actions</h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Runbooks and automated remediations for incidents, suppliers, and reconciliations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => showToast("Template import is available in demo mode.")}>Import Template</Button>
          <Button
            onClick={() => {
              setEditingActionId(null);
              setIsEditorOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Create Action
          </Button>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[300px_1fr]">
        <Card className="h-fit border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search actions"
                className="pl-9"
              />
            </div>

            <Select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as ActionType | "all")}>
              <option value="all">All types</option>
              <option value="runbook">Runbook</option>
              <option value="automation">Automation</option>
              <option value="agent">Agent</option>
            </Select>

            <Select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value as ActionDomain | "all")}>
              <option value="all">All domains</option>
              <option value="reconciliation">Reconciliation</option>
              <option value="supplier">Supplier</option>
              <option value="incident">Incident</option>
              <option value="governance">Governance</option>
            </Select>

            <Select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as ActionRisk | "all")}>
              <option value="all">All risk</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </Select>

            <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as ActionStatus | "all")}>
              <option value="all">All status</option>
              <option value="enabled">Enabled</option>
              <option value="disabled">Disabled</option>
              <option value="draft">Draft</option>
            </Select>

            <Select value={ownerFilter} onChange={(event) => setOwnerFilter(event.target.value)}>
              <option value="all">All owners</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </Select>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {!isHydrated ? (
            <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
              <CardContent className="py-16 text-center text-sm text-muted-foreground">
                Loading action catalog...
              </CardContent>
            </Card>
          ) : filteredActions.length === 0 ? (
            <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
              <CardContent className="py-16 text-center">
                <CircleDashed className="mx-auto h-6 w-6 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No actions match current filters</p>
                <p className="text-sm text-muted-foreground">Create an action or adjust filters.</p>
              </CardContent>
            </Card>
          ) : (
            filteredActions.map((action) => {
              const lastRun = lastRunForAction(runs, action.id);
              const successRate = successRateForAction(runs, action.id);

              return (
                <Card key={action.id} className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
                  <CardContent className="p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={() => setSelectedActionId(action.id)}
                          className="text-left text-base font-semibold hover:text-primary"
                        >
                          {action.name}
                        </button>
                        <p className="max-w-3xl text-sm text-muted-foreground">{action.description}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="neutral">{actionTypeLabel(action.type)}</Badge>
                          <Badge variant="neutral">{actionDomainLabel(action.domain)}</Badge>
                          <Badge variant={actionRiskBadgeVariant(action.risk)}>{actionRiskLabel(action.risk)}</Badge>
                          <Badge variant={actionStatusBadgeVariant(action.status)}>{actionStatusLabel(action.status)}</Badge>
                        </div>
                      </div>

                      <details className="relative">
                        <summary className="flex h-8 w-8 cursor-pointer list-none items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground">
                          <span className="sr-only">Open action menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </summary>
                        <div className="absolute right-0 z-20 mt-2 w-48 rounded-xl border border-white/15 bg-slate-950/95 p-1 shadow-xl">
                          <button
                            type="button"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.08]"
                            onClick={() => setSelectedActionId(action.id)}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.08]"
                            onClick={() => setRunActionId(action.id)}
                          >
                            Run now
                          </button>
                          <button
                            type="button"
                            className="w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.08]"
                            onClick={() => {
                              setEditingActionId(action.id);
                              setIsEditorOpen(true);
                            }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.08]"
                            onClick={() => duplicateAction(action.id)}
                          >
                            <Copy className="h-3.5 w-3.5" />
                            Duplicate
                          </button>
                          <button
                            type="button"
                            className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/[0.08]"
                            onClick={() => toggleActionStatus(action.id)}
                          >
                            <ShieldAlert className="h-3.5 w-3.5" />
                            {action.status === "enabled" ? "Disable" : "Enable"}
                          </button>
                          <button
                            type="button"
                            className="inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-danger hover:bg-danger/15"
                            onClick={() => {
                              if (window.confirm(`Delete action \"${action.name}\"?`)) {
                                deleteAction(action.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        </div>
                      </details>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
                      <span>Owner: {action.owner}</span>
                      <span>
                        Last run: {lastRun ? formatDateTime(lastRun.startedAt) : "Never"}
                      </span>
                      <span>Success rate: {successRate}%</span>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <Button size="sm" variant="outline" onClick={() => setSelectedActionId(action.id)}>
                        View details
                      </Button>
                      <Button size="sm" onClick={() => setRunActionId(action.id)}>
                        <PlayCircle className="h-3.5 w-3.5" />
                        Run now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <CreateEditActionModal
        open={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        initialAction={editingAction}
        onCreate={(payload) => {
          createAction(payload);
          showToast("Action created");
        }}
        onUpdate={(actionId, payload) => {
          updateAction(actionId, payload);
          showToast("Action updated");
        }}
      />

      <ActionDetailsDrawer
        open={Boolean(selectedAction)}
        action={selectedAction}
        runs={runs}
        onClose={() => setSelectedActionId(null)}
        onRunNow={() => {
          if (!selectedAction) {
            return;
          }

          setRunActionId(selectedAction.id);
        }}
      />

      <RunActionModal
        open={Boolean(runAction)}
        action={runAction}
        operator={session?.user?.email ?? "opslead@opsbrain.ai"}
        onClose={() => setRunActionId(null)}
        onRun={(request) => {
          const id = runActionNow(request);
          if (id) {
            showToast(`Run started: ${id}`);
          }
        }}
      />

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-white/15 bg-slate-950/85 px-4 py-3 text-sm text-white shadow-xl backdrop-blur-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
