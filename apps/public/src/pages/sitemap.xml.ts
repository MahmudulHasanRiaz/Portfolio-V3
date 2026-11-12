import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { getSiteSettings } from "../lib/settings";
import { resolvePublicContentToken } from "../loaders/public-content";
import { resolveHostBase } from "../lib/detail";

// GET /sitemap.xml — on-demand (prerender = false) so detail pages
// are included: they are on-demand routes, not in the static build,
// so a build-time-only sitemap would miss them. Static pages + live
// slugs from the Public Content API (build-time collections as the
// fallback when the API is unset/unreachable), every URL in BOTH
// languages with hreflang alternates (en + bn + x-default, reciprocal
// with the <link> tags on the pages themselves).
//
// x-default = the admin-configured default language version (read live
// via getSiteSettings()): default "bn" → Bangla URL; "en"/"system" →
// English URL. Absolute URLs from the REQUEST HOST (resolveHostBase):
// the request host wins so every <loc> lives on the host the crawler
// actually fetched the sitemap from; the admin site_url only fills in
// when there is no request host, and SITE_URL is the last resort.
// Never hardcoded — no served output here contains a fixed domain.
export const prerender = false;

const STATIC_PATHS = [
	"/",
	"/know-me",
	"/platforms",
	"/projects",
	"/ventures",
	"/releases",
	"/posts",
	"/case-studies",
];

const DETAIL_TYPES = [
	{ api: "posts", path: "posts", collection: "posts" },
	{ api: "projects", path: "projects", collection: "projects" },
	{ api: "case-studies", path: "case-studies", collection: "caseStudies" },
	{ api: "ventures", path: "ventures", collection: "ventures" },
	{ api: "releases", path: "releases", collection: "releases" },
] as const;

function escXml(s: string): string {
	return s
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function apiBase(): string | undefined {
	try {
		const fromEnv = (import.meta.env.PUBLIC_CONTENT_API_URL as
			| string
			| undefined) ?? "";
		return fromEnv.replace(/\/$/, "") || undefined;
	} catch {
		return undefined;
	}
}

async function liveSlugs(
	base: string,
	type: string,
	token: string | undefined,
): Promise<string[] | undefined> {
	try {
		const res = await fetch(`${base}/api/public/content/${type}`, {
			// PR #90 made the API auth-required: no Bearer token =
			// 401 = live slugs silently missing from the sitemap.
			headers: token ? { Authorization: `Bearer ${token}` } : {},
			signal: AbortSignal.timeout(8000),
		});
		if (!res.ok) return undefined;
		const raw: unknown = await res.json();
		const items = Array.isArray(raw)
			? raw
			: Array.isArray((raw as { items?: unknown }).items)
				? (raw as { items: unknown[] }).items
				: [];
		return items
			.filter(
				(i): i is { slug: string } =>
					typeof i === "object" &&
					i !== null &&
					typeof (i as { slug?: unknown }).slug === "string",
			)
			.map((i) => i.slug);
	} catch {
		return undefined;
	}
}

export const GET: APIRoute = async ({ request }) => {
	const settings = await getSiteSettings();
	// Search-indexing gate (admin toggle
	// "search_indexing_enabled"): OFF (default) → an EMPTY sitemap —
	// crawlers get nothing to index. The live-slug fetch + token
	// resolution below only run when indexing is ON.
	if (!settings.searchIndexingEnabled) {
		const emptyXml = [
			'<?xml version="1.0" encoding="UTF-8"?>',
			'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
			"</urlset>",
			"",
		].join("\n");
		return new Response(emptyXml, {
			headers: {
				"Content-Type": "application/xml; charset=utf-8",
				"Cache-Control": "public, max-age=3600",
			},
		});
	}
	const siteUrl = resolveHostBase(settings.siteUrl, request);
	const base = apiBase();
	// Resolved once per sitemap request (Worker runtime env, then
	// build-time env) and passed to every liveSlugs call below.
	const token = await resolvePublicContentToken();

	const paths = [...STATIC_PATHS];
	for (const t of DETAIL_TYPES) {
		let slugs: string[] = [];
		if (base) {
			const live = await liveSlugs(base, t.api, token);
			if (live) slugs = live;
		}
		if (!slugs.length) {
			try {
				const rows = await getCollection(t.collection);
				slugs = rows.map((r: { data: { slug: string } }) => r.data.slug);
			} catch {
				slugs = [];
			}
		}
		for (const slug of slugs) paths.push(`/${t.path}/${slug}`);
	}

	const urlEntries = paths
		.map((p) => {
			const en = p === "/" ? `${siteUrl}/` : `${siteUrl}${p}`;
			const bn = p === "/" ? `${siteUrl}/bn/` : `${siteUrl}/bn${p}`;
			const xDefault =
				settings.defaultLanguage === "bn" ? bn : en;
			return [
				"  <url>",
				`    <loc>${escXml(en)}</loc>`,
				`    <xhtml:link rel="alternate" hreflang="en" href="${escXml(en)}" />`,
				`    <xhtml:link rel="alternate" hreflang="bn" href="${escXml(bn)}" />`,
				`    <xhtml:link rel="alternate" hreflang="x-default" href="${escXml(xDefault)}" />`,
				"  </url>",
			].join("\n");
		})
		.join("\n");

	const xml = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
		urlEntries,
		"</urlset>",
		"",
	].join("\n");

	return new Response(xml, {
		headers: {
			"Content-Type": "application/xml; charset=utf-8",
			// Fresh enough to pick up new content quickly, but cached
			// at the edge so crawlers don't hammer the API.
			"Cache-Control": "public, max-age=3600",
		},
	});
};
