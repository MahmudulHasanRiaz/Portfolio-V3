import { type NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "better-auth.session_token";
// Better Auth prefixes the session cookie with "__Secure-" when the app is
// served over HTTPS (BETTER_AUTH_URL https://...), so check both names.
const SECURE_SESSION_COOKIE = "__Secure-better-auth.session_token";

const publicPaths = [
  "/auth/login",
  "/auth/register",
  "/auth/forgot-password",
  "/auth/reset-password",
  "/auth/error",
];

const publicPrefixes = ["/api/auth", "/_next", "/favicon.ico", "/images", "/api/health", "/api/abandoned", "/api/search", "/sitemap.xml", "/robots.txt", "/api/analytics", "/api/cron", "/api/public"];

function isPublic(pathname: string): boolean {
  if (publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (publicPrefixes.some((p) => pathname.startsWith(p))) return true;
  return false;
}

function redirectToLogin(request: NextRequest, reason?: string) {
  const loginUrl = new URL("/auth/login", request.url);
  loginUrl.searchParams.set("redirect", request.nextUrl.pathname);
  if (reason) loginUrl.searchParams.set("reason", reason);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublic(pathname)) return NextResponse.next();

  const sessionCookie =
    request.cookies.get(SECURE_SESSION_COOKIE)?.value ??
    request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    return redirectToLogin(request, "no_session");
  }

  // Optimistic check only (Better Auth's documented middleware pattern):
  // a previous version validated the session here via an HTTP self-fetch to
  // `${origin}/api/auth/get-session`, which throws behind the reverse proxy
  // (public-origin hairpin), bouncing every login with
  // reason=session_check_error. Real session validation happens in-process
  // in the API routes and server components via auth.api.getSession.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|images).*)"],
};
