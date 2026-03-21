import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { getOpsWorkspaceStatus } from "@/features/workspace/server";

export async function GET() {
  const { unauthorizedResponse } = await getApiSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const status = await getOpsWorkspaceStatus();

  return NextResponse.json(status);
}
