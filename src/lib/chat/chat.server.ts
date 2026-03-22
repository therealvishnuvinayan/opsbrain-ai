import type { Session } from "next-auth";

import type {
  ChatConversation as ChatConversationDto,
  ChatMessage as ChatMessageDto,
  ChatRole,
  MessageStatus,
} from "@/lib/chat/chat.types";
import { prisma } from "@/lib/prisma";

interface ChatConversationRecord {
  id: string;
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  lastUsedAt: Date;
  messages?: ChatMessageRecord[];
  _count?: {
    messages: number;
  };
}

interface ChatMessageRecord {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  status: string;
  createdAt: Date;
}

const chatPrisma = prisma as typeof prisma & {
  chatConversation: {
    findMany: (args: unknown) => Promise<ChatConversationRecord[]>;
    findFirst: (args: unknown) => Promise<(ChatConversationRecord & { messages: ChatMessageRecord[] }) | null>;
  };
};

export function toChatRole(role: string): ChatRole {
  return role.toLowerCase() as ChatRole;
}

export function toMessageStatus(status: string): MessageStatus {
  return status.toLowerCase() as MessageStatus;
}

export function toPrismaChatRole(role: ChatRole) {
  switch (role) {
    case "system":
      return "SYSTEM";
    case "assistant":
      return "ASSISTANT";
    default:
      return "USER";
  }
}

export function toPrismaMessageStatus(status: MessageStatus) {
  switch (status) {
    case "idle":
      return "IDLE";
    case "sending":
      return "SENDING";
    case "streaming":
      return "STREAMING";
    case "error":
      return "ERROR";
    default:
      return "DONE";
  }
}

export function mapConversation(
  conversation: ChatConversationRecord
): ChatConversationDto {
  return {
    id: conversation.id,
    title: conversation.title,
    createdAt: conversation.createdAt.toISOString(),
    lastUsedAt: conversation.lastUsedAt.toISOString(),
    messageCount: conversation._count?.messages ?? conversation.messages?.length ?? 0,
  };
}

export function mapMessage(message: ChatMessageRecord): ChatMessageDto {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: toChatRole(message.role),
    content: message.content,
    status: toMessageStatus(message.status),
    createdAt: message.createdAt.toISOString(),
  };
}

export async function resolveChatUser(session: Session) {
  const email = session.user?.email?.toLowerCase().trim();

  if (email) {
    return prisma.user.upsert({
      where: { email },
      update: {
        name: session.user?.name ?? undefined,
        image: session.user?.image ?? undefined,
      },
      create: {
        email,
        name: session.user?.name ?? null,
        image: session.user?.image ?? null,
      },
      select: {
        id: true,
      },
    });
  }

  const sessionUserId = session.user?.id?.trim();

  if (!sessionUserId) {
    return null;
  }

  return prisma.user.findUnique({
    where: { id: sessionUserId },
    select: { id: true },
  });
}

export async function listChatConversationsForUser(userId: string) {
  const conversations = await chatPrisma.chatConversation.findMany({
    where: { userId },
    include: {
      _count: {
        select: {
          messages: true,
        },
      },
    },
    orderBy: [{ lastUsedAt: "desc" }, { createdAt: "desc" }],
  });

  return conversations.map(mapConversation);
}

export async function getChatConversationForUser(userId: string, conversationId: string) {
  const conversation = await chatPrisma.chatConversation.findFirst({
    where: {
      id: conversationId,
      userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!conversation) {
    return null;
  }

  return {
    conversation: mapConversation(conversation),
    messages: conversation.messages.map(mapMessage),
  };
}
