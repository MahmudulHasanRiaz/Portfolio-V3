// i18n helpers — bilingual (English + Bangla) routing + content
// localisation. URL separation only: English at /<page>, Bangla at
// /bn/<page>. Language is determined by the URL; there is NO
// auto-redirect on load for SEO (the first-visit default-language
// script in Layout.astro is client-side only and never fires for a
// /bn/* URL). This module imports nothing from astro:content, so
// client islands (React .tsx) can safely import from it.

export type Lang = "en" | "bn";

export type DefaultLanguage = "en" | "bn" | "system";

/** localStorage key for the visitor's explicit language choice. */
export const SITE_LANG_KEY = "site-lang";

import { en } from "../i18n/en";
import { bn, type Dict } from "../i18n/bn";
import { PROFILE } from "../data/site";

export type { Dict };

/** The fixed-UI dictionary for a page language. */
export function getDict(lang: Lang): Dict {
	return lang === "bn" ? bn : en;
}

/**
 * Display name for the page language: Bangla on /bn/ pages, Latin
 * elsewhere. DISPLAY ONLY — hero h1, footer identity, author bylines.
 * Structured data (JSON-LD, og:title, canonical, <title>) always keeps
 * PROFILE.name, the Latin name.
 */
export function displayName(lang: Lang): string {
	return lang === "bn" ? PROFILE.nameBn : PROFILE.name;
}
/**
 * Admin-overridable site copy (gap group (f)).
 *
 * `settings.siteCopy` (EN) / `settings.siteCopyBn` (BN) are the admin-
 * managed `site_copy` / `site_copy_bn` settings keys, exposed via
 * getPublicSettings() as `siteCopy` / `siteCopyBn`. For the current
 * language, a settings value wins over the dictionary value, PER KEY —
 * the admin can override ONE string without touching the rest. Absent
 * settings value -> dictionary value; the dictionary stays the
 * fail-safe fallback. An empty / whitespace-only string (or an empty /
 * non-string array for the four list keys) is treated as absent, so a
 * page can never render a blank. Keys the dictionary does not know are
 * ignored. When there is nothing to override, the SAME dict object is
 * returned — with no settings keys present (the state today) the output
 * is byte-identical to getDict() alone.
 *
 * The `settings` parameter is deliberately `unknown`: PublicSettings
 * does not declare siteCopy/siteCopyBn yet (that exposure lands
 * separately), so no named object type can accept it today — an
 * all-optional shape trips TS2559 ("no properties in common") at the
 * call sites, and an index signature trips TS2345. The function
 * narrows defensively instead, so anything malformed is ignored and
 * the dictionary wins. Once the loader declares the fields, tighten
 * the parameter to `SiteCopySettings` (below).
 */
export interface SiteCopySettings {
	siteCopy?: Record<string, unknown> | null;
	siteCopyBn?: Record<string, unknown> | null;
}

export function applySiteCopy(
	dict: Dict,
	lang: Lang,
	settings?: unknown,
): Dict {
	const record =
		settings !== null && typeof settings === "object"
			? (settings as Record<string, unknown>)
			: undefined;
	const overrides =
		lang === "bn" ? record?.siteCopyBn : record?.siteCopy;
	if (!overrides || typeof overrides !== "object") return dict;
	let out: Record<string, unknown> | undefined;
	for (const key of Object.keys(dict) as (keyof Dict)[]) {
		const raw = (overrides as Record<string, unknown>)[key];
		if (raw === undefined || raw === null) continue;
		const current = dict[key];
		if (typeof current === "string") {
			if (typeof raw === "string" && raw.trim() !== "") {
				(out ??= { ...dict })[key] = raw;
			}
		} else if (
			Array.isArray(raw) &&
			raw.length > 0 &&
			raw.every((v) => typeof v === "string" && v.trim() !== "")
		) {
			(out ??= { ...dict })[key] = [...raw];
		}
	}
	return (out ?? dict) as Dict;
}


// ---------------------------------------------------------------------------
// Per-island dictionary subsets (Issue 7B).
//
// Client islands used to receive the WHOLE dictionary (~223 keys) as a
// serialised prop — and a page mounts several islands, so the same ~20 KB
// (EN) / ~30 KB (BN) JSON was embedded in the HTML once per island.
// Each island below declares exactly the keys it reads (its own render
// plus any island it forwards props to); call sites pass
// `pickDict(t, <ISLAND>_DICT_KEYS)` instead of `t`. The prop types are
// `Pick<Dict, ...>` so a full Dict still type-checks at any call site
// that has not been converted yet, and an island that reads a key outside
// its Pick fails `tsc` instead of rendering `undefined` at runtime.
// The `dict ?? getDict(lang)` fallback inside each island is kept: it
// only fires when a call site omits `dict` entirely.
//
// Key lists are `as const` so the union type and the runtime array can
// never drift apart.
// ---------------------------------------------------------------------------

/**
 * Shallow-pick only `keys` from a dictionary. Missing keys are skipped
 * (never serialised as `undefined`); a full Dict always carries them.
 */
export function pickDict<K extends keyof Dict>(
	dict: Partial<Dict>,
	keys: readonly K[],
): Pick<Dict, K> {
	const out = {} as Pick<Dict, K>;
	for (const key of keys) {
		const value = dict[key];
		if (value !== undefined) out[key] = value;
	}
	return out;
}

/** SiteHeader (Layout): nav + profile picker + theme/language labels. */
export const SITE_HEADER_DICT_KEYS = [
	"profileSe",
	"profileKnowMe",
	"navWork",
	"navVentures",
	"navReleases",
	"navProjects",
	"navCaseStudies",
	"navPosts",
	"navAbout",
	"navContact",
	"navHome",
	"switchLanguage",
	"switchToLight",
	"switchToDark",
	"chooseProfile",
	"resumeRotation",
	"openMenu",
	"closeMenu",
	"mobileNav",
	"primaryNav",
] as const;
export type SiteHeaderDict = Pick<
	Dict,
	(typeof SITE_HEADER_DICT_KEYS)[number]
>;

/** ContactForm: every label, placeholder, hint and error string. */
export const CONTACT_FORM_DICT_KEYS = [
	"formName",
	"formNamePlaceholder",
	"formEmail",
	"formEmailPlaceholder",
	"formPhone",
	"formPhonePlaceholder",
	"formHintContact",
	"formService",
	"formSelectService",
	"formPreselected",
	"formMessage",
	"formMessagePlaceholder",
	"formSend",
	"formSending",
	"formThanks",
	"formReplyPersonal",
	"formSendAnother",
	"formPreferEmail",
	"formErrorName",
	"formErrorContact",
	"formErrorEmail",
	"formErrorPhone",
] as const;
export type ContactFormDict = Pick<
	Dict,
	(typeof CONTACT_FORM_DICT_KEYS)[number]
>;

/**
 * ContactModal: its own chrome (3 keys) PLUS the ContactForm keys it
 * forwards to the form it renders — it receives the union and narrows
 * it back down with pickDict at the ContactForm call site.
 */
export const CONTACT_MODAL_DICT_KEYS = [
	"close",
	"contactMe",
	"modalSub",
	...CONTACT_FORM_DICT_KEYS,
] as const;
export type ContactModalDict = Pick<
	Dict,
	(typeof CONTACT_MODAL_DICT_KEYS)[number]
>;

/** ProjectsCarousel: empty/loading states + prev/next + section title. */
export const PROJECTS_CAROUSEL_DICT_KEYS = [
	"emptyProjects",
	"loadingProjects",
	"nextProject",
	"previousProject",
	"projectsTitle",
] as const;
export type ProjectsCarouselDict = Pick<
	Dict,
	(typeof PROJECTS_CAROUSEL_DICT_KEYS)[number]
>;

/** ReleasePlayer: facade label + "Watch on YouTube" link. */
export const RELEASE_PLAYER_DICT_KEYS = ["playHere", "watchOnYouTube"] as const;
export type ReleasePlayerDict = Pick<
	Dict,
	(typeof RELEASE_PLAYER_DICT_KEYS)[number]
>;

/** StackGlobe: heading, filter UI, Now/Spin labels, detail-card close. */
export const STACK_GLOBE_DICT_KEYS = [
	"stackTitle",
	"stackSub",
	"stackFilter",
	"allChip",
	"nowLabel",
	"spin",
	"spinLabel",
	"close",
	"globeHint",
	"catFrontend",
	"catBackend",
	"catDatabase",
	"catCloudTools",
	"catCmsEcommerce",
	"catConcepts",
	"catAuth",
] as const;
export type StackGlobeDict = Pick<
	Dict,
	(typeof STACK_GLOBE_DICT_KEYS)[number]
>;

/** DetailMedia: gallery/video slider labels, counter + alt-text base. */
export const DETAIL_MEDIA_DICT_KEYS = [
	"galleryLabel",
	"videosLabel",
	"prevImages",
	"nextImages",
	"prevVideos",
	"nextVideos",
	"mediaCounter",
	"galleryImage",
] as const;
export type DetailMediaDict = Pick<
	Dict,
	(typeof DETAIL_MEDIA_DICT_KEYS)[number]
>;

/** ThemeToggle: light/dark switch labels (aria-label only). */
export const THEME_TOGGLE_DICT_KEYS = [
	"switchToLight",
	"switchToDark",
] as const;
export type ThemeToggleDict = Pick<
	Dict,
	(typeof THEME_TOGGLE_DICT_KEYS)[number]
>;

/** ServiceModal: close + handover CTA + spinner label (all optional). */
export const SERVICE_MODAL_DICT_KEYS = [
	"close",
	"contactAboutService",
	"openingContact",
] as const;
export type ServiceModalDict = Pick<
	Dict,
	(typeof SERVICE_MODAL_DICT_KEYS)[number]
>;

/** "bn" when the pathname is a Bangla URL, otherwise "en". */
export function langFromPath(pathname: string): Lang {
	return pathname === "/bn" || pathname.startsWith("/bn/")
		? "bn"
		: "en";
}

/**
 * Language-aware internal URL. `path` is always the ENGLISH path
 * ("/projects/x", "/know-me", "/#contact"); the Bangla version is
 * "/bn" + path ("/bn/projects/x", "/bn/know-me", "/bn/#contact").
 * External URLs, mailto: and tel: pass through untouched.
 */
export function langUrl(path: string, lang: Lang): string {
	if (
		!path.startsWith("/") ||
		path.startsWith("//") ||
		/^(mailto|tel):/i.test(path)
	) {
		return path;
	}
	if (lang === "en") return path;
	if (path === "/") return "/bn/";
	return `/bn${path}`;
}

/** The same page in the other language (header switcher target). */
export function otherLangUrl(pathname: string, lang: Lang): string {
	if (lang === "bn") {
		if (pathname === "/bn" || pathname === "/bn/") return "/";
		return pathname.replace(/^\/bn/, "") || "/";
	}
	if (pathname === "/") return "/bn/";
	return `/bn${pathname}`;
}

/** Strip "/bn" from a pathname to get the canonical English path. */
export function enPath(pathname: string): string {
	if (pathname === "/bn" || pathname === "/bn/") return "/";
	return pathname.replace(/^\/bn/, "") || "/";
}

/**
 * Localised content: when rendering a /bn/ page, a content item's
 * optional nested `bn` object overlays the English top-level fields
 * with the SAME names (title, description, content, lyrics, ...).
 * A Bangla field is used only when present and non-empty; otherwise
 * the English value is kept — a /bn/ page never renders a blank.
 * `bn` may itself be nested (live bn wins over build-time bn — the
 * merge helpers in lib/content.ts + lib/detail.ts merge the `bn`
 * objects field-wise the same way they merge English fields).
 */
export function localizeData<T extends Record<string, unknown>>(
	data: T,
	lang: Lang,
): T {
	if (lang !== "bn") return data;
	const bn = (data as Record<string, unknown>)["bn"];
	if (!bn || typeof bn !== "object") return data;
	const out: Record<string, unknown> = { ...data };
	for (const [key, value] of Object.entries(
		bn as Record<string, unknown>,
	)) {
		const empty =
			value === undefined ||
			value === null ||
			value === "" ||
			(Array.isArray(value) && value.length === 0);
		if (!empty) out[key] = value;
	}
	return out as T;
}

/**
 * Case-study `bn` uses DB field names while the English top level uses
 * API names — map before overlaying (live shape, PR #76):
 *   bn.challenge → problem, bn.strategy → fix, bn.results → result,
 *   bn.research → research.
 * An explicit API-named key in `bn` (e.g. older build-time frontmatter
 * with `problem`) wins over the mapped DB name, so both shapes work.
 * All other types use identical field names in `bn` and need no map.
 */
const CASE_STUDY_BN_MAP: Record<string, string> = {
	challenge: "problem",
	strategy: "fix",
	results: "result",
	research: "research",
};

export function localizeCaseStudy<T extends Record<string, unknown>>(
	data: T,
	lang: Lang,
): T {
	if (lang !== "bn") return data;
	const bn = (data as Record<string, unknown>)["bn"];
	if (!bn || typeof bn !== "object") return data;
	const remapped: Record<string, unknown> = {
		...(bn as Record<string, unknown>),
	};
	for (const [dbKey, apiKey] of Object.entries(CASE_STUDY_BN_MAP)) {
		if (apiKey in remapped) continue;
		if (dbKey in remapped) remapped[apiKey] = remapped[dbKey];
	}
	return localizeData({ ...data, bn: remapped }, lang);
}

/** Date in the page language (Bangla → bn-BD, Bangla digits). */
export function formatDateLang(
	iso: string | undefined | null,
	lang: Lang,
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

/** "3 min read" / "৩ মিনিট পড়া" (Bangla digits on /bn/). */
export function readingTimeLabel(
	minutes: number | undefined | null,
	lang: Lang,
): string {
	if (!minutes) return "";
	if (lang === "bn") {
		return `${minutes.toLocaleString("bn-BD")} মিনিট পড়া`;
	}
	return `${minutes} min read`;
}

/**
 * "Showing X of Y projects" / "মোট Yটি প্রজেক্টের মধ্যে Xটি দেখাচ্ছে" — `template` comes from the dictionary with {shown} and
 * {total} placeholders, so the client-side filter scripts can reuse
 * the same string (see the data-count-template attribute).
 */
export function showingLabel(
	template: string,
	shown: number,
	total: number,
): string {
	const fmt = (n: number) =>
		template.includes("টি") ? n.toLocaleString("bn-BD") : String(n);
	return template
		.replace("{shown}", fmt(shown))
		.replace("{total}", fmt(total));
}

/** "Watch on YouTube" / "ইউটিউবে দেখুন", "Listen on X" / "X-এ শুনুন". */
export function platformActionLabelLang(
	name: string,
	lang: Lang,
): string {
	if (lang === "bn") {
		return name.toLowerCase() === "youtube"
			? "ইউটিউবে দেখুন"
			: `${name}-এ শুনুন`;
	}
	return name.toLowerCase() === "youtube"
		? "Watch on YouTube"
		: `Listen on ${name}`;
}
