"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  initialActions,
  initialPolicyConfig,
  initialRuns,
} from "@/features/actions/mock";
import type {
  ActionDefinition,
  ActionEnvironment,
  ActionRisk,
  ActionRun,
  ActionRunRequest,
  ActionRunStatus,
  ActionStatus,
  PolicyConfig,
} from "@/features/actions/types";
import { generateId, runId } from "@/features/actions/utils";

interface ActionsStoreState {
  actions: ActionDefinition[];
  runs: ActionRun[];
  policy: PolicyConfig;
}

interface ActionsStoreContextValue extends ActionsStoreState {
  isHydrated: boolean;
  createAction: (input: Omit<ActionDefinition, "id" | "createdAt" | "updatedAt">) => void;
  updateAction: (
    actionId: string,
    patch: Partial<Omit<ActionDefinition, "id" | "createdAt">>
  ) => void;
  duplicateAction: (actionId: string) => void;
  deleteAction: (actionId: string) => void;
  toggleActionStatus: (actionId: string) => void;
  runActionNow: (request: ActionRunRequest) => string | null;
  rerunAction: (runId: string, operator: string) => string | null;
  exportRun: (runId: string) => void;
  updatePolicyRule: (risk: ActionRisk, patch: Partial<PolicyConfig["byRisk"][ActionRisk]>) => void;
  toggleGuardrail: (key: keyof PolicyConfig["guardrails"]) => void;
}

const PERSISTENCE_KEY = "opsbrain-actions-v1";

const ActionsStoreContext = createContext<ActionsStoreContextValue | null>(null);

function createInitialState(): ActionsStoreState {
  return {
    actions: initialActions,
    runs: initialRuns,
    policy: initialPolicyConfig,
  };
}

function normalizeState(value: Partial<ActionsStoreState> | undefined): ActionsStoreState {
  const initial = createInitialState();

  if (!value) {
    return initial;
  }

  return {
    actions: Array.isArray(value.actions) ? value.actions : initial.actions,
    runs: Array.isArray(value.runs) ? value.runs : initial.runs,
    policy: value.policy
      ? {
          byRisk: {
            low: { ...initial.policy.byRisk.low, ...value.policy.byRisk?.low },
            medium: { ...initial.policy.byRisk.medium, ...value.policy.byRisk?.medium },
            high: { ...initial.policy.byRisk.high, ...value.policy.byRisk?.high },
          },
          guardrails: {
            ...initial.policy.guardrails,
            ...(value.policy.guardrails ?? {}),
          },
        }
      : initial.policy,
  };
}

function appendLog(run: ActionRun, status: ActionRunStatus, message: string) {
  return {
    ...run,
    status,
    logs: [
      ...run.logs,
      {
        t: new Date().toISOString(),
        level: status === "failed" ? ("error" as const) : ("info" as const),
        message,
      },
    ],
  };
}

export function ActionsStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ActionsStoreState>(createInitialState);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PERSISTENCE_KEY);
      if (raw) {
        setState(normalizeState(JSON.parse(raw) as Partial<ActionsStoreState>));
      }
    } catch {
      setState(createInitialState());
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    window.localStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
  }, [isHydrated, state]);

  const createAction = useCallback(
    (input: Omit<ActionDefinition, "id" | "createdAt" | "updatedAt">) => {
      const timestamp = new Date().toISOString();

      setState((previous) => ({
        ...previous,
        actions: [
          {
            ...input,
            id: generateId("act"),
            createdAt: timestamp,
            updatedAt: timestamp,
          },
          ...previous.actions,
        ],
      }));
    },
    []
  );

  const updateAction = useCallback(
    (
      actionId: string,
      patch: Partial<Omit<ActionDefinition, "id" | "createdAt">>
    ) => {
      setState((previous) => ({
        ...previous,
        actions: previous.actions.map((action) =>
          action.id === actionId
            ? {
                ...action,
                ...patch,
                updatedAt: new Date().toISOString(),
              }
            : action
        ),
      }));
    },
    []
  );

  const duplicateAction = useCallback((actionId: string) => {
    setState((previous) => {
      const target = previous.actions.find((action) => action.id === actionId);

      if (!target) {
        return previous;
      }

      const timestamp = new Date().toISOString();
      const copy: ActionDefinition = {
        ...target,
        id: generateId("act"),
        name: `${target.name} (Copy)`,
        status: "draft",
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      return {
        ...previous,
        actions: [copy, ...previous.actions],
      };
    });
  }, []);

  const deleteAction = useCallback((actionId: string) => {
    setState((previous) => ({
      ...previous,
      actions: previous.actions.filter((action) => action.id !== actionId),
      runs: previous.runs.filter((run) => run.actionId !== actionId),
    }));
  }, []);

  const toggleActionStatus = useCallback((actionId: string) => {
    setState((previous) => ({
      ...previous,
      actions: previous.actions.map((action) => {
        if (action.id !== actionId) {
          return action;
        }

        const nextStatus: ActionStatus =
          action.status === "enabled" ? "disabled" : "enabled";

        return {
          ...action,
          status: nextStatus,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
  }, []);

  const runActionNow = useCallback((request: ActionRunRequest) => {
    const action = state.actions.find((item) => item.id === request.actionId);

    if (!action) {
      return null;
    }

    const startedAt = new Date().toISOString();
    const id = runId();

    const run: ActionRun = {
      id,
      actionId: action.id,
      actionName: action.name,
      triggerKind: request.triggerKind,
      environment: request.environment,
      startedAt,
      status: "running",
      operator: request.operator,
      inputs: request.inputs,
      logs: [
        {
          t: startedAt,
          level: "info",
          message: "Run accepted by orchestration engine.",
        },
        {
          t: startedAt,
          level: "info",
          message: `Executing action in ${request.environment.toUpperCase()} environment.`,
        },
      ],
    };

    setState((previous) => ({
      ...previous,
      runs: [run, ...previous.runs],
    }));

    window.setTimeout(() => {
      setState((previous) => ({
        ...previous,
        runs: previous.runs.map((item) => {
          if (item.id !== id || item.status !== "running") {
            return item;
          }

          return appendLog(item, "running", "Step execution in progress: validating safety guards.");
        }),
      }));
    }, 650);

    window.setTimeout(() => {
      setState((previous) => {
        const actionForRun = previous.actions.find((item) => item.id === request.actionId);
        const risk = actionForRun?.risk ?? "medium";

        const failureChance =
          risk === "high"
            ? request.environment === "prod"
              ? 0.32
              : 0.24
            : risk === "medium"
              ? 0.14
              : 0.07;

        const failed = Math.random() < failureChance;

        return {
          ...previous,
          runs: previous.runs.map((item) => {
            if (item.id !== id || item.status !== "running") {
              return item;
            }

            const finishedAt = new Date().toISOString();
            const durationSec = Math.max(
              2,
              Math.round((new Date(finishedAt).getTime() - new Date(item.startedAt).getTime()) / 1000)
            );

            if (failed) {
              const failedRun = appendLog(
                item,
                "failed",
                "Execution failed during validation stage for target scope."
              );

              return {
                ...failedRun,
                finishedAt,
                durationSec,
                errorMessage:
                  "Safety validation flagged unresolved dependency; manual operator review required.",
              };
            }

            const successRun = appendLog(
              item,
              "success",
              "Action completed and posted execution summary."
            );

            return {
              ...successRun,
              finishedAt,
              durationSec,
              resultSummary:
                "Execution completed successfully. No blocked safety checks and outputs published.",
            };
          }),
        };
      });
    }, 2200);

    return id;
  }, [state.actions]);

  const rerunAction = useCallback(
    (targetRunId: string, operator: string) => {
      const target = state.runs.find((run) => run.id === targetRunId);

      if (!target) {
        return null;
      }

      return runActionNow({
        actionId: target.actionId,
        triggerKind: "manual",
        environment: target.environment,
        operator,
        inputs: target.inputs,
      });
    },
    [runActionNow, state.runs]
  );

  const exportRun = useCallback(
    (targetRunId: string) => {
      const target = state.runs.find((run) => run.id === targetRunId);

      if (!target) {
        return;
      }

      const blob = new Blob([JSON.stringify(target, null, 2)], {
        type: "application/json",
      });

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `opsbrain-action-run-${target.id}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
    },
    [state.runs]
  );

  const updatePolicyRule = useCallback(
    (risk: ActionRisk, patch: Partial<PolicyConfig["byRisk"][ActionRisk]>) => {
      setState((previous) => ({
        ...previous,
        policy: {
          ...previous.policy,
          byRisk: {
            ...previous.policy.byRisk,
            [risk]: {
              ...previous.policy.byRisk[risk],
              ...patch,
            },
          },
        },
      }));
    },
    []
  );

  const toggleGuardrail = useCallback((key: keyof PolicyConfig["guardrails"]) => {
    setState((previous) => ({
      ...previous,
      policy: {
        ...previous.policy,
        guardrails: {
          ...previous.policy.guardrails,
          [key]: !previous.policy.guardrails[key],
        },
      },
    }));
  }, []);

  const value = useMemo<ActionsStoreContextValue>(
    () => ({
      ...state,
      isHydrated,
      createAction,
      updateAction,
      duplicateAction,
      deleteAction,
      toggleActionStatus,
      runActionNow,
      rerunAction,
      exportRun,
      updatePolicyRule,
      toggleGuardrail,
    }),
    [
      state,
      isHydrated,
      createAction,
      updateAction,
      duplicateAction,
      deleteAction,
      toggleActionStatus,
      runActionNow,
      rerunAction,
      exportRun,
      updatePolicyRule,
      toggleGuardrail,
    ]
  );

  return <ActionsStoreContext.Provider value={value}>{children}</ActionsStoreContext.Provider>;
}

export function useActionsStore() {
  const context = useContext(ActionsStoreContext);

  if (!context) {
    throw new Error("useActionsStore must be used within ActionsStoreProvider.");
  }

  return context;
}
