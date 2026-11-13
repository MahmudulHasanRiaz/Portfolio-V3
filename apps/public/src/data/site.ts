// Site data — real, verified facts about Mahmudul Hasan Riaz.
// This is the data layer for identity-level content (profile, stats,
// services, stack, platforms, clients, footer). Item content (projects,
// posts, releases, case studies, ventures) lives in src/content/.
// Nothing here is invented: every value is an established fact from the
// project record. When the Public Content API exists, this data flows
// from the DB instead; until then these verified facts are the source.

export interface Platform {
	name: string;
	handle?: string;
	url: string;
	/** Simple Icons slug, "wikimedia:<url>" for a real Wikimedia logo, or null for a plain chip. */
	icon: string | null;
	group: "music" | "social" | "professional";
	note?: string;
	/** Descriptive subtitle shown on the All platforms card (preview copy). */
	subtitle?: string;
	/** Live flags from the Public Content API (`platforms` type):
	 * footer primaries + ordering. Absent on build-time rows — the
	 * footer falls back to the seed five, matched by URL. */
	is_primary?: boolean;
	sort_order?: number;
	/** Optional Bangla variant from the API (same field names as the
	 * English top level, title → name). Rendered when lang is bn. */
	bn?: {
		title?: string;
		name?: string;
		subtitle?: string;
		handle?: string;
		note?: string;
	};
}

export const PROFILE = {
	name: "Mahmudul Hasan Riaz",
	/** Bangla display name — shown wherever the name is DISPLAYED on
	 * /bn/ pages (hero h1, footer identity, author bylines), via
	 * displayName() in lib/i18n.ts. Structured data (JSON-LD, og,
	 * canonical, <title>) keeps the Latin `name` above. */
	nameBn: "মাহমুদুল হাসান রিয়াজ",
	location: "Dhaka, Bangladesh",
	email: "hello@riaz.com.bd",
	designations: [
		"Software Engineer",
		"Entrepreneur",
		"Nasheed Artist",
		"Hafiz-Alem",
		"Public Figure",
	] as const,
	heroHeadline: "I build products people rely on every day.",
	heroDescription:
		"ERP, e-commerce and SaaS systems for businesses in Bangladesh and beyond — designed to hold up at real-world scale.",
	knowMeHeadline:
		"Software engineer, entrepreneur and nasheed artist — one person, five callings.",
	knowMeSub:
		"Mahmudul Hasan Riaz — a Hafiz-Alem who builds ERP and e-commerce software, founded three ventures, and shares nasheed, tilawat and lectures with listeners around the world.",
	photo: "/speaker.jpg",
	photoAlt: "Mahmudul Hasan Riaz speaking at a podium",
} as const;

export const STATS = [
	{ value: "4+", label: "Years Experience" },
	{ value: "80+", label: "Projects" },
	{ value: "20+", label: "Clients" },
	{ value: "10+", label: "Releases" },
] as const;

export interface Service {
	name: string;
	slug: string;
	description: string;
	/** Simple Icons slug for the service icon, or null for a Lucide icon name. */
	icon: string | null;
	/** Lucide icon name when icon is null. */
	lucide?: string;
	/** Optional Bangla variant from the API (same field names as the
	 * English top level). Rendered when lang is bn. */
	bn?: { title?: string; summary?: string; description?: string };
}

export const SERVICES: Service[] = [
	{
		name: "ERP/CRM Development",
		slug: "erp-crm-development",
		description:
			"Custom ERP and CRM systems that run the whole business — orders, inventory, accounts, payroll and teams.",
		icon: null,
		lucide: "Database",
	},
	{
		name: "Custom Website Development",
		slug: "custom-website-development",
		description:
			"Fast, reliable websites and web apps built with modern stacks — Next.js, React and TypeScript.",
		icon: null,
		lucide: "Code",
	},
	{
		name: "Ecommerce Consultancy",
		slug: "ecommerce-consultancy",
		description:
			"E-commerce systems and strategy for Bangladeshi businesses — stores, payments, delivery and fraud control.",
		icon: null,
		lucide: "TrendingUp",
	},
	{
		name: "WordPress Website and Theme/Plugin Development",
		slug: "wordpress-development",
		description:
			"WordPress sites, themes and plugins — including WooCommerce tools for Bangladeshi stores.",
		icon: "wordpress",
	},
	{
		name: "Shopify Development",
		slug: "shopify-development",
		description:
			"Shopify stores and custom development for brands that sell online.",
		icon: "shopify",
	},
];

export type StackCategory =
	| "Frontend"
	| "Backend"
	| "Database"
	| "Cloud & Tools"
	| "CMS & E-commerce"
	| "Concepts"
	| "Auth";

export interface StackTech {
	name: string;
	category: StackCategory;
	/** Simple Icons slug, "woocommerce-w" for the new WooCommerce W mark, or null for a plain name chip (no logo exists). */
	icon: string | null;
	/** Use, ONLY where he stated one in his own words. Never invent. */
	use?: string;
	/** Optional Bangla variant from the API (title → name, use → use).
	 * `category` is NEVER overlaid — filter state keys stay English. */
	bn?: { title?: string; name?: string; use?: string };
}

export const STACK_CATEGORIES: StackCategory[] = [
	"Frontend",
	"Backend",
	"Database",
	"Cloud & Tools",
	"CMS & E-commerce",
	"Concepts",
	"Auth",
];

export const STACK: StackTech[] = [
	// Frontend
	{ name: "React", category: "Frontend", icon: "react" },
	{ name: "TypeScript", category: "Frontend", icon: "typescript" },
	{ name: "HTML", category: "Frontend", icon: "html5" },
	{ name: "CSS", category: "Frontend", icon: "css" },
	{ name: "Tailwind CSS", category: "Frontend", icon: "tailwindcss" },
	{ name: "Astro", category: "Frontend", icon: "astro" },
	{ name: "TanStack Start", category: "Frontend", icon: "tanstack" },
	{ name: "Vite", category: "Frontend", icon: "vite" },
	{ name: "TanStack", category: "Frontend", icon: "tanstack" },
	// Backend
	{ name: "Next.js", category: "Backend", icon: "nextdotjs" },
	{ name: "Node.js", category: "Backend", icon: "nodedotjs" },
	{ name: "Nest.js", category: "Backend", icon: "nestjs" },
	{ name: "Express.js", category: "Backend", icon: "express" },
	{ name: "Fastify", category: "Backend", icon: "fastify" },
	{ name: "Laravel", category: "Backend", icon: "laravel" },
	{ name: "PHP", category: "Backend", icon: "php", use: "Plugin development" },
	{ name: "Rust", category: "Backend", icon: "rust" },
	{ name: "GraphQL", category: "Backend", icon: "graphql" },
	{ name: "REST APIs", category: "Backend", icon: null },
	// Database
	{ name: "PostgreSQL", category: "Database", icon: "postgresql" },
	{ name: "MySQL", category: "Database", icon: "mysql" },
	{ name: "Prisma", category: "Database", icon: "prisma" },
	{ name: "Drizzle ORM", category: "Database", icon: "drizzle" },
	{ name: "Redis", category: "Database", icon: "redis" },
	// Cloud & Tools
	{ name: "Docker", category: "Cloud & Tools", icon: "docker" },
	{ name: "DigitalOcean", category: "Cloud & Tools", icon: "digitalocean" },
	{ name: "Amazon EC2", category: "Cloud & Tools", icon: null },
	{ name: "VPS Management", category: "Cloud & Tools", icon: null },
	{ name: "BullMQ", category: "Cloud & Tools", icon: null },
	{ name: "S3/R2", category: "Cloud & Tools", icon: null },
	{ name: "Vercel", category: "Cloud & Tools", icon: "vercel" },
	{ name: "Cloudflare", category: "Cloud & Tools", icon: "cloudflare" },
	// CMS & E-commerce
	{ name: "WordPress", category: "CMS & E-commerce", icon: "wordpress" },
	{ name: "WooCommerce", category: "CMS & E-commerce", icon: "woocommerce-w" },
	{ name: "Shopify", category: "CMS & E-commerce", icon: "shopify" },
	// Concepts
	{ name: "System Design", category: "Concepts", icon: null },
	// Auth
	{ name: "Better Auth", category: "Auth", icon: "betterauth" },
	{ name: "Clerk", category: "Auth", icon: "clerk" },
	{ name: "Firebase", category: "Auth", icon: "firebase" },
	{ name: "Supabase", category: "Auth", icon: "supabase" },
	{ name: "OAuth", category: "Auth", icon: null },
	{ name: "Auth0", category: "Auth", icon: "auth0" },
	{ name: "Auth.js", category: "Auth", icon: null },
	{ name: "Passport", category: "Auth", icon: "passport" },
];

// Real official logos that have NO Simple Icons logo (verified 404).
export const WIKIMEDIA_LOGOS = {
	linkedin:
		"https://upload.wikimedia.org/wikipedia/commons/8/81/LinkedIn_icon.svg",
	boomplay:
		"https://upload.wikimedia.org/wikipedia/commons/0/0d/Boomplay_Music_Logo.png",
	jiosaavn:
		"https://upload.wikimedia.org/wikipedia/commons/e/ed/JioSaavn_Logo.svg",
} as const;

// The Boomplay logo ships as a 3240x2742 PNG (131 KiB) on Wikimedia
// but renders at 16–22px. The SAME official logo, resized to 96px
// (5 KiB), lives at /boomplay-logo.png (public/). Render-time
// override — the data keeps the canonical wikimedia: value (and so
// does the live API), and the render layer swaps it for the local
// file. Same pattern as sizedThumb() in the thumbnail components.
export const BOOMPLAY_LOGO_LOCAL = "/boomplay-logo.png";
export const LOCAL_LOGO_OVERRIDES: Record<string, string> = {
	[`wikimedia:${WIKIMEDIA_LOGOS.boomplay}`]: BOOMPLAY_LOGO_LOCAL,
};

// The latest WooCommerce "W" lettermark (2026 update) — first path of the
// official Woo_logo_color.svg, viewBox 0 0 88 47.5. NOT the old Simple Icons icon.
export const WOOCOMMERCE_W_PATH =
	"M77.4,0c-4.3,0-7.1,1.4-9.6,6.1L56.4,27.6V8.5c0-5.7-2.7-8.5-7.7-8.5s-7.1,1.7-9.6,6.5L28.3,27.6V8.7 c0-6.1-2.5-8.7-8.6-8.7H7.3C2.6,0,0,2.2,0,6.2s2.5,6.4,7.1,6.4h5.1v24.1c0,6.8,4.6,10.8,11.2,10.8s9.6-2.6,12.9-8.7l7.2-13.5v11.4 c0,6.7,4.4,10.8,11.1,10.8s9.2-2.3,13-8.7l16.6-28C87.8,4.7,85.3,0,77.3,0C77.3,0,77.3,0,77.4,0z";

export function simpleIconsUrl(slug: string): string {
	return `https://cdn.simpleicons.org/${slug}`;
}

export const PLATFORMS: Platform[] = [
	// Music & Streaming
	{
		name: "YouTube",
		handle: "@MahmudRiazBD",
		url: "https://www.youtube.com/@MahmudRiazBD",
		icon: "youtube",
		group: "music",
		subtitle: "Nasheed channel — @MahmudRiazBD",
	},
	{
		name: "Spotify",
		url: "https://open.spotify.com/artist/6nRAJg1qLQq3hwlWGtyVap",
		icon: "spotify",
		group: "music",
		subtitle: "Artist profile — the nasheed singles",
	},
	{
		name: "Apple Music",
		url: "https://music.apple.com/us/artist/mahmudul-hasan-riaz/1727545988",
		icon: "applemusic",
		group: "music",
		subtitle: "Artist profile — the nasheed singles",
	},
	{
		name: "Deezer",
		url: "https://www.deezer.com/artist/251928172",
		icon: "deezer",
		group: "music",
		subtitle: "Artist profile — the nasheed singles",
	},
	{
		name: "Boomplay",
		url: "https://www.boomplay.com/artists/84197326",
		icon: `wikimedia:${WIKIMEDIA_LOGOS.boomplay}`,
		group: "music",
		subtitle: "Artist profile — the nasheed singles",
		// NOTE: profile match not yet confirmed by the user (handle/photo match,
		// 0 songs visible) — do not show a "please confirm" note on the public page.
	},
	{
		name: "JioSaavn",
		url: "https://www.jiosaavn.com/artist/mahmudul-hasan-riaz-songs/kxedaLEBozo_",
		icon: `wikimedia:${WIKIMEDIA_LOGOS.jiosaavn}`,
		group: "music",
		subtitle: "Artist profile — the nasheed singles",
	},
	{
		name: "SoundCloud",
		url: "https://soundcloud.com/mahmudulhasanriazbd",
		icon: "soundcloud",
		group: "music",
		subtitle: "Artist profile — the nasheed singles",
	},
	// Social Media
	{
		name: "Facebook",
		handle: "MahmudulHasanRiazBD",
		url: "https://www.facebook.com/MahmudulHasanRiazBD",
		icon: "facebook",
		group: "social",
		note: "Personal",
		subtitle: "Personal profile — MahmudulHasanRiazBD",
	},
	{
		name: "Facebook",
		handle: "MahmudulHasanRiaz.Official",
		url: "https://www.facebook.com/MahmudulHasanRiaz.Official",
		icon: "facebook",
		group: "social",
		note: "Professional",
		subtitle: "Professional page — MahmudulHasanRiaz.Official",
	},
	{
		name: "WhatsApp",
		url: "https://wa.me/8801601701567",
		icon: "whatsapp",
		group: "social",
		subtitle: "Direct chat — message him any time",
	},
	{
		name: "Instagram",
		handle: "@mahmudulhasanriazbd",
		url: "https://www.instagram.com/mahmudulhasanriazbd",
		icon: "instagram",
		group: "social",
		subtitle: "Photos and updates — @mahmudulhasanriazbd",
	},
	{
		name: "TikTok",
		handle: "@mahmudulhasanriazbd",
		url: "https://www.tiktok.com/@mahmudulhasanriazbd",
		icon: "tiktok",
		group: "social",
		subtitle: "Short videos — @mahmudulhasanriazbd",
	},
	{
		name: "Threads",
		handle: "@mahmudulhasanriazbd",
		url: "https://www.threads.net/@mahmudulhasanriazbd",
		icon: "threads",
		group: "social",
		subtitle: "Posts and conversation — @mahmudulhasanriazbd",
	},
	{
		name: "Telegram",
		url: "https://t.me/mahmudulhasanriazbd",
		icon: "telegram",
		group: "social",
		subtitle: "Channel — @mahmudulhasanriazbd",
		// NOTE: profile match not yet confirmed by the user (handle matches,
		// no display name/bio on the page) — do not show a "please confirm"
		// note on the public page.
	},
	{
		name: "X",
		handle: "@MahmudRiazBD",
		url: "https://x.com/MahmudRiazBD",
		icon: "x",
		group: "social",
		subtitle: "Updates and posts — @MahmudRiazBD",
	},
	// Professional / Code
	{
		name: "LinkedIn",
		url: "https://www.linkedin.com/in/mahmudulhasanriaz",
		icon: `wikimedia:${WIKIMEDIA_LOGOS.linkedin}`,
		group: "professional",
		subtitle: "Professional profile — in/mahmudulhasanriaz",
	},
	{
		name: "GitHub",
		url: "https://github.com/MahmudulHasanRiaz",
		icon: "github",
		group: "professional",
		subtitle: "Code profile — MahmudulHasanRiaz",
	},
];

// (No FOOTER_PRIMARIES here: the footer primaries are derived live
// from the platforms' `is_primary` + `sort_order` — see
// getFooterPrimaries() in lib/content.ts. The old list matched rows by
// display name with .find(), which is fragile — two rows are both
// "Facebook" — so it was deleted, not moved.)

export interface Client {
	name: string;
	/** Logo image URL (admin media). Absent = text wordmark. */
	logo_url?: string;
	/** How a set logo renders: "logo" (default) = logo image only;
	 *  "name_logo" = square icon beside the name. Absent = "logo". */
	logo_display_mode?: "logo" | "name_logo";
	/** Live website URL. Present = the cell links out. */
	website?: string;
	sort_order?: number;
	/** Optional Bangla variant from the API (title → name). */
	bn?: { title?: string; name?: string };
}

export const CLIENTS: Client[] = [
	{ name: "Fixed Plus" },
	{ name: "Avelto" },
];

export const PUBLIC_FIGURE_POINTS = [
	{
		title: "Ventures",
		text: "Building companies that solve real problems for Bangladeshi businesses.",
	},
	{
		title: "Social activities",
		text: "Community work and public initiatives around Dhaka and beyond.",
	},
	{
		title: "Public voice",
		text: "Speaking, teaching and sharing — in person and online.",
	},
] as const;

export function platformIconSrc(icon: string | null): string | null {
	if (!icon) return null;
	// Local optimized replacement for an oversized remote logo.
	if (LOCAL_LOGO_OVERRIDES[icon]) return LOCAL_LOGO_OVERRIDES[icon];
	if (icon.startsWith("wikimedia:")) return icon.slice("wikimedia:".length);
	// A local /path is already a final src.
	if (icon.startsWith("/")) return icon;
	return simpleIconsUrl(icon);
}
