// Request-scoped live-fallback tracking (PR #21).
//
// PROBLEM: when the live Public Content API is unreachable at request
// time, pages render from the build-time static rows (content.ts
// mergeWithLive / the detail pages' build-entry fallback) — only 4
// static project files with OLD content. That fallback HTML was then
// cached for the full 1 h route-rule TTL (middleware.ts sets
// max-age=3600 unconditionally), so one transient live-fetch failure
// — e.g. a request landing during a deploy — poisoned the edge cache
// for an hour, and the tag purge (which only fires on content saves)
// never cleared it. The user saw a 4-project site with the old Jannat
// content and the default favicon while fresh curls saw live data
// (different edge colo / cache state).
//
// FIX: a render that fell back must NEVER be cached. The content layer
// marks the request when it falls back (markLiveFallback), and the
// middleware — which wraps the page render in this tracking context —
// disables Astro caching for that response (context.cache.set(false))
// and forces no-store headers, so the next request retries live.
//
// MECHANISM: Node AsyncLocalStorage, the request-scoped store. The
// middleware wraps next() in runWithLiveFallbackTracking(); every
// live-data load inside that async chain (mergeWithLive,
// liveCollectionReachable, fetchPublicSettings) shares the store, so
// a mark anywhere in the render is visible to the middleware after
// next() returns. No shared mutable module state (no cross-request
// race), no per-page changes. markLiveFallback() is a no-op outside a
// tracked request (build time / dev without the middleware), so the
// build is unaffected. Requires nodejs_compat (already enabled in
// wrangler.jsonc) for `node:async_hooks` in the Worker.
import { AsyncLocalStorage } from "node:async_hooks";

export interface LiveFallbackState {
	/** True once any live-data load in this request fell back to static rows. */
	fallback: boolean;
}

const store = new AsyncLocalStorage<LiveFallbackState>();

/**
 * Mark the current request as having rendered from the static
 * fallback. No-op when called outside a tracked request (build time,
 * or a caller that bypasses the middleware tracking).
 */
export function markLiveFallback(): void {
	const state = store.getStore();
	if (state) state.fallback = true;
}

/**
 * Run `fn` inside a fresh fallback-tracking context and report
 * whether any live-data load inside it fell back. Used by the
 * middleware to wrap the page render.
 */
export async function runWithLiveFallbackTracking<T>(fn: () => Promise<T>): Promise<{
	result: T;
	fallback: boolean;
}> {
	const state: LiveFallbackState = { fallback: false };
	const result = await store.run(state, fn);
	return { result, fallback: state.fallback };
}
