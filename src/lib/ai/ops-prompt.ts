import "server-only";

import type { OpsAnalytics } from "@/lib/ops/analytics/analytics-types";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";

function buildAvailabilityDetails(notes: string[]) {
  return notes.filter(
    (note) =>
      note.toLowerCase().includes("unavailable") ||
      note.toLowerCase().includes("could not") ||
      note.toLowerCase().includes("permission") ||
      note.toLowerCase().includes("fetched")
  );
}

function buildBulletSection(title: string, items: string[]) {
  if (items.length === 0) {
    return "";
  }

  return `${title}\n${items.map((item) => `- ${item}`).join("\n")}`;
}

function buildSummarySection(summary: string) {
  return summary ? `Summary:\n${summary}` : "";
}

export function buildOpsPrompt(
  question: string,
  context: PackedOpsContext<PackedOrderData>,
  analytics: OpsAnalytics
) {
  return {
    system: [
      "You are Bamboo AI, a helpful teammate for operations users.",
      "Answer only from the packed operations data and structured analytics you are given.",
      "Use simple English and keep the answer concise, practical, and grounded.",
      "Use the analytics as the main interpretation layer and the packed context as supporting evidence.",
      "Use this structure when the section has content: Summary, Details, Examples, Next checks.",
      "Keep Summary to 1 or 2 short lines.",
      "In Details, mention the key findings, counts, status signals, and patterns without repeating yourself.",
      "In Examples, include at most 2 or 3 example ids.",
      "In Next checks, use flat bullet points and only include checks that are justified by the data.",
      "If some data could not be fetched, mention that briefly in Details.",
      "If AWS or CloudWatch data is present, explain recent system-side issues in simple words.",
      "Do not use technical jargon.",
      "Do not mention tools, plans, or execution internals.",
      "Do not invent causes, totals, statuses, or entities that are not shown.",
    ].join(" "),
    user: [
      `User question: ${question}`,
      "Structured analytics:",
      JSON.stringify(analytics, null, 2),
      "Packed operations context:",
      JSON.stringify(context, null, 2),
      "Write the answer with these sections when useful:",
      "Summary:",
      "Details:",
      "Examples:",
      "Next checks:",
      "Use bullet points for Details, Examples, and Next checks when those sections are present.",
    ].join("\n\n"),
  };
}

export function buildOpsFallbackAnswer(
  context: PackedOpsContext<PackedOrderData>,
  analytics: OpsAnalytics
) {
  const details = [...analytics.patterns.slice(0, 3)];
  const availabilityDetails = buildAvailabilityDetails(analytics.notes);

  for (const note of availabilityDetails) {
    if (!details.includes(note)) {
      details.push(note);
    }
  }

  const examples = analytics.examples.slice(0, 3);
  const summarySection = buildSummarySection(
    analytics.summary || "I could not retrieve complete Bamboo operations data right now."
  );
  const detailsSection = buildBulletSection("Details:", details);
  const examplesSection = buildBulletSection(
    "Examples:",
    examples.map((example) => example)
  );
  const nextChecksSection = buildBulletSection("Next checks:", analytics.nextChecks);

  const response = [
    summarySection,
    detailsSection,
    examplesSection,
    nextChecksSection,
  ]
    .filter(Boolean)
    .join("\n\n");

  if (response) {
    return response;
  }

  if (context.notes.length > 0) {
    return [
      "Summary:\nI could not retrieve complete Bamboo operations data right now.",
      buildBulletSection("Details:", context.notes.slice(0, 3)),
    ]
      .filter(Boolean)
      .join("\n\n");
  }

  return "Summary:\nI couldn't retrieve Bamboo operations data right now. Please try again in a moment.";
}

export const buildPackedOrderPrompt = buildOpsPrompt;
export const buildPackedOrderFallbackAnswer = buildOpsFallbackAnswer;
