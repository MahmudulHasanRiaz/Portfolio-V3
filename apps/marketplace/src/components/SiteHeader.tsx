import { useEffect, useRef, useState } from "preact/hooks";
import {
	Check,
	ChevronDown,
	Code,
	Home,
	Menu,
	Moon,
	Sun,
	User,
	X,
} from "lucide-react";
import {
	langUrl,
	otherLangUrl,
	SITE_LANG_KEY,
	type SiteHeaderDict,
	type Lang,
} from "../lib/i18n";

export type ProfileId = "se" | "knowme";

// Language switcher (bilingual): the corner button is a plain <a> to
// the SAME page in the other language — no JS navigation, so it works
// without JS and crawlers can follow it. Clicking stores the choice
// (localStorage `site-lang`) BEFORE navigating, so the first-visit
// script in Layout.astro never overrides an explicit choice. The URL
// the visitor is on always wins over any stored preference.
interface SiteHeaderProps {
	/** Profile this page belongs to. Unset → `defaultProfile`. */
	current?: ProfileId;
	/** Admin-configured primary identity default, resolved in Layout
	    from settings (Wave 2 A1). The pill label and the picker's
	    active row sit on exactly this profile — or on the profile the
	    visitor tapped (which arrives here as `current` via the page
	    it navigated to). The pill label is FROZEN on this profile
	    (2026-11-13): it never changes on its own. */
	defaultProfile?: ProfileId;
	lang: Lang;
	currentPath: string;
	/** Subset dict only (Issue 7B) — the 12 nav/profile/theme keys. */
	dict: SiteHeaderDict;
}

// Label FROZEN (2026-11-13, user decision): the pill label shows the
// active profile (the admin default, or the profile the visitor tapped)
// and NEVER changes on its own. The old label animation cycled between
// the two profile names every ~2.8s (text only, no navigation) — that
// auto-rotation timer and all of its pause/resume machinery are removed
// entirely; do not re-add them. There is NO auto-rotation timer and NO
// navigation here. Tapping a profile in the picker navigates to that
// profile's route — the visitor's deliberate choice — and the pill then
// shows the newly active profile.

/**
 * Site header — a profile switcher, not a designation display.
 * Top row (not sticky): language switcher left, theme switcher right.
 * Below it, a sticky compact glass pill (hamburger + profile label +
 * teal dot + chevron + nav links) with glowing teal arcs hanging above it.
 * On scroll the header becomes one unified sticky row: the two corner
 * buttons join the pill on the same baseline, at the far edges.
 *
 * The pill LABEL is frozen on the active profile (the admin default
 * unless the visitor tapped another profile in the picker); it NEVER
 * changes on its own. The label NEVER navigates the page by itself.
 */
export default function SiteHeader({
	current,
	defaultProfile = "se",
	lang,
	currentPath,
	dict,
}: SiteHeaderProps) {
	// The active profile: the page's own profile when it declares one,
	// else the admin default (Layout already resolves the same fallback
	// into `current`; this keeps the header correct even if a future
	// page renders it without one). Exactly ONE profile is active —
	// the picker checkmark and the pill's initial label both use this.
	const activeProfile: ProfileId = current ?? defaultProfile;
	const PROFILES: Array<{
		id: ProfileId;
		label: string;
		href: string;
		icon: typeof Code;
	}> = [
		{
			id: "se",
			label: dict.profileSe,
			href: langUrl("/", lang),
			icon: Code,
		},
		{
			id: "knowme",
			label: dict.profileKnowMe,
			href: langUrl("/know-me", lang),
			icon: User,
		},
	];

	const NAV_LINKS: Array<{
		label: string;
		href: string;
		/** Sub-menu items (desktop dropdown + nested mobile rows). */
		children?: Array<{ label: string; href: string }>;
	}> = [
		{
			label: dict.navWork,
			href: langUrl("/#projects", lang),
			children: [
				{ label: dict.navProjects, href: langUrl("/projects", lang) },
				{
					label: dict.navCaseStudies,
					href: langUrl("/case-studies", lang),
				},
				{ label: dict.navPosts, href: langUrl("/posts", lang) },
			],
		},
		{ label: dict.navVentures, href: langUrl("/ventures", lang) },
		{ label: dict.navReleases, href: langUrl("/releases", lang) },
		{ label: dict.navAbout, href: langUrl("/know-me", lang) },
		// MARKETPLACE COPY: no Contact nav link — there is no contact
		// section and no contact modal on this copy (see
		// docs/MARKETPLACE.md). The public site's Contact link
		// (/#contact) is deliberately not mirrored here.
	];

	const [stuck, setStuck] = useState(false);
	// TWO panels, ONE state (preview App.tsx:172): the hamburger opens
	// the mobile nav MENU, the chevron / profile label opens the profile
	// PICKER. A single `panel` value makes them mutually exclusive by
	// construction — they can never be open together. (The live site
	// previously had only a `pickerOpen` boolean and the hamburger
	// toggled the picker, so mobile had no header navigation at all.)
	const [panel, setPanel] = useState<"menu" | "picker" | null>(null);
	const [panelShown, setPanelShown] = useState(false);
	const closeTimer = useRef<number | null>(null);
	const [theme, setTheme] = useState<"light" | "dark">("light");
	// FROZEN label (2026-11-13): the pill shows the active profile and
	// never changes on its own — no displayed/prev profile state, no
	// crossfade machinery, no rotation timer. The label below renders
	// `currentProfile` directly. The pill width never shifts: the label
	// button is a fixed width (160/176/224px, preview w-40/44/56).

	useEffect(() => {
		const onScroll = () => setStuck(window.scrollY > 24);
		onScroll();
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	}, []);

	// Scroll restoration: never let the browser restore a scroll
	// position that leaves the header stuck. NOTE: there is NO
	// window.scrollTo(0, 0) here on purpose — the scroll listener
	// below already sets `stuck` from the current scrollY on mount,
	// so the header state is correct without forcing the page to
	// the top. Forcing scroll-to-top on mount yanked the page to 0
	// whenever the island hydrated late (e.g. a visitor who had
	// already scrolled to the globe was bounced back to the top
	// a few seconds after load). "manual" restoration alone keeps
	// navigations at the top without touching the user's scroll.
	useEffect(() => {
		try {
			if ("scrollRestoration" in history) {
				history.scrollRestoration = "manual";
			}
		} catch {
			/* history API unavailable */
		}
	}, []);

	// Theme restore on mount (2026-11-09 navigation fix): the island
	// re-mounts on EVERY View Transition navigation, and Astro's
	// swapRootAttributes() strips the JS-set data-theme from <html> on
	// every swap. The head script only re-runs on the 1st client
	// navigation, so without this the page falls back to
	// prefers-color-scheme (dark on a system-dark phone) from the 2nd
	// in-app navigation on. Writing the attribute here — React state
	// alone never touches it — keeps the rendered theme in sync with
	// the stored choice on every page. (Layout.astro's
	// astro:page-load handler re-applies it too; both are idempotent.)
	useEffect(() => {
		try {
			const saved = localStorage.getItem("theme");
			const resolved =
				saved === "light" || saved === "dark"
					? saved
					: window.matchMedia("(prefers-color-scheme: dark)").matches
						? "dark"
						: "light";
			setTheme(resolved);
			document.documentElement.setAttribute("data-theme", resolved);
		} catch {
			/* storage unavailable */
		}
	}, []);

	// Panels fade in on open and out on close (~240ms, preview):
	// mount first, flip `panelShown` a frame later; on close, reverse
	// and unmount after the fade. The fade is opacity-only (inline
	// style on each panel) so it never fights the picker's
	// `translateX(-50%)` centering in glass.css.
	useEffect(() => {
		if (!panel) return;
		const t = window.setTimeout(() => setPanelShown(true), 24);
		return () => window.clearTimeout(t);
	}, [panel]);

	useEffect(() => {
		return () => {
			if (closeTimer.current) window.clearTimeout(closeTimer.current);
		};
	}, []);

	const openPanel = (p: "menu" | "picker") => {
		if (closeTimer.current) {
			window.clearTimeout(closeTimer.current);
			closeTimer.current = null;
		}
		setPanel(p);
	};

	const closePanel = () => {
		setPanelShown(false);
		if (closeTimer.current) window.clearTimeout(closeTimer.current);
		closeTimer.current = window.setTimeout(() => setPanel(null), 240);
	};

	const togglePanel = (p: "menu" | "picker") => {
		if (panel === p) closePanel();
		else openPanel(p);
	};

	// Escape closes whichever panel is open (preview).
	useEffect(() => {
		if (!panel) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") closePanel();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [panel]);

	const toggleTheme = () => {
		// Current theme from the source of truth — stored choice, else
		// the rendered data-theme, else system preference. Never from
		// this island's state: the island re-mounts on every View
		// Transition navigation (state restarts "light"), so a toggle
		// that trusted state could flip the wrong way. (2026-11-10:
		// the theme/language order bug itself was the full stylesheet
		// going missing after navigation — the toggle was already
		// correct — but it must not depend on state regardless.)
		const saved = (() => {
			try {
				return localStorage.getItem("theme");
			} catch {
				return null;
			}
		})();
		const dom = document.documentElement.getAttribute("data-theme");
		const current: "light" | "dark" =
			saved === "light" || saved === "dark"
				? saved
				: dom === "dark" || dom === "light"
					? dom
					: window.matchMedia("(prefers-color-scheme: dark)").matches
						? "dark"
						: "light";
		const next = current === "dark" ? "light" : "dark";
		setTheme(next);
		try {
			localStorage.setItem("theme", next);
		} catch {
			/* storage unavailable */
		}
		document.documentElement.setAttribute("data-theme", next);
	};

	// Language switch: the button is a plain link to the same page in
	// the other language. Store the explicit choice BEFORE navigating
	// so the first-visit script never overrides it.
	const targetLang: Lang = lang === "en" ? "bn" : "en";
	const switchHref = otherLangUrl(currentPath, lang);
	const onLangClick = () => {
		try {
			localStorage.setItem(SITE_LANG_KEY, targetLang);
		} catch {
			/* storage unavailable — the URL still switches language */
		}
	};

	// Tapping a profile in the picker navigates there if it is not
	// current — the visitor's deliberate choice. The pill then shows
	// the newly active profile (the page it navigated to carries it
	// as `current`).
	const pickProfile = (p: (typeof PROFILES)[number]) => {
		closePanel();
		if (p.id !== activeProfile) {
			window.location.href = p.href;
		}
	};

	const currentProfile =
		PROFILES.find((p) => p.id === activeProfile) ?? PROFILES[0]!;
	const CurrentProfileIcon = currentProfile.icon;

	// The corner buttons exist TWICE (top row + stuck-row copies, like
	// the preview). The hidden set is inert (tabIndex -1) so keyboard
	// users never tab into an invisible button.
	// Accessible name must contain the visible label ("BN"/"EN" on
	// mobile, "EN/BN" on desktop) — label-content-name-mismatch.
	const langLabel = `${dict.switchLanguage} — EN/BN`;
	const langBtn = (inert: boolean) => (
		<a
			className="corner-btn"
			tabIndex={inert ? -1 : undefined}
			href={switchHref}
			onClick={onLangClick}
			aria-label={langLabel}
			title={langLabel}
		>
			<span className="lang-mobile">{lang === "en" ? "BN" : "EN"}</span>
			<span className="lang-desktop">EN/BN</span>
		</a>
	);

	const themeBtn = (inert: boolean) => (
		<button
			type="button"
			className="corner-btn"
			tabIndex={inert ? -1 : undefined}
			onClick={toggleTheme}
			aria-label={theme === "dark" ? dict.switchToLight : dict.switchToDark}
		>
			{/* Crossfading icon swap: both icons stay mounted and swap
			    with a 300ms rotate/scale/opacity transition. */}
			<span className="theme-icon-wrap" aria-hidden="true">
				<span className={`theme-icon${theme === "dark" ? " active" : ""}`}>
					<Sun size={16} />
				</span>
				<span className={`theme-icon${theme === "light" ? " active" : ""}`}>
					<Moon size={16} />
				</span>
			</span>
		</button>
	);

	// Connecting arcs (preview): TWO separate arcs, one in each gap
	// between the pill and a corner button, arching UP (hill) from the
	// pill's edge to the button — the three header pieces read as ONE
	// connected composition. Each arc is absolutely positioned on the
	// pill (right/left: 100%), 54px tall, top: 50% with a -72%
	// vertical shift, so it hangs above the pill row in BOTH states
	// and never strikes through page content. Widths: 32px <420px,
	// 44px ≥420px, 96px ≥640px, 112px ≥1024px. Base opacity 0.16,
	// flowing light 0.55, dasharray 64/336 of pathLength 400, 4s loop,
	// right arc half a cycle behind (-2s). The old single 96px SVG
	// centred above the pill connected to NOTHING — that is why the
	// designer saw "no connecting lines" in all four states.
	const arcs = (
		<>
			<svg
				className="header-arc header-arc-left"
				viewBox="0 0 100 54"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<path className="arc-base" d="M100 44 C62 42 48 14 4 12" />
				<path
					className="arc-flow"
					d="M100 44 C62 42 48 14 4 12"
					pathLength={400}
				/>
			</svg>
			<svg
				className="header-arc header-arc-right"
				viewBox="0 0 100 54"
				preserveAspectRatio="none"
				aria-hidden="true"
			>
				<path className="arc-base" d="M0 44 C38 42 52 14 96 12" />
				<path
					className="arc-flow"
					d="M0 44 C38 42 52 14 96 12"
					pathLength={400}
				/>
			</svg>
		</>
	);

	// The picker holds ONLY the two profile options (preview): the nav
	// links live in the pill itself on desktop (and in the mobile menu
	// panel below), never duplicated in the dropdown. The selected
	// profile carries a teal checkmark (not a dot). There is no resume
	// button: the label is frozen (2026-11-13), so there is nothing
	// to resume.
	const picker = panel === "picker" ? (
		<div
			className="header-picker"
			role="menu"
			aria-label={dict.chooseProfile}
			style={{
				opacity: panelShown ? 1 : 0,
				transition: "opacity 240ms ease-out",
				pointerEvents: panelShown ? undefined : "none",
			}}
		>
			<p
				style={{
					margin: "4px 10px 8px",
					// A11y (2026-11-09): 11 → 12px. Ink-dim already
					// passes contrast (5.36:1 light / 7.98:1 dark).
					fontSize: 12,
					fontWeight: 700,
					letterSpacing: "0.06em",
					textTransform: "uppercase",
					color: "var(--ink-dim)",
				}}
			>
				{dict.chooseProfile}
			</p>
			{PROFILES.map((p) => {
				const Icon = p.icon;
				const active = p.id === activeProfile;
				return (
					<a
						key={p.id}
						href={p.href}
						onClick={(e) => {
							e.preventDefault();
							pickProfile(p);
						}}
						className={`picker-row${active ? " active" : ""}`}
						role="menuitem"
						aria-current={active ? "true" : undefined}
					>
						<span className="picker-icon">
							<Icon size={18} />
						</span>
						<span>{p.label}</span>
						{active ? (
							<span
								className="picker-check"
								aria-hidden="true"
							>
								<Check size={16} />
							</span>
						) : null}
					</a>
				);
			})}
		</div>
	) : null;

	// The mobile nav menu (preview, App.tsx:440-456): the SAME 5
	// NAV_LINKS as the desktop pill nav — same dictionary labels, same
	// language-aware hrefs — so mobile and desktop navigate identically.
	// PLUS a "Home" row first (2026-11-09 home shortcut): the menu is
	// the hamburger's panel, so the home shortcut lives WITH the
	// hamburger — nothing new is added to the header pill itself. The
	// Home row carries a Lucide Home icon (like the picker rows) so it
	// reads as a destination at a glance; the other rows stay text-only,
	// exactly as the preview has them. The desktop pill nav below is
	// untouched (no Home link there — the menu is mobile-only).
	// A link with `children` (Work) renders its sub-menu items as
	// nested, indented rows directly beneath it (2026-11-10 nav
	// round) — always visible, never a collapsible accordion — so the
	// archive pages (Projects, Case Studies, Posts) are reachable from
	// the menu without adding a 6th top-level item.
	// NOTE on hrefs: the preview is a single page, so its links are bare
	// anchors (#projects / #ventures / #releases / #about / #contact).
	// The live site is multi-route, so the live NAV_LINKS (which the
	// desktop pill already uses) are absolute instead: Work → /#projects,
	// Ventures → /ventures (the archive route — 2026-11-10 nav round,
	// was /#beyond), Releases → /releases (a route), About → /know-me
	// (a route), Contact → /#contact — all via langUrl, so they work
	// from any page and in either language. Bare #ventures / #releases /
	// #about anchors do NOT exist live and must not be reintroduced here.
	// The panel reuses .header-picker positioning/styling (absolute,
	// below the pill, glass, z-50) and .picker-row rows; .header-menu
	// only adds the mobile-only rule (see the <style> in the header
	// return). Tapping a link closes the panel (preview).
	const menu = panel === "menu" ? (
		<nav
			className="header-picker header-menu"
			aria-label={dict.mobileNav}
			style={{
				opacity: panelShown ? 1 : 0,
				transition: "opacity 240ms ease-out",
				pointerEvents: panelShown ? undefined : "none",
			}}
		>
			<a
				href={langUrl("/", lang)}
				onClick={closePanel}
				className="picker-row"
			>
				<span className="picker-icon">
					<Home size={18} />
				</span>
				<span>{dict.navHome}</span>
			</a>
			{NAV_LINKS.map((l) => (
				<span key={l.label} className="menu-group">
					<a
						href={l.href}
						onClick={closePanel}
						className="picker-row"
					>
						{l.label}
					</a>
					{l.children
						? l.children.map((s) => (
								<a
									key={s.label}
									href={s.href}
									onClick={closePanel}
									className="picker-row picker-subrow"
								>
									{s.label}
								</a>
							))
						: null}
				</span>
			))}
		</nav>
	) : null;

	// The pill: hamburger (mobile nav menu) + profile label (fixed
	// width, frozen on the active profile) + teal dot + chevron
	// (profile picker) + nav links. The two
	// glowing arcs are the pill's own children, absolutely positioned
	// in the gaps beside it (preview) — NOT a decoration above it.
	const pill = (
		<div className="sticky-pill">
			{arcs}
			{/* Hamburger — opens the mobile nav MENU (preview), never the
			    picker. The mark is the preview's own 12px icon in the
			    22px button (App.tsx:353) — the live 18px icon was 50%
			    heavier and read as a chunky button. Both marks stay
			    mounted and crossfade (opacity + scale + rotate, 200ms)
			    so open → X is a smooth morph, never a swap flash. */}
			<button
				type="button"
				className="pill-menu-btn pill-hamb-btn"
				onClick={() => togglePanel("menu")}
				aria-label={panel === "menu" ? dict.closeMenu : dict.openMenu}
				aria-expanded={panel === "menu"}
			>
				<span className="hamb-morph" aria-hidden="true">
					<span
						className={`hamb-icon hamb-icon--menu${
							panel === "menu" ? "" : " is-active"
						}`}
					>
						<Menu size={12} />
					</span>
					<span
						className={`hamb-icon hamb-icon--x${
							panel === "menu" ? " is-active" : ""
						}`}
					>
						<X size={11} />
					</span>
				</span>
			</button>
			<button
				type="button"
				className="pill-profile-btn"
				onClick={() => togglePanel("picker")}
				aria-label={`${dict.chooseProfile} — ${currentProfile.label}`}
				aria-expanded={panel === "picker"}
			>
				{/* Fixed-width label stack (preview w-40/44/56): a single
				    slide showing the active profile — the label is
				    FROZEN (2026-11-13) and never changes on its own.
				    The pill width NEVER shifts, and scrolling never
				    remounts it. */}
				<span className="pill-label-stack" aria-hidden="true">
					<span className="pill-label-slide active">
						<span className="pill-icon">
							<CurrentProfileIcon size={16} />
						</span>
						<span className="pill-label-text">
							{currentProfile.label}
						</span>
						<span className="pill-dot" />
					</span>
				</span>
			</button>
			{/* Chevron — opens the profile PICKER (preview). Its label is
			    the picker's own label, never "Open menu". Rotates 180°
			    while the picker is open (preview). */}
			<button
				type="button"
				className="pill-menu-btn pill-chev-btn"
				onClick={() => togglePanel("picker")}
				aria-label={dict.chooseProfile}
				aria-expanded={panel === "picker"}
			>
				<span
					className="pill-chev"
					style={{
						transform:
							panel === "picker"
								? "rotate(180deg)"
								: undefined,
						transition: "transform 300ms",
					}}
				>
					<ChevronDown size={14} />
				</span>
			</button>
			<nav className="pill-nav" aria-label={dict.primaryNav}>
				{NAV_LINKS.map((l) =>
					l.children ? (
						<span key={l.label} className="nav-dropdown">
							{/* The Work label stays a plain link (existing
							    behavior): it navigates to /#projects, the
							    homepage Projects section. The dropdown
							    panel opens on hover / keyboard focus
							    (glass.css :hover + :focus-within) — no
							    new button or icon in the pill, so the
							    header stays thin and premium. */}
							<a href={l.href}>{l.label}</a>
							<span className="nav-dropdown-panel" role="menu">
								{l.children.map((s) => (
									<a
										key={s.label}
										href={s.href}
										className="nav-dropdown-link"
										role="menuitem"
									>
										{s.label}
									</a>
								))}
							</span>
						</span>
					) : (
						<a key={l.label} href={l.href}>
							{l.label}
						</a>
					),
				)}
			</nav>
			{picker}
			{menu}
		</div>
	);


	return (
		<header className={`site-header${stuck ? " is-stuck" : ""}`}>
			{/* Mobile-only menu rule (preview `md:hidden`): the live
			    stylesheet has no `md:hidden` utility and glass.css is
			    out of scope for this fix, so the one rule lives here,
			    in this file only — it hides the menu panel from md up,
			    matching the hamburger itself (`.pill-hamb-btn` is
			    `display: none` ≥768px in glass.css). The reduced-motion
			    rule keeps the panels' opacity fade off for users who
			    ask for it (preview `motion-reduce:transition-none`). */}
			<style dangerouslySetInnerHTML={{ __html: `
				@media (min-width: 768px) {
					.header-menu {
						display: none;
					}
				}
				@media (prefers-reduced-motion: reduce) {
					.header-menu,
					.header-picker {
						transition: none !important;
					}
				}
			` }} />
			<div className="header-top" aria-hidden={stuck || undefined}>
				{langBtn(stuck)}
				{themeBtn(stuck)}
			</div>
			<div className="pill-stack">
				{pill}
			</div>
			{/* Stuck-row corner buttons: ALWAYS rendered (preview's
			    in-row copies). Unstuck they are collapsed to width 0 +
			    opacity 0; when stuck they expand to full width over
			    350ms, so the normal→sticky transition is one smooth,
			    coordinated move — never an abrupt pop-in. */}
			<div className="stuck-corners" aria-hidden={!stuck || undefined}>
				{langBtn(!stuck)}
				{themeBtn(!stuck)}
			</div>
		</header>
	);
}
