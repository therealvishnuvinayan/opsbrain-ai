import {
  ActionType,
  IssueType,
  RunMode,
  RunStatus,
  Severity,
  type Prisma,
} from "@prisma/client";

import { prisma } from "../src/lib/prisma";

const RUN_TARGET = 120;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

const ENTITIES = [
  "Runa",
  "Eneba",
  "Epay",
  "Incomm",
  "Diggecard",
  "Gamivo",
  "Kinguin",
  "G2A",
  "Ezpin",
  "Cadooz",
] as const;

const BRAND_NAMES = [
  "Steam",
  "PlayStation",
  "Xbox",
  "Nintendo",
  "Riot",
  "Roblox",
  "Google Play",
  "Amazon",
  "Apple",
  "Visa",
] as const;

const EMAIL_POOL = [
  "ops@bamboo.ai",
  "recon@bamboo.ai",
  "supplier-ops@bamboo.ai",
  "risk@bamboo.ai",
  "investigator@bamboo.ai",
] as const;

const ISSUE_TYPE_WEIGHTS: Record<RunStatus, Array<{ type: IssueType; weight: number }>> = {
  INITIATED: [
    { type: IssueType.VALIDATION_ERROR, weight: 18 },
    { type: IssueType.INVALID_SUPPLIER, weight: 14 },
    { type: IssueType.SUPPLIER_FETCH_FAILED, weight: 20 },
    { type: IssueType.NOT_FOUND_IN_BAMBOO, weight: 12 },
    { type: IssueType.AMBIGUOUS_MATCH, weight: 8 },
    { type: IssueType.ALREADY_PROCESSED, weight: 7 },
    { type: IssueType.EXPIRED, weight: 8 },
    { type: IssueType.INVALID_PRODUCT_BRAND, weight: 5 },
    { type: IssueType.DUPLICATE_CODE_OR_URL, weight: 8 },
  ],
  UPLOAD_COMPLETED: [
    { type: IssueType.VALIDATION_ERROR, weight: 22 },
    { type: IssueType.INVALID_SUPPLIER, weight: 14 },
    { type: IssueType.SUPPLIER_FETCH_FAILED, weight: 24 },
    { type: IssueType.NOT_FOUND_IN_BAMBOO, weight: 12 },
    { type: IssueType.AMBIGUOUS_MATCH, weight: 7 },
    { type: IssueType.ALREADY_PROCESSED, weight: 5 },
    { type: IssueType.EXPIRED, weight: 6 },
    { type: IssueType.INVALID_PRODUCT_BRAND, weight: 4 },
    { type: IssueType.DUPLICATE_CODE_OR_URL, weight: 6 },
  ],
  IN_PROGRESS: [
    { type: IssueType.NOT_FOUND_IN_BAMBOO, weight: 20 },
    { type: IssueType.SUPPLIER_FETCH_FAILED, weight: 22 },
    { type: IssueType.AMBIGUOUS_MATCH, weight: 14 },
    { type: IssueType.VALIDATION_ERROR, weight: 12 },
    { type: IssueType.ALREADY_PROCESSED, weight: 10 },
    { type: IssueType.EXPIRED, weight: 8 },
    { type: IssueType.INVALID_PRODUCT_BRAND, weight: 5 },
    { type: IssueType.INVALID_SUPPLIER, weight: 4 },
    { type: IssueType.DUPLICATE_CODE_OR_URL, weight: 5 },
  ],
  FETCHED_FROM_SUPPLIER: [
    { type: IssueType.NOT_FOUND_IN_BAMBOO, weight: 24 },
    { type: IssueType.AMBIGUOUS_MATCH, weight: 20 },
    { type: IssueType.VALIDATION_ERROR, weight: 14 },
    { type: IssueType.ALREADY_PROCESSED, weight: 10 },
    { type: IssueType.EXPIRED, weight: 10 },
    { type: IssueType.SUPPLIER_FETCH_FAILED, weight: 8 },
    { type: IssueType.INVALID_PRODUCT_BRAND, weight: 6 },
    { type: IssueType.INVALID_SUPPLIER, weight: 4 },
    { type: IssueType.DUPLICATE_CODE_OR_URL, weight: 4 },
  ],
  VALIDATED: [
    { type: IssueType.NOT_FOUND_IN_BAMBOO, weight: 26 },
    { type: IssueType.AMBIGUOUS_MATCH, weight: 18 },
    { type: IssueType.ALREADY_PROCESSED, weight: 14 },
    { type: IssueType.EXPIRED, weight: 12 },
    { type: IssueType.VALIDATION_ERROR, weight: 10 },
    { type: IssueType.DUPLICATE_CODE_OR_URL, weight: 8 },
    { type: IssueType.INVALID_PRODUCT_BRAND, weight: 5 },
    { type: IssueType.INVALID_SUPPLIER, weight: 4 },
    { type: IssueType.SUPPLIER_FETCH_FAILED, weight: 3 },
  ],
  BUFFER_IN_PROGRESS: [
    { type: IssueType.NOT_FOUND_IN_BAMBOO, weight: 24 },
    { type: IssueType.ALREADY_PROCESSED, weight: 18 },
    { type: IssueType.DUPLICATE_CODE_OR_URL, weight: 14 },
    { type: IssueType.AMBIGUOUS_MATCH, weight: 12 },
    { type: IssueType.EXPIRED, weight: 10 },
    { type: IssueType.VALIDATION_ERROR, weight: 9 },
    { type: IssueType.INVALID_PRODUCT_BRAND, weight: 6 },
    { type: IssueType.SUPPLIER_FETCH_FAILED, weight: 4 },
    { type: IssueType.INVALID_SUPPLIER, weight: 3 },
  ],
  INSERTED_TO_BUFFER: [
    { type: IssueType.ALREADY_PROCESSED, weight: 22 },
    { type: IssueType.NOT_FOUND_IN_BAMBOO, weight: 20 },
    { type: IssueType.DUPLICATE_CODE_OR_URL, weight: 14 },
    { type: IssueType.EXPIRED, weight: 12 },
    { type: IssueType.AMBIGUOUS_MATCH, weight: 10 },
    { type: IssueType.VALIDATION_ERROR, weight: 8 },
    { type: IssueType.INVALID_PRODUCT_BRAND, weight: 6 },
    { type: IssueType.INVALID_SUPPLIER, weight: 4 },
    { type: IssueType.SUPPLIER_FETCH_FAILED, weight: 4 },
  ],
  COMPLETED: [
    { type: IssueType.ALREADY_PROCESSED, weight: 24 },
    { type: IssueType.NOT_FOUND_IN_BAMBOO, weight: 18 },
    { type: IssueType.DUPLICATE_CODE_OR_URL, weight: 14 },
    { type: IssueType.EXPIRED, weight: 14 },
    { type: IssueType.AMBIGUOUS_MATCH, weight: 10 },
    { type: IssueType.VALIDATION_ERROR, weight: 8 },
    { type: IssueType.INVALID_PRODUCT_BRAND, weight: 6 },
    { type: IssueType.INVALID_SUPPLIER, weight: 3 },
    { type: IssueType.SUPPLIER_FETCH_FAILED, weight: 3 },
  ],
  PARTIALLY_COMPLETED: [
    { type: IssueType.NOT_FOUND_IN_BAMBOO, weight: 22 },
    { type: IssueType.ALREADY_PROCESSED, weight: 16 },
    { type: IssueType.DUPLICATE_CODE_OR_URL, weight: 13 },
    { type: IssueType.SUPPLIER_FETCH_FAILED, weight: 12 },
    { type: IssueType.AMBIGUOUS_MATCH, weight: 11 },
    { type: IssueType.EXPIRED, weight: 9 },
    { type: IssueType.VALIDATION_ERROR, weight: 8 },
    { type: IssueType.INVALID_PRODUCT_BRAND, weight: 5 },
    { type: IssueType.INVALID_SUPPLIER, weight: 4 },
  ],
  DISCARDED: [
    { type: IssueType.VALIDATION_ERROR, weight: 20 },
    { type: IssueType.INVALID_SUPPLIER, weight: 18 },
    { type: IssueType.SUPPLIER_FETCH_FAILED, weight: 18 },
    { type: IssueType.NOT_FOUND_IN_BAMBOO, weight: 14 },
    { type: IssueType.DUPLICATE_CODE_OR_URL, weight: 9 },
    { type: IssueType.AMBIGUOUS_MATCH, weight: 8 },
    { type: IssueType.EXPIRED, weight: 6 },
    { type: IssueType.INVALID_PRODUCT_BRAND, weight: 4 },
    { type: IssueType.ALREADY_PROCESSED, weight: 3 },
  ],
  FAILED: [
    { type: IssueType.SUPPLIER_FETCH_FAILED, weight: 28 },
    { type: IssueType.VALIDATION_ERROR, weight: 21 },
    { type: IssueType.INVALID_SUPPLIER, weight: 15 },
    { type: IssueType.NOT_FOUND_IN_BAMBOO, weight: 14 },
    { type: IssueType.AMBIGUOUS_MATCH, weight: 6 },
    { type: IssueType.DUPLICATE_CODE_OR_URL, weight: 6 },
    { type: IssueType.INVALID_PRODUCT_BRAND, weight: 4 },
    { type: IssueType.EXPIRED, weight: 4 },
    { type: IssueType.ALREADY_PROCESSED, weight: 2 },
  ],
};

const STATUS_WEIGHTS: Array<{ status: RunStatus; weight: number }> = [
  { status: RunStatus.COMPLETED, weight: 32 },
  { status: RunStatus.PARTIALLY_COMPLETED, weight: 14 },
  { status: RunStatus.INSERTED_TO_BUFFER, weight: 10 },
  { status: RunStatus.VALIDATED, weight: 8 },
  { status: RunStatus.FETCHED_FROM_SUPPLIER, weight: 7 },
  { status: RunStatus.BUFFER_IN_PROGRESS, weight: 7 },
  { status: RunStatus.IN_PROGRESS, weight: 8 },
  { status: RunStatus.UPLOAD_COMPLETED, weight: 5 },
  { status: RunStatus.FAILED, weight: 5 },
  { status: RunStatus.DISCARDED, weight: 2 },
  { status: RunStatus.INITIATED, weight: 2 },
];

const ISSUE_MESSAGES: Record<IssueType, string[]> = {
  NOT_FOUND_IN_BAMBOO: [
    "Supplier SKU not found in Bamboo catalog.",
    "No matching Bamboo card reference for supplier identifier.",
    "Record exists in supplier feed but missing in Bamboo inventory graph.",
  ],
  SUPPLIER_FETCH_FAILED: [
    "Supplier API timed out while retrieving order details.",
    "Supplier endpoint returned 502 during enrichment step.",
    "Authentication token rejected by supplier system.",
  ],
  ALREADY_PROCESSED: [
    "Order already processed in prior reconciliation cycle.",
    "Duplicate settlement record detected for this card.",
    "Record already buffered in previous run.",
  ],
  EXPIRED: [
    "Gift card expired before confirmation event.",
    "Settlement event arrived after validity window.",
    "Supplier order marked expired in upstream feed.",
  ],
  INVALID_PRODUCT_BRAND: [
    "Brand mapping failed validation against taxonomy.",
    "Supplier brand string did not map to approved brand.",
    "Brand alias mismatch with policy whitelist.",
  ],
  INVALID_SUPPLIER: [
    "Supplier identifier is not part of approved partner list.",
    "Supplier account is disabled for this entity scope.",
    "Supplier code failed policy validation.",
  ],
  DUPLICATE_CODE_OR_URL: [
    "Duplicate card code detected across separate supplier orders.",
    "Redeem URL already exists for another transaction.",
    "Unique code constraint violation in buffering stage.",
  ],
  VALIDATION_ERROR: [
    "Mandatory field missing in supplier payload.",
    "Amount and currency pair failed schema validation.",
    "Line item record violates reconciliation policy checks.",
  ],
  AMBIGUOUS_MATCH: [
    "Multiple Bamboo records match supplier order with similar attributes.",
    "Confidence score below threshold for deterministic matching.",
    "Ambiguous match between supplier order number and Bamboo order graph.",
  ],
};

let idCounter = 0;

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number, precision = 2) {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(precision));
}

function pickOne<T>(items: readonly T[]): T {
  return items[randomInt(0, items.length - 1)]!;
}

function pickWeighted<T>(items: Array<{ weight: number; value: T }>): T {
  const total = items.reduce((sum, item) => sum + item.weight, 0);
  let threshold = Math.random() * total;

  for (const item of items) {
    threshold -= item.weight;

    if (threshold <= 0) {
      return item.value;
    }
  }

  return items[items.length - 1]!.value;
}

function makeId() {
  idCounter += 1;
  return `c${Date.now().toString(36)}${idCounter.toString(36)}${Math.random()
    .toString(36)
    .slice(2, 12)}`;
}

function weightedStatus() {
  return pickWeighted(
    STATUS_WEIGHTS.map((item) => ({
      weight: item.weight,
      value: item.status,
    }))
  );
}

function issueTypeForStatus(status: RunStatus) {
  return pickWeighted(
    ISSUE_TYPE_WEIGHTS[status].map((item) => ({
      weight: item.weight,
      value: item.type,
    }))
  );
}

function severityForIssueType(issueType: IssueType): Severity {
  switch (issueType) {
    case IssueType.SUPPLIER_FETCH_FAILED:
    case IssueType.INVALID_SUPPLIER:
      return Math.random() > 0.55 ? Severity.HIGH : Severity.CRITICAL;
    case IssueType.VALIDATION_ERROR:
    case IssueType.NOT_FOUND_IN_BAMBOO:
    case IssueType.AMBIGUOUS_MATCH:
      return Math.random() > 0.3 ? Severity.MEDIUM : Severity.HIGH;
    case IssueType.DUPLICATE_CODE_OR_URL:
    case IssueType.EXPIRED:
    case IssueType.INVALID_PRODUCT_BRAND:
      return Math.random() > 0.5 ? Severity.MEDIUM : Severity.LOW;
    case IssueType.ALREADY_PROCESSED:
      return Math.random() > 0.75 ? Severity.MEDIUM : Severity.LOW;
    default:
      return Severity.MEDIUM;
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function ratioProfileForStatus(status: RunStatus) {
  switch (status) {
    case RunStatus.COMPLETED:
      return { min: 0.003, max: 0.02 };
    case RunStatus.PARTIALLY_COMPLETED:
    case RunStatus.INSERTED_TO_BUFFER:
      return { min: 0.015, max: 0.05 };
    case RunStatus.VALIDATED:
    case RunStatus.FETCHED_FROM_SUPPLIER:
    case RunStatus.BUFFER_IN_PROGRESS:
      return { min: 0.02, max: 0.065 };
    case RunStatus.IN_PROGRESS:
    case RunStatus.UPLOAD_COMPLETED:
      return { min: 0.03, max: 0.095 };
    case RunStatus.DISCARDED:
    case RunStatus.FAILED:
      return { min: 0.05, max: 0.15 };
    case RunStatus.INITIATED:
    default:
      return { min: 0.01, max: 0.04 };
  }
}

function riskFromRun(params: {
  status: RunStatus;
  uploadedAt: Date;
  mismatchRate: number;
  estimatedExposure: number;
  failedRecords: number;
  totalRecords: number;
  supplierFetchFailures: number;
}) {
  const {
    status,
    uploadedAt,
    mismatchRate,
    estimatedExposure,
    failedRecords,
    totalRecords,
    supplierFetchFailures,
  } = params;

  const now = Date.now();
  const stuck =
    (status === RunStatus.UPLOAD_COMPLETED || status === RunStatus.IN_PROGRESS) &&
    now - uploadedAt.getTime() > TWO_HOURS_MS;

  let severity: Severity;

  if (stuck || mismatchRate > 8 || estimatedExposure > 100000) {
    severity = Severity.CRITICAL;
  } else if (
    mismatchRate > 5 ||
    failedRecords > totalRecords * 0.08 ||
    supplierFetchFailures > 0
  ) {
    severity = Severity.HIGH;
  } else if (status === RunStatus.COMPLETED && mismatchRate < 1.2) {
    severity = Severity.LOW;
  } else {
    severity = Severity.MEDIUM;
  }

  let riskScore = Math.round(
    mismatchRate * 6 +
      (failedRecords / Math.max(totalRecords, 1)) * 100 +
      Math.min(estimatedExposure / 3500, 30) +
      (supplierFetchFailures > 0 ? 8 : 0)
  );

  if (stuck) {
    riskScore += 20;
  }

  if (status === RunStatus.FAILED) {
    riskScore += 12;
  }

  if (severity === Severity.CRITICAL) {
    riskScore = Math.max(riskScore, 85);
  } else if (severity === Severity.HIGH) {
    riskScore = Math.max(riskScore, 65);
  } else if (severity === Severity.MEDIUM) {
    riskScore = Math.max(riskScore, 35);
  } else {
    riskScore = Math.min(riskScore, 34);
  }

  return {
    severity,
    riskScore: clamp(riskScore, 0, 100),
  };
}

function buildEvents(params: {
  runId: string;
  mode: RunMode;
  status: RunStatus;
  uploadedAt: Date;
  entityName: string;
  issueCount: number;
  severity: Severity;
}): Prisma.RunEventCreateManyInput[] {
  const { runId, mode, status, uploadedAt, entityName, issueCount, severity } = params;
  const events: Prisma.RunEventCreateManyInput[] = [];

  let cursor = new Date(uploadedAt);

  const pushEvent = (
    type: string,
    message: string,
    eventSeverity: Severity,
    metaJson?: Prisma.InputJsonValue
  ) => {
    cursor = new Date(cursor.getTime() + randomInt(2, 26) * 60 * 1000);
    events.push({
      id: makeId(),
      runId,
      at: new Date(cursor),
      type,
      message,
      severity: eventSeverity,
      metaJson,
    });
  };

  pushEvent(
    "UPLOAD",
    mode === RunMode.FILE
      ? "File payload uploaded to reconciliation queue."
      : "System trigger received from scheduled reconciliation job.",
    Severity.LOW,
    {
      source: mode,
      entity: entityName,
    }
  );

  pushEvent("PARSE", "Payload parsed and normalized into canonical model.", Severity.LOW, {
    parserVersion: "v2.7.1",
  });

  pushEvent("MATCH", "Matching engine started cross-system correlation.", Severity.LOW, {
    strategy: "hybrid_graph_v3",
  });

  if (
    status === RunStatus.FETCHED_FROM_SUPPLIER ||
    status === RunStatus.VALIDATED ||
    status === RunStatus.BUFFER_IN_PROGRESS ||
    status === RunStatus.INSERTED_TO_BUFFER ||
    status === RunStatus.PARTIALLY_COMPLETED ||
    status === RunStatus.COMPLETED ||
    status === RunStatus.FAILED
  ) {
    pushEvent(
      "SUPPLIER_FETCH",
      `Supplier enrichment fetched records from ${entityName}.`,
      Severity.LOW,
      {
        latencyMs: randomInt(420, 2200),
      }
    );
  }

  if (
    status === RunStatus.VALIDATED ||
    status === RunStatus.BUFFER_IN_PROGRESS ||
    status === RunStatus.INSERTED_TO_BUFFER ||
    status === RunStatus.PARTIALLY_COMPLETED ||
    status === RunStatus.COMPLETED ||
    status === RunStatus.FAILED
  ) {
    pushEvent("VALIDATE", "Validation checks executed against reconciliation policy.", Severity.MEDIUM, {
      policySet: "bamboo-recon-core",
      issueCount,
    });
  }

  if (
    status === RunStatus.BUFFER_IN_PROGRESS ||
    status === RunStatus.INSERTED_TO_BUFFER ||
    status === RunStatus.PARTIALLY_COMPLETED ||
    status === RunStatus.COMPLETED
  ) {
    pushEvent("BUFFER", "Buffered eligible records for settlement handoff.", Severity.MEDIUM, {
      targetQueue: "buffer-reconciliation",
    });
  }

  const fillerEvents = randomInt(0, 8);
  for (let i = 0; i < fillerEvents; i += 1) {
    pushEvent(
      "MATCH",
      `Rule group ${randomInt(1, 12)} completed with confidence ${randomInt(78, 99)}%.`,
      Math.random() > 0.82 ? Severity.MEDIUM : Severity.LOW,
      {
        batch: i + 1,
      }
    );
  }

  if (status === RunStatus.FAILED || status === RunStatus.DISCARDED) {
    pushEvent(
      "COMPLETE",
      status === RunStatus.FAILED
        ? "Run terminated due to unresolved supplier failures."
        : "Run discarded after manual decision.",
      Severity.CRITICAL,
      {
        finalStatus: status,
      }
    );
  } else if (
    status === RunStatus.COMPLETED ||
    status === RunStatus.PARTIALLY_COMPLETED ||
    status === RunStatus.INSERTED_TO_BUFFER
  ) {
    pushEvent(
      "COMPLETE",
      status === RunStatus.COMPLETED
        ? "Run completed and metrics committed."
        : "Run finalized with partial reconciliation outcomes.",
      severity === Severity.LOW ? Severity.LOW : Severity.MEDIUM,
      {
        finalStatus: status,
      }
    );
  } else {
    pushEvent(
      "HEARTBEAT",
      "Run remains active in orchestration pipeline.",
      severity === Severity.CRITICAL ? Severity.HIGH : Severity.MEDIUM,
      {
        currentStatus: status,
      }
    );
  }

  while (events.length < 5) {
    pushEvent("MATCH", "Additional reconciliation pass executed.", Severity.LOW);
  }

  return events.slice(0, 25);
}

function formatProcessId(index: number) {
  return `RB-${8200 + index}`;
}

async function createManyInChunks<T>(
  items: T[],
  chunkSize: number,
  callback: (chunk: T[]) => Promise<unknown>
) {
  for (let index = 0; index < items.length; index += chunkSize) {
    const chunk = items.slice(index, index + chunkSize);
    await callback(chunk);
  }
}

async function main() {
  const startedAt = Date.now();

  console.info("Cleaning previous reconciliation demo data...");

  await prisma.actionLog.deleteMany();
  await prisma.runEvent.deleteMany();
  await prisma.runIssue.deleteMany();
  await prisma.reconciliationRun.deleteMany();

  console.info(`Seeding ${RUN_TARGET} reconciliation runs...`);

  const runRows: Prisma.ReconciliationRunCreateManyInput[] = [];
  const eventRows: Prisma.RunEventCreateManyInput[] = [];
  const issueRows: Prisma.RunIssueCreateManyInput[] = [];
  const actionRows: Prisma.ActionLogCreateManyInput[] = [];

  for (let i = 0; i < RUN_TARGET; i += 1) {
    const runId = makeId();
    const status = weightedStatus();
    const mode = Math.random() > 0.45 ? RunMode.FILE : RunMode.SYSTEM;
    const entityName = pickOne(ENTITIES);
    const entityType = Math.random() > 0.3 ? "Supplier" : "Marketplace";

    const createdAt = new Date(Date.now() - randomInt(0, THIRTY_DAYS_MS));
    const uploadedAt = new Date(createdAt.getTime() + randomInt(6, 120) * 60 * 1000);

    const dateTo = new Date(uploadedAt.getTime() - randomInt(2, 36) * 60 * 60 * 1000);
    const dateFrom = new Date(dateTo.getTime() - randomInt(1, 5) * 24 * 60 * 60 * 1000);

    const totalRecords = randomInt(1200, 26000);
    const ratioProfile = ratioProfileForStatus(status);
    const issueCount = clamp(
      Math.round(totalRecords * randomFloat(ratioProfile.min, ratioProfile.max, 4)),
      10,
      200
    );

    let supplierFetchFailures = 0;

    for (let j = 0; j < issueCount; j += 1) {
      const issueType = issueTypeForStatus(status);
      const issueSeverity = severityForIssueType(issueType);

      if (issueType === IssueType.SUPPLIER_FETCH_FAILED) {
        supplierFetchFailures += 1;
      }

      issueRows.push({
        id: makeId(),
        runId,
        issueType,
        severity: issueSeverity,
        supplierIdentifier: `${entityName.slice(0, 3).toUpperCase()}-${randomInt(1000, 9999)}`,
        supplierOrderNumber: `SO-${randomInt(100000, 999999)}`,
        cardId: `CD-${randomInt(1000000, 9999999)}`,
        orderId: `OR-${randomInt(100000, 999999)}`,
        productSku: `SKU-${randomInt(1000, 9999)}`,
        brandName: pickOne(BRAND_NAMES),
        errorMessage: pickOne(ISSUE_MESSAGES[issueType]),
        createdAt: new Date(uploadedAt.getTime() + randomInt(15, 180) * 60 * 1000),
      });
    }

    const failedRecords = clamp(
      Math.round(issueCount * randomFloat(0.45, status === RunStatus.COMPLETED ? 0.6 : 0.9, 3)),
      0,
      totalRecords
    );

    const unmatchedRecords = clamp(
      Math.round(issueCount * randomFloat(0.22, 0.68, 3)),
      0,
      totalRecords - failedRecords
    );

    const bufferedRecords = clamp(
      status === RunStatus.COMPLETED ||
        status === RunStatus.PARTIALLY_COMPLETED ||
        status === RunStatus.INSERTED_TO_BUFFER
        ? Math.round((totalRecords - failedRecords) * randomFloat(0.25, 0.85, 3))
        : Math.round(totalRecords * randomFloat(0.05, 0.35, 3)),
      0,
      totalRecords
    );

    const mismatchRate = Number(
      (((failedRecords + unmatchedRecords) / Math.max(totalRecords, 1)) * 100).toFixed(2)
    );

    const estimatedExposureBase = (failedRecords + unmatchedRecords) * randomInt(28, 210);
    const estimatedExposure = Math.round(
      status === RunStatus.FAILED || status === RunStatus.DISCARDED
        ? estimatedExposureBase * randomFloat(1.1, 1.5, 2)
        : estimatedExposureBase
    );

    const { severity, riskScore } = riskFromRun({
      status,
      uploadedAt,
      mismatchRate,
      estimatedExposure,
      failedRecords,
      totalRecords,
      supplierFetchFailures,
    });

    const uploadedByEmail = pickOne(EMAIL_POOL);
    const approvedByEmail =
      status === RunStatus.COMPLETED ||
      status === RunStatus.PARTIALLY_COMPLETED ||
      status === RunStatus.INSERTED_TO_BUFFER
        ? pickOne(EMAIL_POOL)
        : null;

    const approvedAt =
      approvedByEmail && Math.random() > 0.15
        ? new Date(uploadedAt.getTime() + randomInt(90, 480) * 60 * 1000)
        : null;

    runRows.push({
      id: runId,
      processId: formatProcessId(i + 1),
      mode,
      status,
      entityType,
      entityName,
      currency: "USD",
      dateFrom,
      dateTo,
      totalRecords,
      failedRecords,
      unmatchedRecords,
      bufferedRecords,
      mismatchRate,
      estimatedExposure,
      riskScore,
      severity,
      uploadedByEmail,
      approvedByEmail,
      uploadedAt,
      approvedAt,
      createdAt,
      updatedAt: new Date(createdAt.getTime() + randomInt(10, 720) * 60 * 1000),
    });

    eventRows.push(
      ...buildEvents({
        runId,
        mode,
        status,
        uploadedAt,
        entityName,
        issueCount,
        severity,
      })
    );

    const actionChance = Math.random();

    if (actionChance > 0.5) {
      actionRows.push({
        id: makeId(),
        runId,
        actionType: ActionType.ADD_NOTE,
        actorEmail: pickOne(EMAIL_POOL),
        note:
          severity === Severity.CRITICAL
            ? "Escalated to supplier response channel and monitoring increased."
            : "Reviewed mismatch sample and retained for analyst follow-up.",
        payloadJson: {
          source: "seed",
          processId: formatProcessId(i + 1),
        },
        createdAt: new Date(uploadedAt.getTime() + randomInt(45, 300) * 60 * 1000),
      });
    }

    if (severity === Severity.CRITICAL || severity === Severity.HIGH) {
      actionRows.push({
        id: makeId(),
        runId,
        actionType:
          severity === Severity.CRITICAL
            ? ActionType.GENERATE_EVIDENCE_BUNDLE
            : ActionType.CREATE_JIRA_TICKET,
        actorEmail: pickOne(EMAIL_POOL),
        note:
          severity === Severity.CRITICAL
            ? "Evidence bundle generated for executive review."
            : "Issue ticket opened for supplier operations.",
        payloadJson: {
          source: "seed",
          severity,
        },
        createdAt: new Date(uploadedAt.getTime() + randomInt(60, 420) * 60 * 1000),
      });
    }

    if (status === RunStatus.DISCARDED) {
      actionRows.push({
        id: makeId(),
        runId,
        actionType: ActionType.DISCARD_RUN,
        actorEmail: pickOne(EMAIL_POOL),
        note: "Discarded due to corrupted supplier payload and schema violations.",
        payloadJson: {
          source: "seed",
          reason: "corrupted_payload",
        },
        createdAt: new Date(uploadedAt.getTime() + randomInt(20, 160) * 60 * 1000),
      });
    }
  }

  for (let index = 0; index < 16; index += 1) {
    actionRows.push({
      id: makeId(),
      runId: null,
      actionType: pickOne([
        ActionType.RERUN_STAGE,
        ActionType.CREATE_JIRA_TICKET,
        ActionType.ADD_NOTE,
      ] as const),
      actorEmail: pickOne(EMAIL_POOL),
      note: `Ops note #${index + 1}: supplier policy sync reviewed and acknowledged.`,
      payloadJson: {
        scope: "global",
        source: "seed",
      },
      createdAt: new Date(Date.now() - randomInt(0, THIRTY_DAYS_MS)),
    });
  }

  await createManyInChunks(runRows, 200, (chunk) =>
    prisma.reconciliationRun.createMany({
      data: chunk,
    })
  );

  await createManyInChunks(eventRows, 2000, (chunk) =>
    prisma.runEvent.createMany({
      data: chunk,
    })
  );

  await createManyInChunks(issueRows, 2000, (chunk) =>
    prisma.runIssue.createMany({
      data: chunk,
    })
  );

  await createManyInChunks(actionRows, 1000, (chunk) =>
    prisma.actionLog.createMany({
      data: chunk,
    })
  );

  const durationMs = Date.now() - startedAt;
  console.info(`Seed complete: ${RUN_TARGET} runs created in ${durationMs}ms.`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
