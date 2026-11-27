import { type NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

// Better Auth session cookie names — the "__Secure-" prefix is used
// when the app is served over HTTPS (BETTER_AUTH_URL https://...).
const SESSION_COOKIE = "better-auth.session_token";
const SECURE_SESSION_COOKIE = "__Secure-better-auth.session_token";

const PROTECTED_PATHS = [
  "/dashboard",
  "/projects",
  "/deliverables",
  "/proposals",
  "/messages",
  "/invoices",
  "/search",
];

function isProtected(pathname: string): boolean {
  return PROTECTED_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

type HonoBinding = {
  fetch: (req: Request) => Promise<Response>;
};

async function getHonoBinding(): Promise<HonoBinding | null> {
  try {
    const { env } = await getCloudflareContext({ async: true });
    const binding = (env as unknown as Record<string, unknown>)
      .HONO_API as HonoBinding | undefined;
    if (binding && typeof binding.fetch === "function") return binding;
    return null;
  } catch {
    return null;
  }
}

// Validate the session against Hono (Better Auth get-session) through
// the HONO_API service binding. Returns true when the session is valid,
// false when it is not, and null when validation could not run (no
// binding — local dev), so the caller falls back to cookie presence.
// The binding calls Hono directly (no workers.dev URL), so this does
// not hit the 1042 hairpin that killed the old HTTP self-fetch.
async function isSessionValid(
  request: NextRequest,
): Promise<boolean | null> {
  const binding = await getHonoBinding();
  if (!binding) return null;
  try {
    const cookie = request.headers.get("cookie") ?? "";
    const res = await binding.fetch(
      new Request("https://hono-api/api/auth/get-session", {
        headers: { cookie },
        signal: AbortSignal.timeout(5_000),
      }),
    );
    if (!res.ok) return false;
    const data: unknown = await res.json();
    return !!(
      data &&
      typeof data === "object" &&
      "session" in data &&
      (data as { session?: unknown }).session
    );
  } catch {
    return null;
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  // Cookie presence first (Better Auth's documented middleware pattern).
  const sessionCookie =
    request.cookies.get(SECURE_SESSION_COOKIE)?.value ??
    request.cookies.get(SESSION_COOKIE)?.value;
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Real session validation when the binding is available; a stale or
  // forged cookie is bounced to /login. When the binding is unavailable
  // (local dev) presence-only is the fallback, and the Hono routes
  // still validate every request.
  const valid = await isSessionValid(request);
  if (valid === false) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
