"use client";

import { useRef } from "react";
import { Plus, SendHorizontal } from "lucide-react";

import { useChatStore } from "@/lib/chat/chat.store";
import { cn } from "@/lib/utils";

export function Composer() {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const input = useChatStore((state) => state.input);
  const isSubmitting = useChatStore((state) => state.isSubmitting);
  const setInput = useChatStore((state) => state.setInput);
  const sendMockMessage = useChatStore((state) => state.sendMockMessage);

  const submit = async () => {
    await sendMockMessage();
    requestAnimationFrame(() => textareaRef.current?.focus());
  };

  return (
    <div className="border-t border-[rgba(222,226,236,0.86)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9)_0%,rgba(249,247,252,0.96)_100%)] px-4 pb-5 pt-4 dark:border-white/[0.06] dark:bg-[linear-gradient(180deg,rgba(17,16,25,0.92)_0%,rgba(15,14,22,0.98)_100%)] md:px-6">
      <div className="mx-auto max-w-[920px]">
        <div className="rounded-[24px] bg-[linear-gradient(90deg,rgba(175,233,238,0.76)_0%,rgba(247,248,252,0.98)_44%,rgba(212,188,250,0.78)_100%)] p-px shadow-[0_18px_34px_-34px_rgba(15,23,42,0.18)] dark:bg-[linear-gradient(90deg,rgba(10,218,238,0.48)_0%,rgba(46,38,93,0.18)_44%,rgba(124,58,237,0.56)_100%)] dark:shadow-[0_0_0_1px_rgba(34,211,238,0.08),0_0_24px_rgba(139,92,246,0.14)]">
          <div className="rounded-[23px] bg-white/[0.98] px-4 py-4 dark:bg-[rgba(20,19,28,0.95)]">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void submit();
                }
              }}
              rows={1}
              placeholder="Ask anything about Bamboo operations..."
              className="min-h-[64px] w-full resize-none bg-transparent text-[15px] leading-6 text-[#1f2330] outline-none placeholder:text-[#8b8d98] dark:text-white/[0.92] dark:placeholder:text-white/[0.42]"
            />

            <div className="mt-3 flex items-center justify-between">
              <button
                type="button"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(209,214,225,0.9)] bg-white/[0.92] text-[#1f2330] transition-colors hover:bg-white dark:border-white/[0.12] dark:bg-white/[0.04] dark:text-white/[0.82] dark:hover:bg-white/[0.06]"
                aria-label="Attachments coming soon"
              >
                <Plus className="h-[17px] w-[17px]" strokeWidth={1.85} />
              </button>

              <button
                type="button"
                onClick={() => void submit()}
                disabled={!input.trim() || isSubmitting}
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  !input.trim() || isSubmitting
                    ? "bg-[#eef1f6] text-[#9aa0ae] dark:bg-white/[0.08] dark:text-white/[0.34]"
                    : "bg-[linear-gradient(135deg,#7c3aed_0%,#9f67ff_100%)] text-white shadow-[0_16px_28px_-18px_rgba(124,58,237,0.56)]"
                )}
                aria-label="Send message"
              >
                <SendHorizontal className="h-[17px] w-[17px]" strokeWidth={1.85} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
