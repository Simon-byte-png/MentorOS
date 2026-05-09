import { NextResponse } from "next/server";
import { listConversationsByUser } from "@mentoros/db";
import { getCurrentAccess, isDevBypassEnabled } from "@/lib/auth/access";

const AUTH_ERROR = "请先登录后再使用 MentorOS。";
const RUNTIME_ERROR = "暂时无法读取历史对话。";

export async function GET() {
  if (isDevBypassEnabled()) {
    return NextResponse.json({
      ok: true,
      conversations: [],
      user: {
        email: null,
        label: "本地开发模式",
        devBypass: true,
      },
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

    const conversations = await listConversationsByUser(access.user.id);

    return NextResponse.json({
      ok: true,
      conversations: conversations
        .filter((conversation) => conversation.status !== "deleted")
        .map((conversation) => ({
          id: conversation.id,
          title: conversation.title ?? "未命名对话",
          mode: conversation.mode ?? "decision",
          status: conversation.status ?? "active",
          createdAt: conversation.created_at,
          updatedAt: conversation.updated_at,
        })),
      user: {
        email: access.user.email ?? access.profile?.email ?? null,
        label: access.user.email ?? access.profile?.email ?? "已登录",
        devBypass: false,
      },
    });
  } catch (error) {
    console.error("[conversations] list failed:", error);
    return NextResponse.json(
      { ok: false, error: RUNTIME_ERROR },
      { status: 500 },
    );
  }
}
