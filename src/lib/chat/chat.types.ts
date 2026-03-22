export type ChatRole = "system" | "user" | "assistant";

export type MessageStatus = "idle" | "sending" | "streaming" | "done" | "error";

export interface ChatMessage {
  id: string;
  conversationId: string;
  role: ChatRole;
  content: string;
  status: MessageStatus;
  createdAt: string;
  errorMessage?: string;
}

export interface ChatConversation {
  id: string;
  title: string;
  createdAt: string;
  lastUsedAt: string;
}
