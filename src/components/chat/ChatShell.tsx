"use client";

import { ArrowLeft } from "lucide-react";

import { Composer } from "@/components/chat/Composer";
import { EmptyState } from "@/components/chat/EmptyState";
import { MessageList } from "@/components/chat/MessageList";
import { useChatStore } from "@/lib/chat/chat.store";

export function ChatShell() {
  const activeConversationId = useChatStore((state) => state.activeConversationId);
  const conversations = useChatStore((state) => state.conversations);
  const messagesByConversation = useChatStore((state) => state.messagesByConversation);
  const goHome = useChatStore((state) => state.goHome);

  const activeConversation = conversations.find(
    (conversation) => conversation.id === activeConversationId
  );
  const messages = activeConversationId ? messagesByConversation[activeConversationId] ?? [] : [];

  return (
    <div className="flex h-full min-h-[calc(100vh-24px)] flex-col rounded-[34px] bg-[linear-gradient(180deg,rgba(255,255,255,0.7)_0%,rgba(247,247,248,0.98)_100%)] dark:bg-[linear-gradient(180deg,#0d101b_0%,#0b0f1a_100%)]">
      <div className="px-4 pb-4 pt-5 md:px-6">
        <div className="mx-auto flex max-w-[920px] items-center gap-3 rounded-[22px] border border-[rgba(221,225,233,0.9)] bg-white/95 px-4 py-3 shadow-[0_18px_34px_-34px_rgba(15,23,42,0.12)] dark:border-white/[0.06] dark:bg-[rgba(20,19,28,0.88)] dark:shadow-[0_16px_34px_-30px_rgba(8,10,22,0.7)]">
          <button
            type="button"
            onClick={goHome}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(219,223,235,0.9)] bg-white/92 text-[#3a3d49] transition-colors hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/[0.82] dark:hover:bg-white/[0.06]"
            aria-label="Back to home"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold tracking-[-0.03em] text-[#26283a] dark:text-white/[0.94]">
              {activeConversation?.title ?? "New chat"}
            </p>
          </div>
        </div>
      </div>

      {messages.length === 0 ? <EmptyState /> : <MessageList messages={messages} />}
      <Composer />
    </div>
  );
}
