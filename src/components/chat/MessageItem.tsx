"use client";

import type { ChatMessage } from "@/lib/chat/chat.types";
import { cn } from "@/lib/utils";
import { TypingIndicator } from "@/components/chat/TypingIndicator";

export function MessageItem({ message }: { message: ChatMessage }) {
  const isUser = message.role === "user";
  const isError = message.status === "error";
  const isStreaming = message.status === "streaming";
  const showTypingIndicator = isStreaming && !message.content.trim();

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[min(720px,84%)] rounded-[22px] px-4 py-3 text-[15px] leading-7 shadow-[0_18px_34px_-34px_rgba(15,23,42,0.18)]",
          isUser
            ? "rounded-br-[8px] bg-[linear-gradient(135deg,rgba(243,235,255,0.98)_0%,rgba(237,229,255,0.98)_100%)] text-[#4a4165] dark:bg-[linear-gradient(135deg,rgba(78,45,145,0.8)_0%,rgba(64,38,121,0.84)_100%)] dark:text-white/[0.94]"
            : "rounded-bl-[8px] border border-[rgba(219,223,235,0.86)] bg-white/94 text-[#2a2b33] dark:border-white/[0.07] dark:bg-[rgba(20,19,28,0.86)] dark:text-white/[0.9]",
          isError &&
            "border border-[#fecaca] bg-[rgba(254,242,242,0.96)] text-[#991b1b] dark:border-[#7f1d1d] dark:bg-[rgba(69,10,10,0.42)] dark:text-[#fecaca]"
        )}
      >
        {showTypingIndicator ? (
          <TypingIndicator />
        ) : (
          <p className="whitespace-pre-wrap break-words">
            {message.content}
            {isStreaming ? (
              <span className="ml-0.5 inline-block h-[1.05em] w-[2px] animate-pulse rounded-full bg-current/45 align-[-0.15em]" />
            ) : null}
          </p>
        )}
        {isError && message.errorMessage ? (
          <p className="mt-2 text-[12px] font-medium text-current/70">{message.errorMessage}</p>
        ) : null}
      </div>
    </div>
  );
}
