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
  initialCollections,
  initialConnectors,
  initialGovernance,
  initialJobs,
  initialSources,
} from "@/features/knowledge/mock";
import type {
  AddSourceInput,
  Connector,
  ConnectorStatus,
  CreateCollectionInput,
  GovernanceMatrix,
  GovernanceRole,
  IngestionJob,
  IngestionJobStatus,
  KnowledgeCollection,
  KnowledgeSource,
  UpdateCollectionInput,
} from "@/features/knowledge/types";
import { generateId } from "@/features/knowledge/utils";

interface KnowledgeStoreState {
  sources: KnowledgeSource[];
  collections: KnowledgeCollection[];
  jobs: IngestionJob[];
  connectors: Connector[];
  governance: GovernanceMatrix;
}

interface KnowledgeStoreContextValue extends KnowledgeStoreState {
  isHydrated: boolean;
  addSource: (input: AddSourceInput) => void;
  updateSource: (sourceId: string, patch: Partial<KnowledgeSource>) => void;
  removeSource: (sourceId: string) => void;
  resyncSource: (sourceId: string) => void;
  createCollection: (input: CreateCollectionInput) => void;
  updateCollection: (input: UpdateCollectionInput) => void;
  deleteCollection: (collectionId: string) => void;
  toggleGovernance: (collectionId: string, role: GovernanceRole) => void;
  setConnectorStatus: (connectorId: string, status: ConnectorStatus) => void;
  retryJob: (jobId: string) => void;
}

const PERSISTENCE_KEY = "opsbrain-knowledge-hub-v1";

const KnowledgeStoreContext = createContext<KnowledgeStoreContextValue | null>(null);

function toStats(
  collections: KnowledgeCollection[],
  sources: KnowledgeSource[]
): KnowledgeCollection[] {
  return collections.map((collection) => {
    const collectionSources = sources.filter((source) =>
      source.collections.includes(collection.id)
    );

    const latestSourceTimestamp = collectionSources
      .map((source) => new Date(source.lastSyncedAt).getTime())
      .reduce((max, value) => Math.max(max, value), 0);

    return {
      ...collection,
      sourcesCount: collectionSources.length,
      chunksCount: collectionSources.reduce((sum, source) => sum + source.chunksCount, 0),
      lastUpdatedAt:
        latestSourceTimestamp > 0
          ? new Date(latestSourceTimestamp).toISOString()
          : collection.lastUpdatedAt,
    };
  });
}

function createInitialState(): KnowledgeStoreState {
  return {
    sources: initialSources,
    collections: toStats(initialCollections, initialSources),
    jobs: initialJobs,
    connectors: initialConnectors,
    governance: initialGovernance,
  };
}

function normalizeState(value: Partial<KnowledgeStoreState> | undefined): KnowledgeStoreState {
  const initial = createInitialState();

  if (!value) {
    return initial;
  }

  const sources = Array.isArray(value.sources) ? value.sources : initial.sources;
  const collections = Array.isArray(value.collections)
    ? toStats(value.collections, sources)
    : toStats(initial.collections, sources);

  const jobs = Array.isArray(value.jobs) ? value.jobs : initial.jobs;
  const connectors = Array.isArray(value.connectors)
    ? value.connectors
    : initial.connectors;

  const governance = {
    ...initial.governance,
    ...(value.governance ?? {}),
  };

  return {
    sources,
    collections,
    jobs,
    connectors,
    governance,
  };
}

function completeLatestRunningJob(
  jobs: IngestionJob[],
  sourceId: string,
  status: IngestionJobStatus,
  error?: string
) {
  const runningJobIndex = jobs.findIndex(
    (job) => job.sourceId === sourceId && job.status === "RUNNING"
  );

  if (runningJobIndex === -1) {
    return jobs;
  }

  const targetJob = jobs[runningJobIndex];
  const startedAtMs = new Date(targetJob.startedAt).getTime();
  const finishedAt = new Date().toISOString();
  const durationSec = Math.max(
    1,
    Math.round((new Date(finishedAt).getTime() - startedAtMs) / 1000)
  );

  const next = [...jobs];
  next[runningJobIndex] = {
    ...targetJob,
    status,
    finishedAt,
    durationSec,
    error,
    logs: [
      ...targetJob.logs,
      status === "COMPLETED"
        ? `[${new Date().toLocaleTimeString("en-US")}] Index commit completed.`
        : `[${new Date().toLocaleTimeString("en-US")}] Job failed: ${error ?? "Unknown error"}`,
    ],
  };

  return next;
}

export function KnowledgeStoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<KnowledgeStoreState>(createInitialState);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PERSISTENCE_KEY);

      if (raw) {
        const parsed = JSON.parse(raw) as Partial<KnowledgeStoreState>;
        setState(normalizeState(parsed));
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

  const addSource = useCallback((input: AddSourceInput) => {
    const now = new Date().toISOString();
    const sourceId = generateId("src");

    const source: KnowledgeSource = {
      id: sourceId,
      name: input.name,
      type: input.type,
      collections: input.collections,
      status: "PROCESSING",
      lastSyncedAt: now,
      chunksCount: 0,
      access: input.access,
      owner: input.owner,
      tags: input.tags,
      sizeBytes: input.sizeBytes,
      previewChunks: input.previewChunks,
      url: input.url,
      connectorId: input.connectorId,
    };

    const jobId = `JOB-${Math.floor(Math.random() * 90000 + 10000)}`;

    setState((previous) => {
      const nextSources = [source, ...previous.sources];
      const nextJobs: IngestionJob[] = [
        {
          id: jobId,
          sourceId,
          status: "RUNNING",
          startedAt: now,
          logs: [
            `[${new Date().toLocaleTimeString("en-US")}] Source queued for ingestion.`,
            `[${new Date().toLocaleTimeString("en-US")}] Building chunk plan.`,
          ],
        },
        ...previous.jobs,
      ];

      return {
        ...previous,
        sources: nextSources,
        jobs: nextJobs,
        collections: toStats(previous.collections, nextSources),
      };
    });

    window.setTimeout(() => {
      setState((previous) => {
        const nextSources = previous.sources.map((current) => {
          if (current.id !== sourceId) {
            return current;
          }

          const chunkBase = Math.max(18, current.previewChunks.length * 12);

          return {
            ...current,
            status: "INDEXED" as const,
            lastSyncedAt: new Date().toISOString(),
            chunksCount: chunkBase,
            errorMessage: undefined,
          };
        });

        return {
          ...previous,
          sources: nextSources,
          jobs: completeLatestRunningJob(previous.jobs, sourceId, "COMPLETED"),
          collections: toStats(previous.collections, nextSources),
        };
      });
    }, 1400);
  }, []);

  const updateSource = useCallback((sourceId: string, patch: Partial<KnowledgeSource>) => {
    setState((previous) => {
      const nextSources = previous.sources.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              ...patch,
            }
          : source
      );

      return {
        ...previous,
        sources: nextSources,
        collections: toStats(previous.collections, nextSources),
      };
    });
  }, []);

  const removeSource = useCallback((sourceId: string) => {
    setState((previous) => {
      const nextSources = previous.sources.filter((source) => source.id !== sourceId);
      return {
        ...previous,
        sources: nextSources,
        jobs: previous.jobs.filter((job) => job.sourceId !== sourceId),
        collections: toStats(previous.collections, nextSources),
      };
    });
  }, []);

  const resyncSource = useCallback((sourceId: string) => {
    const startedAt = new Date().toISOString();
    const jobId = `JOB-${Math.floor(Math.random() * 90000 + 10000)}`;

    setState((previous) => {
      const nextSources = previous.sources.map((source) =>
        source.id === sourceId
          ? {
              ...source,
              status: "PROCESSING" as const,
              lastSyncedAt: startedAt,
              errorMessage: undefined,
            }
          : source
      );

      return {
        ...previous,
        sources: nextSources,
        jobs: [
          {
            id: jobId,
            sourceId,
            status: "RUNNING",
            startedAt,
            logs: [
              `[${new Date().toLocaleTimeString("en-US")}] Manual re-sync requested.`,
              `[${new Date().toLocaleTimeString("en-US")}] Recomputing embeddings for impacted chunks.`,
            ],
          },
          ...previous.jobs,
        ],
        collections: toStats(previous.collections, nextSources),
      };
    });

    window.setTimeout(() => {
      setState((previous) => {
        const nextSources = previous.sources.map((source) =>
          source.id === sourceId
            ? {
                ...source,
                status: "INDEXED" as const,
                lastSyncedAt: new Date().toISOString(),
                chunksCount: source.chunksCount + 14,
              }
            : source
        );

        return {
          ...previous,
          sources: nextSources,
          jobs: completeLatestRunningJob(previous.jobs, sourceId, "COMPLETED"),
          collections: toStats(previous.collections, nextSources),
        };
      });
    }, 1300);
  }, []);

  const createCollection = useCallback((input: CreateCollectionInput) => {
    const id = generateId("col");
    const now = new Date().toISOString();

    setState((previous) => {
      const collection: KnowledgeCollection = {
        id,
        name: input.name,
        description: input.description,
        owners: input.owners,
        defaultAccess: input.defaultAccess,
        sourcesCount: 0,
        chunksCount: 0,
        lastUpdatedAt: now,
      };

      return {
        ...previous,
        collections: [collection, ...previous.collections],
        governance: {
          ...previous.governance,
          [id]: {
            Admin: true,
            Ops: true,
            Finance: input.defaultAccess !== "PUBLIC",
            Viewer: input.defaultAccess !== "RESTRICTED",
          },
        },
      };
    });
  }, []);

  const updateCollection = useCallback((input: UpdateCollectionInput) => {
    setState((previous) => ({
      ...previous,
      collections: previous.collections.map((collection) =>
        collection.id === input.id
          ? {
              ...collection,
              name: input.name,
              description: input.description,
              owners: input.owners,
              defaultAccess: input.defaultAccess,
              lastUpdatedAt: new Date().toISOString(),
            }
          : collection
      ),
    }));
  }, []);

  const deleteCollection = useCallback((collectionId: string) => {
    setState((previous) => {
      const nextSources = previous.sources.map((source) => ({
        ...source,
        collections: source.collections.filter((id) => id !== collectionId),
      }));

      const nextCollections = previous.collections.filter(
        (collection) => collection.id !== collectionId
      );

      const nextGovernance = { ...previous.governance };
      delete nextGovernance[collectionId];

      return {
        ...previous,
        collections: toStats(nextCollections, nextSources),
        governance: nextGovernance,
        sources: nextSources,
      };
    });
  }, []);

  const toggleGovernance = useCallback((collectionId: string, role: GovernanceRole) => {
    setState((previous) => {
      const current =
        previous.governance[collectionId] ??
        ({ Admin: true, Ops: false, Finance: false, Viewer: false } as const);

      return {
        ...previous,
        governance: {
          ...previous.governance,
          [collectionId]: {
            ...current,
            [role]: !current[role],
          },
        },
      };
    });
  }, []);

  const setConnectorStatus = useCallback((connectorId: string, status: ConnectorStatus) => {
    setState((previous) => ({
      ...previous,
      connectors: previous.connectors.map((connector) =>
        connector.id === connectorId
          ? {
              ...connector,
              status,
              lastSyncAt: status === "CONNECTED" ? new Date().toISOString() : connector.lastSyncAt,
            }
          : connector
      ),
    }));
  }, []);

  const retryJob = useCallback((jobId: string) => {
    setState((previous) => {
      const targetJob = previous.jobs.find((job) => job.id === jobId);

      if (!targetJob) {
        return previous;
      }

      const now = new Date().toISOString();

      const jobs = previous.jobs.map((job) =>
        job.id === jobId
          ? {
              ...job,
              status: "RUNNING" as const,
              startedAt: now,
              finishedAt: undefined,
              durationSec: undefined,
              error: undefined,
              logs: [
                ...job.logs,
                `[${new Date().toLocaleTimeString("en-US")}] Retry requested by operator.`,
              ],
            }
          : job
      );

      const sources = previous.sources.map((source) =>
        source.id === targetJob.sourceId
          ? {
              ...source,
              status: "PROCESSING" as const,
              errorMessage: undefined,
            }
          : source
      );

      return {
        ...previous,
        jobs,
        sources,
      };
    });

    window.setTimeout(() => {
      setState((previous) => {
        const targetJob = previous.jobs.find((job) => job.id === jobId);

        if (!targetJob) {
          return previous;
        }

        const finishedAt = new Date().toISOString();

        const jobs = previous.jobs.map((job) =>
          job.id === jobId
            ? {
                ...job,
                status: "COMPLETED" as const,
                finishedAt,
                durationSec: Math.max(
                  1,
                  Math.round((new Date(finishedAt).getTime() - new Date(job.startedAt).getTime()) / 1000)
                ),
                logs: [
                  ...job.logs,
                  `[${new Date().toLocaleTimeString("en-US")}] Retry completed successfully.`,
                ],
              }
            : job
        );

        const sources = previous.sources.map((source) =>
          source.id === targetJob.sourceId
            ? {
                ...source,
                status: "INDEXED" as const,
                lastSyncedAt: finishedAt,
                chunksCount: source.chunksCount + 8,
              }
            : source
        );

        return {
          ...previous,
          jobs,
          sources,
          collections: toStats(previous.collections, sources),
        };
      });
    }, 1200);
  }, []);

  const value = useMemo<KnowledgeStoreContextValue>(
    () => ({
      ...state,
      isHydrated,
      addSource,
      updateSource,
      removeSource,
      resyncSource,
      createCollection,
      updateCollection,
      deleteCollection,
      toggleGovernance,
      setConnectorStatus,
      retryJob,
    }),
    [
      state,
      isHydrated,
      addSource,
      updateSource,
      removeSource,
      resyncSource,
      createCollection,
      updateCollection,
      deleteCollection,
      toggleGovernance,
      setConnectorStatus,
      retryJob,
    ]
  );

  return (
    <KnowledgeStoreContext.Provider value={value}>{children}</KnowledgeStoreContext.Provider>
  );
}

export function useKnowledgeStore() {
  const context = useContext(KnowledgeStoreContext);

  if (!context) {
    throw new Error("useKnowledgeStore must be used within KnowledgeStoreProvider.");
  }

  return context;
}
