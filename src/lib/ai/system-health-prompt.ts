import "server-only";

import type { NormalizedSystemHealth } from "@/lib/bamboo/system-health";

export function buildSystemHealthPrompt(
  question: string,
  context: NormalizedSystemHealth
) {
  return {
    system: [
      "You are Bamboo AI, an operations assistant for Bamboo users.",
      "Answer only from the supplied normalized BackgroundJob system-health context.",
      "Be concise, practical, and explicit about uncertainty.",
      "Do not invent metrics, incidents, or causes that are not present in the context.",
      "If there are failures or delays, call them out clearly.",
    ].join(" "),
    user: [
      `User question: ${question}`,
      "Normalized system-health context:",
      JSON.stringify(context, null, 2),
      "Write a short operational summary with:",
      "1. Overall health",
      "2. Any immediate problems",
      "3. Any uncertainty or missing fields if relevant",
    ].join("\n\n"),
  };
}

export function buildSystemHealthFallbackAnswer(context: NormalizedSystemHealth) {
  const lead =
    context.overallStatus === "critical"
      ? "Bamboo system health looks critical based on the BackgroundJob state endpoint."
      : context.overallStatus === "warning"
        ? "Bamboo system health shows warning signals based on the BackgroundJob state endpoint."
        : context.overallStatus === "healthy"
          ? "Bamboo system health appears healthy based on the BackgroundJob state endpoint."
          : "Bamboo system health could not be determined confidently from the BackgroundJob state endpoint.";

  const stats = `Active jobs: ${context.activeJobs}, failed jobs: ${context.failedJobs}, delayed jobs: ${context.delayedJobs}.`;
  const notes = context.notes.length > 0 ? ` ${context.notes.join(" ")}` : "";

  return `${lead} ${stats}${notes}`.trim();
}
