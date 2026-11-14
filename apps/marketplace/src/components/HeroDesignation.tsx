import { useEffect, useState } from "preact/hooks";
import { BookOpen, CodeXml, Megaphone, Mic, Rocket } from "lucide-react";
import { PROFILE } from "../data/site";

// Split a word into grapheme clusters (user-perceived characters) so the
// typing animation never tears a Bengali conjunct / vowel sign / hasant
// apart mid-typing. `Intl.Segmenter` with granularity "grapheme" keeps
// clusters like "য়্যা", "ঞ্জি", "নি" intact; naive `slice`/`split("")`
// counts UTF-16 code units and breaks them.
// Fallback (no Segmenter): non-ASCII words render whole at once — never
// split by code unit. ASCII-only words are safe to split per character.
function segmentGraphemes(word: string): string[] {
	try {
		if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
			const segmenter = new Intl.Segmenter("bn", { granularity: "grapheme" });
			return [...segmenter.segment(word)].map((s) => s.segment);
		}
	} catch {
		// Fall through to the fallback below.
	}
	if (/[^\x00-\x7F]/.test(word)) return [word];
	return word.split("");
}

// Icons in designation order (index-based, so Bangla designations get
// the same icons as the English ones — never keyed by the word itself).
const DESIGNATION_ICONS = [CodeXml, Rocket, Mic, BookOpen, Megaphone] as const;

export default function HeroDesignation({
	profile,
	designations,
}: {
	profile: "se" | "knowme";
	/** Designation words in the page language (defaults to English). */
	designations?: string[];
}) {
	const DESIGNATIONS =
		designations?.length ? designations : [...PROFILE.designations];

	// Longest designation — the badge sizer reserves this width so the pill
	// never grows/shrinks while typing. Compared by grapheme count, not
	// code-unit length, so Bengali conjuncts don't inflate the measure.
	const LONGEST_DESIGNATION = DESIGNATIONS.reduce((a, b) =>
		segmentGraphemes(a).length >= segmentGraphemes(b).length ? a : b,
	);

	const TYPE_MS = 45;
	const EXIT_MS = 300;

	// SE profile: "Software Engineer" holds ~4.5s, the other four ~1.45s each.
	// Know Me profile: all five cycle equally (~2.2s each).
	function holdMs(profile: "se" | "knowme", index: number): number {
		if (profile === "knowme") return 2200;
		return index === 0 ? 4500 : 1450;
	}
	const [index, setIndex] = useState(0);
	// First paint shows the FULL first designation (SSR HTML contains the
	// complete word) — never an empty pill with just an icon + cursor.
	// The typing cycle still runs for every word after the first hold.
	// `shown` counts grapheme clusters, not UTF-16 code units.
	const [shown, setShown] = useState(
		() => segmentGraphemes(DESIGNATIONS[0]).length,
	);
	const [exiting, setExiting] = useState(false);
	const [reduced, setReduced] = useState(false);

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReduced(mq.matches);
		const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
		mq.addEventListener("change", onChange);
		return () => mq.removeEventListener("change", onChange);
	}, []);

	useEffect(() => {
		if (reduced) return;
		const word = DESIGNATIONS[index] ?? DESIGNATIONS[0];
		if (exiting) {
			// Clean exit (fade + slide up, ~300ms) — no backspacing.
			const timer = window.setTimeout(() => {
				setIndex((i) => (i + 1) % DESIGNATIONS.length);
				setShown(0);
				setExiting(false);
			}, EXIT_MS);
			return () => window.clearTimeout(timer);
		}
		if (shown < segmentGraphemes(word).length) {
			const timer = window.setTimeout(
				() => setShown((s) => s + 1),
				TYPE_MS,
			);
			return () => window.clearTimeout(timer);
		}
		const timer = window.setTimeout(
			() => setExiting(true),
			holdMs(profile, index),
		);
		return () => window.clearTimeout(timer);
	}, [reduced, index, shown, exiting, profile]);

	const word = DESIGNATIONS[index] ?? DESIGNATIONS[0];
	const Icon = DESIGNATION_ICONS[index % DESIGNATION_ICONS.length]!;
	const LongestIcon =
		DESIGNATION_ICONS[
			DESIGNATIONS.indexOf(LONGEST_DESIGNATION) % DESIGNATION_ICONS.length
		]!;

	// Reduced motion: first designation, static — no typing, no cursor.
	if (reduced) {
		return (
			<>
				<span className="hero-badge" aria-hidden="true">
					<span className="badge-sizer">
						<span className="badge-icon">
							<LongestIcon size={14} />
						</span>
						<span>{LONGEST_DESIGNATION}</span>
					</span>
					<span className="badge-visible">
						<span className="badge-icon">
							<Icon size={14} />
						</span>
						<span>{DESIGNATIONS[0]}</span>
					</span>
				</span>
				<span className="sr-only">{DESIGNATIONS.join(", ")}</span>
			</>
		);
	}

	const letters = segmentGraphemes(word).slice(0, shown);

	return (
		<>
			{/* Per-letter entrance + clean word exit. glass.css has no keyframes
			    for these, so they live here, scoped to this island. */}
			<style dangerouslySetInnerHTML={{ __html: `@keyframes badge-letter-in { from { opacity: 0; transform: translateY(6px); filter: blur(2px); } to { opacity: 1; transform: translateY(0); filter: blur(0); } }
@keyframes badge-word-exit { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(-6px); } }` }} />
			<span className="hero-badge" aria-hidden="true">
				{/* Invisible sizer (longest designation + cursor replica)
				    reserves the badge width so it never grows/shrinks
				    while typing; the live word is centered over it. */}
				<span className="badge-sizer">
					<span className="badge-icon">
						<LongestIcon size={14} />
					</span>
					<span>{LONGEST_DESIGNATION}</span>
					<span className="badge-cursor" />
				</span>
				<span className="badge-visible">
					<span className="badge-icon">
						<Icon size={14} />
					</span>
					<span
						style={
							exiting
								? { animation: "badge-word-exit 300ms ease forwards" }
								: undefined
						}
					>
						{letters.map((ch, i) => (
							<span
								key={i}
								style={{
									display: "inline-block",
									animation:
										"badge-letter-in 300ms cubic-bezier(0.22,1,0.36,1) both",
								}}
							>
								{ch === " " ? " " : ch}
							</span>
						))}
					</span>
					{!exiting && <span className="badge-cursor" />}
				</span>
			</span>
			{/* SEO: every designation in the DOM. The visible badge above is
			    aria-hidden; this list is the accessible text, and the
			    non-active designations are additionally present as
			    visually hidden spans. */}
			<span className="sr-only">{DESIGNATIONS.join(", ")}</span>
			{DESIGNATIONS.map((d, i) =>
				i === index ? null : (
					<span key={d} className="sr-only" aria-hidden="true">
						{d}
					</span>
				),
			)}
		</>
	);
}
