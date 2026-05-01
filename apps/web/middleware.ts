import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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

  let response = NextResponse.next({ request });
  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && (pathname.startsWith("/chat") || pathname === "/invite")) {
    return redirectTo(request, "/login");
  }

  // TODO: Move active/pending redirects into middleware once access status is
  // available through a signed auth claim or a lightweight profile cache.
  // Server pages enforce active/pending checks today.
  return response;
}

export const config = {
  matcher: ["/chat/:path*", "/invite", "/login"],
};

function isAuthRoute(pathname: string): boolean {
  return pathname.startsWith("/chat") || pathname === "/invite" || pathname === "/login";
}

function redirectTo(request: NextRequest, pathname: "/login") {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";

  if (request.nextUrl.pathname !== "/login") {
    url.searchParams.set("next", request.nextUrl.pathname);
  }

  return NextResponse.redirect(url);
}
