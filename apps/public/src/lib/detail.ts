// Shared detail-page helpers (Run 13 — detail-pages fix round).
//
// - SITE_URL is the site's ACTUAL live base URL (the custom domain,
//   live since 2026-11-28). Canonical links, JSON-LD URLs and OG
//   images all use it.
// - Body rendering: live entries carry their body as a plain `content`
//   string. `parseBodyBlocks` turns it into the preview's content
//   blocks ('## ' lines become h3 sub-headings, the rest
//   paragraphs). Build-time entries render markdown natively.
// - `isNearDuplicate` / `dedupeBlocks` stop the same story rendering
//   twice (case-study body vs problem/fix/result; venture body vs
//   description): a block that restates a field already shown on the
//   page is dropped, never rendered a second time.
// - New backend fields (ventures media, release lyrics/videos,
//   case-study research/metrics, project longDescription) are consumed
//   when present and omitted gracefully when absent. Nothing here
//   invents content.

export const SITE_URL =
	"https://mahmudulhasanriaz.com";

/**
 * Origin of the incoming request (protocol + host, no path, no
 * trailing slash) — the ONLY host source. Accepts a Request, a URL,
 * a URL string, or an Astro-like `{ url }` object. The origin comes
 * from the request URL itself (Astro.url / request.url), NEVER from
 * Host / X-Forwarded-Host headers: Cloudflare sets the request URL
 * from the host the request actually arrived on, while a forwarded
 * header is client-controlled and would let anyone spoof canonicals.
 * Only a valid http(s) origin with a dotted host counts; anything
 * else (relative URL, wrong scheme, bare hostname) returns
 * undefined so the caller falls through to the next source.
 */
export function requestOrigin(
	input?: Request | URL | string | { url?: string | URL } | undefined,
): string | undefined {
	let raw: string | undefined;
	if (typeof input === "string") raw = input;
	else if (input instanceof URL) raw = input.toString();
	else if (input instanceof Request) raw = input.url;
	else if (input && typeof input === "object" && "url" in input) {
		const u = input.url;
		raw = u instanceof URL ? u.toString() : u;
	}
	if (!raw) return undefined;
	try {
		const parsed = new URL(raw);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
			return undefined;
		// Dotted host (real domain) — or localhost for local dev
		// (astro dev runs on localhost:4321, which has no dot).
		const host = parsed.host;
		const okHost =
			/^[^/]+\.[^/]{2,}$/.test(host) ||
			host === "localhost" ||
			host.startsWith("localhost:");
		if (!okHost) return undefined;
		return parsed.origin;
	} catch {
		return undefined;
	}
}

/**
 * True only when the admin `site_url` setting is an explicit override:
 * a valid http(s) URL DIFFERENT from SITE_URL. The loader's fail-safe
 * default IS SITE_URL (public-content.ts DEFAULT_PUBLIC_SETTINGS), so
 * "admin never set site_url" and "admin set it to the fallback host"
 * arrive here as the same value — and the distinction does not matter:
 * in both cases the request host wins, which is the wanted behaviour.
 * Only a genuinely different admin value (e.g. the custom domain
 * mahmudulhasanriaz.com, connected 2026-11-28) counts as an override.
 */
export function isAdminSiteUrl(siteUrl?: string | null): siteUrl is string {
	if (typeof siteUrl !== "string") return false;
	const cleaned = siteUrl.trim().replace(/\/$/, "");
	if (!/^https?:\/\/[^/]+\.[^/]{2,}/i.test(cleaned)) return false;
	return cleaned.toLowerCase() !== SITE_URL.toLowerCase();
}

/** The admin override when it is explicit, else undefined. */
function adminBase(siteUrl?: string | null): string | undefined {
	if (!isAdminSiteUrl(siteUrl)) return undefined;
	return siteUrl.trim().replace(/\/$/, "");
}

/**
 * Host-consistent base — for robots.txt + sitemap.xml. Precedence:
 *   request host → explicit admin site_url → SITE_URL fallback.
 * The request host MUST win here: the Sitemap line in robots.txt and
 * every <loc> in the sitemap have to live on the host the crawler
 * actually fetched, or search engines reject them as cross-host.
 */
export function resolveHostBase(
	siteUrl?: string | null,
	request?: Request | URL | string | { url?: string | URL } | undefined,
): string {
	return requestOrigin(request) ?? adminBase(siteUrl) ?? SITE_URL;
}

/**
 * Canonical base — for Layout canonical / hreflang / og:url / JSON-LD
 * and detail-page canonicals. Precedence:
 *   explicit admin site_url → request host → SITE_URL fallback.
 * The admin value wins when set so search engines see ONE canonical
 * no matter which host served the page; without an admin override the
 * page is self-consistent on whichever domain served it.
 *
 * NOTE on prerendered pages: at build time Astro.url.origin is
 * Astro.site (astro.config.mjs), so static pages bake that origin
 * into their canonicals; only on-demand renders (detail twin
 * fallback, robots, sitemap) see the live request host. That is
 * inherent to static prerendering — making pages host-aware at serve
 * time would need them on-demand, which is out of scope here.
 */
export function resolveCanonicalBase(
	siteUrl?: string | null,
	request?: Request | URL | string | { url?: string | URL } | undefined,
): string {
	return adminBase(siteUrl) ?? requestOrigin(request) ?? SITE_URL;
}

/**
 * Resolve a stored URL to an absolute URL against the given base
 * (default SITE_URL for callers that have no request context).
 * Pass the page's resolved base (resolveCanonicalBase / resolveHostBase)
 * so relative media never hardcodes the fallback host.
 */
export function absUrl(
	url: string | null | undefined,
	base: string = SITE_URL,
): string | undefined {
	if (!url) return undefined;
	if (/^https?:\/\//i.test(url)) return url;
	const cleanBase = base.replace(/\/$/, "");
	if (url.startsWith("/")) return `${cleanBase}${url}`;
	return `${cleanBase}/${url}`;
}

/** A stored website link is real only when it is a plain http(s) URL. */
export function isRealUrl(url: string | null | undefined): url is string {
	if (!url || typeof url !== "string") return false;
	if (!/^https?:\/\/[^/]+\.[^/]{2,}/i.test(url)) return false;
	if (/example\.(com|org|net)/i.test(url)) return false;
	return true;
}

export interface InlineRun {
	/** Plain text of this run (already entity-decoded). */
	text: string;
	bold?: boolean;
	italic?: boolean;
	underline?: boolean;
	strike?: boolean;
	/** Validated href — http(s), site-relative (/path) or anchor (#id) only. */
	href?: string;
	/** A <br> line break inside the current block. */
	br?: boolean;
}

export interface ListItem {
	rich: InlineRun[];
	/** Nesting depth inside the list (0 = top level). */
	level: number;
	/** "ul" or "ol" — the list this item belongs to. */
	kind: "ul" | "ol";
}

export interface BodyBlock {
	kind: "h2" | "h3" | "p" | "img" | "ul" | "ol" | "blockquote";
	text: string;
	/** Image URL — img blocks only. */
	src?: string;
	/** Image alt text — img blocks only. */
	alt?: string;
	/** Inline formatted runs — p / h2 / h3 / blockquote blocks only.
	 *  `text` stays the plain-text concatenation so dedupeBlocks keeps
	 *  working on rich blocks exactly as on legacy ones. */
	rich?: InlineRun[];
	/** List items — ul / ol blocks only. */
	items?: ListItem[];
}

/**
 * Dual-format body parsing (TipTap editor, 0043):
 *
 * - Legacy rows (`## ` headings + blank-line paragraphs, the only
 *   format the admin could produce before) parse exactly as before
 *   through parseLegacyBlocks — no existing content changes.
 * - Rows saved through the TipTap editor are HTML: they parse through
 *   the sanitized HTML path below. Detection requires a real block tag
 *   at the start (p / h2 / h3 / ul / ol / blockquote / img / div) —
 *   a `<` typed as prose (e.g. "<3") never takes the HTML path.
 *
 * The HTML path is an allowlist sanitizer, not a passthrough: only
 * p / h2 / h3 / strong / b / em / i / u / s / strike / del / ul / ol /
 * li / blockquote / a / img / br survive (unknown tags are unwrapped,
 * their text kept); a[href] and img[src] accept http(s), site-relative
 * (/path) and anchor (#id) URLs only — javascript: / data: / //
 * never reach the page; script / style / iframe / form / svg and
 * friends are dropped WITH their subtree; every other attribute
 * (class / style / on*) is stripped. Text is rendered through Astro /
 * Preact expressions, which escape it — raw HTML never reaches the
 * page. Runs server-side only (Astro SSR / build); nothing of this
 * ships in the public JS bundle.
 */
const HTML_BLOCK_TAG = /^\s*<(p|h2|h3|ul|ol|blockquote|img|div|script|style)[\s/>]/i;

/** True when the stored body is TipTap HTML rather than legacy text. */
export function isHtmlContent(text: string | null | undefined): boolean {
	if (!text) return false;
	return HTML_BLOCK_TAG.test(text);
}

/** Tags whose entire subtree is dropped (children included). */
const DROP_TAGS = new Set([
	"script",
	"style",
	"iframe",
	"object",
	"embed",
	"form",
	"input",
	"textarea",
	"button",
	"select",
	"svg",
	"math",
	"video",
	"audio",
	"noscript",
	"template",
	"title",
	"head",
]);

/** Decode the HTML entities TipTap / pasted content can carry.
 *  &amp; decodes LAST so `&amp;lt;` becomes `&lt;`, never `<`. */
export function decodeEntities(text: string): string {
	return text
		.replace(/&nbsp;/g, " ")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&quot;/g, '"')
		.replace(/&#39;|&apos;/g, "'")
		.replace(/&#(\d+);/g, (_m, n) => {
			const c = Number(n);
			return Number.isFinite(c) && c > 0 && c < 0x110000
				? String.fromCodePoint(c)
				: "";
		})
		.replace(/&#x([0-9a-fA-F]+);/g, (_m, h) => {
			const c = parseInt(h, 16);
			return Number.isFinite(c) && c > 0 && c < 0x110000
				? String.fromCodePoint(c)
				: "";
		})
		.replace(/&amp;/g, "&");
}

/** A URL is safe for href/src only as http(s), a site-relative path
 *  (/path — NOT protocol-relative //host) or a same-page anchor. */
export function safeUrl(url: string | undefined): string | undefined {
	if (!url) return undefined;
	const u = url.trim();
	if (!u || /[\s<>"`]/.test(u)) return undefined;
	if (/^https?:\/\//i.test(u)) return u;
	if (/^\/(?!\/)/.test(u)) return u;
	if (/^#/.test(u)) return u;
	return undefined;
}

/** Attributes of one tag token, lowercased names, first wins. */
function parseAttrs(tagInner: string): Record<string, string> {
	const attrs: Record<string, string> = {};
	const re =
		/([a-zA-Z][a-zA-Z0-9-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
	let m: RegExpExecArray | null;
	while ((m = re.exec(tagInner))) {
		const name = m[1].toLowerCase();
		if (!(name in attrs)) attrs[name] = m[2] ?? m[3] ?? m[4] ?? "";
	}
	return attrs;
}

/** Tokenize HTML into tags / comments / text. A lone `<` that opens
 *  no tag (prose like "<3") is its own token so the `<` survives. */
const TOKEN_RE = /<!--[\s\S]*?-->|<![^>]*>|<\/?[a-zA-Z][^>]*>|[^<]+|</g;

interface HtmlBlockState {
	kind: "p" | "h2" | "h3" | "blockquote";
	rich: InlineRun[];
}

/** Parse TipTap HTML into blocks. Tolerant of unclosed / mismatched
 *  tags (admin HTML is editor-produced, but pasted content is not).
 *  Empty paragraphs (`<p></p>`, `<p><br></p>`) are dropped. */
export function parseHtmlBlocks(html: string): BodyBlock[] {
	const blocks: BodyBlock[] = [];
	let cur: HtmlBlockState | null = null;
	// Open lists, outermost first. A nested list merges its items into
	// its parent on close; each item records its depth in `level`.
	const listStack: { kind: "ul" | "ol"; items: ListItem[] }[] = [];
	let curItem: ListItem | null = null;
	let bold = 0;
	let italic = 0;
	let underline = 0;
	let strike = 0;
	const hrefStack: (string | null)[] = [];
	const dropStack: string[] = [];

	const plainText = (rich: InlineRun[]): string =>
		rich.map((r) => (r.br ? " " : r.text)).join("");

	/** Drop leading/trailing whitespace-only runs; trim the edges. */
	function trimRuns(rich: InlineRun[]): InlineRun[] {
		let start = 0;
		let end = rich.length;
		while (start < end && /^\s*$/.test(rich[start].text) && !rich[start].br)
			start++;
		while (end > start && /^\s*$/.test(rich[end - 1].text) && !rich[end - 1].br)
			end--;
		const out = rich.slice(start, end);
		if (out.length > 0 && !out[0].br)
			out[0] = { ...out[0], text: out[0].text.replace(/^\s+/, "") };
		if (out.length > 0 && !out[out.length - 1].br) {
			const last = out[out.length - 1];
			out[out.length - 1] = { ...last, text: last.text.replace(/\s+$/, "") };
		}
		return out;
	}

	function flushBlock(): void {
		if (!cur) return;
		const rich = trimRuns(cur.rich);
		const text = plainText(rich).trim();
		if (text !== "") blocks.push({ kind: cur.kind, text, rich });
		cur = null;
	}

	function flushItem(): void {
		if (!curItem) return;
		const list = listStack[listStack.length - 1];
		if (list) {
			const rich = trimRuns(curItem.rich);
			if (plainText(rich).trim() !== "")
				list.items.push({ ...curItem, rich });
		}
		curItem = null;
	}

	/** Close one open list, merging a nested list into its parent. */
	function closeList(): void {
		flushItem();
		const closed = listStack.pop();
		if (!closed) return;
		if (listStack.length > 0) {
			listStack[listStack.length - 1].items.push(...closed.items);
		} else if (closed.items.length > 0) {
			blocks.push({
				kind: closed.kind,
				text: closed.items
					.map((i) => plainText(i.rich))
					.join(" ")
					.trim(),
				items: closed.items,
			});
		}
	}

	function flushLists(): void {
		while (listStack.length > 0) closeList();
	}

	function openBlock(kind: "p" | "h2" | "h3" | "blockquote"): void {
		// <p> inside <li> or inside <blockquote> flows into the open
		// block — TipTap wraps both in <p>.
		if (curItem) return;
		if (cur?.kind === "blockquote" && kind === "p") return;
		flushLists();
		flushBlock();
		cur = { kind, rich: [] };
	}

	function closeBlock(): void {
		// A <p> close inside <li> / <blockquote> is a no-op — the
		// outer block closes on its own tag.
		if (curItem) return;
		flushBlock();
	}

	function openList(kind: "ul" | "ol"): void {
		if (curItem) {
			// Nested list inside the current item: flush the item so
			// document order is kept, then open the deeper list.
			flushItem();
		} else {
			flushBlock();
		}
		listStack.push({ kind, items: [] });
	}

	function openItem(): void {
		if (listStack.length === 0) {
			// Stray <li> with no list — treat it as a bullet list.
			listStack.push({ kind: "ul", items: [] });
		}
		flushItem();
		const list = listStack[listStack.length - 1];
		curItem = { rich: [], level: listStack.length - 1, kind: list.kind };
	}

	function appendImage(attrs: Record<string, string>): void {
		const src = safeUrl(attrs.src);
		if (!src) return;
		if (curItem) flushItem();
		flushLists();
		flushBlock();
		blocks.push({ kind: "img", text: attrs.alt ?? "", src, alt: attrs.alt ?? "" });
	}

	function appendText(raw: string): void {
		if (dropStack.length > 0) return;
		const text = decodeEntities(raw);
		if (text === "") return;
		const run: InlineRun = { text };
		if (bold > 0) run.bold = true;
		if (italic > 0) run.italic = true;
		if (underline > 0) run.underline = true;
		if (strike > 0) run.strike = true;
		const href =
			hrefStack.length > 0 ? hrefStack[hrefStack.length - 1] : null;
		if (href) run.href = href;
		const target = curItem ?? cur;
		if (!target) {
			// Bare text outside any block (TipTap never emits this) —
			// wrap it in a paragraph so it is never lost.
			cur = { kind: "p", rich: [run] };
			return;
		}
		const rich = target.rich;
		const last = rich[rich.length - 1];
		if (
			last &&
			!last.br &&
			last.bold === run.bold &&
			last.italic === run.italic &&
			last.underline === run.underline &&
			last.strike === run.strike &&
			last.href === run.href
		) {
			last.text += run.text;
		} else {
			rich.push(run);
		}
	}

	function appendBreak(): void {
		if (dropStack.length > 0) return;
		const target = curItem ?? cur;
		if (!target) return;
		target.rich.push({ text: "", br: true });
	}

	for (const token of html.match(TOKEN_RE) ?? []) {
		if (token.startsWith("<!--") || token.startsWith("<!")) continue;
		if (token === "<") {
			appendText("<");
			continue;
		}
		if (!token.startsWith("<")) {
			appendText(token);
			continue;
		}
		const isClose = token.startsWith("</");
		const inner = token.slice(isClose ? 2 : 1, -1).trim();
		const selfClose = inner.endsWith("/");
		const name = (inner.split(/\s+/, 1)[0] ?? "")
			.replace(/\/$/, "")
			.toLowerCase();
		if (!name) continue;
		// Inside a dropped subtree only its own close tag matters.
		if (dropStack.length > 0) {
			if (isClose && name === dropStack[dropStack.length - 1])
				dropStack.pop();
			continue;
		}
		if (!isClose && DROP_TAGS.has(name)) {
			if (!selfClose) dropStack.push(name);
			continue;
		}
		const attrs = isClose ? {} : parseAttrs(inner);
		switch (name) {
			case "p":
				if (isClose) closeBlock();
				else openBlock("p");
				break;
			case "h2":
				if (isClose) closeBlock();
				else openBlock("h2");
				break;
			case "h3":
				if (isClose) closeBlock();
				else openBlock("h3");
				break;
			case "blockquote":
				if (isClose) closeBlock();
				else openBlock("blockquote");
				break;
			case "ul":
				if (isClose) closeList();
				else openList("ul");
				break;
			case "ol":
				if (isClose) closeList();
				else openList("ol");
				break;
			case "li":
				if (isClose) flushItem();
				else openItem();
				break;
			case "a":
				if (isClose) hrefStack.pop();
				else hrefStack.push(safeUrl(attrs.href) ?? null);
				break;
			case "strong":
			case "b":
				bold = Math.max(0, bold + (isClose ? -1 : 1));
				break;
			case "em":
			case "i":
				italic = Math.max(0, italic + (isClose ? -1 : 1));
				break;
			case "u":
				underline = Math.max(0, underline + (isClose ? -1 : 1));
				break;
			case "s":
			case "strike":
			case "del":
				strike = Math.max(0, strike + (isClose ? -1 : 1));
				break;
			case "br":
				if (!isClose) appendBreak();
				break;
			case "img":
				if (!isClose) appendImage(attrs);
				break;
			case "hr":
				if (!isClose) {
					if (curItem) flushItem();
					flushLists();
					flushBlock();
				}
				break;
			default:
				// Unknown tag (div / span / code / ...): unwrap — the
				// tag is dropped, its children render as if it was
				// never there. Nothing else is trusted.
				break;
		}
	}
	flushItem();
	flushLists();
	flushBlock();
	return blocks;
}

/**
 * The preview's content blocks (LEGACY path — unchanged):
 * a '## ' line is an h3 sub-heading, a line that is exactly a markdown
 * image `![alt](url)` is an img block, every other block is a
 * paragraph. Single newlines inside a block are line wraps, not new
 * blocks.
 *
 * Inline images inside a paragraph (text before/after the `![...]`)
 * stay literal text — only a standalone image line becomes an <img>,
 * so body copy can never silently gain an image it did not ask for.
 * The img block renders through MarkdownBody with the same automatic
 * optimization as every other remote image (files.riaz.com.bd →
 * /api/image, Unsplash → w= rewrite, anything else unchanged).
 */

/**
 * Dual-format entry point: TipTap HTML rows go through the sanitized
 * HTML path; every other row keeps the legacy `## ` + paragraphs
 * parse, byte-identical to before.
 */
export function parseBodyBlocks(
	text: string | null | undefined,
): BodyBlock[] {
	if (!text) return [];
	if (isHtmlContent(text)) return parseHtmlBlocks(text);
	return parseLegacyBlocks(text);
}

function parseLegacyBlocks(
	text: string | null | undefined,
): BodyBlock[] {
	if (!text) return [];
	const blocks: BodyBlock[] = [];
	for (const raw of text.split(/\n\s*\n/)) {
		const chunk = raw.trim();
		if (!chunk) continue;
		for (const line of chunk.split("\n")) {
			const trimmed = line.trim();
			if (!trimmed) continue;
			if (/^#{1,2}\s+/.test(trimmed)) {
				blocks.push({
					kind: "h3",
					text: trimmed.replace(/^#{1,2}\s+/, "").trim(),
				});
			} else if (
				/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/.test(trimmed)
			) {
				const [, alt, src] =
					trimmed.match(
						/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/,
					) ?? [];
				blocks.push({ kind: "img", text: alt ?? "", src, alt });
			} else if (blocks.length > 0 && blocks[blocks.length - 1].kind === "p") {
				// A wrapped line of the same paragraph.
				blocks[blocks.length - 1].text += ` ${trimmed}`;
			} else {
				blocks.push({ kind: "p", text: trimmed });
			}
		}
	}
	return blocks;
}

function wordSet(text: string): Set<string> {
	return new Set(
		text
			.toLowerCase()
			.replace(/[^a-z0-9\s]/g, " ")
			.split(/\s+/)
			.filter((w) => w.length > 2),
	);
}

/**
 * True when two texts say the same thing: one contains the other, or
 * their word sets overlap by half or more. Used to drop a body block
 * that merely restates a field already rendered on the page.
 */
export function isNearDuplicate(a: string, b: string): boolean {
	const na = a.toLowerCase().replace(/\s+/g, " ").trim();
	const nb = b.toLowerCase().replace(/\s+/g, " ").trim();
	if (!na || !nb) return false;
	if (na === nb) return true;
	const shorter = na.length <= nb.length ? na : nb;
	const longer = na.length <= nb.length ? nb : na;
	if (shorter.length >= 40 && longer.includes(shorter)) return true;
	const sa = wordSet(na);
	const sb = wordSet(nb);
	if (sa.size === 0 || sb.size === 0) return false;
	let shared = 0;
	for (const w of sa) if (sb.has(w)) shared++;
	const jaccard = shared / (sa.size + sb.size - shared);
	return jaccard >= 0.5;
}

/** Drop body blocks that restate any of the given reference texts. */
export function dedupeBlocks(
	blocks: BodyBlock[],
	refs: Array<string | null | undefined>,
): BodyBlock[] {
	const references = refs.filter((r): r is string => Boolean(r?.trim()));
	if (references.length === 0) return blocks;
	return blocks.filter(
		(block) =>
			!references.some((ref) => isNearDuplicate(block.text, ref)),
	);
}

/**
 * Field-wise merge of a build-time row with its live API row: live wins
 * where it has a value; the build-time value is kept where the live row
 * is empty (null, "", or []). A detail page must never lose its
 * thumbnail, tags, gallery or techs just because the API row left them
 * blank — same rule as mergeWithLive for lists.
 */
export function mergeDetail<T extends Record<string, unknown>>(
	base: T | undefined,
	live: Record<string, unknown> | undefined,
): T | undefined {
	if (!base) return live as T | undefined;
	if (!live) return base;
	const out: Record<string, unknown> = { ...base };
	for (const [key, value] of Object.entries(live)) {
		if (key === "bn") {
			// Bangla variant merges field-wise (same rule as
			// mergeEntryData in lib/content.ts): live `bn` wins where
			// it has a value; build-time `bn` survives where empty.
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
				const empty =
					bv === undefined ||
					bv === null ||
					bv === "" ||
					(Array.isArray(bv) && bv.length === 0);
				if (!empty) merged[bk] = bv;
			}
			if (Object.keys(merged).length > 0) out["bn"] = merged;
			continue;
		}
		const empty =
			value === undefined ||
			value === null ||
			value === "" ||
			(Array.isArray(value) && value.length === 0);
		if (!empty) out[key] = value;
	}
	return out as T;
}

/** Non-empty string from a merged detail record, or undefined. Reads
 *  the admin SEO override fields (metaTitle / metaDescription /
 *  ogImage / canonicalUrl / keywords) that the API emits on every
 *  public item — the row's own meta columns overlaid with the admin
 *  seo_meta row (Dashboard → SEO → Metadata). Detail pages prefer
 *  these over their built titles/descriptions. */
export function seoString(data: unknown, key: string): string | undefined {
	if (!data || typeof data !== "object") return undefined;
	const v = (data as Record<string, unknown>)[key];
	return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

/**
 * Plain text for a meta/OG description: strips markdown syntax
 * (heading markers, bullets, links, images, bold, code, blockquotes,
 * HTML tags) and collapses whitespace/newlines to single spaces.
 * Admin meta descriptions are plain text already, so this is a
 * no-op for them; it only guards the fallback path where a
 * description is derived from page content — a "## " heading marker
 * must never leak into a <meta> tag (BN Jannat did exactly that).
 * Returns undefined when nothing readable survives, so the caller
 * falls through to the next default.
 */
export function stripMarkdown(
	text: string | null | undefined,
): string | undefined {
	if (!text) return undefined;
	const out = text
		.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images → alt text
		.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links → link text
		.replace(/`/g, "") // code ticks
		.replace(/^#{1,6}\s+/gm, "") // heading markers
		.replace(/^>\s?/gm, "") // blockquotes
		.replace(/^[-*+]\s+/gm, "") // bullets
		.replace(/^\d+[.)]\s+/gm, "") // numbered lists
		.replace(/^\s*[-*_]{3,}\s*$/gm, "") // horizontal rules
		.replace(/\*\*([^*]+)\*\*/g, "$1") // bold **
		.replace(/__([^_]+)__/g, "$1") // bold __
		.replace(/(^|\s)\*([^*]+)\*(?=\s|$)/g, "$1$2") // italic *...*
		.replace(/~~([^~]+)~~/g, "$1") // strikethrough
		.replace(/<[^>]+>/g, "") // HTML tags
		.replace(/\s*\n\s*/g, " ")
		.replace(/\s{2,}/g, " ")
		.trim();
	return out === "" ? undefined : out;
}

/** Boolean from a merged detail record, or undefined when absent /
 *  not a boolean. Reads the per-item `indexable` flag (0038) the API
 *  emits on every public item — detail pages pass it to Layout so a
 *  toggled-off item renders noindex even when the global switch is
 *  on. NULL on the row means the API omits the field (undefined
 *  here), which Layout treats as indexable. */
export function seoBoolean(data: unknown, key: string): boolean | undefined {
	if (!data || typeof data !== "object") return undefined;
	const v = (data as Record<string, unknown>)[key];
	return typeof v === "boolean" ? v : undefined;
}

/** "2023" from an ISO date, or "" when there is none. */
export function yearOf(iso: string | null | undefined): string {
	if (!iso) return "";
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? "" : String(d.getFullYear());
}

/**
 * The service pre-selected in the shared contact modal for a project,
 * from the project's own tags. The modal's select uses service NAMES
 * (ContactForm), so the map returns names. Unknown tags → no
 * pre-selection (never guess a service).
 */
export function serviceForTags(tags: string[] | undefined): string | undefined {
	const list = (tags ?? []).map((t) => t.toLowerCase());
	if (list.some((t) => t.includes("erp") || t.includes("crm"))) {
		return "ERP/CRM Development";
	}
	if (
		list.some(
			(t) =>
				t.includes("wordpress") ||
				t.includes("plugin") ||
				t.includes("woocommerce"),
		)
	) {
		return "WordPress Website and Theme/Plugin Development";
	}
	if (list.some((t) => t.includes("shopify"))) {
		return "Shopify Development";
	}
	if (
		list.some(
			(t) =>
				t.includes("e-commerce") ||
				t.includes("ecommerce") ||
				t.includes("saas"),
		)
	) {
		return "Ecommerce Consultancy";
	}
	return undefined;
}
