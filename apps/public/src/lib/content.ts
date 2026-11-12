// Content helpers — build-time content collections (src/content/) merged
// with the live collections when the Public Content API exists.
// Until the API exists, the live loader returns empty, so the build-time
// rows are the source. Real rows only; empty arrays render empty states.
//
// Why two collection names: Astro 7.4.7 allows a collection name in EITHER
// content.config.ts (getCollection/getEntry) OR live.config.ts
// (getLiveCollection/getLiveEntry) — never both. So the live collections
// are named livePosts/liveProjects/... and merged here by slug, live wins.
// In prerendered pages getLiveCollection may throw (live is on-demand
// only) — the catch falls back to build-time rows, which is exactly the
// hybrid: archives are static until the scheduled rebuild, detail pages
// are on-demand and show live instantly.
import { getCollection, getLiveCollection, type CollectionEntry } from "astro:content";
import {
	CLIENTS,
	PLATFORMS,
	SERVICES,
	STACK,
	STATS,
	type Client,
	type Platform,
	type Service,
	type StackCategory,
	type StackTech,
} from "../data/site";
import { getSiteSettings } from "./settings";
import {
	liveCollectionReachable,
	warnLiveFallbackOnce,
	type PublicContentType,
} from "../loaders/public-content";

// Text helpers (truncateShort, SHORT_DESC_MAX) live in lib/text.ts —
// this module re-exports them so .astro pages keep importing from
// lib/content, while client islands import from lib/text directly
// (lib/content imports astro:content, which is server-only).
export { SHORT_DESC_MAX, truncateShort } from "./text";

export type Project = CollectionEntry<"projects">;
export type CaseStudy = CollectionEntry<"caseStudies">;
export type Post = CollectionEntry<"posts">;
export type Venture = CollectionEntry<"ventures">;
export type Release = CollectionEntry<"releases">;

type LiveCollectionName =
	| "livePosts"
	| "liveProjects"
	| "liveCaseStudies"
	| "liveVentures"
	| "liveReleases"
	| "liveServices"
	| "livePlatforms"
	| "liveTechnologies"
	| "liveClients";

function byDateDesc<T extends { data: { publishedAt?: string } }>(a: T, b: T) {
	return (b.data.publishedAt ?? "").localeCompare(a.data.publishedAt ?? "");
}

// A live row is "empty" for a field when the API returned nothing for it
// (null, undefined, "", or []). The API only returns what the DB holds, so
// an empty field means the DB row was never filled — NOT that the field
// should be blank. In that case the build-time value is kept, so an
// incomplete API row can never strip data the design relies on (thumbnail,
// tags, platforms, gallery, videos). Live wins whenever it has a value.
function isEmptyValue(v: unknown): boolean {
	return (
		v === undefined ||
		v === null ||
		v === "" ||
		(Array.isArray(v) && v.length === 0)
	);
}

function mergeEntryData<T extends Record<string, unknown>>(
	base: T,
	live: Record<string, unknown>,
): T {
	const out: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(live)) {
		if (key === "bn") {
			// Bangla variant merges field-wise like the English fields:
			// live `bn` wins where it has a value; build-time `bn` is
			// kept where the live row is empty — so a half-filled live
			// bn object can never strip a build-time Bangla field.
			const baseBn =
				base["bn"] && typeof base["bn"] === "object"
					? (base["bn"] as Record<string, unknown>)
					: {};
			const liveBn =
				value && typeof value === "object"
					? (value as Record<string, unknown>)
					: {};
			const merged: Record<string, unknown> = { ...baseBn };
			for (const [bk, bv] of Object.entries(liveBn)) {
				if (!isEmptyValue(bv)) merged[bk] = bv;
			}
			if (Object.keys(merged).length > 0) out["bn"] = merged;
			continue;
		}
		if (!isEmptyValue(value)) {
			out[key] = value;
		}
	}
	return out as T;
}

// Authoritative merge (fix plan §1b): when the live API is reachable
// at build time, the published set from the API is authoritative —
// live rows field-merge over matching static rows (as before) AND
// every static row whose slug is absent from the live set is DROPPED,
// so an archived/draft item disappears on the next rebuild with no
// code change. When the API is unreachable, today's behaviour
// (static rows only, live rows merged over them) is kept and a build
// warning names the collection. A 200 with an empty published set
// is reachable: the list then renders its honest empty state.
// A reachability probe that passes but a collection load that then
// fails is treated as unreachable — never ship an empty list on a
// load error.
async function mergeWithLive<
	T extends { data: { slug: string; publishedAt?: string } },
>(
	buildTime: T[],
	liveName: LiveCollectionName,
	liveType: PublicContentType,
): Promise<T[]> {
	let reachable = await liveCollectionReachable(liveType);
	let live: Array<{ data: { slug: string } }> = [];
	try {
		const result = await getLiveCollection(liveName);
		live = (result?.entries ?? []) as Array<{ data: { slug: string } }>;
	} catch {
		if (reachable) {
			warnLiveFallbackOnce(liveType);
			reachable = false;
		}
		live = [];
	}
	if (!reachable) warnLiveFallbackOnce(liveType);
	const liveSlugs = new Set(live.map((item) => item.data.slug));
	const bySlug = new Map<string, T>();
	for (const item of buildTime) {
		if (reachable && !liveSlugs.has(item.data.slug)) continue;
		bySlug.set(item.data.slug, item);
	}
	for (const item of live) {
		// Field-wise merge, not a full-row replace: live wins where it has
		// a value; build-time is kept where the live row is empty.
		const existing = bySlug.get(item.data.slug);
		if (existing) {
			bySlug.set(item.data.slug, {
				...existing,
				data: mergeEntryData(
					existing.data as Record<string, unknown>,
					item.data as Record<string, unknown>,
				),
			} as T);
		} else {
			bySlug.set(item.data.slug, item as unknown as T);
		}
	}
	return [...bySlug.values()].sort(byDateDesc);
}

export async function getProjects(): Promise<Project[]> {
	return mergeWithLive(await getCollection("projects"), "liveProjects", "projects");
}

export async function getCaseStudies(): Promise<CaseStudy[]> {
	return mergeWithLive(
		await getCollection("caseStudies"),
		"liveCaseStudies",
		"case-studies",
	);
}

export async function getPosts(): Promise<Post[]> {
	return mergeWithLive(await getCollection("posts"), "livePosts", "posts");
}

export async function getVentures(): Promise<Venture[]> {
	return mergeWithLive(await getCollection("ventures"), "liveVentures", "ventures");
}

export async function getReleases(): Promise<Release[]> {
	return mergeWithLive(await getCollection("releases"), "liveReleases", "releases");
}

/**
 * Resolve a live `icon` value onto a Service. The DB icon is either a
 * Lucide name (PascalCase: Database, Code, TrendingUp, ...) or a Simple
 * Icons slug (lowercase: wordpress, shopify). A Lucide name clears
 * `icon`; a slug clears `lucide` — explicit, NOT via mergeEntryData,
 * which skips empty values and would leave a stale icon behind.
 */
function resolveServiceIcon(service: Service, liveIcon: unknown): void {
	if (typeof liveIcon !== "string" || !liveIcon) return;
	if (/^[A-Z]/.test(liveIcon)) {
		service.icon = null;
		service.lucide = liveIcon;
	} else {
		service.icon = liveIcon;
		service.lucide = undefined;
	}
}

/** Field-wise Bangla overlay for a service (live wins where non-empty). */
function mergeServiceBn(
	service: Service,
	liveBn: unknown,
): void {
	if (!liveBn || typeof liveBn !== "object") return;
	const merged: Record<string, unknown> = { ...(service.bn ?? {}) };
	for (const [k, v] of Object.entries(liveBn as Record<string, unknown>)) {
		if (!isEmptyValue(v)) merged[k] = v;
	}
	if (Object.keys(merged).length > 0) {
		service.bn = merged as Service["bn"];
	}
}

/**
 * Services, merged live over build-time SERVICES by slug.
 *
 * Services are NOT a content collection (no detail page, no .md files)
 * — the build-time rows live in src/data/site.ts. The live rows come
 * from the Public Content API (`services` type, PR #91 dashboard side).
 * The API calls the name `title` and sends both `description` and
 * `summary`; the Service shape calls it `name` and keeps one
 * `description` (live description wins, else live summary, else the
 * build-time description). Ordering is by `sortOrder` from the API
 * (build-time rows keep their seed order 0–4); live-only rows without
 * one sort last. In prerendered pages getLiveCollection may throw —
 * the catch falls back to build-time SERVICES, same as the other
 * getters.
 */
export async function getServices(): Promise<Service[]> {
	let live: Array<{ data: Record<string, unknown> }> = [];
	try {
		const result = await getLiveCollection("liveServices");
		live = (result?.entries ?? []) as Array<{
			data: Record<string, unknown>;
		}>;
	} catch {
		live = [];
	}
	const bySlug = new Map<string, { service: Service; sortOrder: number }>();
	SERVICES.forEach((s, i) =>
		bySlug.set(s.slug, { service: { ...s }, sortOrder: i }),
	);
	for (const item of live) {
		const d = item.data;
		const slug = typeof d.slug === "string" ? d.slug : "";
		if (!slug) continue;
		const sortOrder =
			typeof d.sortOrder === "number"
				? d.sortOrder
				: (bySlug.get(slug)?.sortOrder ?? 99);
		const existing = bySlug.get(slug);
		if (existing) {
			const s = existing.service;
			if (typeof d.title === "string" && d.title) s.name = d.title;
			if (typeof d.description === "string" && d.description) {
				s.description = d.description;
			} else if (typeof d.summary === "string" && d.summary) {
				s.description = d.summary;
			}
			mergeServiceBn(s, d.bn);
			resolveServiceIcon(s, d.icon);
			bySlug.set(slug, { service: s, sortOrder });
		} else {
			// Live-only service (published after the last static build).
			const svc: Service = {
				name:
					typeof d.title === "string" && d.title ? d.title : slug,
				slug,
				description:
					typeof d.description === "string" && d.description
						? d.description
						: typeof d.summary === "string" && d.summary
							? d.summary
							: "",
				icon: null,
			};
			mergeServiceBn(svc, d.bn);
			resolveServiceIcon(svc, d.icon);
			bySlug.set(slug, { service: svc, sortOrder });
		}
	}
	return [...bySlug.values()]
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((x) => x.service);
}

export interface Stat {
	value: string;
	label: string;
}

/**
 * Stats, merged live over build-time STATS by position.
 *
 * Stats are NOT a content collection — the live rows come from the
 * Public Content API settings (`stats`, dashboard migration 0031).
 * Same live-wins rule as getServices(): a live entry wins where it has
 * a non-empty value AND label; build-time fills any gap; live-only
 * extras append. getSiteSettings() never throws (it falls back to the
 * fail-safe defaults, which carry no stats), so this never throws
 * either — an unreachable API renders exactly build-time STATS.
 */
export async function getStats(): Promise<Stat[]> {
	const live = (await getSiteSettings()).stats ?? [];
	const merged: Stat[] = STATS.map((s) => ({
		value: s.value,
		label: s.label,
	}));
	for (let i = 0; i < live.length; i++) {
		const entry = live[i];
		if (
			!entry ||
			typeof entry.value !== "string" ||
			entry.value.trim() === "" ||
			typeof entry.label !== "string" ||
			entry.label.trim() === ""
		)
			continue;
		const clean: Stat = {
			value: entry.value.trim(),
			label: entry.label.trim(),
		};
		if (i < merged.length) merged[i] = clean;
		else merged.push(clean);
	}
	return merged;
}

// ---------------------------------------------------------------------------
// Platforms / technologies / clients — live over build-time site data.
// ---------------------------------------------------------------------------
//
// Same pattern as getServices(): the build-time rows in src/data/site.ts
// are the fallback; when the Public Content API serves the matching
// type, live rows merge over them (live wins where it has a value) and
// live-only rows are appended. Until the API type exists the live
// loader returns empty, so the page renders exactly as today — no
// regression, no empty sections.
//
// Identity is the STABLE field, never the slug alone: the services
// slug bug (PR #92, 2026-11-09 — DB slugs differed from the
// build-time ones) showed a slug-only match can append duplicates.
// Platforms match by URL, technologies/clients by name; the slug is
// only a secondary match. Field reads accept snake_case or camelCase,
// top-level or under `meta`, so a naming choice on the dashboard side
// can never silently drop a row.

function slugify(value: string): string {
	return value
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-+|-+$/g, "");
}

function normName(value: string): string {
	return value.toLowerCase().trim().replace(/\s+/g, " ");
}

/** First non-empty value for any of the keys, top-level then `meta`. */
function liveField(
	d: Record<string, unknown>,
	...keys: string[]
): unknown {
	for (const key of keys) {
		const v = d[key];
		if (v !== undefined && v !== null && v !== "") return v;
	}
	const meta = d.meta;
	if (meta && typeof meta === "object") {
		const m = meta as Record<string, unknown>;
		for (const key of keys) {
			const v = m[key];
			if (v !== undefined && v !== null && v !== "") return v;
		}
	}
	return undefined;
}

function asString(v: unknown): string | undefined {
	return typeof v === "string" && v ? v : undefined;
}

function asNumber(v: unknown): number | undefined {
	return typeof v === "number" && Number.isFinite(v) ? v : undefined;
}

function asBool(v: unknown): boolean | undefined {
	return typeof v === "boolean" ? v : undefined;
}

/**
 * Bangla overlay for a live row, whitelisted per type: only the listed
 * keys survive, with `allowed` mapping API names to site-data names
 * (title → name). Structural fields (platform `group`, tech
 * `category`) are never overlaid — filter/group state keys stay
 * English; only display copy is localised. Merged field-wise over
 * the build-time `bn` by the callers.
 */
function normalizeLiveBn(
	raw: unknown,
	allowed: Record<string, string>,
): Record<string, unknown> | undefined {
	if (!raw || typeof raw !== "object") return undefined;
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
		const target = allowed[k];
		if (!target || isEmptyValue(v)) continue;
		out[target] = v;
	}
	return Object.keys(out).length > 0 ? out : undefined;
}

function mergeRowBn<T extends { bn?: Record<string, unknown> }>(
	row: T,
	liveBn: Record<string, unknown> | undefined,
): void {
	if (!liveBn) return;
	row.bn = { ...(row.bn ?? {}), ...liveBn } as T["bn"];
}

async function getLiveRows(
	liveName: LiveCollectionName,
): Promise<Array<{ data: Record<string, unknown> }>> {
	try {
		const result = await getLiveCollection(liveName);
		return (result?.entries ?? []) as Array<{
			data: Record<string, unknown>;
		}>;
	} catch {
		return [];
	}
}

const PLATFORM_GROUPS = ["music", "social", "professional"] as const;

function asPlatformGroup(v: unknown): Platform["group"] | undefined {
	return typeof v === "string" &&
		(PLATFORM_GROUPS as readonly string[]).includes(v)
		? (v as Platform["group"])
		: undefined;
}

/** Build-time slug candidates for a platform (slug is secondary). */
function platformSlugs(p: Platform): string[] {
	const slugs = [slugify(p.name)];
	if (p.note) slugs.push(slugify(`${p.name} ${p.note}`));
	return slugs;
}

/**
 * Platforms, merged live over build-time PLATFORMS by URL (then slug).
 * Live `title` is the platform name; `subtitle` / `handle` / `note`
 * are the card copy (bn overlay where present). Ordering is by
 * `sort_order` from the API (build-time rows keep seed order 0–16);
 * live-only rows without one sort last.
 */
export async function getPlatforms(): Promise<Platform[]> {
	const live = await getLiveRows("livePlatforms");
	const byUrl = new Map<string, { platform: Platform; sortOrder: number }>();
	const bySlug = new Map<
		string,
		{ platform: Platform; sortOrder: number }
	>();
	PLATFORMS.forEach((p, i) => {
		const entry = { platform: { ...p }, sortOrder: i };
		byUrl.set(p.url, entry);
		for (const slug of platformSlugs(p)) bySlug.set(slug, entry);
	});
	for (const item of live) {
		const d = item.data;
		const url = asString(liveField(d, "url", "website"));
		const slug = asString(d.slug);
		const existing =
			(url ? byUrl.get(url) : undefined) ??
			(slug ? bySlug.get(slug) : undefined);
		const name = asString(liveField(d, "title", "name"));
		const group = asPlatformGroup(liveField(d, "group"));
		const sortOrder =
			asNumber(liveField(d, "sort_order", "sortOrder")) ??
			existing?.sortOrder ??
			99;
		const bn = normalizeLiveBn(d.bn, {
			title: "name",
			name: "name",
			subtitle: "subtitle",
			handle: "handle",
			note: "note",
		});
		if (existing) {
			const p = existing.platform;
			if (name) p.name = name;
			if (url) p.url = url;
			const handle = asString(liveField(d, "handle"));
			if (handle) p.handle = handle;
			const icon = liveField(d, "icon");
			if (typeof icon === "string") p.icon = icon || null;
			else if (icon === null) p.icon = null;
			if (group) p.group = group;
			const note = asString(liveField(d, "note"));
			if (note) p.note = note;
			const subtitle = asString(liveField(d, "subtitle"));
			if (subtitle) p.subtitle = subtitle;
			const isPrimary = asBool(
				liveField(d, "is_primary", "isPrimary"),
			);
			if (isPrimary !== undefined) p.is_primary = isPrimary;
			const liveSort = asNumber(liveField(d, "sort_order", "sortOrder"));
			if (liveSort !== undefined) p.sort_order = liveSort;
			mergeRowBn(p, bn);
			existing.sortOrder = sortOrder;
			if (url) byUrl.set(url, existing);
		} else {
			// Live-only platform: without a URL it cannot link
			// anywhere, and without a valid group no section can
			// place it — skip rather than render a dead row.
			if (!name || !url || !group) continue;
			const icon = liveField(d, "icon");
			const p: Platform = {
				name,
				url,
				icon:
					typeof icon === "string"
						? icon || null
						: null,
				group,
			};
			const handle = asString(liveField(d, "handle"));
			if (handle) p.handle = handle;
			const note = asString(liveField(d, "note"));
			if (note) p.note = note;
			const subtitle = asString(liveField(d, "subtitle"));
			if (subtitle) p.subtitle = subtitle;
			const isPrimary = asBool(
				liveField(d, "is_primary", "isPrimary"),
			);
			if (isPrimary !== undefined) p.is_primary = isPrimary;
			const liveSort = asNumber(liveField(d, "sort_order", "sortOrder"));
			if (liveSort !== undefined) p.sort_order = liveSort;
			mergeRowBn(p, bn);
			const entry = { platform: p, sortOrder };
			byUrl.set(url, entry);
			if (slug) bySlug.set(slug, entry);
		}
	}
	return [...byUrl.values()]
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((x) => x.platform);
}

// Footer primary icons — exactly these 5, in this order. Derived from
// the live `is_primary` flag + `sort_order`, never by display name
// (two rows are both "Facebook"). Fallback when no row carries the
// flag yet (API absent): the same five profiles, matched by URL —
// the stable identity.
const SEED_FOOTER_URLS = [
	"https://www.linkedin.com/in/mahmudulhasanriaz",
	"https://wa.me/8801601701567",
	"https://www.facebook.com/MahmudulHasanRiaz.Official",
	"https://github.com/MahmudulHasanRiaz",
	"https://www.youtube.com/@MahmudRiazBD",
];

export function getFooterPrimaries(platforms: Platform[]): Platform[] {
	const flagged = platforms.filter((p) => p.is_primary === true);
	if (flagged.length > 0) {
		return [...flagged]
			.sort((a, b) => (a.sort_order ?? 99) - (b.sort_order ?? 99))
			.slice(0, 5);
	}
	return SEED_FOOTER_URLS.flatMap((url) => {
		const row = platforms.find((p) => p.url === url);
		return row ? [row] : [];
	});
}

/**
 * Stack technologies, merged live over build-time STACK by name (then
 * slug). Live `title` is the tech name; `category` / `icon` / `use`
 * overlay where present. Ordering is by `sort_order` from the API
 * (build-time rows keep seed order 0–43); live-only rows without one
 * sort last. The globe derives its filter chips + constellation lines
 * from the returned rows, so a new API category appears automatically.
 */
export async function getTechnologies(): Promise<StackTech[]> {
	const live = await getLiveRows("liveTechnologies");
	const byName = new Map<
		string,
		{ tech: StackTech; sortOrder: number }
	>();
	const bySlug = new Map<
		string,
		{ tech: StackTech; sortOrder: number }
	>();
	STACK.forEach((t, i) => {
		const entry = { tech: { ...t }, sortOrder: i };
		byName.set(normName(t.name), entry);
		bySlug.set(slugify(t.name), entry);
	});
	for (const item of live) {
		const d = item.data;
		const name = asString(liveField(d, "title", "name"));
		const slug = asString(d.slug);
		const existing =
			(name ? byName.get(normName(name)) : undefined) ??
			(slug ? bySlug.get(slug) : undefined);
		const category = asString(liveField(d, "category"));
		const sortOrder =
			asNumber(liveField(d, "sort_order", "sortOrder")) ??
			existing?.sortOrder ??
			99;
		const bn = normalizeLiveBn(d.bn, {
			title: "name",
			name: "name",
			use: "use",
		});
		if (existing) {
			const t = existing.tech;
			if (name) t.name = name;
			// An unknown category is kept as-is (the globe falls back
			// to the raw label + no colour dot) rather than dropping
			// the row — the API owns the taxonomy.
			if (category) t.category = category as StackCategory;
			const icon = liveField(d, "icon");
			if (typeof icon === "string") t.icon = icon || null;
			else if (icon === null) t.icon = null;
			const use = asString(liveField(d, "use"));
			if (use) t.use = use;
			mergeRowBn(t, bn);
			existing.sortOrder = sortOrder;
		} else {
			// Live-only tech: nameless or category-less rows cannot
			// be placed on the globe — skip rather than render a
			// broken tag.
			if (!name || !category) continue;
			const icon = liveField(d, "icon");
			const t: StackTech = {
				name,
				category: category as StackCategory,
				icon:
					typeof icon === "string"
						? icon || null
						: null,
			};
			const use = asString(liveField(d, "use"));
			if (use) t.use = use;
			mergeRowBn(t, bn);
			const entry = { tech: t, sortOrder };
			byName.set(normName(name), entry);
			if (slug) bySlug.set(slug, entry);
		}
	}
	return [...byName.values()]
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((x) => x.tech);
}

/**
 * Clients, merged live over build-time CLIENTS by name (then slug).
 * Live `title` is the client name; `logo_url` renders the logo when
 * present (else the text wordmark), `website` links the cell when
 * present. Ordering is by `sort_order` from the API (build-time rows
 * keep seed order); live-only rows without one sort last.
 */
export async function getClients(): Promise<Client[]> {
	const live = await getLiveRows("liveClients");
	const byName = new Map<
		string,
		{ client: Client; sortOrder: number }
	>();
	const bySlug = new Map<
		string,
		{ client: Client; sortOrder: number }
	>();
	CLIENTS.forEach((c, i) => {
		const entry = { client: { ...c }, sortOrder: i };
		byName.set(normName(c.name), entry);
		bySlug.set(slugify(c.name), entry);
	});
	for (const item of live) {
		const d = item.data;
		const name = asString(liveField(d, "title", "name"));
		const slug = asString(d.slug);
		const existing =
			(name ? byName.get(normName(name)) : undefined) ??
			(slug ? bySlug.get(slug) : undefined);
		const sortOrder =
			asNumber(liveField(d, "sort_order", "sortOrder")) ??
			existing?.sortOrder ??
			99;
		const bn = normalizeLiveBn(d.bn, { title: "name", name: "name" });
		if (existing) {
			const c = existing.client;
			if (name) c.name = name;
			const logo = asString(
				liveField(d, "logo_url", "logoUrl", "logo", "thumbnail"),
			);
			if (logo) c.logo_url = logo;
			const website = asString(liveField(d, "website", "url"));
			if (website) c.website = website;
			const liveSort = asNumber(liveField(d, "sort_order", "sortOrder"));
			if (liveSort !== undefined) c.sort_order = liveSort;
			mergeRowBn(c, bn);
			existing.sortOrder = sortOrder;
		} else {
			if (!name) continue;
			const c: Client = { name };
			const logo = asString(
				liveField(d, "logo_url", "logoUrl", "logo", "thumbnail"),
			);
			if (logo) c.logo_url = logo;
			const website = asString(liveField(d, "website", "url"));
			if (website) c.website = website;
			const liveSort = asNumber(liveField(d, "sort_order", "sortOrder"));
			if (liveSort !== undefined) c.sort_order = liveSort;
			mergeRowBn(c, bn);
			const entry = { client: c, sortOrder };
			byName.set(normName(name), entry);
			if (slug) bySlug.set(slug, entry);
		}
	}
	return [...byName.values()]
		.sort((a, b) => a.sortOrder - b.sortOrder)
		.map((x) => x.client);
}

export function formatDate(
	iso: string | undefined,
	lang: "en" | "bn" = "en",
): string {
	if (!iso) return "";
	const d = new Date(iso);
	if (Number.isNaN(d.getTime())) return "";
	return d.toLocaleDateString(lang === "bn" ? "bn-BD" : "en-GB", {
		day: "numeric",
		month: "short",
		year: "numeric",
	});
}

export function readingTimeFromText(text: string | undefined): number | null {
	if (!text) return null;
	const words = text.trim().split(/\s+/).length;
	return Math.max(1, Math.round(words / 200));
}
