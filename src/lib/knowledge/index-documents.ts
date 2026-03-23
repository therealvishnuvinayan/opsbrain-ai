import "server-only";

import { chunkDocuments } from "@/lib/knowledge/chunk-documents";
import { loadDocuments } from "@/lib/knowledge/load-documents";
import type { IndexedKnowledgeChunk, IndexedKnowledgeDocuments } from "@/lib/knowledge/types";

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function countTokens(tokens: string[]) {
  const counts = new Map<string, number>();

  for (const token of tokens) {
    counts.set(token, (counts.get(token) ?? 0) + 1);
  }

  return counts;
}

let indexPromise: Promise<IndexedKnowledgeDocuments> | undefined;

export async function indexDocuments(): Promise<IndexedKnowledgeDocuments> {
  indexPromise ??= (async () => {
    const documents = await loadDocuments();
    const chunks = chunkDocuments(documents);
    const documentFrequency = new Map<string, number>();
    const indexedChunks: IndexedKnowledgeChunk[] = chunks.map((chunk) => {
      const tokens = tokenize(`${chunk.title} ${chunk.tags.join(" ")} ${chunk.text}`);
      const tokenCounts = countTokens(tokens);

      for (const token of new Set(tokens)) {
        documentFrequency.set(token, (documentFrequency.get(token) ?? 0) + 1);
      }

      return {
        ...chunk,
        tokenCounts,
      };
    });
    const inverseDocumentFrequency = new Map<string, number>();

    for (const [token, frequency] of documentFrequency.entries()) {
      inverseDocumentFrequency.set(token, Math.log((indexedChunks.length + 1) / (frequency + 1)) + 1);
    }

    return {
      builtAt: new Date().toISOString(),
      documentCount: documents.length,
      chunkCount: indexedChunks.length,
      chunks: indexedChunks,
      inverseDocumentFrequency,
    };
  })();

  return indexPromise;
}
