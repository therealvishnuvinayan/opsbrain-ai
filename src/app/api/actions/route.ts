import { ActionType, type Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { prisma } from "@/lib/prisma";

interface ActionBody {
  runId?: string | null;
  actionType?: ActionType;
  note?: string;
  payloadJson?: unknown;
}

export async function POST(request: Request) {
  const { session, unauthorizedResponse } = await getApiSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  if (!session) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const body = (await request.json()) as ActionBody;

  if (!body.actionType || !Object.values(ActionType).includes(body.actionType)) {
    return NextResponse.json({ message: "Invalid action type." }, { status: 400 });
  }

  if (body.runId) {
    const runExists = await prisma.reconciliationRun.findUnique({
      where: {
        id: body.runId,
      },
      select: {
        id: true,
      },
    });

    if (!runExists) {
      return NextResponse.json({ message: "Run not found." }, { status: 404 });
    }
  }

  const action = await prisma.actionLog.create({
    data: {
      runId: body.runId ?? null,
      actionType: body.actionType,
      actorEmail: session.user?.email ?? null,
      note: body.note?.trim() || null,
      payloadJson:
        body.payloadJson === undefined
          ? undefined
          : (body.payloadJson as Prisma.InputJsonValue),
    },
  });

  return NextResponse.json({
    item: action,
  });
}
