export type OpsDomain =
  | "orders"
  | "billing"
  | "audit"
  | "reconciliation"
  | "aws"
  | "knowledge";

export type ToolSourceType = "swagger" | "aws" | "rag" | "internal";
