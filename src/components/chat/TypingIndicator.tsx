"use client";

export function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[rgba(219,223,235,0.9)] bg-white/92 px-3 py-2 dark:border-white/[0.08] dark:bg-white/[0.04]">
      <span className="h-2 w-2 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-[#8b8d98] dark:bg-white/[0.55]" />
      <span className="h-2 w-2 animate-[pulse_1s_ease-in-out_0.18s_infinite] rounded-full bg-[#8b8d98] dark:bg-white/[0.55]" />
      <span className="h-2 w-2 animate-[pulse_1s_ease-in-out_0.36s_infinite] rounded-full bg-[#8b8d98] dark:bg-white/[0.55]" />
    </div>
  );
}
