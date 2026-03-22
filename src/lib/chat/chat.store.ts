"use client";

import { create } from "zustand";

import {
  appendChatMessage,
  createChatConversation,
  getChatConversation,
  listChatConversations,
  streamAiQuery,
} from "@/lib/chat/chat.api";
import type { ChatConversation, ChatMessage } from "@/lib/chat/chat.types";
import { createChatId, createConversationTitle } from "@/lib/chat/chat.utils";

type ChatViewMode = "home" | "thread";

const ACTIVE_CONVERSATION_STORAGE_KEY = "bamboo-ai-active-conversation-id";
export const DRAFT_CONVERSATION_ID = "__draft_conversation__";
let pendingCreateConversation: Promise<string> | null = null;

interface ChatState {
  activeConversationId: string | null;
  messagesByConversation: Record<string, ChatMessage[]>;
  conversations: ChatConversation[];
  input: string;
  isCreatingConversation: boolean;
  isSubmitting: boolean;
  isStreaming: boolean;
  viewMode: ChatViewMode;
  isInitialized: boolean;
  isLoadingConversations: boolean;
  isLoadingConversation: boolean;
  setInput: (value: string) => void;
  initialize: () => Promise<void>;
  openDraftConversation: () => void;
  setActiveConversation: (conversationId: string | null) => Promise<void>;
  createConversation: (title?: string) => Promise<string>;
  addMessage: (conversationId: string, message: ChatMessage) => void;
  updateMessage: (
    conversationId: string,
    messageId: string,
    updater: Partial<ChatMessage> | ((message: ChatMessage) => ChatMessage)
  ) => void;
  goHome: () => void;
  sendMockMessage: (overrideInput?: string) => Promise<string | null>;
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

function replaceMessageOrAppend(
  messages: ChatMessage[],
  targetMessageId: string,
  nextMessage: ChatMessage
) {
  const targetIndex = messages.findIndex((message) => message.id === targetMessageId);

  if (targetIndex === -1) {
    return [...messages, nextMessage];
  }

  return messages.map((message, index) => (index === targetIndex ? nextMessage : message));
}

function updateAssistantPlaceholder(
  currentMessages: ChatMessage[],
  options: {
    assistantMessageId: string;
    conversationId: string;
    createdAt: string;
    content: string;
    status: ChatMessage["status"];
    errorMessage?: string;
  }
) {
  return replaceMessageOrAppend(currentMessages, options.assistantMessageId, {
    id: options.assistantMessageId,
    conversationId: options.conversationId,
    role: "assistant",
    content: options.content,
    status: options.status,
    createdAt: options.createdAt,
    errorMessage: options.errorMessage,
  });
}

export const useChatStore = create<ChatState>((set, get) => ({
  activeConversationId: null,
  messagesByConversation: {},
  conversations: [],
  input: "",
  isCreatingConversation: false,
  isSubmitting: false,
  isStreaming: false,
  viewMode: "home",
  isInitialized: false,
  isLoadingConversations: false,
  isLoadingConversation: false,

  setInput: (value) => set({ input: value }),

  openDraftConversation: () => {
    writeStoredActiveConversationId(null);
    set((state) => ({
      activeConversationId: DRAFT_CONVERSATION_ID,
      viewMode: "thread",
      input: "",
      isSubmitting: false,
      isStreaming: false,
      isLoadingConversation: false,
      messagesByConversation: {
        ...state.messagesByConversation,
        [DRAFT_CONVERSATION_ID]: [],
      },
    }));
  },

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

    const existingMessages = get().messagesByConversation[conversationId] ?? [];

    writeStoredActiveConversationId(conversationId);
    set({
      activeConversationId: conversationId,
      viewMode: "thread",
      isLoadingConversation: existingMessages.length === 0,
    });

    try {
      const payload = await getChatConversation(conversationId);
      set((state) => ({
        // Preserve optimistic local messages when the server thread is still catching up.
        // This avoids wiping the draft thread immediately after route replacement.
        // Once the server returns the same or more messages, it becomes the source of truth.
        conversations: upsertConversation(state.conversations, payload.item),
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: (() => {
            const localMessages = state.messagesByConversation[conversationId] ?? [];
            const shouldPreserveLocal =
              localMessages.some(
                (message) => message.status === "sending" || message.status === "streaming"
              ) || localMessages.length > payload.messages.length;

            return shouldPreserveLocal ? localMessages : payload.messages;
          })(),
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
    if (pendingCreateConversation) {
      return pendingCreateConversation;
    }

    set({ isCreatingConversation: true });

    pendingCreateConversation = (async () => {
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
    })();

    try {
      return await pendingCreateConversation;
    } finally {
      pendingCreateConversation = null;
      set({ isCreatingConversation: false });
    }
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
    set((state) => {
      const { [DRAFT_CONVERSATION_ID]: _draftMessages, ...restMessages } = state.messagesByConversation;

      return {
        activeConversationId: null,
        viewMode: "home",
        input: "",
        isLoadingConversation: false,
        isSubmitting: false,
        isStreaming: false,
        messagesByConversation: restMessages,
      };
    });
  },

  sendMockMessage: async (overrideInput) => {
    const state = get();
    const prompt = (overrideInput ?? state.input).trim();

    if (!prompt || state.isSubmitting || state.isCreatingConversation) {
      return null;
    }

    set({
      isSubmitting: true,
    });

    const isDraftConversation =
      !state.activeConversationId || state.activeConversationId === DRAFT_CONVERSATION_ID;
    let conversationId: string = isDraftConversation
      ? DRAFT_CONVERSATION_ID
      : (state.activeConversationId as string);
    let conversationTitle = createConversationTitle(prompt);
    const timestamp = new Date().toISOString();
    const userMessageId = createChatId("msg");
    const assistantMessageId = createChatId("msg");
    let shouldUpdateTitle = isDraftConversation;

    set((current) => ({
      input: "",
      isStreaming: true,
      activeConversationId: conversationId,
      viewMode: "thread",
      conversations: current.conversations.map((conversation) => {
        if (conversation.id !== conversationId) {
          return conversation;
        }

        return {
          ...conversation,
          title: shouldUpdateTitle ? conversationTitle : conversation.title,
          lastUsedAt: timestamp,
        };
      }),
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

    if (isDraftConversation) {
      try {
        const createdConversationId = await get().createConversation("New chat");
        conversationId = createdConversationId;

        set((current) => {
          const draftMessages = current.messagesByConversation[DRAFT_CONVERSATION_ID] ?? [];
          const { [DRAFT_CONVERSATION_ID]: _draftMessages, ...restMessages } =
            current.messagesByConversation;

          return {
            activeConversationId: createdConversationId,
            conversations: current.conversations.map((conversation) =>
              conversation.id === createdConversationId
                ? {
                    ...conversation,
                    title: conversationTitle,
                    lastUsedAt: timestamp,
                  }
                : conversation
            ),
            messagesByConversation: {
              ...restMessages,
              [createdConversationId]: draftMessages.map((message) => ({
                ...message,
                conversationId: createdConversationId,
              })),
            },
          };
        });
      } catch {
        set((current) => ({
          input: overrideInput === undefined ? state.input : "",
          isSubmitting: false,
          isStreaming: false,
          messagesByConversation: {
            ...current.messagesByConversation,
            [DRAFT_CONVERSATION_ID]: (current.messagesByConversation[DRAFT_CONVERSATION_ID] ?? []).map(
              (message) => {
                if (message.id === userMessageId) {
                  return {
                    ...message,
                    status: "error",
                    errorMessage: "Conversation could not be created.",
                  };
                }

                if (message.id === assistantMessageId) {
                  return {
                    ...message,
                    content: "I couldn't create a conversation for that message.",
                    status: "error",
                    errorMessage: "Conversation could not be created.",
                  };
                }

                return message;
              }
            ),
          },
        }));
        return null;
      }
    } else {
      const currentConversation = get().conversations.find((conversation) => conversation.id === conversationId);
      conversationTitle =
        currentConversation?.title && currentConversation.title !== "New chat"
          ? currentConversation.title
          : createConversationTitle(prompt);
      shouldUpdateTitle = currentConversation?.title === "New chat";
    }

    void (async () => {
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
            [conversationId]: replaceMessageOrAppend(
              current.messagesByConversation[conversationId] ?? [],
              userMessageId,
              {
                ...persistedUserMessage.item,
                status: "done",
              }
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
            [conversationId]: replaceMessageOrAppend(
              replaceMessageOrAppend(
                current.messagesByConversation[conversationId] ?? [],
                userMessageId,
                {
                  id: userMessageId,
                  conversationId,
                  role: "user",
                  content: prompt,
                  status: "error",
                  createdAt: timestamp,
                  errorMessage: message,
                }
              ),
              assistantMessageId,
              {
                id: assistantMessageId,
                conversationId,
                role: "assistant",
                content: "I couldn't save that message to the conversation.",
                status: "error",
                createdAt: timestamp,
                errorMessage: message,
              }
            ),
          },
        }));

        return;
      }

      try {
        let streamedContent = "";
        let chunkCount = 0;

        await streamAiQuery(
          {
            question: prompt,
            conversationId,
          },
          {
            onChunk: ({ content }) => {
              streamedContent = content;
              chunkCount += 1;
              console.debug("assistant chunk received", {
                conversationId,
                chunkCount,
              });

              set((current) => ({
                messagesByConversation: {
                  ...current.messagesByConversation,
                  [conversationId]: updateAssistantPlaceholder(
                    current.messagesByConversation[conversationId] ?? [],
                    {
                      assistantMessageId,
                      conversationId,
                      createdAt: timestamp,
                      content,
                      status: "streaming",
                    }
                  ),
                },
              }));
            },
            onDone: async ({ content }) => {
              const finalContent = content.trim() || streamedContent.trim();
              const persistedAssistantMessage = await appendChatMessage(conversationId, {
                role: "assistant",
                content: finalContent,
                status: "done",
              });

              set((current) => ({
                isSubmitting: false,
                isStreaming: false,
                conversations: upsertConversation(
                  current.conversations,
                  persistedAssistantMessage.conversation
                ),
                messagesByConversation: {
                  ...current.messagesByConversation,
                  [conversationId]: replaceMessageOrAppend(
                    current.messagesByConversation[conversationId] ?? [],
                    assistantMessageId,
                    {
                      ...persistedAssistantMessage.item,
                      id: assistantMessageId,
                    }
                  ),
                },
              }));
            },
          }
        );
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Assistant response could not be saved.";

        set((current) => ({
          isSubmitting: false,
          isStreaming: false,
          messagesByConversation: {
            ...current.messagesByConversation,
            [conversationId]: updateAssistantPlaceholder(
              current.messagesByConversation[conversationId] ?? [],
              {
                assistantMessageId,
                conversationId,
                createdAt: timestamp,
                content:
                  current.messagesByConversation[conversationId]?.find(
                    (item) => item.id === assistantMessageId
                  )?.content || "I couldn't save the assistant response.",
                status: "error",
                errorMessage: message,
              }
            ),
          },
        }));
      }
    })();

    return conversationId;
  },
}));
