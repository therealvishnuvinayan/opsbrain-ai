"use client";

import type { ChatConversation, ChatMessage, ChatRole, MessageStatus } from "@/lib/chat/chat.types";

interface ConversationListResponse {
  items: ChatConversation[];
}

interface ConversationDetailResponse {
  item: ChatConversation;
  messages: ChatMessage[];
}

interface ConversationItemResponse {
  item: ChatConversation;
}

interface MessageItemResponse {
  item: ChatMessage;
  conversation: ChatConversation;
}

interface AiQueryResponse {
  answer: string;
  sources: Array<{
    type: string;
    endpoint?: string;
  }>;
}

type AiStreamEvent =
  | { type: "start"; sources: Array<{ type: string; endpoint?: string }> }
  | { type: "chunk"; delta: string; content: string }
  | { type: "done"; content: string; sources: Array<{ type: string; endpoint?: string }> }
  | { type: "error"; message: string };

const DEV_STREAM_PACING_MS = process.env.NODE_ENV === "development" ? 100 : 0;

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (response.ok) {
    return (await response.json()) as T;
  }

  let message = "Request failed.";

  try {
    const payload = (await response.json()) as { message?: string };
    if (payload.message) {
      message = payload.message;
    }
  } catch {
    const text = await response.text();
    if (text.trim()) {
      message = text;
    }
  }

  throw new Error(message);
}

export async function listChatConversations() {
  const response = await fetch("/api/chat/conversations", {
    method: "GET",
    cache: "no-store",
  });

  const payload = await parseJsonResponse<ConversationListResponse>(response);
  return payload.items;
}

export async function getChatConversation(conversationId: string) {
  const response = await fetch(`/api/chat/conversations/${conversationId}`, {
    method: "GET",
    cache: "no-store",
  });

  return parseJsonResponse<ConversationDetailResponse>(response);
}

export async function createChatConversation(title?: string) {
  const response = await fetch("/api/chat/conversations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title }),
  });

  const payload = await parseJsonResponse<ConversationItemResponse>(response);
  return payload.item;
}

export async function appendChatMessage(
  conversationId: string,
  body: {
    role: ChatRole;
    content: string;
    status?: MessageStatus;
    title?: string;
  }
) {
  const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  return parseJsonResponse<MessageItemResponse>(response);
}

export async function queryAi(question: string, conversationId?: string | null) {
  const response = await fetch("/api/ai/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question,
      conversationId,
    }),
  });

  return parseJsonResponse<AiQueryResponse>(response);
}

export async function streamAiQuery(
  body: {
    question: string;
    conversationId?: string | null;
  },
  handlers: {
    onStart?: (payload: { sources: Array<{ type: string; endpoint?: string }> }) => void | Promise<void>;
    onChunk: (payload: { delta: string; content: string }) => void | Promise<void>;
    onDone: (
      payload: { content: string; sources: Array<{ type: string; endpoint?: string }> }
    ) => void | Promise<void>;
    onError?: (payload: { message: string }) => void | Promise<void>;
  }
) {
  const response = await fetch("/api/ai/stream", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      question: body.question,
      conversationId: body.conversationId,
    }),
  });

  if (!response.ok) {
    await parseJsonResponse(response);
  }

  const streamBody = response.body;
  if (!streamBody) {
    throw new Error("Assistant stream body is unavailable.");
  }

  const reader = streamBody.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    const decodedChunk = decoder.decode(value, { stream: true });
    console.debug("ai stream raw chunk", decodedChunk);
    buffer += decodedChunk;
    const events = buffer.split("\n\n");
    buffer = events.pop() ?? "";

    for (const eventBlock of events) {
      const dataLines = eventBlock
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line.startsWith("data:"));

      for (const line of dataLines) {
        const data = line.slice(5).trim();

        if (!data) {
          continue;
        }

        const event = JSON.parse(data) as AiStreamEvent;
        console.debug("ai stream parsed event", event);

        if (event.type === "start") {
          await handlers.onStart?.({
            sources: event.sources,
          });
          continue;
        }

        if (event.type === "chunk") {
          console.debug("ai stream chunk", event.delta);
          await handlers.onChunk({
            delta: event.delta,
            content: event.content,
          });
          if (DEV_STREAM_PACING_MS > 0) {
            // Dev-only pacing so progressive updates are visually obvious while debugging.
            await new Promise((resolve) => window.setTimeout(resolve, DEV_STREAM_PACING_MS));
          }
          continue;
        }

        if (event.type === "done") {
          console.debug("ai stream done");
          await handlers.onDone({
            content: event.content,
            sources: event.sources,
          });
          continue;
        }

        if (event.type === "error") {
          await handlers.onError?.({ message: event.message });
          throw new Error(event.message);
        }
      }
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    const line = trailing.startsWith("data:") ? trailing.slice(5).trim() : trailing;
    const event = JSON.parse(line) as AiStreamEvent;
    if (event.type === "done") {
      await handlers.onDone({
        content: event.content,
        sources: event.sources,
      });
      return;
    }
    if (event.type === "error") {
      await handlers.onError?.({ message: event.message });
      throw new Error(event.message);
    }
  }
}
