// Live collections — opt-in, NOT automatic.
// These only resolve at request time (on-demand routes) via the loader in
// src/loaders/public-content.ts. Static builds never call them.
// Schemas mirror src/content.config.ts so live entries carry the same
// fields (gallery, videos, platforms, credits) when the API exists.
import { defineLiveCollection } from "astro:content";
import { z } from "astro/zod";
import {
	createPublicContentLoader,
	type PublicContentType,
} from "./loaders/public-content";

// The loader's PublicContentType union is owned by T0 (parallel work
// on src/loaders/public-content.ts); until it gains "platforms" |
// "technologies" | "clients", bridge with a cast. The loader is
// runtime-generic — `type` is only interpolated into the API URL — so
// the cast changes no runtime behaviour. Remove liveType once the
// union covers the new types.
const liveType = (type: string): PublicContentType =>
	type as unknown as PublicContentType;

const platformSchema = z.object({
	name: z.string(),
	url: z.string(),
});

const videoSchema = z.object({
	url: z.string(),
	title: z.string().optional(),
});

// Optional metric card (case studies, ventures): a real measured
// figure + its label. Zod strips unknown live fields, so these must be
// declared here or the backend's new fields never reach the page.
const metricSchema = z.object({
	value: z.string(),
	label: z.string(),
});

const baseSchema = z.object({
	title: z.string(),
	slug: z.string(),
	description: z.string().optional(),
	content: z.string().optional(),
	tags: z.array(z.string()).default([]),
	publishedAt: z.string().optional(),
	updatedAt: z.string().optional(),
	thumbnail: z.string().optional(),
	thumbnailType: z.enum(["image", "video"]).optional(),
	// Silent card-preview playback for a video thumbnail. Absent =
	// autoplay (muted loop); false = show first frame only. The API
	// may send this as `autoplay` — the loader normalizes it here.
	thumbnailAutoplay: z.boolean().optional(),
	// Optional Bangla variant from the API (same field names as the
	// English top level). Zod strips undeclared live fields, so this
	// must be declared here or live `bn` never reaches the page.
	bn: z.record(z.string(), z.unknown()).optional(),
});

const livePosts = defineLiveCollection({
	loader: createPublicContentLoader("posts"),
	schema: baseSchema.extend({
		excerpt: z.string().optional(),
		readingTime: z.number().optional(),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
		thumbnailVideoUrl: z.string().optional(),
	}),
});

const liveProjects = defineLiveCollection({
	loader: createPublicContentLoader("projects"),
	schema: baseSchema.extend({
		techs: z.array(z.string()).default([]),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
		featured: z.boolean().optional(),
		longDescription: z.string().optional(),
		client: z.string().optional(),
		role: z.string().optional(),
		year: z.string().optional(),
		status: z.string().optional(),
		liveUrl: z.string().optional(),
		thumbnailVideoUrl: z.string().optional(),
	}),
});

const liveCaseStudies = defineLiveCollection({
	loader: createPublicContentLoader("case-studies"),
	schema: baseSchema.extend({
		problem: z.string().optional(),
		fix: z.string().optional(),
		result: z.string().optional(),
		fixPoints: z.array(z.string()).default([]),
		metrics: z.array(metricSchema).default([]),
		research: z.string().optional(),
		techs: z.array(z.string()).default([]),
		projectSlug: z.string().optional(),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
		thumbnailVideoUrl: z.string().optional(),
	}),
});

const liveVentures = defineLiveCollection({
	loader: createPublicContentLoader("ventures"),
	schema: baseSchema.extend({
		website: z.string().nullable().optional(),
		gallery: z.array(z.string()).default([]),
		videos: z.array(videoSchema).default([]),
		stage: z.string().optional(),
		location: z.string().optional(),
		teamSize: z.string().optional(),
		foundedDate: z.string().optional(),
		foundedYear: z.number().optional(),
		metrics: z.array(metricSchema).default([]),
		thumbnailVideoUrl: z.string().optional(),
	}),
});

const liveReleases = defineLiveCollection({
	loader: createPublicContentLoader("releases"),
	schema: baseSchema.extend({
		// nasheed | tilawat | podcast | lecture | other
		releaseType: z.string().optional(),
		platforms: z.array(platformSchema).default([]),
		youtubeId: z.string().optional(),
		tune: z.string().optional(),
		lyricist: z.string().optional(),
		lyrics: z.string().optional(),
		videos: z.array(videoSchema).default([]),
		thumbnailVideoUrl: z.string().optional(),
	}),
});

const liveServices = defineLiveCollection({
	loader: createPublicContentLoader("services"),
	schema: baseSchema.extend({
		summary: z.string().optional(),
		icon: z.string().optional(),
		priceRange: z.string().optional(),
		thumbnailVideoUrl: z.string().optional(),
		featured: z.boolean().optional(),
		sortOrder: z.number().optional(),
	}),
});

// Platforms / technologies / clients are NOT content collections —
// their build-time rows live in src/data/site.ts (like SERVICES) and
// the live rows come from the Public Content API (`platforms` /
// `technologies` / `clients` types, dashboard side). Both snake_case
// and camelCase variants are declared: zod strips undeclared live
// fields, so a naming choice on the dashboard side must never
// silently drop a row. `meta` is the same safety net — if the API
// nests type-specific fields there, the merge in lib/content.ts reads
// them from it.
const livePlatforms = defineLiveCollection({
	loader: createPublicContentLoader(liveType("platforms")),
	schema: baseSchema.extend({
		url: z.string().optional(),
		website: z.string().optional(),
		handle: z.string().optional(),
		icon: z.string().nullable().optional(),
		group: z.string().optional(),
		note: z.string().optional(),
		subtitle: z.string().optional(),
		is_primary: z.boolean().optional(),
		isPrimary: z.boolean().optional(),
		sort_order: z.number().optional(),
		sortOrder: z.number().optional(),
		meta: z.record(z.string(), z.unknown()).optional(),
	}),
});

const liveTechnologies = defineLiveCollection({
	loader: createPublicContentLoader(liveType("technologies")),
	schema: baseSchema.extend({
		category: z.string().optional(),
		icon: z.string().nullable().optional(),
		use: z.string().optional(),
		sort_order: z.number().optional(),
		sortOrder: z.number().optional(),
		meta: z.record(z.string(), z.unknown()).optional(),
	}),
});

const liveClients = defineLiveCollection({
	loader: createPublicContentLoader(liveType("clients")),
	schema: baseSchema.extend({
		logo_url: z.string().optional(),
		logoUrl: z.string().optional(),
		logo: z.string().optional(),
		website: z.string().optional(),
		url: z.string().optional(),
		sort_order: z.number().optional(),
		sortOrder: z.number().optional(),
		meta: z.record(z.string(), z.unknown()).optional(),
	}),
});

export const collections = { livePosts, liveProjects, liveCaseStudies, liveVentures, liveReleases, liveServices, livePlatforms, liveTechnologies, liveClients };
