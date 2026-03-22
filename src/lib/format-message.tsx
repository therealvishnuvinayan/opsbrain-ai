import type { ReactNode } from "react";

const STATUS_PATTERN = /(Failed|Succeeded|Success|Pending)/gi;

export function formatMessageWithStatusColors(text: string): ReactNode[] {
  return text.split(STATUS_PATTERN).map((part, index) => {
    const lower = part.toLowerCase();

    if (lower === "failed") {
      return (
        <span key={index} className="font-medium text-red-500">
          {part}
        </span>
      );
    }

    if (lower === "succeeded" || lower === "success") {
      return (
        <span key={index} className="font-medium text-green-500">
          {part}
        </span>
      );
    }

    if (lower === "pending") {
      return (
        <span key={index} className="font-medium text-amber-500">
          {part}
        </span>
      );
    }

    return <span key={index}>{part}</span>;
  });
}
