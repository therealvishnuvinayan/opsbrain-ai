import { NextResponse } from "next/server";

import { getApiSession } from "@/lib/api-session";
import { getChatConversationForUser, resolveChatUser } from "@/lib/chat/chat.server";

interface RouteContext {
  params: Promise<{
    id: string;
  }>;
}

export async function GET(_request: Request, context: RouteContext) {
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
  const conversation = await getChatConversationForUser(user.id, id);

  if (!conversation) {
    return NextResponse.json({ message: "Conversation not found." }, { status: 404 });
  }

  return NextResponse.json({
    item: conversation.conversation,
    messages: conversation.messages,
  });
}
