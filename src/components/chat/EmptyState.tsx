"use client";

import { useChatStore } from "@/lib/chat/chat.store";

const suggestions = [
  "Show me the latest incidents and summarize root causes",
  "Which suppliers are causing the most failed orders?",
  "Summarize current system health across Bamboo services",
];

export function EmptyState() {
  const setInput = useChatStore((state) => state.setInput);

  return (
    <div className="flex flex-1 items-center justify-center px-4">
      <div className="mx-auto flex w-full max-w-[720px] flex-col items-center text-center">
        <p className="text-[28px] font-semibold tracking-[-0.05em] text-[#26283a] dark:text-white/[0.94]">
          Start a Bamboo AI thread
        </p>
        <p className="mt-2 max-w-[520px] text-[15px] text-[#76798a] dark:text-white/[0.54]">
          Ask about incidents, suppliers, orders, reconciliation, or overall system health.
        </p>
        <div className="mt-6 flex w-full flex-wrap justify-center gap-3">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => setInput(suggestion)}
              className="rounded-full border border-[rgba(219,223,235,0.9)] bg-white/92 px-4 py-2 text-[13px] font-medium text-[#424657] transition-colors hover:bg-white dark:border-white/[0.08] dark:bg-white/[0.04] dark:text-white/[0.82] dark:hover:bg-white/[0.06]"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
