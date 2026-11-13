// Build-time collections.
// These are the static counterparts of the live collections: at build time
// Astro pulls the same DB content (via the Public Content API) and bakes it
// into static HTML. The local src/content/* directories hold the real,
// verified content rows (the same rows seeded in the Portfolio-V2 DB) so
// the build ships real content — never dummy/preview rows. The dummy
// rows (StyleNest, PharmaTrack, HisabKit, CloudDesk, SkillBridge) were
// deleted (fix plan §1a); the surviving files are only the outage
// fallback for when the live API is unreachable at build time (the
// authoritative merge in src/lib/content.ts drops any static row
// absent from the live published set whenever the API is reachable).
import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const platformSchema = z.object({
	name: z.string(),
	url: z.string(),
});

const videoSchema = z.object({
	url: z.string(),
	title: z.string().optional(),
});

// Optional metric card (case studies, ventures): a real measured
// figure + its label. Never invented — omitted when the backend has none.
const metricSchema = z.object({
	value: z.string(),
	label: z.string(),
});

const baseSchema = z.object({
	title: z.string(),
	slug: z.string(),
	description: z.string().optional(),
	tags: z.array(z.string()).default([]),
	publishedAt: z.string().optional(),
	updatedAt: z.string().optional(),
	// Thumbnail: image URL, or a video URL when thumbnailType is "video".
	thumbnail: z.string().optional(),
	thumbnailType: z.enum(["image", "video"]).optional(),
	// Silent card-preview playback for a video thumbnail. Absent =
	// autoplay (muted loop); false = show first frame only.
	thumbnailAutoplay: z.boolean().optional(),
	// Optional Bangla variant: same field names as the English top
	// level (title, description, content, lyrics, ...). On /bn/ pages
	// a present, non-empty Bangla field wins; English is the fallback
	// (lib/i18n.ts localizeData) — a page never renders a blank.
	bn: z.record(z.string(), z.unknown()).optional(),
});

export const collections = {
	posts: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/posts" }),
		schema: baseSchema.extend({
			excerpt: z.string().optional(),
			readingTime: z.number().optional(),
			gallery: z.array(z.string()).default([]),
			videos: z.array(videoSchema).default([]),
			thumbnailVideoUrl: z.string().optional(),
		}),
	}),
	projects: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
		schema: baseSchema.extend({
			techs: z.array(z.string()).default([]),
			gallery: z.array(z.string()).default([]),
			videos: z.array(videoSchema).default([]),
			featured: z.boolean().optional(),
			// Full story, when the backend carries one (live entries).
			longDescription: z.string().optional(),
			client: z.string().optional(),
			role: z.string().optional(),
			year: z.string().optional(),
			status: z.string().optional(),
			liveUrl: z.string().optional(),
			thumbnailVideoUrl: z.string().optional(),
		}),
	}),
	caseStudies: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/case-studies" }),
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
	}),
	ventures: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/ventures" }),
		schema: baseSchema.extend({
			website: z.string().nullable().optional(),
			gallery: z.array(z.string()).default([]),
			videos: z.array(videoSchema).default([]),
			stage: z.string().optional(),
			location: z.string().optional(),
			teamSize: z.string().optional(),
			foundedDate: z.string().optional(),
			metrics: z.array(metricSchema).default([]),
			thumbnailVideoUrl: z.string().optional(),
		}),
	}),
	releases: defineCollection({
		loader: glob({ pattern: "**/*.md", base: "./src/content/releases" }),
		schema: baseSchema.extend({
			releaseType: z.string().optional(),
			platforms: z.array(platformSchema).default([]),
			youtubeId: z.string().optional(),
			tune: z.string().optional(),
			lyricist: z.string().optional(),
			lyrics: z.string().optional(),
			videos: z.array(videoSchema).default([]),
			thumbnailVideoUrl: z.string().optional(),
		}),
	}),
};
