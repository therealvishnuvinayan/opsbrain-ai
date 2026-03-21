import { NextResponse } from "next/server";

import { queryOpsWorkspaceFromBackend } from "@/features/workspace/server";
import type {
  OpsWorkspaceMessage,
  OpsWorkspaceReasoningMode,
} from "@/features/workspace/types";
import { getApiSession } from "@/lib/api-session";

function isReasoningMode(value: unknown): value is OpsWorkspaceReasoningMode {
  return value === "quick" || value === "standard" || value === "deep";
}

function isWorkspaceMessage(value: unknown): value is OpsWorkspaceMessage {
  if (!value || typeof value !== "object") {
    return false;
  }

  const message = value as Record<string, unknown>;

  return (
    typeof message.id === "string" &&
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    typeof message.createdAt === "string"
  );
}

export async function POST(request: Request) {
  const { unauthorizedResponse } = await getApiSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ message: "Invalid JSON payload." }, { status: 400 });
  }

  const body =
    payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const reasoningMode = isReasoningMode(body?.reasoningMode)
    ? body.reasoningMode
    : "standard";
  const history = Array.isArray(body?.history)
    ? body.history.filter(isWorkspaceMessage).slice(-12)
    : [];

  if (!question) {
    return NextResponse.json(
      { message: "Enter a question before submitting." },
      { status: 400 }
    );
  }

  try {
    const response = await queryOpsWorkspaceFromBackend({
      question,
      reasoningMode,
      history,
    });

    return NextResponse.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "OpsBrain query failed unexpectedly.";

    return NextResponse.json({ message }, { status: 502 });
  }
}
