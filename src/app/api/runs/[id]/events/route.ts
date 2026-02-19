import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { getRunEvents } from "@/lib/runs-data";

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
  const events = await getRunEvents(id);

  return NextResponse.json({ items: events });
}
