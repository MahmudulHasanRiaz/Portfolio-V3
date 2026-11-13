// Twin SSR fallback — data preparation for the catch-all detail route
// (src/pages/[...path].astro).
//
// WHY: the 10 detail routes are FULLY STATIC (getStaticPaths;
// prerender=false was removed because Astro 7.4.7 never calls
// getStaticPaths for prerender=false routes). A slug published AFTER
// the build therefore 404s until the next rebuild. The catch-all is
// the live half of the hybrid plan: Astro serves the STATIC page when
// one exists for a slug (static routes take precedence) and falls
// through to the catch-all only for paths with no static match. The
// catch-all renders the slug LIVE from the Public Content API with the
// SAME detail templates the static pages use (same components, same
// markup, same SEO) — or a proper 404 when the API has no such item.
//
// LIVE-ONLY: a slug that reaches the catch-all is, by construction, NOT
// in the build-time collections (getStaticPaths would have prerendered
// it), so there is no build-time entry and no markdown `Content` to
// render. Every view model below is built from the live row alone:
// the body comes from the live `content` / `longDescription` strings
// (parsed into blocks, never invented), and the Bangla overlay comes
// from the live `bn` object — English is the fallback, never a blank.
//
// This module does the async work (live fetch + prev/next lists) and
// every derivation the static pages do in their frontmatter. The five
// detail components (src/components/details/) are pure renderers of
// the view models built here, so the markup and the data stay in sync
// with the static pages by construction.
import { getLiveEntry } from "astro:content";
import {
	formatDate,
	getCaseStudies,
	getPosts,
	getProjects,
	getReleases,
	getVentures,
	readingTimeFromText,
} from "./content";
import {
	SITE_URL,
	absUrl,
	dedupeBlocks,
	isRealUrl,
	parseBodyBlocks,
	yearOf,
	type BodyBlock,
} from "./detail";
import {
	langUrl,
	localizeCaseStudy,
	localizeData,
	readingTimeLabel,
	type Dict,
	type Lang,
} from "./i18n";
import { PROFILE } from "../data/site";
import { optimizedImageUrl } from "./images";
import { youtubeEmbed, youtubeIdFromUrl, youtubeThumb } from "./youtube";

export type DetailType =
	| "projects"
	| "case-studies"
	| "ventures"
	| "releases"
	| "posts";

export interface TwinRoute {
	lang: Lang;
	type: DetailType;
	slug: string;
}

const DETAIL_TYPES: DetailType[] = [
	"projects",
	"case-studies",
	"ventures",
	"releases",
	"posts",
];

const LIVE_COLLECTION: Record<
	DetailType,
	| "livePosts"
	| "liveProjects"
	| "liveCaseStudies"
	| "liveVentures"
	| "liveReleases"
> = {
	projects: "liveProjects",
	"case-studies": "liveCaseStudies",
	ventures: "liveVentures",
	releases: "liveReleases",
	posts: "livePosts",
};

/**
 * Resolve a request pathname to a twin detail route, or null when the
 * path is not a detail URL at all. Accepts exactly two segments after
 * an optional `bn` prefix: /{type}/{slug} or /bn/{type}/{slug}.
 * Archives (/projects), the homepage (/), and any other path return
 * null — those are served by their own (static) routes and never
 * reach the catch-all in practice; this is the safety net.
 */
export function resolveTwinRoute(pathname: string): TwinRoute | null {
	const clean = pathname.replace(/\/+$/, "") || "/";
	const parts = clean.split("/").filter(Boolean);
	let lang: Lang = "en";
	let rest = parts;
	if (parts[0] === "bn") {
		lang = "bn";
		rest = parts.slice(1);
	}
	if (rest.length !== 2) return null;
	const [type, slug] = rest as [string, string];
	if (!DETAIL_TYPES.includes(type as DetailType)) return null;
	if (!slug) return null;
	return { lang, type: type as DetailType, slug };
}

/** Fetch one live entry (single-item API call). Never throws. */
export async function fetchLiveDetail(type: DetailType, slug: string) {
	const liveResult = await getLiveEntry(LIVE_COLLECTION[type], slug).catch(
		() => undefined,
	);
	return liveResult?.entry;
}

// ---------------------------------------------------------------------------
// View models — one per type, mirroring the static pages' frontmatter.
// ---------------------------------------------------------------------------

export interface PrevNextLink {
	href: string;
	title: string;
	thumb: string | null;
}

/** Layout props + JSON-LD every detail page carries. */
export interface DetailHead {
	/** Full <title> for Layout (with the name suffix / not-found label). */
	layoutTitle: string;
	description: string | undefined;
	ogType: "website" | "article";
	/** Absolute OG image URL, or null to omit og:image entirely. */
	ogImage: string | null;
	/** Canonical = the page's own absolute URL (== pageUrl). */
	canonical: string;
	jsonLd: Record<string, unknown> | null;
}

interface DetailViewBase extends DetailHead {
	found: boolean;
	lang: Lang;
	slug: string;
	pageUrl: string;
}

export interface ProjectData {
	title: string;
	description?: string;
	content?: string;
	longDescription?: string;
	tags?: string[];
	techs?: string[];
	publishedAt?: string;
	thumbnail?: string;
	thumbnailType?: "image" | "video";
	thumbnailVideoUrl?: string;
	gallery?: string[];
	videos?: { url: string; title?: string }[];
	client?: string;
	role?: string;
	year?: string;
	status?: string;
	liveUrl?: string;
}

export interface ProjectView extends DetailViewBase {
	type: "projects";
	d: ProjectData | undefined;
	storyBlocks: BodyBlock[];
	showDescriptionFallback: boolean;
	isVideoThumb: boolean;
	videoSrc: string | undefined;
	videoPoster: string | null;
	coverImage: string | null | undefined;
	backHref: string;
	backLabel: string;
	prev: PrevNextLink | null;
	next: PrevNextLink | null;
}

interface Metric {
	value: string;
	label: string;
}

export interface CaseStudyData {
	title: string;
	description?: string;
	content?: string;
	tags?: string[];
	publishedAt?: string;
	thumbnail?: string;
	thumbnailType?: "image" | "video";
	thumbnailVideoUrl?: string;
	problem?: string;
	fix?: string;
	result?: string;
	fixPoints?: string[];
	metrics?: Metric[];
	research?: string;
	techs?: string[];
	projectSlug?: string;
	gallery?: string[];
	videos?: { url: string; title?: string }[];
}

export interface CaseStudyView extends DetailViewBase {
	type: "case-studies";
	d: CaseStudyData | undefined;
	ledeBlocks: BodyBlock[];
	techs: string[];
	isVideoThumb: boolean;
	videoSrc: string | undefined;
	videoPoster: string | null;
	coverImage: string | null | undefined;
	prev: PrevNextLink | null;
	next: PrevNextLink | null;
}

export interface VentureData {
	title?: string;
	description?: string;
	content?: string;
	tags?: string[];
	publishedAt?: string;
	thumbnail?: string;
	thumbnailType?: "image" | "video";
	thumbnailVideoUrl?: string;
	website?: string | null;
	gallery?: string[];
	videos?: Array<{ url: string; title?: string }>;
	stage?: string;
	location?: string;
	teamSize?: string;
	foundedDate?: string;
	metrics?: Metric[];
}

export interface VentureView extends DetailViewBase {
	type: "ventures";
	data: VentureData | undefined;
	title: string;
	description: string | undefined;
	tags: string[];
	website: string | null;
	bodyBlocks: BodyBlock[];
	isVideoThumb: boolean;
	videoSrc: string | undefined;
	videoPoster: string | null;
	coverImage: string | null | undefined;
	prev: PrevNextLink | null;
	next: PrevNextLink | null;
}

export interface ReleaseData {
	title?: string;
	description?: string;
	content?: string;
	releaseType?: string;
	publishedAt?: string;
	youtubeId?: string;
	platforms?: Array<{ name: string; url: string }>;
	tune?: string;
	lyricist?: string;
	lyrics?: string;
	thumbnail?: string;
	thumbnailType?: "image" | "video";
	thumbnailVideoUrl?: string;
	videos?: Array<{ url: string; title?: string }>;
}

export interface ReleaseView extends DetailViewBase {
	type: "releases";
	data: ReleaseData | undefined;
	title: string;
	description: string | undefined;
	platforms: Array<{ name: string; url: string }>;
	youtubeId: string | null;
	hasYouTube: boolean;
	isVideo: boolean;
	coverImage: string | null;
	firstPlatform: { name: string; url: string } | undefined;
	year: string;
	releaseTypeLabel: string;
	prev: PrevNextLink | null;
	next: PrevNextLink | null;
}

export interface PostData {
	title?: string;
	description?: string;
	excerpt?: string;
	content?: string;
	tags?: string[];
	publishedAt?: string;
	thumbnail?: string;
	thumbnailType?: "image" | "video";
	thumbnailVideoUrl?: string;
	readingTime?: number;
	gallery?: string[];
	videos?: Array<{ url: string; title?: string }>;
}

export interface RelatedPost {
	href: string;
	title: string;
	date: string;
	reading: string;
}

export interface PostView extends DetailViewBase {
	type: "posts";
	data: PostData | undefined;
	title: string;
	description: string | undefined;
	readingTime: number | undefined;
	thumb: string | undefined;
	tags: string[];
	isVideoThumb: boolean;
	videoSrc: string | undefined;
	videoPoster: string | null;
	coverImage: string | null | undefined;
	storyBlocks: BodyBlock[];
	related: RelatedPost[];
	prev: PrevNextLink | null;
	next: PrevNextLink | null;
}

export type PreparedDetail =
	| ProjectView
	| CaseStudyView
	| VentureView
	| ReleaseView
	| PostView;

// ---------------------------------------------------------------------------
// Small shared helpers.
// ---------------------------------------------------------------------------

/** A Bangla string field from a merged record's `bn` object (bn only). */
function bnString(
	merged: Record<string, unknown> | undefined,
	lang: Lang,
	key: string,
): string | undefined {
	if (lang !== "bn" || !merged) return undefined;
	const bn = merged["bn"] as Record<string, unknown> | undefined;
	const value = bn?.[key];
	return typeof value === "string" && value ? value : undefined;
}

/** Video-thumbnail derivation, identical on every detail page. */
function videoThumb(data: {
	thumbnailType?: "image" | "video";
	thumbnail?: string;
	thumbnailVideoUrl?: string;
}): {
	isVideoThumb: boolean;
	videoSrc: string | undefined;
	videoPoster: string | null;
	coverImage: string | null | undefined;
} {
	const isVideoThumb = data?.thumbnailType === "video";
	const videoSrc = isVideoThumb
		? (data?.thumbnailVideoUrl ?? data?.thumbnail)
		: undefined;
	const videoPoster =
		isVideoThumb &&
		data?.thumbnailVideoUrl &&
		data?.thumbnail &&
		data.thumbnail !== data.thumbnailVideoUrl &&
		!/\.(mp4|webm|mov|m4v)([?#]|$)/i.test(data.thumbnail)
			? data.thumbnail
			: null;
	const coverImage =
		!isVideoThumb && data?.thumbnail ? data.thumbnail : videoPoster;
	return { isVideoThumb, videoSrc, videoPoster, coverImage };
}

function breadcrumb(
	t: Dict,
	archiveLabel: string,
	archiveUrl: string,
	title: string,
	pageUrl: string,
	baseUrl: string,
) {
	return {
		"@type": "BreadcrumbList",
		itemListElement: [
			{ "@type": "ListItem", position: 1, name: t.homeName, item: baseUrl },
			{
				"@type": "ListItem",
				position: 2,
				name: archiveLabel,
				item: archiveUrl,
			},
			{ "@type": "ListItem", position: 3, name: title, item: pageUrl },
		],
	};
}

/** Prev/next link pair from a date-ordered (newest first) list. */
function prevNext<T extends { data: { slug: string } }>(
	list: T[],
	slug: string,
	type: DetailType,
	lang: Lang,
	thumbOf: (item: T | undefined) => string | null,
): { prev: PrevNextLink | null; next: PrevNextLink | null } {
	const idx = list.findIndex((item) => item.data.slug === slug);
	const prev = idx >= 0 ? list[idx + 1] : undefined;
	const next = idx > 0 ? list[idx - 1] : undefined;
	const toLink = (item: T | undefined): PrevNextLink | null =>
		item
			? {
					href: langUrl(`/${type}/${item.data.slug}`, lang),
					title: (item.data as { title?: string }).title ?? "",
					thumb: thumbOf(item),
				}
			: null;
	return { prev: toLink(prev), next: toLink(next) };
}

function thumbOfItem(item: { data: { thumbnailType?: string; thumbnail?: string } } | undefined): string | null {
	return item?.data.thumbnailType !== "video" && item?.data.thumbnail
		? item.data.thumbnail
		: null;
}

// ---------------------------------------------------------------------------
// Per-type preparation. Each mirrors its static page's frontmatter with
// buildEntry / Content removed (live-only) — same fields, same order,
// same fallbacks, same JSON-LD.
// ---------------------------------------------------------------------------

async function prepareProject(
	liveData: Record<string, unknown> | undefined,
	lang: Lang,
	slug: string,
	fromParam: string | null,
	t: Dict,
	baseUrl: string,
): Promise<ProjectView> {
	const merged = liveData as unknown as
		| (ProjectData & Record<string, unknown>)
		| undefined;
	const d = merged
		? (localizeData(
				merged as unknown as Record<string, unknown>,
				lang,
			) as unknown as ProjectData)
		: undefined;
	// A Bangla story (bn.longDescription / bn.content) wins over the
	// English body — the visitor is on the Bangla page.
	const bnStory =
		bnString(merged as Record<string, unknown> | undefined, lang, "longDescription") ??
		bnString(merged as Record<string, unknown> | undefined, lang, "content");
	// Full story, in priority order: the Bangla story when it exists,
	// then the backend's longDescription, then the live content string,
	// then the short description (never an invented story).
	const storyBlocks = bnStory
		? parseBodyBlocks(bnStory)
		: d?.longDescription
			? parseBodyBlocks(d.longDescription)
			: d?.content
				? parseBodyBlocks(d.content)
				: [];
	const showDescriptionFallback =
		!bnStory && storyBlocks.length === 0 && Boolean(d?.description);

	// Back link returns to origin: a visitor who arrived from a case
	// study ("View the project") goes back to that case study.
	const fromCaseStudy =
		fromParam?.startsWith("case-study:") === true
			? fromParam.slice("case-study:".length)
			: null;
	const backHref = fromCaseStudy
		? langUrl(`/case-studies/${fromCaseStudy}`, lang)
		: langUrl("/projects", lang);
	const backLabel = fromCaseStudy ? t.backCaseStudy : t.backAllProjects;

	const { isVideoThumb, videoSrc, videoPoster, coverImage } = videoThumb(
		d ?? {},
	);

	// Prev/next by date order (newest first): prev = older, next = newer.
	const allProjectsRaw = await getProjects();
	const allProjects = allProjectsRaw.map((p) => ({
		...p,
		data: localizeData(p.data, lang),
	}));
	const { prev, next } = prevNext(
		allProjects,
		slug,
		"projects",
		lang,
		thumbOfItem,
	);

	const pageUrl = `${baseUrl}${lang === "bn" ? "/bn" : ""}/projects/${slug}`;
	const jsonLd = d
		? {
				"@context": "https://schema.org",
				"@graph": [
					{
						"@type": "SoftwareApplication",
						name: d.title,
						description: d.description,
						inLanguage: lang,
						applicationCategory: "BusinessApplication",
						url: pageUrl,
						...(coverImage ? { image: absUrl(optimizedImageUrl(coverImage, 1200), baseUrl) } : {}),
						author: {
							"@type": "Person",
							name: "Mahmudul Hasan Riaz",
							url: baseUrl,
						},
						...(d.publishedAt ? { datePublished: d.publishedAt } : {}),
					},
					breadcrumb(
						t,
						t.allProjects,
						`${baseUrl}${lang === "bn" ? "/bn" : ""}/projects`,
						d.title,
						pageUrl,
					baseUrl,
					),
				],
			}
		: null;

	return {
		type: "projects",
		found: Boolean(d),
		lang,
		slug,
		pageUrl,
		layoutTitle: d
			? `${d.title} — Mahmudul Hasan Riaz`
			: `${t.notFoundProject} — Mahmudul Hasan Riaz`,
		description: d?.description,
		ogType: "website",
		ogImage: coverImage ? (absUrl(optimizedImageUrl(coverImage, 1200), baseUrl) ?? null) : null,
		canonical: pageUrl,
		jsonLd,
		d,
		storyBlocks,
		showDescriptionFallback,
		isVideoThumb,
		videoSrc,
		videoPoster,
		coverImage,
		backHref,
		backLabel,
		prev,
		next,
	};
}

async function prepareCaseStudy(
	liveData: Record<string, unknown> | undefined,
	lang: Lang,
	slug: string,
	t: Dict,
	baseUrl: string,
): Promise<CaseStudyView> {
	const merged = liveData as unknown as
		| (CaseStudyData & Record<string, unknown>)
		| undefined;
	const d = merged
		? (localizeCaseStudy(
				merged as unknown as Record<string, unknown>,
				lang,
			) as unknown as CaseStudyData)
		: undefined;
	// A Bangla body (bn.content) wins over the English body.
	const bnContent = bnString(
		merged as Record<string, unknown> | undefined,
		lang,
		"content",
	);
	// The story body, rendered ONCE: the Bangla content when present,
	// else the live content string. Any paragraph that merely restates
	// the Problem / Fix / Result fields is dropped, so each section
	// appears exactly once. What survives is the hook lede.
	const rawBody = bnContent ?? d?.content ?? "";
	const ledeBlocks = dedupeBlocks(parseBodyBlocks(rawBody), [
		d?.problem,
		d?.fix,
		d?.result,
		d?.description,
	]);

	// "Built with" techs: the case study's own list when present, else
	// the linked project's stack (real data, never invented).
	let techs = d?.techs ?? [];
	if (techs.length === 0 && d?.projectSlug) {
		const projects = await getProjects();
		const linked = projects.find((p) => p.data.slug === d.projectSlug);
		if (linked?.data.techs?.length) techs = linked.data.techs;
	}

	const { isVideoThumb, videoSrc, videoPoster, coverImage } = videoThumb(
		d ?? {},
	);

	const allStudiesRaw = await getCaseStudies();
	const allStudies = allStudiesRaw.map((s) => ({
		...s,
		data: localizeCaseStudy(s.data, lang),
	}));
	const { prev, next } = prevNext(
		allStudies,
		slug,
		"case-studies",
		lang,
		thumbOfItem,
	);

	const pageUrl = `${baseUrl}${lang === "bn" ? "/bn" : ""}/case-studies/${slug}`;
	const jsonLd = d
		? {
				"@context": "https://schema.org",
				"@graph": [
					{
						"@type": "Article",
						headline: d.title,
						description: d.description,
						inLanguage: lang,
						author: {
							"@type": "Person",
							name: "Mahmudul Hasan Riaz",
							url: baseUrl,
						},
						mainEntityOfPage: pageUrl,
						...(coverImage ? { image: absUrl(optimizedImageUrl(coverImage, 1200), baseUrl) } : {}),
					},
					breadcrumb(
						t,
						t.allCaseStudies,
						`${baseUrl}${lang === "bn" ? "/bn" : ""}/case-studies`,
						d.title,
						pageUrl,
					baseUrl,
					),
				],
			}
		: null;

	return {
		type: "case-studies",
		found: Boolean(d),
		lang,
		slug,
		pageUrl,
		layoutTitle: d
			? `${d.title} — Mahmudul Hasan Riaz`
			: `${t.notFoundCaseStudy} — Mahmudul Hasan Riaz`,
		description: d?.description,
		ogType: "article",
		ogImage: coverImage ? (absUrl(optimizedImageUrl(coverImage, 1200), baseUrl) ?? null) : null,
		canonical: pageUrl,
		jsonLd,
		d,
		ledeBlocks,
		techs,
		isVideoThumb,
		videoSrc,
		videoPoster,
		coverImage,
		prev,
		next,
	};
}

async function prepareVenture(
	liveData: Record<string, unknown> | undefined,
	lang: Lang,
	slug: string,
	t: Dict,
	baseUrl: string,
): Promise<VentureView> {
	const merged = liveData as unknown as
		| (VentureData & Record<string, unknown>)
		| undefined;
	const data = merged
		? (localizeData(
				merged as unknown as Record<string, unknown>,
				lang,
			) as unknown as VentureData)
		: undefined;
	// A Bangla body (bn.content) wins over the English body.
	const bnContent = bnString(
		merged as Record<string, unknown> | undefined,
		lang,
		"content",
	);
	// The body is the long description — never the one-liner repeated:
	// any paragraph that restates the description is dropped.
	const rawBody = bnContent ?? data?.content ?? "";
	const bodyBlocks = dedupeBlocks(parseBodyBlocks(rawBody), [
		data?.description,
	]);

	const venturesRaw = await getVentures();
	const ventures = venturesRaw.map((v) => ({
		...v,
		data: localizeData(v.data, lang),
	}));
	const idx = ventures.findIndex((v) => v.data.slug === slug);
	const prevItem = idx > 0 ? ventures[idx - 1] : undefined;
	const nextItem =
		idx >= 0 && idx < ventures.length - 1 ? ventures[idx + 1] : undefined;
	const toLink = (
		v: (typeof ventures)[number] | undefined,
	): PrevNextLink | null =>
		v
			? {
					href: langUrl(`/ventures/${v.data.slug}`, lang),
					title: v.data.title ?? "",
					thumb: thumbOfItem(v),
				}
			: null;
	const prev = toLink(prevItem);
	const next = toLink(nextItem);

	const title = data?.title ?? t.notFoundVenture;
	const description = data?.description;
	const tags = data?.tags ?? [];
	const website = isRealUrl(data?.website) ? (data.website as string) : null;

	const { isVideoThumb, videoSrc, videoPoster, coverImage } = videoThumb(
		data ?? {},
	);

	const pageUrl = `${baseUrl}${lang === "bn" ? "/bn" : ""}/ventures/${slug}`;
	const jsonLd = data
		? {
				"@context": "https://schema.org",
				"@graph": [
					{
						"@type": "Organization",
						name: title,
						...(description ? { description } : {}),
						inLanguage: lang,
						...(website ? { url: website } : {}),
						founder: { "@type": "Person", name: PROFILE.name },
					},
					breadcrumb(
						t,
						t.allVentures,
						`${baseUrl}${lang === "bn" ? "/bn" : ""}/ventures`,
						title,
						pageUrl,
					baseUrl,
					),
				],
			}
		: null;

	return {
		type: "ventures",
		found: Boolean(data),
		lang,
		slug,
		pageUrl,
		layoutTitle: `${title} — Mahmudul Hasan Riaz`,
		description,
		ogType: "website",
		ogImage: coverImage ? (absUrl(optimizedImageUrl(coverImage, 1200), baseUrl) ?? null) : null,
		canonical: pageUrl,
		jsonLd,
		data,
		title,
		tags,
		website,
		bodyBlocks,
		isVideoThumb,
		videoSrc,
		videoPoster,
		coverImage,
		prev,
		next,
	};
}

async function prepareRelease(
	liveData: Record<string, unknown> | undefined,
	lang: Lang,
	slug: string,
	t: Dict,
	baseUrl: string,
): Promise<ReleaseView> {
	const merged = liveData as unknown as
		| (ReleaseData & Record<string, unknown>)
		| undefined;
	const data = merged
		? (localizeData(
				merged as unknown as Record<string, unknown>,
				lang,
			) as unknown as ReleaseData)
		: undefined;

	const releasesRaw = await getReleases();
	const releases = releasesRaw.map((r) => ({
		...r,
		data: localizeData(r.data, lang),
	}));
	const idx = releases.findIndex((r) => r.data.slug === slug);
	const prevItem = idx > 0 ? releases[idx - 1] : undefined;
	const nextItem =
		idx >= 0 && idx < releases.length - 1 ? releases[idx + 1] : undefined;
	const thumbOfRelease = (
		r: (typeof releases)[number] | undefined,
	): string | null => (r?.data.youtubeId ? youtubeThumb(r.data.youtubeId) : null);
	const toLink = (
		r: (typeof releases)[number] | undefined,
	): PrevNextLink | null =>
		r
			? {
					href: langUrl(`/releases/${r.data.slug}`, lang),
					title: r.data.title ?? "",
					thumb: thumbOfRelease(r),
				}
			: null;
	const prev = toLink(prevItem);
	const next = toLink(nextItem);

	const title = data?.title ?? t.notFoundRelease;
	// Real description only — never the generic "A release by…" fallback.
	const description = data?.description?.trim()
		? data.description
		: data?.content?.trim()
			? data.content
			: undefined;
	const platforms = data?.platforms ?? [];
	const youtubeId =
		data?.youtubeId ??
		youtubeIdFromUrl(
			platforms.find((p) => p.name === "YouTube")?.url,
		);
	const hasYouTube =
		Boolean(youtubeId) || platforms.some((p) => p.name === "YouTube");
	const isVideo = Boolean(youtubeId) && hasYouTube;
	const coverImage = isVideo
		? youtubeThumb(youtubeId)
		: data?.thumbnail
			? (absUrl(data.thumbnail, baseUrl) ?? null)
			: null;
	const firstPlatform = platforms[0];
	const year = yearOf(data?.publishedAt);

	const releaseTypeLabel = (() => {
		const key = (data?.releaseType ?? "").toLowerCase();
		if (key === "nasheed") return t.releaseTypeNasheed;
		if (key === "tilawat") return t.releaseTypeTilawat;
		if (key === "podcast") return t.releaseTypePodcast;
		if (key === "lecture") return t.releaseTypeLecture;
		if (key === "other") return t.releaseTypeOther;
		return data?.releaseType ?? "";
	})();

	const pageUrl = `${baseUrl}${lang === "bn" ? "/bn" : ""}/releases/${slug}`;
	const jsonLd = data
		? {
				"@context": "https://schema.org",
				"@graph": [
					isVideo && youtubeId
						? {
								"@type": "VideoObject",
								name: title,
								...(description ? { description } : {}),
								inLanguage: lang,
								thumbnailUrl: youtubeThumb(youtubeId),
								...(data.publishedAt
									? { uploadDate: data.publishedAt }
									: {}),
								embedUrl: youtubeEmbed(youtubeId),
							}
						: {
								"@type": "AudioObject",
								name: title,
								...(description ? { description } : {}),
								inLanguage: lang,
								...(data.publishedAt
									? { datePublished: data.publishedAt }
									: {}),
								...(firstPlatform
									? { contentUrl: firstPlatform.url }
									: {}),
								...(coverImage
								? { thumbnailUrl: absUrl(optimizedImageUrl(coverImage, 1200), baseUrl) }
								: {}),
							},
					breadcrumb(
						t,
						t.allReleases,
						`${baseUrl}${lang === "bn" ? "/bn" : ""}/releases`,
						title,
						pageUrl,
					baseUrl,
					),
				],
			}
		: null;

	return {
		type: "releases",
		found: Boolean(data),
		lang,
		slug,
		pageUrl,
		layoutTitle: `${title} — Mahmudul Hasan Riaz`,
		description,
		ogType: "website",
		ogImage: coverImage
			? (absUrl(optimizedImageUrl(coverImage, 1200), baseUrl) ?? null)
			: null,
		canonical: pageUrl,
		jsonLd,
		data,
		title,
		platforms,
		youtubeId,
		hasYouTube,
		isVideo,
		coverImage,
		firstPlatform,
		year,
		releaseTypeLabel,
		prev,
		next,
	};
}

async function preparePost(
	liveData: Record<string, unknown> | undefined,
	lang: Lang,
	slug: string,
	t: Dict,
	baseUrl: string,
): Promise<PostView> {
	const merged = liveData as unknown as
		| (PostData & Record<string, unknown>)
		| undefined;
	const data = merged
		? (localizeData(
				merged as unknown as Record<string, unknown>,
				lang,
			) as unknown as PostData)
		: undefined;
	// A Bangla body (bn.content) wins over the English body.
	const bnContent = bnString(
		merged as Record<string, unknown> | undefined,
		lang,
		"content",
	);
	// Live entries carry the body as a plain `content` string — parsed
	// into content blocks so '## ' lines become real <h2> headings
	// instead of rendering literally as markdown text.
	const storyBlocks = bnContent
		? parseBodyBlocks(bnContent)
		: data?.content
			? parseBodyBlocks(data.content)
			: [];

	const postsRaw = await getPosts();
	const posts = postsRaw.map((p) => ({
		...p,
		data: localizeData(p.data, lang),
	}));
	const idx = posts.findIndex((p) => p.data.slug === slug);
	const prevItem = idx > 0 ? posts[idx - 1] : undefined;
	const nextItem =
		idx >= 0 && idx < posts.length - 1 ? posts[idx + 1] : undefined;
	const toLink = (
		p: (typeof posts)[number] | undefined,
	): PrevNextLink | null =>
		p
			? {
					href: langUrl(`/posts/${p.data.slug}`, lang),
					title: p.data.title ?? "",
					thumb: thumbOfItem(p),
				}
			: null;
	const prev = toLink(prevItem);
	const next = toLink(nextItem);
	// Related posts: the three newest others. A live neighbour has no
	// build-time `.body`, so its reading time falls back to its live
	// `content` string.
	const related: RelatedPost[] = posts
		.filter((p) => p.data.slug !== slug)
		.slice(0, 3)
		.map((r) => {
			const body =
				(r as unknown as { body?: string }).body ??
				(r.data as { content?: string }).content;
			const rt =
				r.data.readingTime ?? readingTimeFromText(body) ?? undefined;
			return {
				href: langUrl(`/posts/${r.data.slug}`, lang),
				title: r.data.title ?? "",
				date: formatDate(r.data.publishedAt, lang),
				reading: rt ? readingTimeLabel(rt, lang) : "",
			};
		});

	const title = data?.title ?? t.notFoundPost;
	const description = data?.excerpt ?? data?.description;
	const readingTime =
		data?.readingTime ?? readingTimeFromText(data?.content) ?? undefined;
	const thumb = data?.thumbnail;
	const tags = data?.tags ?? [];

	const { isVideoThumb, videoSrc, videoPoster, coverImage } = videoThumb(
		data ?? {},
	);

	const pageUrl = `${baseUrl}${lang === "bn" ? "/bn" : ""}/posts/${slug}`;
	const jsonLd = data
		? {
				"@context": "https://schema.org",
				"@graph": [
					{
						"@type": "BlogPosting",
						headline: title,
						...(description ? { description } : {}),
						inLanguage: lang,
						author: {
							"@type": "Person",
							name: PROFILE.name,
							url: baseUrl,
						},
						...(data.publishedAt
							? { datePublished: data.publishedAt }
							: {}),
						...(coverImage ? { image: absUrl(optimizedImageUrl(coverImage, 1200), baseUrl) } : {}),
						mainEntityOfPage: pageUrl,
					},
					breadcrumb(
						t,
						t.allPosts,
						`${baseUrl}${lang === "bn" ? "/bn" : ""}/posts`,
						title,
						pageUrl,
					baseUrl,
					),
				],
			}
		: null;

	return {
		type: "posts",
		found: Boolean(data),
		lang,
		slug,
		pageUrl,
		layoutTitle: `${title} — Mahmudul Hasan Riaz`,
		description,
		ogType: "article",
		ogImage: coverImage ? (absUrl(optimizedImageUrl(coverImage, 1200), baseUrl) ?? null) : null,
		canonical: pageUrl,
		jsonLd,
		data,
		title,
		readingTime,
		thumb,
		tags,
		isVideoThumb,
		videoSrc,
		videoPoster,
		coverImage,
		storyBlocks,
		related,
		prev,
		next,
	};
}

/**
 * Build the view model for a twin detail page. `liveData` is the live
 * row's data (undefined when the API has no such slug — the view then
 * renders the type's not-found section with a 404 status).
 */
export async function prepareDetail(
	type: DetailType,
	liveData: Record<string, unknown> | undefined,
	lang: Lang,
	slug: string,
	fromParam: string | null,
	t: Dict,
	// Resolved canonical base (admin site_url via resolveCanonicalBase(),
	// request host, then SITE_URL fallback) — threaded from the route, which already
	// fetched the settings once; never fetched again here.
	baseUrl: string = SITE_URL,
): Promise<PreparedDetail> {
	switch (type) {
		case "projects":
			return prepareProject(liveData, lang, slug, fromParam, t, baseUrl);
		case "case-studies":
			return prepareCaseStudy(liveData, lang, slug, t, baseUrl);
		case "ventures":
			return prepareVenture(liveData, lang, slug, t, baseUrl);
		case "releases":
			return prepareRelease(liveData, lang, slug, t, baseUrl);
		case "posts":
			return preparePost(liveData, lang, slug, t, baseUrl);
	}
}
