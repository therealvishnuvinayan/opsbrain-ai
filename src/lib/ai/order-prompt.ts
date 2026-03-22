import "server-only";

import type {
  NormalizedOrderDetail,
  NormalizedOrderHistory,
} from "@/lib/bamboo/orders";

export function buildOrderHistoryPrompt(
  question: string,
  context: NormalizedOrderHistory
) {
  return {
    system: [
      "You are Bamboo AI, an operations assistant for Bamboo order operations.",
      "Answer only from the supplied normalized order history context.",
      "Be concise, operational, and grounded in the data.",
      "Do not invent totals, causes, or statuses that are not present.",
      "Call out failures, blocked orders, delayed orders, or low-confidence areas when visible.",
    ].join(" "),
    user: [
      `User question: ${question}`,
      "Normalized order history context:",
      JSON.stringify(context, null, 2),
      "Write a short answer with the most relevant recent order activity and notable issues.",
    ].join("\n\n"),
  };
}

export function buildOrderDetailPrompt(
  question: string,
  context: NormalizedOrderDetail
) {
  return {
    system: [
      "You are Bamboo AI, an operations assistant for Bamboo order operations.",
      "Answer only from the supplied normalized order detail context.",
      "Be concise, specific to the requested order, and explicit about missing fields.",
      "Mention order status, items, cards, and obvious issues if available.",
    ].join(" "),
    user: [
      `User question: ${question}`,
      "Normalized order detail context:",
      JSON.stringify(context, null, 2),
      "Write a short operational summary for this order.",
    ].join("\n\n"),
  };
}

export function buildOrderHistoryFallbackAnswer(context: NormalizedOrderHistory) {
  if (context.orders.length === 0) {
    return "I could not find matching orders in the current Bamboo order history response.";
  }

  const topStatuses = Object.entries(context.statuses)
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([status, count]) => `${count} ${status}`)
    .join(", ");
  const notableIssues = context.notableIssues.slice(0, 3).join(" ");

  return [
    `I found ${context.returnedCount} recent orders${context.totalCount ? ` out of ${context.totalCount}` : ""}.`,
    topStatuses ? `Most visible statuses: ${topStatuses}.` : "",
    notableIssues,
  ]
    .filter(Boolean)
    .join(" ");
}

export function buildOrderDetailFallbackAnswer(context: NormalizedOrderDetail) {
  const cardStatuses = Object.entries(context.cardStatusCounts)
    .map(([status, count]) => `${count} ${status}`)
    .join(", ");

  return [
    `Order ${context.orderId} is currently ${context.status}.`,
    context.itemCount !== undefined ? `Items: ${context.itemCount}.` : "",
    context.cardCount !== undefined ? `Cards: ${context.cardCount}.` : "",
    cardStatuses ? `Card statuses: ${cardStatuses}.` : "",
    context.notableIssues.length > 0 ? context.notableIssues.slice(0, 3).join(" ") : "",
  ]
    .filter(Boolean)
    .join(" ");
}
