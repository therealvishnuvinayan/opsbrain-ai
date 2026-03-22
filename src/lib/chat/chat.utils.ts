import type { ChatConversation } from "@/lib/chat/chat.types";

export function createChatId(prefix: "msg" | "conv" = "msg") {
  return `${prefix}-${crypto.randomUUID()}`;
}

export function createConversationTitle(input: string) {
  const trimmed = input.trim();
  if (!trimmed) {
    return "New chat";
  }

  return trimmed.length > 42 ? `${trimmed.slice(0, 42).trimEnd()}...` : trimmed;
}

export function sortConversationsByLastUsed(conversations: ChatConversation[]) {
  return [...conversations].sort(
    (left, right) => new Date(right.lastUsedAt).getTime() - new Date(left.lastUsedAt).getTime()
  );
}

export function groupConversationsByRecency(conversations: ChatConversation[]) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  const groups = {
    Today: [] as ChatConversation[],
    Yesterday: [] as ChatConversation[],
    Earlier: [] as ChatConversation[],
  };

  for (const conversation of sortConversationsByLastUsed(conversations)) {
    const usedAt = new Date(conversation.lastUsedAt);

    if (usedAt >= startOfToday) {
      groups.Today.push(conversation);
    } else if (usedAt >= startOfYesterday) {
      groups.Yesterday.push(conversation);
    } else {
      groups.Earlier.push(conversation);
    }
  }

  return groups;
}

export function getMockAssistantReply(input: string) {
  const normalized = input.toLowerCase();

  if (normalized.includes("incident")) {
    return "I found 3 recent Bamboo incidents. The main pattern is supplier webhook latency causing delayed order acknowledgements, with the highest impact concentrated in APAC retries.";
  }

  if (normalized.includes("supplier")) {
    return "The most unstable suppliers right now are Eneba and G2A. They are contributing the highest share of blocked orders and repeated retry traffic over the last 24 hours.";
  }

  if (normalized.includes("reconciliation")) {
    return "Recent reconciliation mismatches are clustered around payout timing differences and duplicate settlement records. The highest-risk batch is still awaiting finance review.";
  }

  if (normalized.includes("health")) {
    return "Bamboo system health is mostly stable. Current concerns are elevated API retry rates and a delayed database reconciliation job that is extending processing times.";
  }

  if (normalized.includes("error") || normalized.includes("fail")) {
    return "";
  }

  return "I can help summarize incidents, supplier risk, order failures, reconciliation mismatches, and system health. Tell me which operational area you want to inspect.";
}
