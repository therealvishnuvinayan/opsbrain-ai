-- CreateEnum
CREATE TYPE "RunMode" AS ENUM ('FILE', 'SYSTEM');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('INITIATED', 'UPLOAD_COMPLETED', 'IN_PROGRESS', 'FETCHED_FROM_SUPPLIER', 'VALIDATED', 'BUFFER_IN_PROGRESS', 'INSERTED_TO_BUFFER', 'COMPLETED', 'PARTIALLY_COMPLETED', 'DISCARDED', 'FAILED');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('NOT_FOUND_IN_BAMBOO', 'SUPPLIER_FETCH_FAILED', 'ALREADY_PROCESSED', 'EXPIRED', 'INVALID_PRODUCT_BRAND', 'INVALID_SUPPLIER', 'DUPLICATE_CODE_OR_URL', 'VALIDATION_ERROR', 'AMBIGUOUS_MATCH');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('APPROVE_MOVE_TO_BUFFER', 'DISCARD_RUN', 'RERUN_STAGE', 'GENERATE_EVIDENCE_BUNDLE', 'CREATE_JIRA_TICKET', 'ADD_NOTE');

-- CreateTable
CREATE TABLE "ReconciliationRun" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "mode" "RunMode" NOT NULL,
    "status" "RunStatus" NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityName" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "totalRecords" INTEGER NOT NULL,
    "failedRecords" INTEGER NOT NULL,
    "unmatchedRecords" INTEGER NOT NULL,
    "bufferedRecords" INTEGER NOT NULL,
    "mismatchRate" DOUBLE PRECISION NOT NULL,
    "estimatedExposure" INTEGER NOT NULL,
    "riskScore" INTEGER NOT NULL,
    "severity" "Severity" NOT NULL,
    "uploadedByEmail" TEXT,
    "approvedByEmail" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReconciliationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunEvent" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "metaJson" JSONB,

    CONSTRAINT "RunEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RunIssue" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "issueType" "IssueType" NOT NULL,
    "severity" "Severity" NOT NULL,
    "supplierIdentifier" TEXT,
    "supplierOrderNumber" TEXT,
    "cardId" TEXT,
    "orderId" TEXT,
    "productSku" TEXT,
    "brandName" TEXT,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RunIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "actionType" "ActionType" NOT NULL,
    "actorEmail" TEXT,
    "note" TEXT,
    "payloadJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReconciliationRun_processId_key" ON "ReconciliationRun"("processId");

-- CreateIndex
CREATE INDEX "ReconciliationRun_status_uploadedAt_idx" ON "ReconciliationRun"("status", "uploadedAt");

-- CreateIndex
CREATE INDEX "ReconciliationRun_entityName_uploadedAt_idx" ON "ReconciliationRun"("entityName", "uploadedAt");

-- CreateIndex
CREATE INDEX "ReconciliationRun_severity_uploadedAt_idx" ON "ReconciliationRun"("severity", "uploadedAt");

-- CreateIndex
CREATE INDEX "ReconciliationRun_createdAt_idx" ON "ReconciliationRun"("createdAt");

-- CreateIndex
CREATE INDEX "RunEvent_runId_at_idx" ON "RunEvent"("runId", "at");

-- CreateIndex
CREATE INDEX "RunIssue_runId_issueType_idx" ON "RunIssue"("runId", "issueType");

-- CreateIndex
CREATE INDEX "RunIssue_runId_severity_idx" ON "RunIssue"("runId", "severity");

-- CreateIndex
CREATE INDEX "RunIssue_createdAt_idx" ON "RunIssue"("createdAt");

-- CreateIndex
CREATE INDEX "ActionLog_runId_createdAt_idx" ON "ActionLog"("runId", "createdAt");

-- CreateIndex
CREATE INDEX "ActionLog_actionType_createdAt_idx" ON "ActionLog"("actionType", "createdAt");

-- AddForeignKey
ALTER TABLE "RunEvent" ADD CONSTRAINT "RunEvent_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RunIssue" ADD CONSTRAINT "RunIssue_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionLog" ADD CONSTRAINT "ActionLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "ReconciliationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
