import "server-only";

import type {
  NormalizedOrderDetail,
  NormalizedOrderHistory,
  OrderPatternAnalysis,
  OrderTrendAnalysis,
} from "@/lib/bamboo/orders";
import type { OrderAnalytics } from "@/lib/ops/analytics/analytics-types";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";

function joinExamples(values: string[], max = 3) {
  return values.slice(0, max).join(", ");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
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

function buildPatternNextStep(context: OrderPatternAnalysis) {
  if (context.repeatedIssue === "missing_cards") {
    return ["card creation", "supplier processing"];
  }

  if (context.repeatedIssue === "blocked") {
    return ["where the orders are getting stuck", "supplier processing"];
  }

  if (context.repeatedIssue === "pending") {
    return ["where the delay starts", "supplier processing"];
  }

  return ["payment", "supplier processing", "card creation"];
}

function buildTrendNextStep(context: OrderTrendAnalysis) {
  if (context.direction === "up") {
    return ["payment", "supplier processing", "card creation"];
  }

  return ["recent failed orders", "the latest order updates"];
}

export function buildOrderHistoryPrompt(
  question: string,
  context: NormalizedOrderHistory,
  options?: {
    mode?: "recent_orders_summary" | "failed_orders_summary";
  }
) {
  const mode = options?.mode ?? "recent_orders_summary";
  return {
    system: [
      "You are Bamboo AI, a helpful teammate for operations users.",
      "Answer only from the order history data you are given.",
      "Use simple English and keep the answer short and clear.",
      "Be direct and confident.",
      "If all checked orders show the same status, say all.",
      "If the sample is mixed, say most when that is true.",
      "Use phrases like 'in Failed status' instead of 'are Failed'.",
      mode === "failed_orders_summary"
        ? "Focus on what the failed orders are showing right now."
        : "Focus on the overall picture in the recent orders.",
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

export function buildOrderPatternAnalysisPrompt(
  question: string,
  context: OrderPatternAnalysis
) {
  return {
    system: [
      "You are Bamboo AI, a helpful teammate for operations users.",
      "Answer only from the order pattern analysis data you are given.",
      "Use simple English and keep the answer short and clear.",
      "Explain the common issue across the failed orders if one is visible.",
      "Mention up to 2 or 3 example order ids.",
      "Format the answer with a blank line between sections.",
      "Write the final 'You should check:' section as bullet points, with one bullet on each line.",
      "Do not use technical jargon.",
      "Do not invent causes that are not shown.",
    ].join(" "),
    user: [
      `User question: ${question}`,
      "Order pattern analysis data:",
      JSON.stringify(context, null, 2),
      "Write a short answer in this order:",
      "1. what common issue is showing up",
      "2. the main pattern",
      "3. example orders if useful",
      "4. what to check next",
      "Use a blank line between sections.",
      "Use bullet points for the final 'You should check:' section.",
    ].join("\n\n"),
  };
}

export function buildOrderTrendAnalysisPrompt(
  question: string,
  context: OrderTrendAnalysis
) {
  return {
    system: [
      "You are Bamboo AI, a helpful teammate for operations users.",
      "Answer only from the order trend data you are given.",
      "Use simple English and keep the answer short and clear.",
      "Say clearly if failures are going up, down, or staying flat.",
      "Mention the two time windows and the counts.",
      "Format the answer with a blank line between sections.",
      "Write the final 'You should check:' section as bullet points, with one bullet on each line.",
      "Do not use technical jargon.",
      "Do not invent reasons that are not shown.",
    ].join(" "),
    user: [
      `User question: ${question}`,
      "Order trend data:",
      JSON.stringify(context, null, 2),
      "Write a short answer in this order:",
      "1. what is changing",
      "2. the comparison between the two time windows",
      "3. what to check next",
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

export function buildFailedOrdersFallbackAnswer(context: NormalizedOrderHistory) {
  if (context.orders.length === 0) {
    return "I could not find failed orders for that time.";
  }

  const sampleSize = context.returnedCount;
  const examples = joinExamples(context.issueOrderIds.length > 0 ? context.issueOrderIds : context.orders.map((order) => order.orderNumber));
  const nextSteps = buildHistoryNextStep(context);

  return [
    `I found ${sampleSize} failed orders in the current result.`,
    examples ? `Example orders: ${examples}.` : "",
    formatCheckList(nextSteps),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildOrderPatternAnalysisFallbackAnswer(context: OrderPatternAnalysis) {
  if (context.sampleSize === 0) {
    return "I could not find failed orders to compare.";
  }

  const examples = joinExamples(context.issueOrderIds);
  const opening =
    context.repeatedIssue === "missing_cards"
      ? "A repeated issue is that some orders have items, but no cards were created."
      : context.repeatedIssue === "blocked"
        ? "A repeated issue is that many of the failed orders also look blocked."
        : context.repeatedIssue === "pending"
          ? "A repeated issue is that many of the failed orders are still stuck in a waiting state."
          : context.failureCount > 0
            ? "The failed orders are showing the same problem again and again."
            : "The failed orders show a mixed pattern.";
  const pattern =
    context.topStatuses.length > 0
      ? `Main status pattern: ${context.topStatuses
          .map((item) => `${item.count} in ${item.status} status`)
          .join(", ")}.`
      : "";
  const suppliers =
    context.topSuppliers.length > 0
      ? `Common suppliers in this sample: ${context.topSuppliers.join(", ")}.`
      : "";
  const nextSteps = buildPatternNextStep(context);

  return [
    opening,
    pattern,
    examples ? `Example orders: ${examples}.` : "",
    suppliers,
    formatCheckList(nextSteps),
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function buildOrderTrendAnalysisFallbackAnswer(context: OrderTrendAnalysis) {
  const opening =
    context.direction === "up"
      ? "Failed orders are going up."
      : context.direction === "down"
        ? "Failed orders are going down."
        : "Failed orders are staying about the same.";
  const comparison = `${context.recentWindow.label}: ${context.recentWindow.count}. ${context.previousWindow.label}: ${context.previousWindow.count}.`;
  const change =
    context.percentChange !== undefined && context.direction !== "flat"
      ? `That is a ${Math.abs(context.percentChange)}% change.`
      : "";
  const nextSteps = buildTrendNextStep(context);

  return [
    opening,
    comparison,
    change,
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

function isNormalizedOrderHistory(value: unknown): value is NormalizedOrderHistory {
  return isRecord(value) && Array.isArray(value.orders) && typeof value.returnedCount === "number";
}

function isNormalizedOrderDetail(value: unknown): value is NormalizedOrderDetail {
  return (
    isRecord(value) &&
    typeof value.orderId === "string" &&
    typeof value.status === "string" &&
    Array.isArray(value.items) &&
    Array.isArray(value.cards)
  );
}

function buildPackedOrderAvailabilityNote(notes: string[]) {
  const availabilityNotes = notes.filter(
    (note) =>
      note.includes("unavailable") ||
      note.includes("could not be retrieved") ||
      note.includes("failed")
  );

  if (availabilityNotes.length === 0) {
    return "";
  }

  return `Availability note: ${availabilityNotes.join(" ")}`;
}

export function buildPackedOrderPrompt(
  question: string,
  context: PackedOpsContext<PackedOrderData>,
  analytics: OrderAnalytics
) {
  return {
    system: [
      "You are Bamboo AI, a helpful teammate for operations users.",
      "Answer only from the packed order context and structured order analytics you are given.",
      "Use simple English and keep the answer short and clear.",
      "Be direct and confident.",
      "Use the analytics as the primary interpretation layer and the packed context as supporting evidence.",
      "Start with what is happening in plain language.",
      "Then explain the main issue or pattern in simple words.",
      "Mention up to 2 or 3 example order ids when useful.",
      "If some requested data was unavailable, mention that briefly only when relevant.",
      "Format the answer with a blank line between sections.",
      "Write the final 'You should check:' section as bullet points, with one bullet on each line.",
      "Do not use technical jargon.",
      "Do not invent causes, totals, or statuses that are not shown in the packed context.",
      "Do not mention tools, plans, or execution internals unless data availability matters.",
    ].join(" "),
    user: [
      `User question: ${question}`,
      "Structured order analytics:",
      JSON.stringify(analytics, null, 2),
      "Packed order context:",
      JSON.stringify(context, null, 2),
      "Write a short answer in this order:",
      "1. what is happening",
      "2. the main issue or pattern",
      "3. example orders if useful",
      "4. what to check next",
      "Use the structured analytics first and only use the packed context to support it.",
    ].join("\n\n"),
  };
}

export function buildPackedOrderFallbackAnswer(
  context: PackedOpsContext<PackedOrderData>,
  analytics: OrderAnalytics
) {
  const availabilityNote = buildPackedOrderAvailabilityNote(analytics.notes);
  const examplesLine =
    analytics.examples.length > 0
      ? `Example orders: ${joinExamples(analytics.examples)}.`
      : "";
  const nextChecksLine =
    analytics.nextChecks.length > 0 ? formatCheckList(analytics.nextChecks) : "";

  const body = [
    analytics.summary,
    ...analytics.patterns.slice(0, 3),
    examplesLine,
    availabilityNote,
    nextChecksLine,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (body) {
    return body;
  }

  if (context.notes.length > 0) {
    return [
      "I could not retrieve complete Bamboo order data right now.",
      availabilityNote || context.notes.join(" "),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return "I couldn't retrieve Bamboo order data right now. Please try again in a moment.";
}
