import type {
  ZendeskAutopilotCase,
  ZendeskAutopilotListResponse,
  ZendeskAutopilotProcessResponse,
  ZendeskSimulateTicketInput,
} from "@/features/zendesk/types";

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000"
).replace(/\/$/, "");

function isApiConfigured() {
  return API_BASE_URL.length > 0;
}

interface RequestJsonOptions {
  timeoutMs?: number;
}

async function requestJson<T>(
  path: string,
  init?: RequestInit,
  options?: RequestJsonOptions
): Promise<T> {
  if (!isApiConfigured()) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL is not configured");
  }

  const timeoutMs = options?.timeoutMs ?? 15000;
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort("request-timeout"), timeoutMs);

  const method = (init?.method ?? "GET").toUpperCase();
  const shouldSetJsonHeader = method !== "GET" && method !== "HEAD";

  try {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...init,
        headers: {
          ...(shouldSetJsonHeader ? { "Content-Type": "application/json" } : {}),
          ...(init?.headers ?? {}),
        },
        cache: "no-store",
        signal: controller.signal,
      });
    } catch (fetchError) {
      if (fetchError instanceof Error && fetchError.name === "AbortError") {
        throw new Error(
          `Request timed out after ${Math.round(
            timeoutMs / 1000
          )}s. The backend is still processing or unreachable.`
        );
      }
      throw fetchError;
    }

    if (!response.ok) {
      const message = await response.text();
      throw new Error(`API request failed (${response.status}): ${message}`);
    }

    return response.json() as Promise<T>;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchZendeskAutopilotCases(
  limit = 20,
  offset = 0
): Promise<ZendeskAutopilotListResponse> {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  return requestJson<ZendeskAutopilotListResponse>(`/api/zendesk/autopilot/tickets?${params.toString()}`);
}

export async function fetchZendeskAutopilotCase(ticketId: string): Promise<ZendeskAutopilotCase> {
  return requestJson<ZendeskAutopilotCase>(`/api/zendesk/autopilot/tickets/${encodeURIComponent(ticketId)}`);
}

export async function simulateZendeskTicket(
  payload: ZendeskSimulateTicketInput
): Promise<ZendeskAutopilotProcessResponse> {
  return requestJson<ZendeskAutopilotProcessResponse>(
    "/api/webhooks/zendesk/simulate",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    { timeoutMs: 90000 }
  );
}

export function canUseZendeskBackendApi() {
  return isApiConfigured();
}
