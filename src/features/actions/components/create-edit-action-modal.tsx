"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Trash2, X } from "lucide-react";

import type {
  ActionDefinition,
  ActionEnvironment,
  ActionInputDefinition,
  ActionInputType,
  ActionStep,
} from "@/features/actions/types";
import { generateId } from "@/features/actions/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface CreateEditActionModalProps {
  open: boolean;
  onClose: () => void;
  initialAction?: ActionDefinition | null;
  onCreate: (input: Omit<ActionDefinition, "id" | "createdAt" | "updatedAt">) => void;
  onUpdate: (
    actionId: string,
    input: Omit<ActionDefinition, "id" | "createdAt" | "updatedAt">
  ) => void;
}

interface ActionDraft {
  name: string;
  description: string;
  type: ActionDefinition["type"];
  domain: ActionDefinition["domain"];
  risk: ActionDefinition["risk"];
  status: ActionDefinition["status"];
  owner: string;
  tagsText: string;
  steps: ActionStep[];
  manualTrigger: boolean;
  scheduleTrigger: boolean;
  eventTrigger: boolean;
  scheduleValue: string;
  eventTypeValue: string;
  inputs: ActionInputDefinition[];
  requiresApproval: boolean;
  approverRole: string;
  allowedEnvs: ActionEnvironment[];
  maxScope: string;
}

function defaultStep(index: number): ActionStep {
  return {
    id: generateId(`step-${index}`),
    title: `Step ${index + 1}`,
    description: "",
    kind: "script",
    config: {},
  };
}

function defaultInput(index: number): ActionInputDefinition {
  return {
    key: `param${index + 1}`,
    label: `Parameter ${index + 1}`,
    type: "text",
    required: false,
    defaultValue: "",
  };
}

function toDraft(action?: ActionDefinition | null): ActionDraft {
  if (!action) {
    return {
      name: "",
      description: "",
      type: "runbook",
      domain: "reconciliation",
      risk: "medium",
      status: "draft",
      owner: "opslead@opsbrain.ai",
      tagsText: "",
      steps: [defaultStep(0)],
      manualTrigger: true,
      scheduleTrigger: false,
      eventTrigger: false,
      scheduleValue: "",
      eventTypeValue: "",
      inputs: [defaultInput(0)],
      requiresApproval: false,
      approverRole: "Ops Lead",
      allowedEnvs: ["dev", "staging"],
      maxScope: "500",
    };
  }

  const scheduleTrigger = action.triggers.find((trigger) => trigger.kind === "schedule");
  const eventTrigger = action.triggers.find((trigger) => trigger.kind === "event");

  return {
    name: action.name,
    description: action.description,
    type: action.type,
    domain: action.domain,
    risk: action.risk,
    status: action.status,
    owner: action.owner,
    tagsText: action.tags.join(", "),
    steps: action.steps.length > 0 ? action.steps : [defaultStep(0)],
    manualTrigger: action.triggers.some((trigger) => trigger.kind === "manual"),
    scheduleTrigger: Boolean(scheduleTrigger),
    eventTrigger: Boolean(eventTrigger),
    scheduleValue: scheduleTrigger?.schedule ?? "",
    eventTypeValue: eventTrigger?.eventType ?? "",
    inputs: action.inputsSchema.length > 0 ? action.inputsSchema : [defaultInput(0)],
    requiresApproval: action.safety.requiresApproval,
    approverRole: action.safety.approverRole ?? "Ops Lead",
    allowedEnvs: action.safety.allowedEnvs,
    maxScope: String(action.safety.maxScope ?? 500),
  };
}

const environments: ActionEnvironment[] = ["dev", "staging", "prod"];
const inputTypes: ActionInputType[] = ["text", "number", "date", "boolean"];

export function CreateEditActionModal({
  open,
  onClose,
  initialAction,
  onCreate,
  onUpdate,
}: CreateEditActionModalProps) {
  const [draft, setDraft] = useState<ActionDraft>(toDraft(initialAction));
  const [isSaving, setIsSaving] = useState(false);

  const editing = Boolean(initialAction);

  useEffect(() => {
    if (!open) {
      return;
    }

    setDraft(toDraft(initialAction));
  }, [initialAction, open]);

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

  const canSave = useMemo(() => draft.name.trim().length > 2, [draft.name]);

  if (!open) {
    return null;
  }

  const save = async () => {
    if (!canSave) {
      return;
    }

    setIsSaving(true);

    try {
      const triggers: ActionDefinition["triggers"] = [];

      if (draft.manualTrigger) {
        triggers.push({ kind: "manual" });
      }

      if (draft.scheduleTrigger) {
        triggers.push({ kind: "schedule", schedule: draft.scheduleValue || "0 */6 * * *" });
      }

      if (draft.eventTrigger) {
        triggers.push({ kind: "event", eventType: draft.eventTypeValue || "RUN_ALERT" });
      }

      if (triggers.length === 0) {
        triggers.push({ kind: "manual" });
      }

      const payload: Omit<ActionDefinition, "id" | "createdAt" | "updatedAt"> = {
        name: draft.name.trim(),
        description: draft.description.trim(),
        type: draft.type,
        domain: draft.domain,
        risk: draft.risk,
        status: draft.status,
        owner: draft.owner.trim() || "opslead@opsbrain.ai",
        tags: draft.tagsText
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
        steps: draft.steps
          .map((step) => ({
            ...step,
            title: step.title.trim(),
            description: step.description.trim(),
          }))
          .filter((step) => step.title.length > 0),
        triggers,
        inputsSchema: draft.inputs
          .map((input) => ({
            ...input,
            key: input.key.trim(),
            label: input.label.trim(),
            defaultValue: input.defaultValue?.trim(),
          }))
          .filter((input) => input.key.length > 0 && input.label.length > 0),
        safety: {
          requiresApproval: draft.requiresApproval,
          approverRole: draft.approverRole.trim() || "Ops Lead",
          allowedEnvs: draft.allowedEnvs.length > 0 ? draft.allowedEnvs : ["dev", "staging"],
          maxScope: Number.isFinite(Number(draft.maxScope)) ? Number(draft.maxScope) : 500,
        },
      };

      if (editing && initialAction) {
        onUpdate(initialAction.id, payload);
      } else {
        onCreate(payload);
      }

      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 p-4 backdrop-blur-sm md:items-center">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl border border-white/15 bg-slate-950/95 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-slate-950/95 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">{editing ? "Edit Action" : "Create Action"}</h3>
            <p className="text-xs text-muted-foreground">
              Define triggers, approvals, and guarded execution behavior.
            </p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close action modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Name
              </label>
              <Input
                value={draft.name}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Action name"
              />
            </div>

            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Description
              </label>
              <Textarea
                rows={3}
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                placeholder="Describe what this action does and when to run it."
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</label>
              <Select
                value={draft.type}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    type: event.target.value as ActionDefinition["type"],
                  }))
                }
              >
                <option value="runbook">Runbook</option>
                <option value="automation">Automation</option>
                <option value="agent">Agent</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Domain</label>
              <Select
                value={draft.domain}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    domain: event.target.value as ActionDefinition["domain"],
                  }))
                }
              >
                <option value="reconciliation">Reconciliation</option>
                <option value="supplier">Supplier</option>
                <option value="incident">Incident</option>
                <option value="governance">Governance</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Risk</label>
              <Select
                value={draft.risk}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    risk: event.target.value as ActionDefinition["risk"],
                  }))
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</label>
              <Select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as ActionDefinition["status"],
                  }))
                }
              >
                <option value="enabled">Enabled</option>
                <option value="disabled">Disabled</option>
                <option value="draft">Draft</option>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Owner</label>
              <Input
                value={draft.owner}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    owner: event.target.value,
                  }))
                }
                placeholder="opslead@opsbrain.ai"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tags</label>
              <Input
                value={draft.tagsText}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    tagsText: event.target.value,
                  }))
                }
                placeholder="incident, remediation"
              />
            </div>
          </div>

          <section className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Steps</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    steps: [...current.steps, defaultStep(current.steps.length)],
                  }))
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add step
              </Button>
            </div>

            {draft.steps.map((step, index) => (
              <div key={step.id} className="space-y-2 rounded-xl border border-white/10 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Step {index + 1}</p>
                  {draft.steps.length > 1 ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          steps: current.steps.filter((item) => item.id !== step.id),
                        }))
                      }
                      aria-label={`Remove step ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <Input
                    value={step.title}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        steps: current.steps.map((item) =>
                          item.id === step.id ? { ...item, title: event.target.value } : item
                        ),
                      }))
                    }
                    placeholder="Step title"
                  />

                  <Select
                    value={step.kind}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        steps: current.steps.map((item) =>
                          item.id === step.id
                            ? { ...item, kind: event.target.value as ActionStep["kind"] }
                            : item
                        ),
                      }))
                    }
                  >
                    <option value="query">Query</option>
                    <option value="api">API</option>
                    <option value="notify">Notify</option>
                    <option value="approve">Approve</option>
                    <option value="script">Script</option>
                  </Select>

                  <Input
                    value={String(step.config.endpoint ?? step.config.script ?? "")}
                    onChange={(event) =>
                      setDraft((current) => ({
                        ...current,
                        steps: current.steps.map((item) =>
                          item.id === step.id
                            ? {
                                ...item,
                                config: { endpoint: event.target.value },
                              }
                            : item
                        ),
                      }))
                    }
                    placeholder="Config hint"
                  />
                </div>

                <Textarea
                  rows={2}
                  value={step.description}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      steps: current.steps.map((item) =>
                        item.id === step.id ? { ...item, description: event.target.value } : item
                      ),
                    }))
                  }
                  placeholder="Step description"
                />
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold">Triggers</p>
            <div className="grid gap-2 md:grid-cols-3">
              <label className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
                Manual
                <input
                  type="checkbox"
                  checked={draft.manualTrigger}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      manualTrigger: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-white/30 bg-transparent"
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
                Schedule
                <input
                  type="checkbox"
                  checked={draft.scheduleTrigger}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      scheduleTrigger: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-white/30 bg-transparent"
                />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
                Event
                <input
                  type="checkbox"
                  checked={draft.eventTrigger}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      eventTrigger: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-white/30 bg-transparent"
                />
              </label>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <Input
                value={draft.scheduleValue}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    scheduleValue: event.target.value,
                  }))
                }
                placeholder="Cron (e.g. 0 */6 * * *)"
                disabled={!draft.scheduleTrigger}
              />
              <Input
                value={draft.eventTypeValue}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    eventTypeValue: event.target.value,
                  }))
                }
                placeholder="Event type (e.g. RUN_ALERT)"
                disabled={!draft.eventTrigger}
              />
            </div>
          </section>

          <section className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Inputs</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  setDraft((current) => ({
                    ...current,
                    inputs: [...current.inputs, defaultInput(current.inputs.length)],
                  }))
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Add input
              </Button>
            </div>

            {draft.inputs.map((input, index) => (
              <div key={`${input.key}-${index}`} className="grid gap-2 rounded-xl border border-white/10 p-3 md:grid-cols-5">
                <Input
                  value={input.key}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      inputs: current.inputs.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, key: event.target.value } : item
                      ),
                    }))
                  }
                  placeholder="key"
                />
                <Input
                  value={input.label}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      inputs: current.inputs.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, label: event.target.value } : item
                      ),
                    }))
                  }
                  placeholder="Label"
                />
                <Select
                  value={input.type}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      inputs: current.inputs.map((item, itemIndex) =>
                        itemIndex === index
                          ? { ...item, type: event.target.value as ActionInputType }
                          : item
                      ),
                    }))
                  }
                >
                  {inputTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </Select>
                <Input
                  value={input.defaultValue ?? ""}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      inputs: current.inputs.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, defaultValue: event.target.value } : item
                      ),
                    }))
                  }
                  placeholder="Default"
                />
                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={input.required}
                      onChange={(event) =>
                        setDraft((current) => ({
                          ...current,
                          inputs: current.inputs.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, required: event.target.checked } : item
                          ),
                        }))
                      }
                      className="h-4 w-4 rounded border-white/30 bg-transparent"
                    />
                    Required
                  </label>
                  {draft.inputs.length > 1 ? (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setDraft((current) => ({
                          ...current,
                          inputs: current.inputs.filter((_, itemIndex) => itemIndex !== index),
                        }))
                      }
                      aria-label={`Remove input ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
            <p className="text-sm font-semibold">Safety</p>
            <div className="grid gap-2 md:grid-cols-2">
              <label className="flex items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm">
                Requires approval
                <input
                  type="checkbox"
                  checked={draft.requiresApproval}
                  onChange={(event) =>
                    setDraft((current) => ({
                      ...current,
                      requiresApproval: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-white/30 bg-transparent"
                />
              </label>
              <Input
                value={draft.approverRole}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    approverRole: event.target.value,
                  }))
                }
                placeholder="Approver role"
              />
              <Input
                value={draft.maxScope}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    maxScope: event.target.value,
                  }))
                }
                placeholder="Max scope"
              />
              <div className="rounded-xl border border-white/10 px-3 py-2">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Allowed environments
                </p>
                <div className="flex flex-wrap gap-2">
                  {environments.map((env) => (
                    <label key={env} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={draft.allowedEnvs.includes(env)}
                        onChange={(event) =>
                          setDraft((current) => ({
                            ...current,
                            allowedEnvs: event.target.checked
                              ? [...current.allowedEnvs, env]
                              : current.allowedEnvs.filter((item) => item !== env),
                          }))
                        }
                        className="h-4 w-4 rounded border-white/30 bg-transparent"
                      />
                      {env.toUpperCase()}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="sticky bottom-0 z-10 flex justify-end gap-2 border-t border-white/10 bg-slate-950/95 px-5 py-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!canSave || isSaving} onClick={() => void save()}>
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {editing ? "Save Action" : "Create Action"}
          </Button>
        </div>
      </div>
    </div>
  );
}
