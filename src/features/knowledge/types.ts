export type KnowledgeSourceType = "UPLOAD" | "URL" | "NOTE" | "CONNECTOR";

export type KnowledgeSourceStatus = "INDEXED" | "PROCESSING" | "FAILED" | "STALE";

export type KnowledgeAccess = "PUBLIC" | "INTERNAL" | "RESTRICTED";

export interface KnowledgeSource {
  id: string;
  name: string;
  type: KnowledgeSourceType;
  collections: string[];
  status: KnowledgeSourceStatus;
  lastSyncedAt: string;
  chunksCount: number;
  access: KnowledgeAccess;
  owner: string;
  tags: string[];
  sizeBytes: number;
  errorMessage?: string;
  previewChunks: string[];
  url?: string;
  connectorId?: string;
}

export interface KnowledgeCollection {
  id: string;
  name: string;
  description: string;
  owners: string[];
  sourcesCount: number;
  chunksCount: number;
  lastUpdatedAt: string;
  defaultAccess: KnowledgeAccess;
}

export type IngestionJobStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED";

export interface IngestionJob {
  id: string;
  sourceId: string;
  status: IngestionJobStatus;
  startedAt: string;
  finishedAt?: string;
  durationSec?: number;
  error?: string;
  logs: string[];
}

export type ConnectorStatus = "CONNECTED" | "NOT_CONNECTED" | "COMING_SOON";

export interface Connector {
  id: string;
  name: string;
  status: ConnectorStatus;
  lastSyncAt?: string;
  description: string;
}

export type GovernanceRole = "Admin" | "Ops" | "Finance" | "Viewer";

export type GovernanceMatrix = Record<string, Record<GovernanceRole, boolean>>;

export interface AddSourceInput {
  name: string;
  type: KnowledgeSourceType;
  collections: string[];
  access: KnowledgeAccess;
  owner: string;
  tags: string[];
  sizeBytes: number;
  previewChunks: string[];
  url?: string;
  connectorId?: string;
}

export interface UpdateSourceInput extends AddSourceInput {
  id: string;
  status: KnowledgeSourceStatus;
  errorMessage?: string;
  chunksCount: number;
  lastSyncedAt: string;
}

export interface CreateCollectionInput {
  name: string;
  description: string;
  owners: string[];
  defaultAccess: KnowledgeAccess;
}

export interface UpdateCollectionInput extends CreateCollectionInput {
  id: string;
}
