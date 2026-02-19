import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { getRunsList } from "@/lib/runs-data";

export async function GET(request: Request) {
  const { unauthorizedResponse } = await getApiSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  const url = new URL(request.url);

  const data = await getRunsList({
    status: url.searchParams.get("status"),
    mode: url.searchParams.get("mode"),
    entity: url.searchParams.get("entity"),
    q: url.searchParams.get("q"),
    from: url.searchParams.get("from"),
    to: url.searchParams.get("to"),
    page: url.searchParams.get("page"),
    pageSize: url.searchParams.get("pageSize"),
  });

  return NextResponse.json(data);
}
