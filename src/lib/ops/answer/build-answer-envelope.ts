import type { OpsAnalytics } from "@/lib/ops/analytics/analytics-types";
import { buildAnswerBasis } from "@/lib/ops/answer/build-answer-basis";
import { deriveAnswerConfidence } from "@/lib/ops/answer/derive-answer-confidence";
import type {
  AnswerTrustNote,
  OpsAnswerEnvelope,
} from "@/lib/ops/answer/answer-types";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";
import type { OpsQueryTrace } from "@/lib/ops/observability/trace-types";

function parseBulletLines(section: string | string[] | undefined) {
  if (!section) {
    return [];
  }

  const lines = Array.isArray(section) ? section.flatMap((line) => line.split("\n")) : section.split("\n");

  return lines
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.slice(2).trim())
    .filter(Boolean);
}

function normalizeHeading(value: string) {
  return value.trim().toLowerCase();
}

function splitAnswerSections(answer: string) {
  const lines = answer.trim().split("\n");
  const sections: Record<string, string[]> = {};
  let currentSection = "body";

  for (const line of lines) {
    const normalized = normalizeHeading(line.replace(/:$/, ""));

    if (
      normalized === "summary" ||
      normalized === "details" ||
      normalized === "examples" ||
      normalized === "next checks" ||
      normalized === "notes" ||
      normalized === "note"
    ) {
      currentSection = normalized;
      sections[currentSection] ??= [];
      continue;
    }

    sections[currentSection] ??= [];
    sections[currentSection].push(line);
  }

  return sections;
}

function getSummaryFromSections(answer: string, sections: Record<string, string[]>) {
  const summary = sections.summary?.join("\n").trim();

  if (summary) {
    return summary;
  }

  return answer.trim().split("\n").find((line) => line.trim()) ?? "";
}

function buildTrustNotes(
  trace: OpsQueryTrace,
  context?: PackedOpsContext<PackedOrderData>
): AnswerTrustNote[] {
  const notes: AnswerTrustNote[] = [];
  const seen = new Set<string>();

  const appendNote = (message: string | undefined) => {
    if (!message || seen.has(message)) {
      return;
    }

    seen.add(message);
    notes.push({ message });
  };

  if (trace.flags.partialData) {
    appendNote("Some data could not be fetched.");
  }

  if (trace.flags.onlyKnowledgeUsed) {
    appendNote("This answer is based on internal runbooks rather than live system data.");
  }

  if (trace.flags.noLiveDataUsed && !trace.flags.onlyKnowledgeUsed) {
    appendNote("This answer is based on limited available data.");
  }

  if (trace.flags.noMeaningfulData) {
    appendNote("I could not verify all related data.");
  }

  for (const note of context?.notes ?? []) {
    const normalized = note.toLowerCase();

    if (
      normalized.includes("unavailable") ||
      normalized.includes("could not") ||
      normalized.includes("permission") ||
      normalized.includes("no log groups") ||
      normalized.includes("no successful tool data")
    ) {
      appendNote(note);
    }
  }

  return notes.slice(0, 3);
}

function applyTrustAwareAnswer(answer: string, envelope: Omit<OpsAnswerEnvelope, "answer">) {
  let nextAnswer = answer.trim();

  if (
    envelope.confidence === "limited" &&
    !/based on the available data/i.test(nextAnswer)
  ) {
    if (nextAnswer.startsWith("Summary:")) {
      nextAnswer = nextAnswer.replace(/^Summary:\s*/i, "Summary:\nBased on the available data, ");
    } else {
      nextAnswer = `Based on the available data, ${nextAnswer}`;
    }
  }

  if (envelope.notes.length > 0) {
    const renderedNotes = envelope.notes.map((note) => `- ${note.message}`).join("\n");

    if (!/\nNotes?:/i.test(nextAnswer)) {
      nextAnswer = `${nextAnswer}\n\nNotes:\n${renderedNotes}`;
    }
  }

  return nextAnswer;
}

export function buildAnswerEnvelope(input: {
  answer: string;
  trace: OpsQueryTrace;
  analytics?: OpsAnalytics;
  packedContext?: PackedOpsContext<PackedOrderData>;
}) {
  const sections = splitAnswerSections(input.answer);
  const confidence = deriveAnswerConfidence(input.trace);
  const basedOn = buildAnswerBasis(input.packedContext);
  const sourceLabels = basedOn.map((entry) => entry.label);
  const nextChecks = parseBulletLines(sections["next checks"]);
  const details = parseBulletLines(sections.details);
  const notes = buildTrustNotes(input.trace, input.packedContext);
  const summary = getSummaryFromSections(input.answer, sections) || input.analytics?.summary || "";
  const envelopeWithoutAnswer: Omit<OpsAnswerEnvelope, "answer"> = {
    summary,
    details,
    nextChecks,
    confidence,
    basedOn,
    notes,
    sourceLabels,
    partialData: input.trace.flags.partialData,
  };

  return {
    ...envelopeWithoutAnswer,
    answer: applyTrustAwareAnswer(input.answer, envelopeWithoutAnswer),
  } satisfies OpsAnswerEnvelope;
}
