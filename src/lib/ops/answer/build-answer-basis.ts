import type { AnswerBasisSummary } from "@/lib/ops/answer/answer-types";
import type { PackedOpsContext, PackedOrderData } from "@/lib/ops/context/context-types";

function addBasis(
  basis: AnswerBasisSummary[],
  label: string,
  domain?: AnswerBasisSummary["domain"]
) {
  if (!basis.some((entry) => entry.label === label)) {
    basis.push({ label, domain });
  }
}

export function buildAnswerBasis(context?: PackedOpsContext<PackedOrderData>) {
  const basis: AnswerBasisSummary[] = [];

  if (!context) {
    return basis;
  }

  if (context.data.history || context.data.order || context.data.cards || context.data.items) {
    addBasis(basis, "Bamboo order data", "orders");
  }

  if (context.data.billing) {
    addBasis(basis, "Billing data", "billing");
  }

  if (context.data.audit) {
    addBasis(basis, "Audit logs", "audit");
  }

  if (
    context.data.reconciliationStatus ||
    context.data.bufferedRecords ||
    context.data.reconciledRecords ||
    context.data.invalidProductBrandCards ||
    context.data.expiredCards ||
    context.data.reconciliationSummary
  ) {
    addBasis(basis, "Reconciliation records", "reconciliation");
  }

  if (context.data.awsLogs || context.data.serviceHealth || context.data.infraSummary) {
    addBasis(basis, "CloudWatch logs", "aws");
  }

  if (context.data.knowledgeResults || context.data.docGuidance || context.data.runbookMatches) {
    addBasis(basis, "Internal runbooks", "knowledge");
  }

  return basis;
}
