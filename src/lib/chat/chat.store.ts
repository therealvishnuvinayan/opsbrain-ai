"use client";

import { create } from "zustand";

import { mockConversations, mockMessagesByConversation } from "@/lib/chat/chat.mock";
import type { ChatConversation, ChatMessage } from "@/lib/chat/chat.types";
import { createChatId, createConversationTitle, getMockAssistantReply } from "@/lib/chat/chat.utils";

type ChatViewMode = "home" | "thread";

interface ChatState {
  activeConversationId: string | null;
  messagesByConversation: Record<string, ChatMessage[]>;
  conversations: ChatConversation[];
  input: string;
  isSubmitting: boolean;
  isStreaming: boolean;
  viewMode: ChatViewMode;
  setInput: (value: string) => void;
  setActiveConversation: (conversationId: string | null) => void;
  createConversation: (title?: string) => string;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updater: Partial<ChatMessage> | ((message: ChatMessage) => ChatMessage)
  ) => void;
  goHome: () => void;
  sendMockMessage: (overrideInput?: string) => Promise<void>;
}

function touchConversation(
  conversations: ChatConversation[],
  conversationId: string,
  updates: Partial<ChatConversation>
) {
  return conversations.map((conversation) =>
    conversation.id === conversationId ? { ...conversation, ...updates } : conversation
  );
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeConversationId: null,
  messagesByConversation: mockMessagesByConversation,
  conversations: mockConversations,
  input: "",
  isSubmitting: false,
  isStreaming: false,
  viewMode: "home",

  setInput: (value) => set({ input: value }),

  setActiveConversation: (conversationId) =>
    set({
      activeConversationId: conversationId,
      viewMode: conversationId ? "thread" : "home",
    }),

  createConversation: (title = "New chat") => {
    const timestamp = new Date().toISOString();
    const conversationId = createChatId("conv");

    set((state) => ({
      conversations: [
        {
          id: conversationId,
          title,
          createdAt: timestamp,
          lastUsedAt: timestamp,
        },
        ...state.conversations,
      ],
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [],
      },
      activeConversationId: conversationId,
      viewMode: "thread",
    }));

    return conversationId;
  },

  addMessage: (conversationId, message) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: [...(state.messagesByConversation[conversationId] ?? []), message],
      },
    })),

  updateMessage: (conversationId, messageId, updater) =>
    set((state) => ({
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversationId]: (state.messagesByConversation[conversationId] ?? []).map((message) => {
          if (message.id !== messageId) {
            return message;
          }

          return typeof updater === "function" ? updater(message) : { ...message, ...updater };
        }),
      },
    })),

  goHome: () =>
    set({
      activeConversationId: null,
      viewMode: "home",
      input: "",
    }),

  sendMockMessage: async (overrideInput) => {
    const state = get();
    const prompt = (overrideInput ?? state.input).trim();

    if (!prompt || state.isSubmitting) {
      return;
    }

    const nextConversationId =
      state.activeConversationId ?? get().createConversation(createConversationTitle(prompt));
    const timestamp = new Date().toISOString();
    const userMessageId = createChatId("msg");
    const assistantMessageId = createChatId("msg");

    set((current) => ({
      input: "",
      isSubmitting: true,
      isStreaming: true,
      activeConversationId: nextConversationId,
      viewMode: "thread",
      conversations: touchConversation(current.conversations, nextConversationId, {
        title:
          current.conversations.find((conversation) => conversation.id === nextConversationId)?.title ===
          "New chat"
            ? createConversationTitle(prompt)
            : current.conversations.find((conversation) => conversation.id === nextConversationId)?.title ??
              createConversationTitle(prompt),
        lastUsedAt: timestamp,
      }),
      messagesByConversation: {
        ...current.messagesByConversation,
        [nextConversationId]: [
          ...(current.messagesByConversation[nextConversationId] ?? []),
          {
            id: userMessageId,
            conversationId: nextConversationId,
            role: "user",
            content: prompt,
            status: "done",
            createdAt: timestamp,
          },
          {
            id: assistantMessageId,
            conversationId: nextConversationId,
            role: "assistant",
            content: "",
            status: "streaming",
            createdAt: timestamp,
          },
        ],
      },
    }));

    await new Promise((resolve) => window.setTimeout(resolve, 950));

    const reply = getMockAssistantReply(prompt);
    const isError = reply.length === 0;

    set((current) => ({
      isSubmitting: false,
      isStreaming: false,
      conversations: touchConversation(current.conversations, nextConversationId, {
        lastUsedAt: new Date().toISOString(),
      }),
      messagesByConversation: {
        ...current.messagesByConversation,
        [nextConversationId]: (current.messagesByConversation[nextConversationId] ?? []).map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: isError
                  ? "I couldn't complete that mock request. Try asking again or narrow the scope."
                  : reply,
                status: isError ? "error" : "done",
                errorMessage: isError ? "Mock request failed before a backend response was available." : undefined,
              }
            : message
        ),
      },
    }));
  },
}));
