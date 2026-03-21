"use client";

import { useEffect, useRef } from "react";
import { Loader2 } from "lucide-react";

import type { OpsWorkspaceMessage } from "@/features/workspace/types";
import { MessageItem } from "@/features/workspace/components/message-item";

interface MessageListProps {
  messages: OpsWorkspaceMessage[];
  isSubmitting: boolean;
  onPromptSelect: (prompt: string) => void;
}

export function MessageList({
  messages,
  isSubmitting,
  onPromptSelect,
}: MessageListProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [isSubmitting, messages]);

  const hasConversation = messages.length > 0 || isSubmitting;

  if (!hasConversation) {
    return null;
  }

  return (
    <section className="space-y-8">
      <div className="space-y-8">
        {messages.map((message) => (
          <MessageItem
            key={message.id}
            message={message}
            onPromptSelect={onPromptSelect}
          />
        ))}

        {isSubmitting ? (
          <div className="max-w-3xl space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="flex h-8 w-8 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
              OpsBrain is reasoning over operational context...
            </div>
            <div className="space-y-2 rounded-[28px] bg-white/70 px-5 py-4 shadow-[0_22px_80px_-56px_rgba(16,24,40,0.22)] backdrop-blur dark:bg-slate-950/54">
              <div className="h-3 w-full rounded-full bg-secondary/75" />
              <div className="h-3 w-10/12 rounded-full bg-secondary/65" />
              <div className="h-3 w-8/12 rounded-full bg-secondary/55" />
            </div>
          </div>
        ) : null}
        <div ref={endRef} />
      </div>
    </section>
  );
}
