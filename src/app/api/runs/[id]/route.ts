import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { getRunById, getRunIssueBreakdown } from "@/lib/runs-data";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
  const { unauthorizedResponse } = await getApiSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await context.params;

  const [run, issueBreakdown] = await Promise.all([
    getRunById(id),
    getRunIssueBreakdown(id),
  ]);

  if (!run) {
    return NextResponse.json({ message: "Run not found." }, { status: 404 });
  }

  return NextResponse.json({
    run,
    issueBreakdown,
  });
}
