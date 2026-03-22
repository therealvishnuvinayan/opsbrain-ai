import "server-only";

import type {
  NormalizedOrderDetail,
  NormalizedOrderHistory,
} from "@/lib/bamboo/orders";

function joinExamples(values: string[], max = 3) {
  return values.slice(0, max).join(", ");
}

function buildHistoryNextStep(context: NormalizedOrderHistory) {
  if (context.hasConcentratedFailures) {
    return ["payment", "supplier processing", "card creation"];
  }

  if (context.issueOrderIds.length > 0) {
    return ["payment", "supplier processing", "card creation"];
  }

  if (context.hasMixedStatuses) {
    return ["where the orders are slowing down"];
  }

  return ["a few recent orders to make sure they are moving normally"];
}

function buildDetailNextStep(context: NormalizedOrderDetail) {
  if (context.missingCards) {
    return ["supplier processing", "why the card was not created"];
  }

  if (context.problematicCardStatuses.length > 0) {
    return ["the card status", "where card creation stopped"];
  }

  if (context.problematicItemStatuses.length > 0) {
    return ["the order items", "supplier processing"];
  }

  if (context.status.toLowerCase().includes("fail") || context.status.toLowerCase().includes("block")) {
    return ["payment", "supplier processing", "card creation"];
  }

  return ["the latest updates on the order"];
}

function formatCheckList(items: string[]) {
  return `You should check:\n${items.map((item) => `- ${item}`).join("\n")}`;
}

export function buildOrderHistoryPrompt(
  question: string,
  context: NormalizedOrderHistory
) {
  return {
    system: [
      "You are Bamboo AI, a helpful teammate for operations users.",
      "Answer only from the order history data you are given.",
      "Use simple English and keep the answer short and clear.",
      "Be direct and confident.",
      "If all checked orders show the same status, say all.",
      "If the sample is mixed, say most when that is true.",
      "Use phrases like 'in Failed status' instead of 'are Failed'.",
      "Start with what is happening in plain language.",
      "Then explain the pattern in simple words.",
      "Mention up to 2 or 3 example order ids when useful.",
      "Format the answer with a blank line between sections.",
      "Write the final 'You should check:' section as bullet points, with one bullet on each line.",
      "Do not use technical jargon.",
      "Do not invent causes, totals, or statuses that are not shown.",
      "Do not repeat the same sentence for each order.",
    ].join(" "),
    user: [
      `User question: ${question}`,
      "Order history data:",
      JSON.stringify(context, null, 2),
      "Write a short answer in this order:",
      "1. what is happening",
      "2. what pattern we see",
      "3. example orders if useful",
      "4. what to check next",
      "Use a blank line between sections.",
      "Use bullet points for the final 'You should check:' section.",
    ].join("\n\n"),
  };
}

export function buildOrderDetailPrompt(
  question: string,
  context: NormalizedOrderDetail
) {
  return {
    system: [
      "You are Bamboo AI, a helpful teammate for operations users.",
      "Answer only from the order detail data you are given.",
      "Use simple English and keep the answer short and clear.",
      "Be direct and confident.",
      "Explain the order status in a way a non-technical person can understand.",
      "Mention items, cards, and any clear problem if they are shown.",
      "Format the answer with a blank line between sections.",
      "Write the final 'You should check:' section as bullet points, with one bullet on each line.",
      "Do not use technical jargon.",
      "Do not invent hidden causes.",
    ].join(" "),
    user: [
      `User question: ${question}`,
      "Order detail data:",
      JSON.stringify(context, null, 2),
      "Write a short answer in this order:",
      "1. what is happening with this order",
      "2. the main pattern or issue",
      "3. the most useful details",
      "4. what to check next",
      "Use a blank line between sections.",
      "Use bullet points for the final 'You should check:' section.",
    ].join("\n\n"),
  };
}

export function buildOrderHistoryFallbackAnswer(context: NormalizedOrderHistory) {
  if (context.orders.length === 0) {
    return "I could not find matching orders in the recent order list.";
  }

  const sampleSize = context.returnedCount;
  const dominantStatus = context.dominantStatus;
  const allSameStatus = context.dominantStatusShare === 1 && Boolean(dominantStatus);
  const examples = joinExamples(context.issueOrderIds.length > 0 ? context.issueOrderIds : context.orders.map((order) => order.orderNumber));
  const opening = context.hasConcentratedFailures
    ? allSameStatus
      ? `Most of the recent orders are failing. All ${sampleSize} checked orders are in Failed status.`
      : `Most of the recent orders are failing. Most of the ${sampleSize} checked orders are in Failed status.`
    : dominantStatus
      ? allSameStatus
        ? `All ${sampleSize} checked orders are ${dominantStatus}.`
        : `Most of the ${sampleSize} checked orders are ${dominantStatus}.`
      : `I checked ${sampleSize} recent orders.`;
  const pattern = context.hasMixedStatuses
    ? "The orders are mixed."
    : "";
  const examplesLine = examples ? `Example orders: ${examples}.` : "";
  const nextSteps = buildHistoryNextStep(context);

  return [
    opening,
    pattern,
    examplesLine,
    formatCheckList(nextSteps),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildOrderDetailFallbackAnswer(context: NormalizedOrderDetail) {
  const cardStatuses = Object.entries(context.cardStatusCounts)
    .map(([status, count]) => `${count} ${status}`)
    .join(", ");
  const itemCardLine =
    context.itemCount !== undefined || context.cardCount !== undefined
      ? `It has ${context.itemCount ?? 0} items and ${context.cardCount ?? 0} cards.`
      : "";
  const issueSummary = context.missingCards
    ? "The main issue is that the order has items, but no cards were created."
    : context.problematicCardStatuses.length > 0
      ? `There is a card problem here: ${joinExamples(context.problematicCardStatuses)}.`
      : context.problematicItemStatuses.length > 0
        ? `Some order items have a problem: ${joinExamples(context.problematicItemStatuses)}.`
        : context.notableIssues[0] ?? "";
  const nextSteps = buildDetailNextStep(context);

  return [
    `Order ${context.orderId} is currently ${context.status}.`,
    itemCardLine,
    issueSummary,
    cardStatuses && context.problematicCardStatuses.length > 0
      ? `Current card statuses: ${cardStatuses}.`
      : "",
    formatCheckList(nextSteps),
  ]
    .filter(Boolean)
    .join("\n\n");
}
