import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import {
  mapConversation,
  mapMessage,
  resolveChatUser,
  toPrismaChatRole,
  toPrismaMessageStatus,
} from "@/lib/chat/chat.server";
import type { ChatRole, MessageStatus } from "@/lib/chat/chat.types";
import { prisma } from "@/lib/prisma";

interface AppendMessageBody {
  role?: ChatRole;
  content?: string;
  status?: MessageStatus;
  title?: string;
}

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

const chatPrisma = prisma as typeof prisma & {
  chatConversation: {
    findFirst: (args: unknown) => Promise<{
      id: string;
      userId: string;
      title: string;
      createdAt: Date;
      updatedAt: Date;
      lastUsedAt: Date;
    } | null>;
    update: (args: unknown) => Promise<{
      id: string;
      userId: string;
      title: string;
      createdAt: Date;
      updatedAt: Date;
      lastUsedAt: Date;
    }>;
  };
  chatMessage: {
    create: (args: unknown) => Promise<{
      id: string;
      conversationId: string;
      role: string;
      content: string;
      status: string;
      createdAt: Date;
    }>;
  };
};

export async function POST(request: Request, context: RouteContext) {
  const { session, unauthorizedResponse } = await getApiSession();

  if (unauthorizedResponse) {
    return unauthorizedResponse;
  }

  if (!session) {
    return NextResponse.json({ message: "Authentication required." }, { status: 401 });
  }

  const user = await resolveChatUser(session);
  if (!user) {
    return NextResponse.json({ message: "Unable to resolve current user." }, { status: 400 });
  }

  const { id } = await context.params;
  const body = (await request.json().catch(() => ({}))) as AppendMessageBody;
  const content = body.content?.trim();

  if (!body.role || !content) {
    return NextResponse.json({ message: "role and content are required." }, { status: 400 });
  }

  const conversation = await chatPrisma.chatConversation.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!conversation) {
    return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
  }

  const nextTitle = body.title?.trim();
  const now = new Date();

  const message = await chatPrisma.chatMessage.create({
    data: {
      conversationId: id,
      role: toPrismaChatRole(body.role),
      content,
      status: toPrismaMessageStatus(body.status ?? "done"),
    },
  });

  const updatedConversation = await chatPrisma.chatConversation.update({
    where: { id },
    data: {
      lastUsedAt: now,
      ...(nextTitle ? { title: nextTitle } : {}),
    },
  });

  return NextResponse.json({
    item: mapMessage(message),
    conversation: mapConversation(updatedConversation),
  });
}
