import type { OpsDomain } from "@/lib/ops/types";

export type AnswerConfidenceLevel = "high" | "medium" | "limited";

export interface AnswerBasisSummary {
  label: string;
  domain?: OpsDomain;
}

export interface AnswerTrustNote {
  message: string;
}

export interface OpsAnswerEnvelope {
  answer: string;
  summary: string;
  details: string[];
  nextChecks: string[];
  confidence: AnswerConfidenceLevel;
  basedOn: AnswerBasisSummary[];
  notes: AnswerTrustNote[];
  sourceLabels: string[];
  partialData: boolean;
}
