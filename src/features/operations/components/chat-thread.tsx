"use client";

import { useEffect, useRef } from "react";
import { MessageSquareDashed, Trash2 } from "lucide-react";

import { AssistantThinking } from "@/features/operations/components/assistant-thinking";
import { ChatMessageBubble } from "@/features/operations/components/chat-message-bubble";
import { SuggestedPromptsRow } from "@/features/operations/components/suggested-prompts-row";
import type { OperationsChatMessage } from "@/features/operations/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChatThreadProps {
  messages: OperationsChatMessage[];
  isThinking: boolean;
  emptyPrompts: string[];
  onPromptSelect: (prompt: string) => void;
  onClear: () => void;
}

export function ChatThread({
  messages,
  isThinking,
  emptyPrompts,
  onPromptSelect,
  onClear,
}: ChatThreadProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isThinking]);

  return (
    <Card className="border-white/15 bg-white/[0.04] backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
        <CardTitle>Conversation</CardTitle>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={messages.length === 0 && !isThinking}
        >
          <Trash2 className="h-4 w-4" />
          Clear chat
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {messages.length === 0 && !isThinking ? (
          <div className="space-y-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.03] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03]">
                <MessageSquareDashed className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium">Ask OpsBrain a question</p>
                <p className="text-sm text-muted-foreground">
                  Example: "Why is OB-24831 delayed and which supplier signal is driving it?"
                </p>
              </div>
            </div>

            <SuggestedPromptsRow
              prompts={emptyPrompts}
              onSelect={onPromptSelect}
              title="Example questions"
            />
          </div>
        ) : (
          <div className="max-h-[680px] space-y-3 overflow-y-auto pr-1">
            {messages.map((message) => (
              <ChatMessageBubble key={message.id} message={message} />
            ))}
            {isThinking ? <AssistantThinking /> : null}
            <div ref={endRef} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
