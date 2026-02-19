import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { getRunIssues } from "@/lib/runs-data";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  const { unauthorizedResponse } = await getApiSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const { id } = await context.params;
  const url = new URL(request.url);

  const data = await getRunIssues(id, {
    type: url.searchParams.get("type"),
    severity: url.searchParams.get("severity"),
    q: url.searchParams.get("q"),
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
  });

  return NextResponse.json(data);
}
