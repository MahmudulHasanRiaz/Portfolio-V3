// Plain text helpers — this module imports NOTHING from astro:content,
// so client islands (React .tsx components) can safely import from it.
// Anything that touches astro:content lives in lib/content.ts instead
// (which re-exports these helpers for the .astro pages).

// Character safety net for grid/card SHORT descriptions (user decision,
// 2026-11-08, corrected 2026-11-08): the requirement is a VISUAL max of
// 2 LINES, enforced primarily by CSS line-clamp: 2 on every grid/card
// description (.grid-card p, .deck-card p, .release-desc). This cap is
// only a text-level safety net for absurdly long live/API text — it must
// NEVER cut the preview's own card copy. Measured from the preview copy
// ported to src/content: longest project 168, case study 180, post 129,
// release 119, venture 133 chars — so the cap sits at 200, above the
// longest preview card text. (An earlier blind 100-char guess cut the
// preview's own copy and was corrected.) Detail pages keep full text;
// no copy is rewritten to fit — only the display is limited.
export const SHORT_DESC_MAX = 200;

// Strip the legacy `## ` + paragraph markup out of a card excerpt so no
// markdown syntax ever leaks into a grid/card preview (2026-11-24: the
// Jannat card showed a literal "## " because truncateShort only trimmed
// and truncated the stored description, whose first block is a `## `
// heading the detail-page renderer turns into an <h2>). The stored
// description is untouched — this is display-only cleanup. Images and
// links keep their visible text, never the URL.
function stripMarkdown(text: string): string {
	return text
		.replace(/!\[([^\]]*)\]\([^)\s]+(?:\s+"[^"]*")?\)/g, "$1")
		.replace(/\[([^\]]+)\]\([^)\s]+(?:\s+"[^"]*")?\)/g, "$1")
		.replace(/\*\*([^*]+)\*\*/g, "$1")
		.replace(/__([^_]+)__/g, "$1")
		.replace(/^#{1,6}\s+/gm, "")
		.replace(/^[-*+]\s+/gm, "")
		.replace(/^>\s?/gm, "")
		.replace(/\*\*/g, "")
		.replace(/\s+/g, " ")
		.trim();
}

export function truncateShort(text: string | undefined | null): string {
	if (!text) return "";
	const clean = stripMarkdown(text);
	if (clean.length <= SHORT_DESC_MAX) return clean;
	return clean.slice(0, SHORT_DESC_MAX - 1).trimEnd() + "…";
}
