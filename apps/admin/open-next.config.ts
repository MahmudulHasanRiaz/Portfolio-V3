// default open-next.config.ts file created by @opennextjs/cloudflare
// (copied from the adapter's template; `opennextjs-cloudflare migrate` was
// NOT run because it would install deps and rewrite package.json scripts,
// and this app's `build` script must stay `next build`).
// R2 incremental cache matches the NEXT_INC_CACHE_R2_BUCKET binding in
// wrangler.jsonc — create that bucket before the first deploy.
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";

export default defineCloudflareConfig({
	incrementalCache: r2IncrementalCache,
});
