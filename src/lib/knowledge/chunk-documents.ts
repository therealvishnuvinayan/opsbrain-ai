import "server-only";

import type { KnowledgeChunk, KnowledgeDocument } from "@/lib/knowledge/types";

const TARGET_CHUNK_SIZE = 850;

function cleanText(value: string) {
  return value.replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim();
}

function summarizeExcerpt(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();
  return normalized.length > 220 ? `${normalized.slice(0, 217)}...` : normalized;
}

function extractGuidancePoints(value: string) {
  const points: string[] = [];

  for (const line of value.split("\n")) {
    const trimmed = line.trim();

    if (/^[-*]\s+/.test(trimmed)) {
      points.push(trimmed.replace(/^[-*]\s+/, "").trim());
    } else if (/^\d+\.\s+/.test(trimmed)) {
      points.push(trimmed.replace(/^\d+\.\s+/, "").trim());
    }

    if (points.length >= 5) {
      break;
    }
  }

  return points;
}

function splitIntoSections(document: KnowledgeDocument) {
  const lines = cleanText(document.text).split("\n");
  const sections: Array<{ heading?: string; text: string }> = [];
  let currentHeading: string | undefined;
  let currentBody: string[] = [];

  function flushSection() {
    const text = currentBody.join("\n").trim();

    if (!text) {
      currentBody = [];
      return;
    }

    sections.push({
      heading: currentHeading,
      text,
    });

    currentBody = [];
  }

  for (const line of lines) {
    if (/^#{1,3}\s+/.test(line.trim())) {
      flushSection();
      currentHeading = line.replace(/^#{1,3}\s+/, "").trim();
      continue;
    }

    currentBody.push(line);
  }

  flushSection();

  return sections.length > 0
    ? sections
    : [
        {
          text: cleanText(document.text),
        },
      ];
}

export function chunkDocuments(documents: KnowledgeDocument[]) {
  const chunks: KnowledgeChunk[] = [];

  for (const document of documents) {
    const sections = splitIntoSections(document);
    let chunkIndex = 0;

    for (const section of sections) {
      const paragraphs = section.text
        .split(/\n\s*\n/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
      let currentChunk = section.heading ? `${section.heading}\n` : "";

      const flushChunk = () => {
        const text = cleanText(currentChunk);

        if (!text) {
          currentChunk = section.heading ? `${section.heading}\n` : "";
          return;
        }

        chunks.push({
          id: `${document.id}-chunk-${chunkIndex + 1}`,
          documentId: document.id,
          title: document.title,
          source: document.source,
          domain: document.domain,
          tags: document.tags,
          chunkIndex,
          text,
          excerpt: summarizeExcerpt(text),
          guidancePoints: extractGuidancePoints(text),
        });

        chunkIndex += 1;
        currentChunk = section.heading ? `${section.heading}\n` : "";
      };

      for (const paragraph of paragraphs) {
        const nextChunk = currentChunk ? `${currentChunk}\n\n${paragraph}` : paragraph;

        if (nextChunk.length > TARGET_CHUNK_SIZE && currentChunk.trim()) {
          flushChunk();
          currentChunk = section.heading ? `${section.heading}\n\n${paragraph}` : paragraph;
          continue;
        }

        currentChunk = nextChunk;
      }

      flushChunk();
    }
  }

  return chunks;
}
