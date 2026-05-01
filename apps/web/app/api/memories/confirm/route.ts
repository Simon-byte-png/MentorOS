import { NextResponse } from "next/server";
import type { MemoryType } from "@mentoros/db";
import { createMemory } from "@mentoros/db";
import {
  getCurrentAccess,
  isDevBypassEnabled,
  isProductionRuntime,
} from "@/lib/auth/access";

const AUTH_ERROR = "请先登录后再使用 MentorOS。";
const INVITE_ERROR = "你的内测权限尚未激活，请先输入邀请码。";
const SAVE_ERROR = "这条记忆暂时没有保存成功，请稍后重试。";
const INVALID_ERROR = "请求参数不正确。";

const ALLOWED_MEMORY_TYPES = new Set<string>([
  "profile",
  "goal",
  "preference",
  "project",
  "decision_history",
  "blind_spot",
  "writing_style",
  "relationship",
]);

export async function POST(request: Request) {
  const devBypass = isDevBypassEnabled();

  // --- Auth check ---
  let userId: string | null = null;

  if (!devBypass) {
    const access = await getCurrentAccess();

    if (!access.user) {
      return NextResponse.json(
        { ok: false, error: AUTH_ERROR },
        { status: 401 },
      );
    }

    if (access.profile?.access_status !== "active") {
      return NextResponse.json(
        { ok: false, error: INVITE_ERROR },
        { status: 403 },
      );
    }

    userId = access.user.id;
  } else {
    userId = "dev-bypass-user";
  }

  // --- Parse body ---
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: INVALID_ERROR },
      { status: 400 },
    );
  }

  const parsed = readConfirmPayload(payload);

  if (!parsed) {
    return NextResponse.json(
      { ok: false, error: INVALID_ERROR },
      { status: 400 },
    );
  }

  const { conversationId, candidate, finalContent } = parsed;

  // --- Dev bypass short-circuit ---
  // 生产环境下双重保险：即使 devBypass 被误开启，也不返回 mock 数据
  if (devBypass && !isProductionRuntime()) {
    return NextResponse.json({
      ok: true,
      memory: {
        id: "dev-mock-id",
        memory_type: candidate.type,
        content: finalContent,
        is_active: true,
      },
      mock: true,
    });
  }

  // --- DB write ---
  try {
    const confidence = candidate.confidence === "fact" ? 0.9 : 0.7;

    const memory = await createMemory({
      user_id: userId!,
      memory_type: candidate.type as MemoryType,
      content: finalContent,
      confidence,
      source_conversation_id: conversationId,
      source_message_id: null,
      is_active: true,
    });

    return NextResponse.json({ ok: true, memory });
  } catch (error) {
    console.error("[memories/confirm] createMemory failed:", error);
    return NextResponse.json(
      { ok: false, error: SAVE_ERROR },
      { status: 500 },
    );
  }
}

// --- Helpers ---

type ConfirmPayload = {
  conversationId: string | null;
  candidate: {
    type: string;
    content: string;
    confidence?: string;
  };
  finalContent: string;
};

function readConfirmPayload(payload: unknown): ConfirmPayload | null {
  if (!payload || typeof payload !== "object") return null;

  const obj = payload as Record<string, unknown>;
  const candidate = obj.candidate;

  if (!candidate || typeof candidate !== "object") return null;

  const candidateObj = candidate as Record<string, unknown>;
  const type = candidateObj.type;
  const content = candidateObj.content;

  if (typeof type !== "string" || !ALLOWED_MEMORY_TYPES.has(type)) return null;
  if (typeof content !== "string") return null;

  const editedContent = typeof obj.editedContent === "string" ? obj.editedContent : undefined;
  const finalContent = (editedContent ?? content).trim();

  if (finalContent.length === 0) return null;

  const conversationId = typeof obj.conversationId === "string" ? obj.conversationId : null;
  const confidence = typeof candidateObj.confidence === "string" ? candidateObj.confidence : undefined;

  return {
    conversationId,
    candidate: { type, content, confidence },
    finalContent,
  };
}
