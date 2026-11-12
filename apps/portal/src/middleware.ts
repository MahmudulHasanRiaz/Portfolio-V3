import { type NextRequest, NextResponse } from "next/server";

const PORTAL_SESSION_COOKIE = "portal_session_token";

const PROTECTED_PATHS = ["/dashboard", "/projects", "/deliverables", "/proposals", "/messages", "/invoices"];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  // Optimistic cookie-presence check only. The previous implementation
  // validated the session via an HTTP self-fetch to /api/auth/verify,
  // which fails behind the reverse proxy (hairpin) and bounced every
  // signed-in client straight back to /login. Real validation happens
  // in-process in every API route (verifyJwt); nothing in the app
  // consumes middleware-injected headers.
  const sessionToken = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  if (!sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
