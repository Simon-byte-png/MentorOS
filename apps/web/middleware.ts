import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const AUTH_REFRESH_TIMEOUT_MS = 4_000;

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

  if (!hasSupabaseAuthCookie(request) && isProtectedRoute(pathname)) {
    return redirectTo(request, "/login");
  }

  const authResult = await refreshAuthSession(request);

  if (authResult.verified && authResult.user && pathname === "/login") {
    const redirectResponse = redirectTo(request, "/chat");
    copyResponseCookies(authResult.response, redirectResponse);
    return redirectResponse;
  }

  if (authResult.verified && !authResult.user && isProtectedRoute(pathname)) {
    const redirectResponse = redirectTo(request, "/login");
    copyResponseCookies(authResult.response, redirectResponse);
    return redirectResponse;
  }

  // TODO: Move active/pending redirects into middleware once access status is
  // available through a signed auth claim or a lightweight profile cache.
  // Server pages enforce active/pending checks today.
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

async function refreshAuthSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
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

    return {
      response,
      verified: true,
      user: userResult.data.user,
    };
  } catch {
    return {
      response,
      verified: false,
      user: null,
    };
  }
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

function redirectTo(request: NextRequest, pathname: "/login" | "/chat") {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  if (request.nextUrl.pathname !== "/login") {
    url.searchParams.set("next", request.nextUrl.pathname);
  }

  return NextResponse.redirect(url);
}
