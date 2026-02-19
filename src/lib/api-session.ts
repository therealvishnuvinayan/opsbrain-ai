import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Session } from "next-auth";

import { authOptions } from "@/lib/auth";

interface ApiSessionResult {
  session: Session | null;
  unauthorizedResponse: NextResponse | null;
}

export async function getApiSession(): Promise<ApiSessionResult> {
  const session = await getServerSession(authOptions);

  if (!session) {
    return {
      session: null,
      unauthorizedResponse: NextResponse.json(
        { message: "Authentication required." },
        { status: 401 }
      ),
    };
  }

  return {
    session,
    unauthorizedResponse: null,
  };
}
