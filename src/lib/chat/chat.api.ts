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

interface StreamDonePayload {
  item: ChatMessage;
  conversation: ChatConversation;
}

type StreamEvent =
  | { type: "chunk"; delta: string; content: string }
  | { type: "done"; payload: StreamDonePayload }
  | { type: "error"; message: string };

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

export async function streamAssistantMessage(
  conversationId: string,
  body: {
    prompt: string;
  },
  handlers: {
    onChunk: (payload: { delta: string; content: string }) => void;
    onDone: (payload: StreamDonePayload) => void;
  }
) {
  const response = await fetch(`/api/chat/conversations/${conversationId}/stream`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok || !response.body) {
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

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      const event = JSON.parse(trimmed) as StreamEvent;

      if (event.type === "chunk") {
        console.debug("chat stream chunk", event.delta);
        handlers.onChunk({
          delta: event.delta,
          content: event.content,
        });
        continue;
      }

      if (event.type === "done") {
        console.debug("chat stream done");
        handlers.onDone(event.payload);
        continue;
      }

      if (event.type === "error") {
        throw new Error(event.message);
      }
    }
  }

  const trailing = buffer.trim();
  if (trailing) {
    const event = JSON.parse(trailing) as StreamEvent;
    if (event.type === "done") {
      handlers.onDone(event.payload);
      return;
    }
    if (event.type === "error") {
      throw new Error(event.message);
    }
  }
}
