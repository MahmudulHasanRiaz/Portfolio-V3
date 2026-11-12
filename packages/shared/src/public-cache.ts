// Instant public-site cache purge (Portfolio-Public, Astro live).
//
// The public Astro site caches every content page at the Cloudflare edge
// for 1 hour (see Portfolio-Public docs/BUILD_GUARD.md Rule 8). Freshness
// comes from the tag purge, NOT from a short TTL: after every successful
// admin content save the admin POSTs the affected tags to the public
// site's POST /api/cache/invalidate, and the next visitor gets the fresh
// page within seconds — no rebuild, no deploy.
//
// This helper is deliberately best-effort and NEVER throws: a failed or
// unconfigured purge must NEVER fail an admin save. The worst case is a
// page staying cached up to the 1 h TTL. Callers fire-and-forget it
// (`void purgePublicCache([...])`) after the DB write succeeds.
//
// Configuration (admin env, never in the repo):
//   PUBLIC_SITE_URL — the public Worker origin, e.g.
//     https://portfolio-public.riaaz.workers.dev
//   CACHE_INVALIDATE_SECRET — the shared secret; MUST match the
//     Cloudflare dashboard secret of the same name on the public Worker.
//     The endpoint answers 503 while the secret is unset there, and 401
//     when the value does not match.
// No Cloudflare API token or zone ID is needed: the endpoint purges
// through Astro's cache API (Workers Cache purge-by-tag).

const PURGE_TIMEOUT_MS = 5000;

// Warn once per process when the purge is unconfigured, so a missing
// secret is visible in the admin log without spamming it on every save.
let warnedMissingConfig = false;

export async function purgePublicCache(tags: string[]): Promise<void> {
  const clean = [
    ...new Set(tags.filter((t) => typeof t === "string" && t.length > 0)),
  ];
  if (clean.length === 0) return;

  const siteUrl = process.env.PUBLIC_SITE_URL?.replace(/\/+$/, "");
  const secret = process.env.CACHE_INVALIDATE_SECRET;
  if (!siteUrl || !secret) {
    if (!warnedMissingConfig) {
      warnedMissingConfig = true;
      console.warn(
        "[public-cache] PUBLIC_SITE_URL / CACHE_INVALIDATE_SECRET not configured — " +
          "public site cache is NOT purged on admin saves (pages stay cached up to the 1 h TTL).",
      );
    }
    return;
  }

  try {
    const res = await fetch(`${siteUrl}/api/cache/invalidate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ tags: clean }),
      signal: AbortSignal.timeout(PURGE_TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn(
        `[public-cache] purge failed (${res.status}) for tags ${clean.join(", ")} — ` +
          "pages stay cached up to the 1 h TTL.",
      );
    }
  } catch (err) {
    console.warn(
      `[public-cache] purge request failed for tags ${clean.join(", ")}: ` +
        `${err instanceof Error ? err.message : String(err)} — ` +
        "pages stay cached up to the 1 h TTL.",
    );
  }
}
