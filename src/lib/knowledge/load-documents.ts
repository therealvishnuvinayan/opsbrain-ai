import "server-only";

import { promises as fs } from "node:fs";
import path from "node:path";

import type { KnowledgeDocument } from "@/lib/knowledge/types";

const KNOWLEDGE_DOCS_DIR = path.join(process.cwd(), "src/lib/knowledge/docs");

function parseFrontmatter(content: string) {
  if (!content.startsWith("---\n")) {
    return {
      metadata: {} as Record<string, string>,
      body: content,
    };
  }

  const endIndex = content.indexOf("\n---\n", 4);

  if (endIndex === -1) {
    return {
      metadata: {} as Record<string, string>,
      body: content,
    };
  }

  const rawFrontmatter = content.slice(4, endIndex);
  const metadata: Record<string, string> = {};

  for (const line of rawFrontmatter.split("\n")) {
    const separatorIndex = line.indexOf(":");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim();

    if (!key || !value) {
      continue;
    }

    metadata[key] = value;
  }

  return {
    metadata,
    body: content.slice(endIndex + 5).trim(),
  };
}

function toTags(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

async function loadDocumentFile(filePath: string): Promise<KnowledgeDocument> {
  const content = await fs.readFile(filePath, "utf8");
  const relativePath = path.relative(KNOWLEDGE_DOCS_DIR, filePath);
  const id = relativePath.replace(/\.[^.]+$/, "").replace(/[\\/]/g, "-");
  const { metadata, body } = parseFrontmatter(content);
  const title =
    metadata.title?.trim() ||
    path.basename(filePath).replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");

  return {
    id,
    title,
    source: metadata.source?.trim() || relativePath,
    domain: metadata.domain?.trim(),
    tags: toTags(metadata.tags),
    text: body,
  };
}

export async function loadDocuments() {
  const entries = await fs.readdir(KNOWLEDGE_DOCS_DIR, { withFileTypes: true });
  const filePaths = entries
    .filter((entry) => entry.isFile() && /\.(md|mdx|txt)$/i.test(entry.name))
    .map((entry) => path.join(KNOWLEDGE_DOCS_DIR, entry.name));

  return Promise.all(filePaths.map((filePath) => loadDocumentFile(filePath)));
}
