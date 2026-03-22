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
