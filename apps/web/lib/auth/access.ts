import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { UserProfile } from "@mentoros/db";
import { createClient } from "@/lib/supabase/server";

export type CurrentAccess = {
  user: User | null;
  profile: UserProfile | null;
};

/**
 * 判断当前是否运行在生产环境。
 * Vercel production (VERCEL_ENV=production) 或 NODE_ENV=production 均视为生产环境。
 * 生产环境下 dev bypass 必须被禁用，即使环境变量误配也不能绕过。
 */
export function isProductionRuntime(): boolean {
  return (
    process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production"
  );
}

/**
 * Dev bypass 仅在本地开发时有效。
 * 生产环境下无论环境变量如何设置，始终返回 false。
 */
export function isDevBypassEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === "true" && !isProductionRuntime()
  );
}

export async function getCurrentAccess() {
  let supabase: SupabaseClient;

  try {
    supabase = await createClient();
  } catch (error) {
    if (!isProductionRuntime() && isMissingSupabaseConfigError(error)) {
      return { user: null, profile: null } satisfies CurrentAccess;
    }

    throw error;
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, profile: null } satisfies CurrentAccess;
  }

  const profile = await getCurrentUserProfile(supabase, user.id);

  return { user, profile } satisfies CurrentAccess;
}

export function getRedirectForAccess(access: CurrentAccess): "/login" | "/invite" | "/chat" {
  if (!access.user) {
    return "/login";
  }

  return access.profile?.access_status === "active" ? "/chat" : "/invite";
}

async function getCurrentUserProfile(
  supabase: SupabaseClient,
  userId: User["id"],
): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as UserProfile;
}

function isMissingSupabaseConfigError(error: unknown): boolean {
  return error instanceof Error &&
    error.message.startsWith("Missing NEXT_PUBLIC_SUPABASE_");
}
