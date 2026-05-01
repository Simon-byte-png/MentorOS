import { NextResponse, type NextRequest } from "next/server";
import { getOrCreatePendingProfile } from "@/lib/auth/profiles";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return redirectTo(requestUrl, "/login?error=auth");
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return redirectTo(requestUrl, "/login?error=auth");
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return redirectTo(requestUrl, "/login?error=auth");
    }

    const profile = await getOrCreatePendingProfile(user);

    return redirectTo(
      requestUrl,
      profile.access_status === "active" ? "/chat" : "/invite",
    );
  } catch {
    return redirectTo(requestUrl, "/login?error=auth");
  }
}

function redirectTo(requestUrl: URL, pathname: string) {
  return NextResponse.redirect(new URL(pathname, requestUrl.origin));
}
