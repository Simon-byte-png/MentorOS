import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { redeemInviteCodeByHash } from "@mentoros/db";
import { getCurrentAccess } from "@/lib/auth/access";

export const runtime = "nodejs";

const EMPTY_CODE_ERROR = "请输入邀请码。";
const INVITE_ERROR_MESSAGE = "邀请码无效或已被使用。";

export async function POST(request: Request) {
  const access = await getCurrentAccess();

  if (!access.user) {
    return NextResponse.json({ ok: false, error: INVITE_ERROR_MESSAGE }, { status: 401 });
  }

  if (access.profile?.access_status === "active") {
    return NextResponse.json({ ok: true });
  }

  const code = await readInviteCode(request);

  if (!code) {
    return NextResponse.json({ ok: false, error: EMPTY_CODE_ERROR }, { status: 400 });
  }

  try {
    const codeHash = hashInviteCode(code);
    const result = await redeemInviteCodeByHash({
      code_hash: codeHash,
      user_id: access.user.id,
    });

    if (result.ok) {
      return NextResponse.json({ ok: true });
    }

    console.warn("[invite/redeem] redemption failed", {
      reason: result.reason,
      userId: access.user.id,
    });
    return NextResponse.json({ ok: false, error: INVITE_ERROR_MESSAGE }, { status: 400 });
  } catch {
    console.warn("[invite/redeem] unexpected error", {
      userId: access.user.id,
    });
    return NextResponse.json({ ok: false, error: INVITE_ERROR_MESSAGE }, { status: 400 });
  }
}

async function readInviteCode(request: Request): Promise<string | null> {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }

  const value = (payload as { code?: unknown }).code;

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (trimmed.length === 0 || trimmed.length > 128) {
    return null;
  }

  return trimmed;
}

function hashInviteCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}
