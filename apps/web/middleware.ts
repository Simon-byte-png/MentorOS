import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const AUTH_REFRESH_TIMEOUT_MS = 4_000;
const AUTH_USER_ID_HEADER = "x-mentoros-auth-user-id";
const AUTH_USER_EMAIL_HEADER = "x-mentoros-auth-user-email";

type AuthRefreshResult = {
  response: NextResponse;
  verified: boolean;
  user: { id: string; email?: string | null } | null;
  accessRedirect: "/invite" | "/chat";
};

/** Dev bypass 仅本地有效，production 下即使误配 true 也不生效。 */
function isDevBypassAllowed(): boolean {
  const isProduction =
    process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production";
  return process.env.NEXT_PUBLIC_ALLOW_DEV_BYPASS === "true" && !isProduction;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!isAuthRoute(pathname)) {
    return NextResponse.next();
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    if (isDevBypassAllowed() && pathname.startsWith("/chat")) {
      return NextResponse.next();
    }

    return pathname === "/login"
      ? NextResponse.next()
      : redirectTo(request, "/login");
  }

  const hasAuthCookie = hasSupabaseAuthCookie(request);

  if (!hasAuthCookie && isProtectedRoute(pathname)) {
    logAuthDecision({
      pathname,
      hasAuthCookie,
      reason: "protected-route-missing-cookie",
      redirectTo: "/login",
    });
    return redirectTo(request, "/login");
  }

  const authResult = await refreshAuthSession(request);

  if (authResult.verified && !authResult.user && isProtectedRoute(pathname)) {
    const redirectResponse = redirectTo(request, "/login");
    copyResponseCookies(authResult.response, redirectResponse);
    logAuthDecision({
      pathname,
      hasAuthCookie,
      reason: "protected-route-no-user",
      verified: authResult.verified,
      hasUser: false,
      redirectTo: "/login",
    });
    return redirectResponse;
  }

  if (authResult.verified && authResult.user) {
    const accessRedirect = authResult.accessRedirect;

    if (pathname === "/login" || (pathname !== accessRedirect && isProtectedRoute(pathname))) {
      const redirectResponse = redirectTo(request, accessRedirect);
      copyResponseCookies(authResult.response, redirectResponse);
      logAuthDecision({
        pathname,
        hasAuthCookie,
        reason: pathname === "/login" ? "login-with-user" : "protected-route-access-mismatch",
        verified: authResult.verified,
        hasUser: true,
        accessRedirect,
        redirectTo: accessRedirect,
      });
      return redirectResponse;
    }
  }

  // Middleware owns page-level auth redirects so Server Components do not race
  // against the refreshed Supabase cookies in the same navigation.
  logAuthDecision({
    pathname,
    hasAuthCookie,
    reason: "allow",
    verified: authResult.verified,
    hasUser: Boolean(authResult.user),
    accessRedirect: authResult.accessRedirect,
  });
  return authResult.response;
}

export const config = {
  matcher: ["/chat/:path*", "/invite", "/login"],
};

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/chat") || pathname === "/invite" || pathname === "/login";
}

function isProtectedRoute(pathname: string): boolean {
  return pathname.startsWith("/chat") || pathname === "/invite";
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"));
}

async function refreshAuthSession(request: NextRequest): Promise<AuthRefreshResult> {
  let response = createNextResponse(request);
  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = createNextResponse(request);
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  try {
    const userResult = await withTimeout(
      supabase.auth.getUser(),
      AUTH_REFRESH_TIMEOUT_MS,
    );

    const user = userResult.data.user;
    const accessRedirect: "/invite" | "/chat" = user
      ? await getAccessRedirect(supabase, user.id)
      : "/invite";
    const finalResponse = createNextResponse(request, {
      id: userResult.data.user?.id ?? null,
      email: userResult.data.user?.email ?? null,
    });
    copyResponseCookies(response, finalResponse);

    return {
      response: finalResponse,
      verified: true,
      user: userResult.data.user,
      accessRedirect,
    };
  } catch {
    return {
      response,
      verified: false,
      user: null,
      accessRedirect: "/invite",
    };
  }
}

function createNextResponse(
  request: NextRequest,
  user: { id: string | null; email: string | null } = { id: null, email: null },
) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(AUTH_USER_ID_HEADER);
  requestHeaders.delete(AUTH_USER_EMAIL_HEADER);

  if (user.id) {
    requestHeaders.set(AUTH_USER_ID_HEADER, user.id);
  }

  if (user.email) {
    requestHeaders.set(AUTH_USER_EMAIL_HEADER, user.email);
  }

  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Auth refresh timed out."));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

function copyResponseCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => {
    to.cookies.set(cookie);
  });
}

async function getAccessRedirect(
  supabase: ReturnType<typeof createServerClient>,
  userId: string,
): Promise<"/invite" | "/chat"> {
  const { data } = await supabase
    .from("user_profiles")
    .select("access_status")
    .eq("user_id", userId)
    .maybeSingle();

  return data?.access_status === "active" ? "/chat" : "/invite";
}

function redirectTo(request: NextRequest, pathname: "/login" | "/invite" | "/chat") {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  if (request.nextUrl.pathname !== "/login") {
    url.searchParams.set("next", request.nextUrl.pathname);
  }

  return NextResponse.redirect(url);
}

function logAuthDecision(details: {
  pathname: string;
  hasAuthCookie: boolean;
  reason: string;
  verified?: boolean;
  hasUser?: boolean;
  accessRedirect?: "/invite" | "/chat";
  redirectTo?: "/login" | "/invite" | "/chat";
}) {
  console.info("[auth/middleware]", details);
}
