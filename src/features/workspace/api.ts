import type {
  OpsWorkspaceQueryInput,
  OpsWorkspaceResponse,
  OpsWorkspaceStatus,
} from "@/features/workspace/types";

interface RequestJsonOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

async function requestJson<T>(
  input: string,
  init?: RequestInit,
  options?: RequestJsonOptions
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const method = (init?.method ?? "GET").toUpperCase();
  const signal =
    options?.signal ? AbortSignal.any([controller.signal, options.signal]) : controller.signal;

  try {
    let response: Response;

    try {
      response = await fetch(input, {
        ...init,
        cache: "no-store",
        headers: {
          ...(method !== "GET" && method !== "HEAD"
            ? { "Content-Type": "application/json" }
            : {}),
          ...(init?.headers ?? {}),
        },
        signal,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("The request timed out before OpsBrain returned a response.");
      }

      throw error;
    }

    if (!response.ok) {
      let message = `Request failed with status ${response.status}.`;

      try {
        const errorPayload = (await response.json()) as { message?: string };
        if (typeof errorPayload.message === "string" && errorPayload.message.trim()) {
          message = errorPayload.message;
        }
      } catch {
        const text = await response.text();
        if (text.trim()) {
          message = text;
        }
      }

      throw new Error(message);
    }

    return response.json() as Promise<T>;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchOpsWorkspaceStatus() {
  return requestJson<OpsWorkspaceStatus>("/api/workspace/status", undefined, {
    timeoutMs: 6000,
  });
}

export async function sendMessage(
  input: OpsWorkspaceQueryInput,
  options?: RequestJsonOptions
) {
  return requestJson<OpsWorkspaceResponse>(
    "/api/workspace/query",
    {
      method: "POST",
      body: JSON.stringify(input),
    },
    {
      timeoutMs: options?.timeoutMs ?? 45000,
      signal: options?.signal,
    }
  );
}

export async function queryOpsWorkspace(input: OpsWorkspaceQueryInput) {
  return sendMessage(input);
}
