"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  FileCog,
  Lock,
  PlayCircle,
  Rocket,
  ShieldCheck,
  Sparkles,
  Unlock,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type BuilderStep = 1 | 2 | 3;
type TimelineStatus = "queued" | "running" | "done" | "failed";
type BaseBranch = "develop" | "main";

interface TimelineItem {
  id: string;
  label: string;
  status: TimelineStatus;
}

const TECH_MODE_STORAGE_KEY = "opsbrain_tech_mode";
const DOMAIN_BASE = "bamboocardportal.com";
const DEFAULT_DEPLOY_PREFIX = "deploy-BAM";
const WORKFLOW_FILE = "feature-deploy.yml";
const PARAMS_FILE = "params.feature.json";

const TIMELINE_BLUEPRINT: Array<{ id: string; label: string; durationMs: number }> = [
  { id: "branch", label: "Branch created", durationMs: 1100 },
  { id: "params", label: "params.feature.json updated", durationMs: 1300 },
  { id: "workflow", label: "GitHub Action triggered (feature-deploy.yml)", durationMs: 1200 },
  { id: "infra", label: "Deploying infrastructure", durationMs: 1800 },
  { id: "warmup", label: "Warming up services", durationMs: 1500 },
  { id: "ready", label: "Ready", durationMs: 900 },
];

function createTimelineItems(): TimelineItem[] {
  return TIMELINE_BLUEPRINT.map((item) => ({
    id: item.id,
    label: item.label,
    status: "queued",
  }));
}

function statusVariant(status: TimelineStatus): "neutral" | "warning" | "success" | "danger" {
  if (status === "done") {
    return "success";
  }

  if (status === "running") {
    return "warning";
  }

  if (status === "failed") {
    return "danger";
  }

  return "neutral";
}

function stepBadge(step: BuilderStep, activeStep: BuilderStep) {
  if (step < activeStep) {
    return "success";
  }

  if (step === activeStep) {
    return "warning";
  }

  return "neutral";
}

function sanitizeTicketInput(value: string) {
  return value.replace(/\D/g, "");
}

function FeatureUrl({ url }: { url: string }) {
  if (url === "—") {
    return <span className="text-muted-foreground">—</span>;
  }

  return <span className="font-mono text-sm text-primary">{url}</span>;
}

export function FeatureEnvBuilderPage() {
  const [techModeEnabled, setTechModeEnabled] = useState<boolean | null>(null);

  const [step, setStep] = useState<BuilderStep>(1);
  const [feTicket, setFeTicket] = useState("");
  const [beTicket, setBeTicket] = useState("");
  const [baseBranch, setBaseBranch] = useState<BaseBranch>("develop");
  const [baseBranchLocked, setBaseBranchLocked] = useState(true);
  const [showUnlockConfirm, setShowUnlockConfirm] = useState(false);
  const [deployPrefix, setDeployPrefix] = useState(DEFAULT_DEPLOY_PREFIX);

  const [workflowRunId, setWorkflowRunId] = useState<string>("—");
  const [progress, setProgress] = useState(0);
  const [timeline, setTimeline] = useState<TimelineItem[]>(createTimelineItems);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isReady, setIsReady] = useState(false);

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const timersRef = useRef<number[]>([]);

  const validFeTicket = /^\d+$/.test(feTicket);
  const validBeTicket = beTicket.length === 0 || /^\d+$/.test(beTicket);

  const deployBranch = useMemo(() => {
    if (!validFeTicket) {
      return `${deployPrefix}-<FE_TICKET>`;
    }

    return `${deployPrefix}-${feTicket}`;
  }, [deployPrefix, feTicket, validFeTicket]);

  const featureHost = useMemo(() => {
    if (!validFeTicket) {
      return `BAM<FE_TICKET>.dev2.${DOMAIN_BASE}`;
    }

    return `BAM${feTicket}.dev2.${DOMAIN_BASE}`;
  }, [feTicket, validFeTicket]);

  const featureUrl = validFeTicket ? `https://${featureHost}` : "—";

  const backendUrl = useMemo(() => {
    if (!validBeTicket || beTicket.length === 0) {
      return "—";
    }

    return `https://BE${beTicket}.dev2.${DOMAIN_BASE}`;
  }, [beTicket, validBeTicket]);

  const canProceedStep1 = validFeTicket && validBeTicket;

  const clearSimulationTimers = () => {
    for (const timer of timersRef.current) {
      window.clearTimeout(timer);
    }
    timersRef.current = [];
  };

  const queueTimer = (fn: () => void, delay: number) => {
    const timerId = window.setTimeout(fn, delay);
    timersRef.current.push(timerId);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage((current) => (current === message ? null : current));
    }, 2200);
  };

  const copyToClipboard = async (value: string, label: string) => {
    if (!value || value === "—") {
      return;
    }

    try {
      await navigator.clipboard.writeText(value);
      showToast(`${label} copied`);
    } catch {
      showToast(`Failed to copy ${label.toLowerCase()}`);
    }
  };

  const startSimulation = () => {
    clearSimulationTimers();
    setStep(3);
    setProgress(0);
    setIsReady(false);
    setIsSimulating(true);
    setTimeline(createTimelineItems());
    setWorkflowRunId(`SIM-${Date.now().toString().slice(-8)}`);

    let elapsed = 0;

    TIMELINE_BLUEPRINT.forEach((timelineStep, index) => {
      queueTimer(() => {
        setTimeline((current) =>
          current.map((item, itemIndex) => {
            if (itemIndex === index) {
              return { ...item, status: "running" };
            }

            return item;
          })
        );
      }, elapsed);

      elapsed += timelineStep.durationMs;

      queueTimer(() => {
        setTimeline((current) =>
          current.map((item, itemIndex) => {
            if (itemIndex === index) {
              return { ...item, status: "done" };
            }

            return item;
          })
        );

        setProgress(Math.round(((index + 1) / TIMELINE_BLUEPRINT.length) * 100));
      }, elapsed);
    });

    queueTimer(() => {
      setIsSimulating(false);
      setIsReady(true);
      setProgress(100);
    }, elapsed + 200);
  };

  useEffect(() => {
    const techMode = window.localStorage.getItem(TECH_MODE_STORAGE_KEY) === "true";
    setTechModeEnabled(techMode);
  }, []);

  useEffect(() => {
    return () => {
      clearSimulationTimers();
    };
  }, []);

  if (techModeEnabled === null) {
    return (
      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Loading tech mode...
        </CardContent>
      </Card>
    );
  }

  if (!techModeEnabled) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Tech Mode Locked
            </CardTitle>
            <CardDescription>
              This page is a tech-only tool. Enable Tech Mode to continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This is UI-only gating for demo use. It does not grant backend permissions.
            </p>
            <Button
              onClick={() => {
                window.localStorage.setItem(TECH_MODE_STORAGE_KEY, "true");
                window.location.reload();
              }}
            >
              <Wrench className="h-4 w-4" />
              Enable Tech Mode
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">Feature Environment Builder</h2>
          <p className="text-sm text-muted-foreground md:text-base">
            Tech-only workflow to prepare BAM feature environments with simulated deployment status.
          </p>
        </div>

        <Badge variant="neutral" className="h-7 px-3 text-xs">
          UI Only · No backend calls
        </Badge>
      </section>

      <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
        <CardContent className="flex flex-wrap items-center gap-2 p-4 md:gap-3 md:p-5">
          <Badge variant={stepBadge(1, step)} className="h-7 px-3">Step 1 · Inputs</Badge>
          <Badge variant={stepBadge(2, step)} className="h-7 px-3">Step 2 · Review</Badge>
          <Badge variant={stepBadge(3, step)} className="h-7 px-3">Step 3 · Status</Badge>
        </CardContent>
      </Card>

      {step === 1 ? (
        <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Step 1 · Inputs</CardTitle>
              <CardDescription>Provide ticket identifiers and branch strategy.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Frontend Ticket Number
                </label>
                <Input
                  value={feTicket}
                  onChange={(event) => setFeTicket(sanitizeTicketInput(event.target.value))}
                  placeholder="1234"
                  inputMode="numeric"
                />
                {!validFeTicket && feTicket.length > 0 ? (
                  <p className="text-xs text-danger">Frontend ticket must be numeric.</p>
                ) : (
                  <p className="text-xs text-muted-foreground">Required field.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Backend Ticket Number
                </label>
                <Input
                  value={beTicket}
                  onChange={(event) => setBeTicket(sanitizeTicketInput(event.target.value))}
                  placeholder="5678"
                  inputMode="numeric"
                />
                <p className="text-xs text-muted-foreground">Optional · numeric only.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Base Branch
                </label>

                {baseBranchLocked ? (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2">
                    <Badge variant="neutral" className="h-6 px-2.5 text-[11px]">
                      <Lock className="h-3 w-3" />
                      {baseBranch}
                    </Badge>
                    <Button variant="outline" size="sm" onClick={() => setShowUnlockConfirm(true)}>
                      <Unlock className="h-3.5 w-3.5" />
                      Unlock
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Select
                      value={baseBranch}
                      onChange={(event) => setBaseBranch(event.target.value as BaseBranch)}
                    >
                      <option value="develop">develop</option>
                      <option value="main">main</option>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setBaseBranch("develop");
                        setBaseBranchLocked(true);
                      }}
                    >
                      <Lock className="h-3.5 w-3.5" />
                      Lock
                    </Button>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Deploy Branch Prefix
                </label>
                <Input
                  value={deployPrefix}
                  onChange={(event) => setDeployPrefix(event.target.value || DEFAULT_DEPLOY_PREFIX)}
                />
                <p className="text-xs text-muted-foreground">
                  This will change in the new project later.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Domain Template Preview
                </label>
                <div className="rounded-xl border border-white/10 bg-slate-950/35 px-3 py-2 font-mono text-sm text-muted-foreground">
                  BAM{validFeTicket ? feTicket : "{feTicket}"}.dev2.{DOMAIN_BASE}
                </div>
              </div>

              <div className="pt-2">
                <Button disabled={!canProceedStep1} onClick={() => setStep(2)}>
                  Next
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Computed Preview</CardTitle>
              <CardDescription>Live values generated from current inputs.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                <span className="text-muted-foreground">Base branch</span>
                <span className="font-mono">{baseBranch}</span>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                <span className="text-muted-foreground">Deploy branch</span>
                <span className="font-mono">{deployBranch}</span>
              </div>

              <div className="space-y-1 rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                <span className="text-muted-foreground">Feature URL</span>
                <FeatureUrl url={featureUrl} />
              </div>

              <div className="space-y-1 rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                <span className="text-muted-foreground">Backend URL</span>
                <FeatureUrl url={backendUrl} />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {step === 2 ? (
        <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Step 2 · Review</CardTitle>
            <CardDescription>Confirm the deployment plan before simulation starts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                <p className="text-muted-foreground">FE Ticket</p>
                <p className="font-mono">{feTicket}</p>
              </div>

              <div className="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                <p className="text-muted-foreground">BE Ticket</p>
                <p className="font-mono">{beTicket || "Not selected"}</p>
              </div>

              <div className="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                <p className="text-muted-foreground">Base branch</p>
                <p className="font-mono">
                  {baseBranch} {baseBranchLocked ? "(locked)" : "(unlocked)"}
                </p>
              </div>

              <div className="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                <p className="text-muted-foreground">Deploy branch to be created</p>
                <p className="font-mono">{deployBranch}</p>
              </div>

              <div className="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                <p className="text-muted-foreground">Configuration file</p>
                <p className="font-mono">Will update: {PARAMS_FILE}</p>
              </div>

              <div className="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                <p className="text-muted-foreground">Workflow to dispatch</p>
                <p className="font-mono">{WORKFLOW_FILE}</p>
              </div>
            </div>

            <div className="rounded-lg border border-primary/20 bg-primary/10 px-3 py-2 text-sm text-primary">
              Estimated time: ~8–12 minutes
            </div>

            <div className="flex items-center gap-2 pt-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={startSimulation}>
                <Rocket className="h-4 w-4" />
                Create Feature Environment
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === 3 ? (
        <div className="space-y-5">
          <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
            <CardHeader>
              <CardTitle>Step 3 · Status</CardTitle>
              <CardDescription>Simulation progress for environment provisioning.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Workflow file</p>
                  <p className="font-mono text-sm">{WORKFLOW_FILE}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Workflow Run ID</p>
                  <p className="font-mono text-sm">{workflowRunId}</p>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/25 px-3 py-2">
                  <p className="text-xs text-muted-foreground">Logs</p>
                  <button
                    type="button"
                    onClick={() => showToast("Logs viewer is not connected in UI-only mode")}
                    className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                  >
                    View logs
                    <ExternalLink className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full border border-white/10 bg-slate-950/45">
                  <div
                    className={cn(
                      "h-full rounded-full bg-primary transition-all duration-500",
                      isSimulating ? "animate-pulse" : ""
                    )}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                {timeline.map((item) => (
                  <div
                    key={item.id}
                    className={cn(
                      "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3 py-2",
                      item.status === "running"
                        ? "border-primary/30 bg-primary/10"
                        : "border-white/10 bg-slate-950/25"
                    )}
                  >
                    <div className="flex items-center gap-2 text-sm">
                      {item.status === "done" ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : item.status === "running" ? (
                        <PlayCircle className="h-4 w-4 text-primary" />
                      ) : item.status === "failed" ? (
                        <AlertTriangle className="h-4 w-4 text-danger" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>{item.label}</span>
                    </div>

                    <Badge variant={statusVariant(item.status)}>
                      {item.status === "done"
                        ? "Done"
                        : item.status === "running"
                        ? "Running"
                        : item.status === "failed"
                        ? "Failed"
                        : "Queued"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isReady ? (
            <Card className="border-success/30 bg-success/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                  Environment Ready
                </CardTitle>
                <CardDescription>
                  Feature environment simulation completed successfully.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2 rounded-xl border border-success/30 bg-slate-950/35 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Feature URL
                  </p>
                  <p className="font-mono text-sm text-success">{featureUrl}</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (featureUrl !== "—") {
                          window.open(featureUrl, "_blank", "noopener,noreferrer");
                        }
                      }}
                    >
                      <ExternalLink className="h-4 w-4" />
                      Open
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => void copyToClipboard(featureUrl, "Feature URL")}>
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 rounded-xl border border-white/10 bg-slate-950/35 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Backend URL
                  </p>
                  <p className="font-mono text-sm text-muted-foreground">{backendUrl}</p>
                  <div>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={backendUrl === "—"}
                      onClick={() => void copyToClipboard(backendUrl, "Backend URL")}
                    >
                      <Copy className="h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  <Button variant="outline" disabled title="Coming soon">
                    <FileCog className="h-4 w-4" />
                    Destroy environment (Coming soon)
                  </Button>
                  <Button variant="outline" disabled title="Coming soon">
                    <Sparkles className="h-4 w-4" />
                    Notify QA (Coming soon)
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setStep(2)} disabled={isSimulating}>
              Back
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                clearSimulationTimers();
                setStep(1);
                setIsSimulating(false);
                setIsReady(false);
                setProgress(0);
                setTimeline(createTimelineItems());
              }}
              disabled={isSimulating}
            >
              Start new simulation
            </Button>
          </div>
        </div>
      ) : null}

      {showUnlockConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-slate-700/80 bg-slate-950 p-5 shadow-2xl">
            <h3 className="text-base font-semibold">Unlock base branch?</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Develop is the standard base branch. Are you sure you want to change?
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setShowUnlockConfirm(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  setBaseBranchLocked(false);
                  setShowUnlockConfirm(false);
                }}
              >
                Confirm Unlock
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {toastMessage ? (
        <div className="fixed bottom-4 right-4 rounded-xl border border-white/15 bg-slate-950/90 px-3 py-2 text-xs text-muted-foreground shadow-xl">
          {toastMessage}
        </div>
      ) : null}
    </div>
  );
}
