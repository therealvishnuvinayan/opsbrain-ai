export interface KnowledgeDocument {
  id: string;
  title: string;
  source: string;
  domain?: string;
  tags: string[];
  text: string;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  title: string;
  source: string;
  domain?: string;
  tags: string[];
  chunkIndex: number;
  text: string;
  excerpt: string;
  guidancePoints: string[];
}

export interface IndexedKnowledgeChunk extends KnowledgeChunk {
  tokenCounts: Map<string, number>;
}

export interface IndexedKnowledgeDocuments {
  builtAt: string;
  documentCount: number;
  chunkCount: number;
  chunks: IndexedKnowledgeChunk[];
  inverseDocumentFrequency: Map<string, number>;
}

export interface KnowledgeSearchFilters {
  query: string;
  maxResults?: number;
  domain?: string;
  tags?: string[];
}

export interface NormalizedKnowledgeSearchMatch {
  title: string;
  source: string;
  excerpt: string;
  relevanceScore: number;
  tags: string[];
  domain?: string;
  guidancePoints: string[];
}

export interface NormalizedKnowledgeSearchResults {
  checkedAt: string;
  query: string;
  domain?: string;
  returnedCount: number;
  bestScore?: number;
  hasRunbookMatch: boolean;
  results: NormalizedKnowledgeSearchMatch[];
}
