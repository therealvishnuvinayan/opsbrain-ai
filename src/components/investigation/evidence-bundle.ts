export type InvestigationActionType =
  | "APPROVE_MOVE_TO_BUFFER"
  | "DISCARD_RUN"
  | "RERUN_STAGE"
  | "GENERATE_EVIDENCE_BUNDLE"
  | "CREATE_JIRA_TICKET"
  | "ADD_NOTE";

export interface InvestigationReportResponse {
  run: {
    id: string;
    processId: string;
    mode: string;
    status: string;
    severity: string;
    entityType: string;
    entityName: string;
    uploadedAt: string;
    updatedAt: string;
    mismatchRate: number;
    riskScore: number;
    estimatedExposure: number;
    totalRecords: number;
    failedRecords: number;
    unmatchedRecords: number;
    bufferedRecords: number;
  };
  diagnosis: {
    headline: string;
    summary: string;
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    confidence: number;
    primarySignals: string[];
  };
  hypotheses: Array<{
    title: string;
    rationale: string;
    evidence: string[];
    probability: number;
  }>;
  evidence: {
    keyMetrics: Array<{ label: string; value: string; note?: string }>;
    topIssueTypes: Array<{ type: string; count: number; severity: string }>;
    topErrors: Array<{ message: string; count: number }>;
    timeline: Array<{ at: string; severity: string; message: string }>;
  };
  recommendedActions: Array<{
    id: string;
    label: string;
    intent: string;
    actionType: InvestigationActionType;
    payload?: unknown;
  }>;
  nextQuestions: string[];
  sampleIssues?: unknown[];
}

interface EvidenceBundlePayload {
  exportedAt: string;
  source: string;
  runId: string;
  processId: string;
  investigation: InvestigationReportResponse;
  issuesSample: unknown[];
}

interface ExportEvidenceBundleParams {
  investigation: InvestigationReportResponse;
  source?: string;
}

function toDateStamp(date: Date) {
  return date.toISOString().slice(0, 10);
}

function buildEvidenceFileName(processId: string) {
  return `opsbrain-evidence-${processId}-${toDateStamp(new Date())}.json`;
}

function downloadJson(fileName: string, payload: EvidenceBundlePayload) {
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();

  URL.revokeObjectURL(url);
}

async function fetchIssueSample(runId: string) {
  const response = await fetch(`/api/runs/${runId}/issues?page=1&pageSize=50`, {
    method: "GET",
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as { items?: unknown[] };
  return data.items ?? [];
}

export async function exportEvidenceBundle({
  investigation,
  source = "investigation-center-v0",
}: ExportEvidenceBundleParams) {
  const precomputedSample = investigation.sampleIssues ?? [];
  const issuesSample =
    precomputedSample.length > 0
      ? precomputedSample.slice(0, 50)
      : await fetchIssueSample(investigation.run.id);

  const payload: EvidenceBundlePayload = {
    exportedAt: new Date().toISOString(),
    source,
    runId: investigation.run.id,
    processId: investigation.run.processId,
    investigation,
    issuesSample,
  };

  downloadJson(buildEvidenceFileName(investigation.run.processId), payload);
}
