import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import {
  mapConversation,
  mapMessage,
  resolveChatUser,
  toPrismaChatRole,
  toPrismaMessageStatus,
} from "@/lib/chat/chat.server";
import { getMockAssistantReply } from "@/lib/chat/chat.utils";
import { prisma } from "@/lib/prisma";

interface StreamAssistantBody {
  prompt?: string;
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
      _count: {
        messages: number;
      };
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
  const body = (await request.json().catch(() => ({}))) as StreamAssistantBody;
  const prompt = body.prompt?.trim();

  if (!prompt) {
    return NextResponse.json({ message: "prompt is required." }, { status: 400 });
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

  const encoder = new TextEncoder();
  const reply = getMockAssistantReply(prompt);
  const isError = reply.length === 0;
  const finalContent = isError
    ? "I couldn't complete that mock request. Try asking again or narrow the scope."
    : reply;
  const chunks = finalContent.match(/\S+\s*/g) ?? [finalContent];

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        let content = "";

        for (const chunk of chunks) {
          content += chunk;
          controller.enqueue(
            encoder.encode(
              `${JSON.stringify({
                type: "chunk",
                delta: chunk,
                content,
              })}\n`
            )
          );
          await new Promise((resolve) =>
            setTimeout(resolve, Math.min(80, Math.max(28, chunk.trim().length * 10)))
          );
        }

        const message = await chatPrisma.chatMessage.create({
          data: {
            conversationId: id,
            role: toPrismaChatRole("assistant"),
            content: finalContent,
            status: toPrismaMessageStatus(isError ? "error" : "done"),
          },
        });

        const updatedConversation = await chatPrisma.chatConversation.update({
          where: { id },
          data: {
            lastUsedAt: new Date(),
          },
          include: {
            _count: {
              select: {
                messages: true,
              },
            },
          },
        });

        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "done",
              payload: {
                item: mapMessage(message),
                conversation: mapConversation(updatedConversation),
              },
            })}\n`
          )
        );
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `${JSON.stringify({
              type: "error",
              message: error instanceof Error ? error.message : "Assistant stream failed.",
            })}\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
