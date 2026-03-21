import "server-only";

import type {
  OpsWorkspaceMessage,
  OpsWorkspaceQueryInput,
  OpsWorkspaceReasoningMode,
  OpsWorkspaceResponse,
  OpsWorkspaceStatus,
} from "@/features/workspace/types";

interface BackendAskResponse {
  answer: string;
  structured: {
    summary: string;
    key_findings: string[];
    evidence: string[];
    recommended_actions: Array<{ label: string; href: string }>;
  };
  entities: {
    orders: Array<{ order_number: string; status: string }>;
    customers: Array<{ id: string; name: string }>;
    suppliers: Array<{ id: string; name: string }>;
  };
  citations: Array<{ source_id: string; chunk_id: string; snippet: string }>;
  raw_model_output?: Record<string, unknown> | null;
}

const ORDER_NUMBER_PATTERN = /OB-\d+/gi;

const BACKEND_BASE_URL = (
  process.env.OPSBRAIN_API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  ""
)
  .trim()
  .replace(/\/$/, "");

const BACKEND_SERVICE_API_KEY = (
  process.env.OPSBRAIN_SERVICE_API_KEY ??
  process.env.SERVICE_API_KEY ??
  ""
).trim();

function isBackendConfigured() {
  return BACKEND_BASE_URL.length > 0;
}

function truncate(value: string, limit = 280) {
  const normalized = value.replace(/\s+/g, " ").trim();

  if (normalized.length <= limit) {
    return normalized;
  }

  return `${normalized.slice(0, limit - 1).trimEnd()}...`;
}

function reasoningDepth(mode: OpsWorkspaceReasoningMode) {
  if (mode === "quick") {
    return 4;
  }

  if (mode === "deep") {
    return 10;
  }

  return 6;
}

function buildConversationQuestion(question: string, history: OpsWorkspaceMessage[]) {
  const normalizedQuestion = question.trim();

  const trailingHistory = history.slice(-6);
  const lastHistoryMessage = trailingHistory[trailingHistory.length - 1];
  const shouldDropLastMessage =
    lastHistoryMessage?.role === "user" &&
    lastHistoryMessage.content.trim() === normalizedQuestion;

  const priorTurns = shouldDropLastMessage
    ? trailingHistory.slice(0, -1)
    : trailingHistory;

  if (priorTurns.length === 0) {
    return normalizedQuestion;
  }

  const transcript = priorTurns
    .slice(-4)
    .map((message) => {
      const speaker = message.role === "assistant" ? "Assistant" : "User";
      return `${speaker}: ${truncate(message.content)}`;
    })
    .join("\n");

  return `Conversation context:\n${transcript}\n\nCurrent user request:\n${normalizedQuestion}`;
}

function collectOrderHints(question: string, history: OpsWorkspaceMessage[]) {
  const hints = new Set<string>();
  const source = [question, ...history.slice(-6).map((message) => message.content)].join("\n");

  for (const match of source.match(ORDER_NUMBER_PATTERN) ?? []) {
    hints.add(match.toUpperCase());
  }

  return Array.from(hints).slice(0, 12);
}

function buildFollowUpPrompts(
  question: string,
  reasoningMode: OpsWorkspaceReasoningMode,
  payload: BackendAskResponse
) {
  const prompts = new Set<string>();

  const primaryOrder = payload.entities.orders[0]?.order_number;
  const primarySupplier = payload.entities.suppliers[0]?.name;
  const primaryCustomer = payload.entities.customers[0]?.name;

  if (primaryOrder) {
    prompts.add(`What changed recently for ${primaryOrder}?`);
  }

  if (primarySupplier) {
    prompts.add(`What supplier signals are driving the issue for ${primarySupplier}?`);
  }

  if (primaryCustomer) {
    prompts.add(`Summarize customer impact for ${primaryCustomer}.`);
  }

  prompts.add("What should be escalated first?");
  prompts.add("Summarize this for finance handoff.");

  if (reasoningMode !== "deep") {
    prompts.add("Run a deeper investigation with more evidence.");
  }

  return Array.from(prompts)
    .filter((prompt) => prompt.toLowerCase() !== question.trim().toLowerCase())
    .slice(0, 4);
}

async function requestBackend<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 15000
): Promise<T> {
  if (!isBackendConfigured()) {
    throw new Error(
      "OpsBrain backend is not configured. Set OPSBRAIN_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL."
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  const method = (init?.method ?? "GET").toUpperCase();
  const headers = new Headers(init?.headers);

  if (method !== "GET" && method !== "HEAD" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (BACKEND_SERVICE_API_KEY && !headers.has("X-API-Key")) {
    headers.set("X-API-Key", BACKEND_SERVICE_API_KEY);
  }

  try {
    let response: Response;

    try {
      response = await fetch(`${BACKEND_BASE_URL}${path}`, {
        ...init,
        cache: "no-store",
        headers,
        signal: controller.signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("OpsBrain backend timed out while processing the request.");
      }

      throw error;
    }

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `OpsBrain backend request failed with status ${response.status}.`);
    }

    return response.json() as Promise<T>;
  } finally {
    clearTimeout(timeout);
  }
}

function mapWorkspaceResponse(
  question: string,
  reasoningMode: OpsWorkspaceReasoningMode,
  payload: BackendAskResponse
): OpsWorkspaceResponse {
  const evidence = [
    ...payload.structured.evidence.map((item, index) => ({
      id: `finding-${index}`,
      snippet: item,
    })),
    ...payload.citations.map((citation, index) => ({
      id: `citation-${index}-${citation.chunk_id}`,
      snippet: citation.snippet,
      sourceId: citation.source_id,
      chunkId: citation.chunk_id,
    })),
  ].slice(0, 8);

  const relatedEntities = [
    ...payload.entities.orders.map((order) => ({
      id: order.order_number,
      label: `Order ${order.order_number}`,
      type: "order" as const,
    })),
    ...payload.entities.customers.map((customer) => ({
      id: customer.id,
      label: customer.name,
      type: "customer" as const,
    })),
    ...payload.entities.suppliers.map((supplier) => ({
      id: supplier.id,
      label: supplier.name,
      type: "supplier" as const,
    })),
  ];

  return {
    narrative: payload.answer,
    diagnosis: payload.structured.summary || null,
    keyFindings: payload.structured.key_findings,
    evidence,
    recommendedActions: payload.structured.recommended_actions,
    relatedEntities,
    followUpPrompts: buildFollowUpPrompts(question, reasoningMode, payload),
    reasoningMode,
    sourceLabel: payload.raw_model_output
      ? "OpsBrain reasoning backend"
      : "OpsBrain retrieval backend",
  };
}

export async function getOpsWorkspaceStatus(): Promise<OpsWorkspaceStatus> {
  if (!isBackendConfigured()) {
    return {
      status: "not_configured",
      headline: "Backend not configured",
      detail:
        "Set OPSBRAIN_API_BASE_URL or NEXT_PUBLIC_API_BASE_URL to enable live operational queries.",
    };
  }

  try {
    await requestBackend<{ status?: string }>("/api/health", undefined, 4000);

    return {
      status: "connected",
      headline: "Live backend connected",
      detail:
        "Queries route through the configured OpsBrain API and return backend-driven operational context.",
    };
  } catch {
    return {
      status: "unavailable",
      headline: "Backend unreachable",
      detail:
        "OpsBrain could not reach the configured API. This workspace does not generate local fallback answers.",
    };
  }
}

export async function queryOpsWorkspaceFromBackend(
  input: OpsWorkspaceQueryInput
): Promise<OpsWorkspaceResponse> {
  const question = input.question.trim();

  if (!question) {
    throw new Error("Enter a question before submitting.");
  }

  const payload = await requestBackend<BackendAskResponse>(
    "/api/ask",
    {
      method: "POST",
      body: JSON.stringify({
        question: buildConversationQuestion(question, input.history),
        entity_hints: {
          order_numbers: collectOrderHints(question, input.history),
          customer_ids: [],
          supplier_ids: [],
        },
        k: reasoningDepth(input.reasoningMode),
      }),
    },
    45000
  );

  return mapWorkspaceResponse(question, input.reasoningMode, payload);
}
