import "server-only";

import { indexDocuments } from "@/lib/knowledge/index-documents";
import { buildCacheKey, getOrSetMemoryCache } from "@/lib/ops/runtime/memory-cache";
import type {
  IndexedKnowledgeChunk,
  KnowledgeSearchFilters,
  NormalizedKnowledgeSearchMatch,
  NormalizedKnowledgeSearchResults,
} from "@/lib/knowledge/types";

function tokenize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2);
}

function addTagBoost(chunk: IndexedKnowledgeChunk, query: string) {
  const normalizedQuery = query.toLowerCase();

  return chunk.tags.reduce((score, tag) => {
    return normalizedQuery.includes(tag.toLowerCase()) ? score + 1.25 : score;
  }, 0);
}

function addTitleBoost(chunk: IndexedKnowledgeChunk, query: string) {
  const normalizedQuery = query.toLowerCase();
  const normalizedTitle = chunk.title.toLowerCase();
  let score = 0;

  if (normalizedQuery.includes(normalizedTitle) || normalizedTitle.includes(normalizedQuery)) {
    score += 3;
  }

  if (normalizedTitle.includes("runbook")) {
    score += 0.5;
  }

  if (normalizedTitle.includes("sop")) {
    score += 0.5;
  }

  return score;
}

function matchesDomain(chunk: IndexedKnowledgeChunk, domain?: string) {
  if (!domain) {
    return true;
  }

  return chunk.domain === domain || chunk.tags.includes(domain);
}

export async function searchKnowledgeDocs(filters: KnowledgeSearchFilters) {
  const cacheKey = buildCacheKey(["knowledge-search", filters]);

  return getOrSetMemoryCache(cacheKey, 60_000, async () => {
    const query = filters.query.trim();
    const maxResults = Math.min(filters.maxResults && filters.maxResults > 0 ? filters.maxResults : 5, 5);
    const queryTokens = tokenize(query);
    const index = await indexDocuments();
    const scoredChunks = index.chunks
      .filter((chunk) => matchesDomain(chunk, filters.domain))
      .map((chunk) => {
        let score = 0;

        for (const token of queryTokens) {
          const termFrequency = chunk.tokenCounts.get(token) ?? 0;

          if (termFrequency === 0) {
            continue;
          }

          score += termFrequency * (index.inverseDocumentFrequency.get(token) ?? 1);
        }

        score += addTagBoost(chunk, query);
        score += addTitleBoost(chunk, query);

        if (filters.tags?.some((tag) => chunk.tags.includes(tag))) {
          score += 1.5;
        }

        if (chunk.domain && filters.domain && chunk.domain === filters.domain) {
          score += 1;
        }

        return {
          chunk,
          score,
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, maxResults);
    const results: NormalizedKnowledgeSearchMatch[] = scoredChunks.map(({ chunk, score }) => ({
      title: chunk.title,
      source: chunk.source,
      excerpt: chunk.excerpt,
      relevanceScore: Number(score.toFixed(3)),
      tags: chunk.tags,
      domain: chunk.domain,
      guidancePoints: chunk.guidancePoints.slice(0, 3),
    }));

    return {
      context: {
        checkedAt: new Date().toISOString(),
        query,
        domain: filters.domain,
        returnedCount: results.length,
        bestScore: results[0]?.relevanceScore,
        hasRunbookMatch: results.some(
          (result) =>
            result.title.toLowerCase().includes("runbook") ||
            result.title.toLowerCase().includes("sop") ||
            result.tags.some((tag) => tag.toLowerCase() === "runbook" || tag.toLowerCase() === "sop")
        ),
        results,
      } satisfies NormalizedKnowledgeSearchResults,
      sources: [
        {
          type: "rag" as const,
          endpoint: "knowledge:local-index",
        },
      ],
    };
  });
}
