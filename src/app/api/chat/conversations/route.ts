import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import {
  listChatConversationsForUser,
  mapConversation,
  resolveChatUser,
} from "@/lib/chat/chat.server";
import { prisma } from "@/lib/prisma";

interface CreateConversationBody {
  title?: string;
}

const chatPrisma = prisma as typeof prisma & {
  chatConversation: {
    create: (args: unknown) => Promise<{
      id: string;
      userId: string;
      title: string;
      createdAt: Date;
      updatedAt: Date;
      lastUsedAt: Date;
      _count: {
        messages: number;
      };
    }>;
  };
};

export async function GET() {
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

  const items = await listChatConversationsForUser(user.id);

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
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

  const body = (await request.json().catch(() => ({}))) as CreateConversationBody;
  const title = body.title?.trim() || "New chat";

  const conversation = await chatPrisma.chatConversation.create({
    data: {
      userId: user.id,
      title,
    },
    include: {
      _count: {
        select: {
          messages: true,
        },
      },
    },
  });

  return NextResponse.json({
    item: mapConversation(conversation),
  });
}
