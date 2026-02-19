import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { getDashboardMetrics } from "@/lib/runs-data";

export async function GET() {
  const { unauthorizedResponse } = await getApiSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const metrics = await getDashboardMetrics();

  return NextResponse.json(metrics);
}
