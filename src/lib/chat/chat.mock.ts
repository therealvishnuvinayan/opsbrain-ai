import type { ChatConversation, ChatMessage } from "@/lib/chat/chat.types";

const now = new Date();
const today = now.toISOString();
const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
const earlier = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString();

export const mockConversations: ChatConversation[] = [
  {
    id: "conv-supplier",
    title: "Supplier incident summary",
    createdAt: today,
    lastUsedAt: today,
  },
  {
    id: "conv-random",
    title: "Random Text Input",
    createdAt: yesterday,
    lastUsedAt: yesterday,
  },
  {
    id: "conv-recon",
    title: "Reconciliation mismatch review",
    createdAt: earlier,
    lastUsedAt: earlier,
  },
];

export const mockMessagesByConversation: Record<string, ChatMessage[]> = {
  "conv-supplier": [
    {
      id: "msg-supplier-user",
      conversationId: "conv-supplier",
      role: "user",
      content: "Show me the latest supplier incidents and summarize root causes.",
      status: "done",
      createdAt: today,
    },
    {
      id: "msg-supplier-assistant",
      conversationId: "conv-supplier",
      role: "assistant",
      content:
        "The main root causes are upstream webhook latency, duplicate callback retries, and two supplier authentication failures that caused blocked order confirmations.",
      status: "done",
      createdAt: today,
    },
  ],
  "conv-random": [
    {
      id: "msg-random-user",
      conversationId: "conv-random",
      role: "user",
      content: "Can you check whether the Bamboo health checks are still running?",
      status: "done",
      createdAt: yesterday,
    },
    {
      id: "msg-random-streaming",
      conversationId: "conv-random",
      role: "assistant",
      content: "",
      status: "streaming",
      createdAt: yesterday,
    },
  ],
  "conv-recon": [
    {
      id: "msg-recon-user",
      conversationId: "conv-recon",
      role: "user",
      content: "Explain the payout mismatch from last Friday.",
      status: "done",
      createdAt: earlier,
    },
    {
      id: "msg-recon-error",
      conversationId: "conv-recon",
      role: "assistant",
      content: "I couldn't complete that analysis right now.",
      status: "error",
      createdAt: earlier,
      errorMessage: "Mock upstream timeout while loading reconciliation evidence.",
    },
  ],
};
