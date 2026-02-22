"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Rocket, X } from "lucide-react";

import type {
  ActionDefinition,
  ActionEnvironment,
  ActionRunRequest,
} from "@/features/actions/types";
import { defaultInputs, environmentLabel } from "@/features/actions/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

interface RunActionModalProps {
  open: boolean;
  action: ActionDefinition | null;
  operator: string;
  onClose: () => void;
  onRun: (request: ActionRunRequest) => void;
}

export function RunActionModal({
  open,
  action,
  operator,
  onClose,
  onRun,
}: RunActionModalProps) {
  const [environment, setEnvironment] = useState<ActionEnvironment>("staging");
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [scopeHint, setScopeHint] = useState("");
  const [confirmOne, setConfirmOne] = useState(false);
  const [confirmTwo, setConfirmTwo] = useState(false);
  const [confirmThree, setConfirmThree] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  const allowedEnvs = action?.safety.allowedEnvs ?? ["dev", "staging", "prod"];

  useEffect(() => {
    if (!open || !action) {
      return;
    }

    const defaults = defaultInputs(action);
    setInputs(defaults);
    setScopeHint("");
    setConfirmOne(false);
    setConfirmTwo(false);
    setConfirmThree(false);
    setEnvironment(action.safety.allowedEnvs[0] ?? "staging");
  }, [action, open]);

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

  const ready = useMemo(() => confirmOne && confirmTwo && confirmThree, [confirmOne, confirmTwo, confirmThree]);

  if (!open || !action) {
    return null;
  }

  const run = async () => {
    if (!ready) {
      return;
    }

    setIsRunning(true);

    try {
      onRun({
        actionId: action.id,
        triggerKind: "manual",
        environment,
        operator,
        inputs: {
          ...inputs,
          scope: scopeHint,
        },
      });
      onClose();
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-[2px] sm:p-6">
      <div className="flex max-h-[82vh] w-[min(92vw,620px)] flex-col overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-base font-semibold">Run Action Now</h3>
            <p className="text-xs text-muted-foreground">{action.name}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close run action modal">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 space-y-4 overflow-y-auto overflow-x-auto px-4 py-4 md:px-5">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Environment
              </label>
              <Select
                value={environment}
                onChange={(event) => setEnvironment(event.target.value as ActionEnvironment)}
              >
                {allowedEnvs.map((env) => (
                  <option key={env} value={env}>
                    {environmentLabel(env)}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Scope (mock)
              </label>
              <Input
                value={scopeHint}
                onChange={(event) => setScopeHint(event.target.value)}
                placeholder="supplierId=SUP-123 or runId=RB-9821"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Inputs
            </p>
            {action.inputsSchema.length === 0 ? (
              <p className="text-sm text-muted-foreground">No explicit inputs configured.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2">
                {action.inputsSchema.map((inputDef) => (
                  <div key={inputDef.key} className="space-y-1">
                    <label className="text-xs text-muted-foreground">{inputDef.label}</label>
                    <Input
                      value={inputs[inputDef.key] ?? ""}
                      onChange={(event) =>
                        setInputs((current) => ({
                          ...current,
                          [inputDef.key]: event.target.value,
                        }))
                      }
                      placeholder={inputDef.key}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Safety Checklist
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmOne}
                onChange={(event) => setConfirmOne(event.target.checked)}
                className="h-4 w-4 rounded border-white/30 bg-transparent"
              />
              I verified scope and environment are correct.
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmTwo}
                onChange={(event) => setConfirmTwo(event.target.checked)}
                className="h-4 w-4 rounded border-white/30 bg-transparent"
              />
              I reviewed approval requirements and guardrails.
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={confirmThree}
                onChange={(event) => setConfirmThree(event.target.checked)}
                className="h-4 w-4 rounded border-white/30 bg-transparent"
              />
              I confirm this is a simulation-safe manual run.
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-white/10 bg-slate-950 px-4 py-4 md:px-5">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!ready || isRunning} onClick={() => void run()}>
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />}
            Start Run
          </Button>
        </div>
      </div>
    </div>
  );
}
