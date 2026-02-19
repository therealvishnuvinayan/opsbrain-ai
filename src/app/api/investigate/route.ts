import { ActionType, RunStatus, type Prisma, type Severity } from "@prisma/client";
import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";
import { getIssueTypeLabel, getStatusLabel } from "@/lib/reconciliation";

interface InvestigateBody {
  runId?: string;
}

type SignalSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

interface Signal {
  key: string;
  title: string;
  severity: SignalSeverity;
  weight: number;
  rationale: string;
  evidence: string[];
  category: "pipeline" | "supplier" | "matching" | "quality" | "financial";
}

const severityRank: Record<SignalSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercentFromRatio(value: number) {
  return `${(value * 100).toFixed(2)}%`;
}

function formatStatus(value: string) {
  return getStatusLabel(value);
}

function highestSeverity(first: SignalSeverity, second: SignalSeverity): SignalSeverity {
  return severityRank[first] >= severityRank[second] ? first : second;
}

function addAction(
  actions: Array<{
    id: string;
    label: string;
    intent: string;
    actionType: ActionType;
    payload?: Prisma.InputJsonValue;
  }>,
  action: {
    id: string;
    label: string;
    intent: string;
    actionType: ActionType;
    payload?: Prisma.InputJsonValue;
  }
) {
  const exists = actions.some(
    (candidate) =>
      candidate.actionType === action.actionType &&
      candidate.label.toLowerCase() === action.label.toLowerCase()
  );

  if (!exists) {
    actions.push(action);
  }
}

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getApiSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  if (!session) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json()) as InvestigateBody;
  const runId = body.runId?.trim();

  if (!runId) {
    return NextResponse.json({ message: "runId is required." }, { status: 400 });
  }

  const [run, events, issueTypeBySeverity, topErrors, sampleIssues] = await Promise.all([
    prisma.reconciliationRun.findUnique({
      where: { id: runId },
    }),
    prisma.runEvent.findMany({
      where: { runId },
      orderBy: { at: "desc" },
      take: 50,
    }),
    prisma.runIssue.groupBy({
      by: ["issueType", "severity"],
      where: { runId },
      _count: { _all: true },
    }),
    prisma.runIssue.groupBy({
      by: ["errorMessage"],
      where: {
        runId,
        errorMessage: {
          not: null,
        },
      },
      _count: { _all: true },
      orderBy: {
        _count: {
          errorMessage: "desc",
        },
      },
      take: 10,
    }),
    prisma.runIssue.findMany({
      where: { runId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        issueType: true,
        severity: true,
        supplierIdentifier: true,
        supplierOrderNumber: true,
        cardId: true,
        orderId: true,
        productSku: true,
        brandName: true,
        errorMessage: true,
        createdAt: true,
      },
    }),
  ]);

  if (!run) {
    return NextResponse.json({ message: "Run not found." }, { status: 404 });
  }

  const issueTotals = new Map<string, number>();
  const issueSeverity = new Map<string, SignalSeverity>();
  const typeSeverityRank: Record<Severity, SignalSeverity> = {
    LOW: "LOW",
    MEDIUM: "MEDIUM",
    HIGH: "HIGH",
    CRITICAL: "CRITICAL",
  };

  for (const group of issueTypeBySeverity) {
    const key = group.issueType;
    const count = group._count._all;
    issueTotals.set(key, (issueTotals.get(key) ?? 0) + count);

    const candidateSeverity = typeSeverityRank[group.severity];
    issueSeverity.set(
      key,
      issueSeverity.has(key)
        ? highestSeverity(issueSeverity.get(key)!, candidateSeverity)
        : candidateSeverity
    );
  }

  const totalIssues = [...issueTotals.values()].reduce((sum, value) => sum + value, 0);
  const supplierFetchFailed = issueTotals.get("SUPPLIER_FETCH_FAILED") ?? 0;
  const ambiguousMatch = issueTotals.get("AMBIGUOUS_MATCH") ?? 0;
  const duplicateOrUrl = issueTotals.get("DUPLICATE_CODE_OR_URL") ?? 0;
  const validationError = issueTotals.get("VALIDATION_ERROR") ?? 0;
  const qualityIssues = duplicateOrUrl + validationError;

  const lastEventAt = events[0]?.at ?? run.updatedAt;
  const stuckDurationMinutes = Math.max(
    0,
    Math.round((Date.now() - new Date(lastEventAt).getTime()) / (60 * 1000))
  );

  const mismatchRatio = run.mismatchRate > 1 ? run.mismatchRate / 100 : run.mismatchRate;
  const mismatchPercent = mismatchRatio * 100;

  const supplierFailureThreshold = Math.max(8, Math.round(totalIssues * 0.18));
  const ambiguityThreshold = Math.max(8, Math.round(totalIssues * 0.15));
  const qualityThreshold = Math.max(10, Math.round(totalIssues * 0.2));

  const signals: Signal[] = [];

  if (
    (run.status === RunStatus.UPLOAD_COMPLETED || run.status === RunStatus.IN_PROGRESS) &&
    stuckDurationMinutes > 120
  ) {
    signals.push({
      key: "stuck_run",
      title: "Stuck run in active pipeline stage",
      severity: "CRITICAL",
      weight: 92,
      category: "pipeline",
      rationale:
        "Run is still in an in-flight status and no progress has been observed within the expected SLA.",
      evidence: [
        `Status: ${formatStatus(run.status)}`,
        `No progress for ${stuckDurationMinutes} minutes`,
      ],
    });
  }

  if (mismatchRatio > 0.08) {
    signals.push({
      key: "mismatch_spike",
      title: "Mismatch spike beyond operational threshold",
      severity: mismatchRatio > 0.11 ? "CRITICAL" : "HIGH",
      weight: mismatchRatio > 0.11 ? 85 : 76,
      category: "matching",
      rationale:
        "Mismatch ratio is elevated, indicating matching quality degradation or upstream feed drift.",
      evidence: [
        `Mismatch rate: ${formatPercentFromRatio(mismatchRatio)}`,
        `Unmatched records: ${run.unmatchedRecords.toLocaleString("en-US")}`,
      ],
    });
  }

  if (run.estimatedExposure > 100000) {
    signals.push({
      key: "exposure_high",
      title: "High financial exposure",
      severity: run.estimatedExposure > 180000 ? "CRITICAL" : "HIGH",
      weight: run.estimatedExposure > 180000 ? 82 : 72,
      category: "financial",
      rationale:
        "Estimated unresolved value is above risk appetite and should be triaged with urgency.",
      evidence: [
        `Estimated exposure: ${formatCurrency(run.estimatedExposure)}`,
        `Failed records: ${run.failedRecords.toLocaleString("en-US")}`,
      ],
    });
  }

  if (supplierFetchFailed >= supplierFailureThreshold) {
    signals.push({
      key: "supplier_fetch_failures",
      title: "Supplier API failure cluster",
      severity: supplierFetchFailed > supplierFailureThreshold * 1.5 ? "CRITICAL" : "HIGH",
      weight: supplierFetchFailed > supplierFailureThreshold * 1.5 ? 88 : 73,
      category: "supplier",
      rationale:
        "A high proportion of row-level failures indicate unstable supplier retrieval or authentication errors.",
      evidence: [
        `SUPPLIER_FETCH_FAILED issues: ${supplierFetchFailed.toLocaleString("en-US")}`,
        `Threshold: ${supplierFailureThreshold.toLocaleString("en-US")}`,
      ],
    });
  }

  if (ambiguousMatch >= ambiguityThreshold) {
    signals.push({
      key: "matching_ambiguity",
      title: "Matching rule ambiguity detected",
      severity: "HIGH",
      weight: 69,
      category: "matching",
      rationale:
        "High ambiguous matches suggest deterministic rules are insufficient for this feed shape.",
      evidence: [
        `AMBIGUOUS_MATCH issues: ${ambiguousMatch.toLocaleString("en-US")}`,
        `Threshold: ${ambiguityThreshold.toLocaleString("en-US")}`,
      ],
    });
  }

  if (qualityIssues >= qualityThreshold) {
    signals.push({
      key: "data_quality",
      title: "Data quality/template mismatch",
      severity: "HIGH",
      weight: 67,
      category: "quality",
      rationale:
        "Validation and duplicate anomalies indicate source template drift or input data integrity problems.",
      evidence: [
        `VALIDATION_ERROR: ${validationError.toLocaleString("en-US")}`,
        `DUPLICATE_CODE_OR_URL: ${duplicateOrUrl.toLocaleString("en-US")}`,
      ],
    });
  }

  if (signals.length === 0) {
    signals.push({
      key: "multi_factor_baseline",
      title: "No dominant anomaly cluster detected",
      severity: run.severity as SignalSeverity,
      weight: 52,
      category: "pipeline",
      rationale:
        "Run appears generally within expected variance with no single dominant fault signature.",
      evidence: [
        `Status: ${formatStatus(run.status)}`,
        `Mismatch rate: ${mismatchPercent.toFixed(2)}%`,
      ],
    });
  }

  const sortedSignals = [...signals].sort((a, b) => b.weight - a.weight);
  const primarySignals = sortedSignals.slice(0, 3).map((signal) => signal.title);
  const diagnosisSeverity = sortedSignals.reduce<SignalSeverity>(
    (current, signal) => highestSeverity(current, signal.severity),
    "LOW"
  );

  const signalWeightTotal = sortedSignals.reduce((sum, signal) => sum + signal.weight, 0);
  const dominanceRatio = signalWeightTotal
    ? sortedSignals[0]!.weight / signalWeightTotal
    : 0.45;
  const confidence = clamp(
    Math.round(56 + dominanceRatio * 30 + Math.min(12, sortedSignals.length * 3)),
    40,
    97
  );

  const scoreByHypothesis = new Map<
    string,
    {
      title: string;
      rationale: string;
      evidence: string[];
      score: number;
    }
  >();

  const pushHypothesisScore = (
    key: string,
    seed: { title: string; rationale: string; evidence: string[] },
    increment: number
  ) => {
    const existing = scoreByHypothesis.get(key);

    if (!existing) {
      scoreByHypothesis.set(key, {
        ...seed,
        score: increment,
      });
      return;
    }

    existing.score += increment;
    for (const evidenceLine of seed.evidence) {
      if (!existing.evidence.includes(evidenceLine)) {
        existing.evidence.push(evidenceLine);
      }
    }
  };

  for (const signal of sortedSignals) {
    if (signal.category === "pipeline") {
      pushHypothesisScore(
        "pipeline_stall",
        {
          title: "Pipeline stage stalled due to unresolved upstream dependency",
          rationale:
            "Execution likely paused in orchestration while waiting on a dependency or manual intervention path.",
          evidence: signal.evidence,
        },
        signal.weight
      );
    }

    if (signal.category === "supplier") {
      pushHypothesisScore(
        "supplier_api_instability",
        {
          title: "Supplier API instability caused reconciliation gaps",
          rationale:
            "Supplier endpoint latency/errors prevented enrichment, causing downstream validation and matching failures.",
          evidence: signal.evidence,
        },
        signal.weight
      );
    }

    if (signal.category === "matching") {
      pushHypothesisScore(
        "matching_rule_drift",
        {
          title: "Matching logic ambiguity due to feed drift",
          rationale:
            "Current deterministic matching rules likely need retuning for the incoming supplier payload profile.",
          evidence: signal.evidence,
        },
        signal.weight
      );
    }

    if (signal.category === "quality") {
      pushHypothesisScore(
        "template_quality_mismatch",
        {
          title: "Data quality/template mismatch in source payload",
          rationale:
            "Template shape or field quality has drifted, creating duplicate and validation-heavy failure patterns.",
          evidence: signal.evidence,
        },
        signal.weight
      );
    }

    if (signal.category === "financial") {
      pushHypothesisScore(
        "financial_risk_escalation",
        {
          title: "Financial risk escalation from unresolved failed records",
          rationale:
            "Unresolved failures have accumulated enough value at risk to require coordinated remediation.",
          evidence: signal.evidence,
        },
        signal.weight
      );
    }
  }

  const defaultHypotheses = [
    {
      key: "pipeline_baseline",
      title: "Pipeline throughput remains within normal variance",
      rationale:
        "No single failure mode dominates; run appears to be affected by routine low-severity noise.",
      evidence: [`Run status: ${formatStatus(run.status)}`],
      score: 40,
    },
    {
      key: "reconciliation_noise",
      title: "Mixed low-signal reconciliation anomalies",
      rationale:
        "Observed issues likely represent normal provider noise rather than a systemic outage.",
      evidence: [`Total issues: ${totalIssues.toLocaleString("en-US")}`],
      score: 32,
    },
  ];

  let rankedHypotheses = [...scoreByHypothesis.entries()]
    .map(([key, value]) => ({ key, ...value }))
    .sort((a, b) => b.score - a.score);

  if (rankedHypotheses.length < 2) {
    for (const fallback of defaultHypotheses) {
      if (rankedHypotheses.find((item) => item.key === fallback.key)) {
        continue;
      }

      rankedHypotheses.push(fallback);
      if (rankedHypotheses.length >= 2) {
        break;
      }
    }
  }

  rankedHypotheses = rankedHypotheses.slice(0, 4);

  const hypothesisScoreTotal = rankedHypotheses.reduce((sum, item) => sum + item.score, 0) || 1;

  const hypotheses = rankedHypotheses.map((hypothesis) => {
    const rawProbability = Math.round((hypothesis.score / hypothesisScoreTotal) * 100);

    return {
      title: hypothesis.title,
      rationale: hypothesis.rationale,
      evidence: hypothesis.evidence.slice(0, 4),
      probability: clamp(rawProbability, 10, 95),
    };
  });

  const topIssueTypes = [...issueTotals.entries()]
    .sort(([, leftCount], [, rightCount]) => rightCount - leftCount)
    .slice(0, 8)
    .map(([issueType, count]) => ({
      type: getIssueTypeLabel(issueType),
      count,
      severity: issueSeverity.get(issueType) ?? "LOW",
    }));

  const timeline = events.map((event) => ({
    at: event.at.toISOString(),
    severity: event.severity,
    message: event.message,
  }));

  const keyMetrics = [
    {
      label: "Process",
      value: run.processId,
      note: `${run.entityType}: ${run.entityName}`,
    },
    {
      label: "Status",
      value: formatStatus(run.status),
    },
    {
      label: "Mismatch Rate",
      value: formatPercentFromRatio(mismatchRatio),
      note: `${run.unmatchedRecords.toLocaleString("en-US")} unmatched`,
    },
    {
      label: "Estimated Exposure",
      value: formatCurrency(run.estimatedExposure),
    },
    {
      label: "Issue Volume",
      value: totalIssues.toLocaleString("en-US"),
    },
    {
      label: "Stuck Duration",
      value: `${stuckDurationMinutes}m`,
      note: `since ${new Date(lastEventAt).toLocaleString("en-US")}`,
    },
  ];

  const recommendedActions: Array<{
    id: string;
    label: string;
    intent: string;
    actionType: ActionType;
    payload?: Prisma.InputJsonValue;
  }> = [];

  if (sortedSignals.some((signal) => signal.key === "stuck_run")) {
    addAction(recommendedActions, {
      id: "rerun-stuck-stage",
      label: "Rerun Stuck Stage",
      intent: "Resume orchestration from the most likely blocked stage to unblock throughput.",
      actionType: ActionType.RERUN_STAGE,
      payload: {
        stage:
          run.status === RunStatus.UPLOAD_COMPLETED || run.status === RunStatus.IN_PROGRESS
            ? "SUPPLIER_FETCH"
            : "BUFFER",
      },
    });
  }

  if (sortedSignals.some((signal) => signal.key === "supplier_fetch_failures")) {
    addAction(recommendedActions, {
      id: "jira-supplier-outage",
      label: "Create Supplier Jira Ticket",
      intent: "Escalate API failure pattern to supplier operations with attached diagnostics.",
      actionType: ActionType.CREATE_JIRA_TICKET,
      payload: {
        queue: "SUPPLIER-OPS",
        reason: "SUPPLIER_FETCH_FAILED_CLUSTER",
      },
    });
    addAction(recommendedActions, {
      id: "rerun-supplier-fetch",
      label: "Rerun Supplier Fetch",
      intent: "Retry supplier enrichment after outage window to recover failed rows.",
      actionType: ActionType.RERUN_STAGE,
      payload: {
        stage: "SUPPLIER_FETCH",
      },
    });
  }

  if (
    sortedSignals.some(
      (signal) =>
        signal.key === "mismatch_spike" ||
        signal.key === "matching_ambiguity" ||
        signal.key === "exposure_high" ||
        signal.key === "data_quality"
    )
  ) {
    addAction(recommendedActions, {
      id: "generate-evidence",
      label: "Generate Evidence Bundle",
      intent: "Package a shareable forensic summary for finance, operations, and audit.",
      actionType: ActionType.GENERATE_EVIDENCE_BUNDLE,
      payload: {
        include: ["diagnosis", "topIssueTypes", "topErrors", "timeline"],
      },
    });
  }

  if (
    sortedSignals.some(
      (signal) => signal.key === "mismatch_spike" || signal.key === "matching_ambiguity"
    )
  ) {
    addAction(recommendedActions, {
      id: "open-mismatch-drilldown",
      label: "Open Mismatch Drilldown",
      intent: "Jump to filtered run issues focused on ambiguity and mismatch anomalies.",
      actionType: ActionType.ADD_NOTE,
      payload: {
        href: `/runs/${run.id}?type=AMBIGUOUS_MATCH`,
      },
    });
    addAction(recommendedActions, {
      id: "jira-matching-rules",
      label: "Create Matching Rules Ticket",
      intent: "Open an engineering task to refine ambiguous matching logic and thresholds.",
      actionType: ActionType.CREATE_JIRA_TICKET,
      payload: {
        queue: "RECON-ENG",
        reason: "MATCHING_RULE_DRIFT",
      },
    });
  }

  if (sortedSignals.some((signal) => signal.key === "data_quality")) {
    addAction(recommendedActions, {
      id: "download-template-guidance",
      label: "Download Template Guidance",
      intent: "Use the supplier template checklist before rerunning this reconciliation batch.",
      actionType: ActionType.ADD_NOTE,
      payload: {
        guidanceUrl: "/knowledge?doc=supplier-template-guidance",
      },
    });
  }

  addAction(recommendedActions, {
    id: "always-add-note",
    label: "Add Note",
    intent: "Capture analyst findings and preserve operational context for the audit trail.",
    actionType: ActionType.ADD_NOTE,
  });

  const nextQuestions = [
    "Did supplier latency or auth failures begin near the run upload timestamp?",
    "Which entities contributed most to unmatched records in this run?",
    "Do recent runs for this supplier show the same issue signature?",
    "Is the current matching policy tuned for this supplier feed version?",
  ].slice(0, sortedSignals[0]?.key === "multi_factor_baseline" ? 2 : 4);

  const diagnosisHeadlineBySignal: Record<string, string> = {
    stuck_run: "Run is stalled in the reconciliation pipeline",
    supplier_fetch_failures: "Supplier integration instability is the primary failure driver",
    mismatch_spike: "Mismatch ratio is materially above operating threshold",
    matching_ambiguity: "Matching ambiguity is suppressing deterministic reconciliation",
    data_quality: "Source data quality drift is degrading reconciliation accuracy",
    exposure_high: "High unresolved exposure requires immediate mitigation",
    multi_factor_baseline: "No dominant incident pattern detected",
  };

  const headline = diagnosisHeadlineBySignal[sortedSignals[0]?.key ?? "multi_factor_baseline"];
  const summary =
    `${formatStatus(run.status)} run ${run.processId} for ${run.entityName} shows ` +
    `${sortedSignals.length} major signal${sortedSignals.length > 1 ? "s" : ""}. ` +
    `Top risk driver: ${sortedSignals[0]?.title.toLowerCase()}. ` +
    `Mismatch is ${mismatchPercent.toFixed(2)}% with estimated exposure ${formatCurrency(
      run.estimatedExposure
    )}.`;

  const payloadForLog = {
    source: "investigation-api-v0",
    runId: run.id,
    processId: run.processId,
    primarySignals,
    topIssueTypes: topIssueTypes.slice(0, 5),
    confidence,
  } as Prisma.InputJsonValue;

  await prisma.actionLog.create({
    data: {
      runId: run.id,
      actionType: ActionType.ADD_NOTE,
      actorEmail: session.user?.email ?? null,
      note: "Investigation generated",
      payloadJson: payloadForLog,
    },
  });

  return NextResponse.json({
    run: {
      id: run.id,
      processId: run.processId,
      mode: run.mode,
      status: run.status,
      severity: run.severity,
      entityType: run.entityType,
      entityName: run.entityName,
      uploadedAt: run.uploadedAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
      mismatchRate: run.mismatchRate,
      riskScore: run.riskScore,
      estimatedExposure: run.estimatedExposure,
      totalRecords: run.totalRecords,
      failedRecords: run.failedRecords,
      unmatchedRecords: run.unmatchedRecords,
      bufferedRecords: run.bufferedRecords,
    },
    diagnosis: {
      headline,
      summary,
      severity: diagnosisSeverity,
      confidence,
      primarySignals,
    },
    hypotheses,
    evidence: {
      keyMetrics,
      topIssueTypes,
      topErrors: topErrors.map((item) => ({
        message: item.errorMessage ?? "Unknown error",
        count: item._count._all,
      })),
      timeline,
    },
    recommendedActions,
    nextQuestions,
    sampleIssues: sampleIssues.map((issue) => ({
      ...issue,
      createdAt: issue.createdAt.toISOString(),
    })),
  });
}
