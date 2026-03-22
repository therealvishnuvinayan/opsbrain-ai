"use client";

import { create } from "zustand";

import {
  appendChatMessage,
  createChatConversation,
  getChatConversation,
  listChatConversations,
} from "@/lib/chat/chat.api";
import type { ChatConversation, ChatMessage } from "@/lib/chat/chat.types";
import { createChatId, createConversationTitle, getMockAssistantReply } from "@/lib/chat/chat.utils";

type ChatViewMode = "home" | "thread";

const ACTIVE_CONVERSATION_STORAGE_KEY = "bamboo-ai-active-conversation-id";

interface ChatState {
  activeConversationId: string | null;
  messagesByConversation: Record<string, ChatMessage[]>;
  conversations: ChatConversation[];
  input: string;
  isSubmitting: boolean;
  isStreaming: boolean;
  viewMode: ChatViewMode;
  isInitialized: boolean;
  isLoadingConversations: boolean;
  isLoadingConversation: boolean;
  setInput: (value: string) => void;
  initialize: () => Promise<void>;
  setActiveConversation: (conversationId: string | null) => Promise<void>;
  createConversation: (title?: string) => Promise<string>;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updater: Partial<ChatMessage> | ((message: ChatMessage) => ChatMessage)
  ) => void;
  goHome: () => void;
  sendMockMessage: (overrideInput?: string) => Promise<void>;
}

function readStoredActiveConversationId() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(ACTIVE_CONVERSATION_STORAGE_KEY);
}

function writeStoredActiveConversationId(conversationId: string | null) {
  if (typeof window === "undefined") {
    return;
  }

  if (conversationId) {
    window.localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, conversationId);
  } else {
    window.localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
  }
}

function upsertConversation(conversations: ChatConversation[], conversation: ChatConversation) {
  const nextConversations = conversations.filter((item) => item.id !== conversation.id);
  nextConversations.unshift(conversation);
  return nextConversations.sort(
    (left, right) => new Date(right.lastUsedAt).getTime() - new Date(left.lastUsedAt).getTime()
  );
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeConversationId: null,
  messagesByConversation: {},
  conversations: [],
  input: "",
  isSubmitting: false,
  isStreaming: false,
  viewMode: "home",
  isInitialized: false,
  isLoadingConversations: false,
  isLoadingConversation: false,

  setInput: (value) => set({ input: value }),

  initialize: async () => {
    const state = get();

    if (state.isInitialized || state.isLoadingConversations) {
      return;
    }

    set({ isLoadingConversations: true });

    try {
      const conversations = await listChatConversations();
      const preferredConversationId = readStoredActiveConversationId();
      const activeConversationId =
        preferredConversationId && conversations.some((conversation) => conversation.id === preferredConversationId)
          ? preferredConversationId
          : null;

      set({
        conversations,
        activeConversationId,
        viewMode: activeConversationId ? "thread" : "home",
        isInitialized: true,
        isLoadingConversations: false,
      });

      if (activeConversationId) {
        await get().setActiveConversation(activeConversationId);
      }
    } catch {
      set({
        conversations: [],
        activeConversationId: null,
        viewMode: "home",
        isInitialized: true,
        isLoadingConversations: false,
      });
    }
  },

  setActiveConversation: async (conversationId) => {
    if (!conversationId) {
      writeStoredActiveConversationId(null);
      set({
        activeConversationId: null,
        viewMode: "home",
        isLoadingConversation: false,
      });
      return;
    }

    writeStoredActiveConversationId(conversationId);
    set({
      activeConversationId: conversationId,
      viewMode: "thread",
      isLoadingConversation: true,
    });

    try {
      const payload = await getChatConversation(conversationId);
      set((state) => ({
        conversations: upsertConversation(state.conversations, payload.item),
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: payload.messages,
        },
        isLoadingConversation: false,
      }));
    } catch {
      set({
        isLoadingConversation: false,
      });
    }
  },

  createConversation: async (title = "New chat") => {
    const conversation = await createChatConversation(title);

    writeStoredActiveConversationId(conversation.id);
    set((state) => ({
      conversations: upsertConversation(state.conversations, conversation),
      messagesByConversation: {
        ...state.messagesByConversation,
        [conversation.id]: state.messagesByConversation[conversation.id] ?? [],
      },
      activeConversationId: conversation.id,
      viewMode: "thread",
    }));

    return conversation.id;
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

  goHome: () => {
    writeStoredActiveConversationId(null);
    set({
      activeConversationId: null,
      viewMode: "home",
      input: "",
      isLoadingConversation: false,
    });
  },

  sendMockMessage: async (overrideInput) => {
    const state = get();
    const prompt = (overrideInput ?? state.input).trim();

    if (!prompt || state.isSubmitting) {
      return;
    }

    let conversationId = state.activeConversationId;
    let conversationTitle = createConversationTitle(prompt);

    if (!conversationId) {
      try {
        conversationId = await get().createConversation("New chat");
      } catch {
        set({
          isSubmitting: false,
          isStreaming: false,
        });
        return;
      }
    } else {
      const currentConversation = get().conversations.find((conversation) => conversation.id === conversationId);
      conversationTitle =
        currentConversation?.title && currentConversation.title !== "New chat"
          ? currentConversation.title
          : createConversationTitle(prompt);
    }

    const timestamp = new Date().toISOString();
    const userMessageId = createChatId("msg");
    const assistantMessageId = createChatId("msg");
    const shouldUpdateTitle =
      get().conversations.find((conversation) => conversation.id === conversationId)?.title === "New chat";

    set((current) => ({
      input: "",
      isSubmitting: true,
      isStreaming: true,
      activeConversationId: conversationId,
      viewMode: "thread",
      conversations: current.conversations.map((conversation) =>
        conversation.id === conversationId
          ? {
              ...conversation,
              title: shouldUpdateTitle ? conversationTitle : conversation.title,
              lastUsedAt: timestamp,
            }
          : conversation
      ),
      messagesByConversation: {
        ...current.messagesByConversation,
        [conversationId]: [
          ...(current.messagesByConversation[conversationId] ?? []),
          {
            id: userMessageId,
            conversationId,
            role: "user",
            content: prompt,
            status: "sending",
            createdAt: timestamp,
          },
          {
            id: assistantMessageId,
            conversationId,
            role: "assistant",
            content: "",
            status: "streaming",
            createdAt: timestamp,
          },
        ],
      },
    }));

    try {
      const persistedUserMessage = await appendChatMessage(conversationId, {
        role: "user",
        content: prompt,
        status: "done",
        ...(shouldUpdateTitle ? { title: conversationTitle } : {}),
      });

      set((current) => ({
        conversations: upsertConversation(current.conversations, persistedUserMessage.conversation),
        messagesByConversation: {
          ...current.messagesByConversation,
          [conversationId]: (current.messagesByConversation[conversationId] ?? []).map((message) =>
            message.id === userMessageId
              ? {
                  ...persistedUserMessage.item,
                  status: "done",
                }
              : message
          ),
        },
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Message could not be saved.";

      set((current) => ({
        isSubmitting: false,
        isStreaming: false,
        messagesByConversation: {
          ...current.messagesByConversation,
          [conversationId]: (current.messagesByConversation[conversationId] ?? []).map((item) => {
            if (item.id === userMessageId) {
              return {
                ...item,
                status: "error",
                errorMessage: message,
              };
            }

            if (item.id === assistantMessageId) {
              return {
                ...item,
                content: "I couldn't save that message to the conversation.",
                status: "error",
                errorMessage: message,
              };
            }

            return item;
          }),
        },
      }));

      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 950));

    const reply = getMockAssistantReply(prompt);
    const isError = reply.length === 0;

    try {
      const persistedAssistantMessage = await appendChatMessage(conversationId, {
        role: "assistant",
        content: isError
          ? "I couldn't complete that mock request. Try asking again or narrow the scope."
          : reply,
        status: isError ? "error" : "done",
      });

      set((current) => ({
        isSubmitting: false,
        isStreaming: false,
        conversations: upsertConversation(current.conversations, persistedAssistantMessage.conversation),
        messagesByConversation: {
          ...current.messagesByConversation,
          [conversationId]: (current.messagesByConversation[conversationId] ?? []).map((message) =>
            message.id === assistantMessageId
              ? {
                  ...persistedAssistantMessage.item,
                  errorMessage: isError
                    ? "Mock request failed before a backend response was available."
                    : undefined,
                }
              : message
          ),
        },
      }));
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Assistant response could not be saved.";

      set((current) => ({
        isSubmitting: false,
        isStreaming: false,
        messagesByConversation: {
          ...current.messagesByConversation,
          [conversationId]: (current.messagesByConversation[conversationId] ?? []).map((item) =>
            item.id === assistantMessageId
              ? {
                  ...item,
                  content: "I couldn't save the assistant response.",
                  status: "error",
                  errorMessage: message,
                }
              : item
          ),
        },
      }));
    }
  },
}));
