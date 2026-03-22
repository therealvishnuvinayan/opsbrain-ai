"use client";

import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/lib/chat/chat.types";
import { MessageItem } from "@/components/chat/MessageItem";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCountRef = useRef(0);
  const previousLastSignatureRef = useRef("");

  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const nextCount = messages.length;
    const nextSignature = lastMessage
      ? `${lastMessage.id}:${lastMessage.status}:${lastMessage.content.length}`
      : "";
    const messageCountChanged = nextCount !== previousMessageCountRef.current;
    const lastMessageChanged = nextSignature !== previousLastSignatureRef.current;

    if (messageCountChanged) {
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
    } else if (lastMessageChanged && lastMessage?.status === "streaming") {
      bottomRef.current?.scrollIntoView({ block: "end", behavior: "auto" });
    }

    previousMessageCountRef.current = nextCount;
    previousLastSignatureRef.current = nextSignature;
  }, [messages]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-4 md:px-6">
      <div className="mx-auto flex w-full max-w-[920px] flex-col gap-5 pb-6 pt-2">
        {messages.map((message) => (
          <MessageItem key={message.id} message={message} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
