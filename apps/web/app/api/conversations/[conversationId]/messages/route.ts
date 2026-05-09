import { NextResponse, type NextRequest } from "next/server";
import {
  getConversationById,
  listMessagesByConversation,
} from "@mentoros/db";
import { getCurrentAccess, isDevBypassEnabled } from "@/lib/auth/access";

const AUTH_ERROR = "请先登录后再使用 MentorOS。";
const NOT_FOUND_ERROR = "对话不存在。";
const RUNTIME_ERROR = "暂时无法读取这段对话。";

type RouteContext = {
  params: Promise<{
    conversationId: string;
  }>;
};

export async function GET(_request: NextRequest, context: RouteContext) {
  const { conversationId } = await context.params;

  if (isDevBypassEnabled()) {
    return NextResponse.json({
      ok: true,
      messages: [],
    });
  }

  try {
    const access = await getCurrentAccess();

    if (!access.user) {
      return NextResponse.json(
        { ok: false, error: AUTH_ERROR },
        { status: 401 },
      );
    }

    const conversation = await getConversationById(conversationId);

    if (!conversation || conversation.user_id !== access.user.id) {
      return NextResponse.json(
        { ok: false, error: NOT_FOUND_ERROR },
        { status: 404 },
      );
    }

    const messages = await listMessagesByConversation(conversationId);

    return NextResponse.json({
      ok: true,
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        speaker: message.speaker,
        content: message.content,
        metadata: message.metadata ?? {},
        createdAt: message.created_at,
      })),
    });
  } catch (error) {
    console.error("[conversation/messages] list failed:", error);
    return NextResponse.json(
      { ok: false, error: RUNTIME_ERROR },
      { status: 500 },
    );
  }
}
