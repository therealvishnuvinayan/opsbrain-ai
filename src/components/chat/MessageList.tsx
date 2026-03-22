"use client";

import { useEffect, useRef } from "react";

import type { ChatMessage } from "@/lib/chat/chat.types";
import { MessageItem } from "@/components/chat/MessageItem";

export function MessageList({ messages }: { messages: ChatMessage[] }) {
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
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
