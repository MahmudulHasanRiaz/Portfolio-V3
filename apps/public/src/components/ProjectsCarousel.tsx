import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { MouseEvent, PointerEvent, TouchEvent } from "preact/compat";
import { ChevronLeft, ChevronRight } from "lucide-react";
// truncateShort lives in lib/text.ts (no astro:content) — a client
// island cannot import lib/content.ts (server-only astro:content).
import { truncateShort } from "../lib/text";
import { getDict, langUrl, type ProjectsCarouselDict, type Lang } from "../lib/i18n";
import {
	optimizedImageUrl,
	optimizedSrcset,
	unsplashSrcset,
} from "../lib/images";

// Projects carousel — stacked deck ported from the approved React preview.
// The page renders the section wrapper (heading + "View all projects →");
// this island renders the deck, the indicator row and (mobile only) the
// flip controls. No auto-rotation: slides change only on user action.
//
// MOBILE (< 640px): single-card carousel, one at a time, page-flip.
// GRID (>= 640px): 2-per-row at 640–1023px, 3-per-row at >= 1024px,
// all projects visible, staggered reveal entrance + hover lift —
// no one-at-a-time flip, no dots/chevrons. (Desktop 3-col grid is the
// user's 2026-11-08 decision; the 2-col tablet grid reuses the
// .projects-grid CSS that already existed for 640px+.)

export interface CarouselProject {
	slug: string;
	title: string;
	description: string;
	tags: string[];
	techs: string[];
	thumbnail?: string | null;
	thumbnailType?: string | null;
	/** Silent card-preview playback for a video thumbnail. Absent =
	    autoplay (muted loop); false = first frame only. */
	thumbnailAutoplay?: boolean | null;
}

interface Props {
	projects: CarouselProject[];
	lang?: Lang;
	/** Subset dict only (Issue 7B) — the 5 keys the carousel reads. */
	dict?: ProjectsCarouselDict;
}

// Unsplash card thumbs ship at w=1200 in content/API rows but render at
// ~360px wide (2x retina ≈ 720px) — request w=800/q=75 instead: measured
// 124KB → 67KB per image (~46% less). A files.riaz.com.bd thumb goes
// through /api/image at the same width; any other URL passes through.
const sizedThumb = (url: string | null | undefined, w = 800) =>
	url?.includes("images.unsplash.com")
		? url.replace(/w=\d+/, `w=${w}`).replace(/q=\d+/, "q=75")
		: optimizedImageUrl(url, w);
// Carousel srcset: Unsplash w= rewrite, else the /api/image srcset,
// else none — the <img> keeps its plain src in that case.
const carouselSrcset = (url: string | null | undefined) =>
	unsplashSrcset(url, [360, 720, 1080]) ??
	optimizedSrcset(url, [360, 720, 1024]);

const SWIPE_THRESHOLD = 28;
// Page-flip (preview): one 0.52s turn around the RIGHT edge (the spine),
// rotateY 0 → +104deg, opacity 1 → 0.2, on a soft paper ease.
// The flip travels LEFT-to-RIGHT: the card's free (left) edge lifts
// toward the viewer and sweeps right, pivoting on the right spine.
const FLIP_MS = 520;
const FLIP_EASE = "cubic-bezier(0.35, 0.55, 0.35, 1)";
const PEEK_COUNT = 3;
// Grid from 640px: a 640–1039px-wide browser window has a viewport
// below 1024px once the ~15px scrollbar is subtracted, so a 1024px
// query kept showing the mobile single-card carousel at desktop-ish
// widths. 640px matches the .projects-grid CSS (2-col from 640px,
// 3-col from 1024px) and the carousel image sizes (50vw at 640–1023px).
const GRID_QUERY = "(min-width: 640px)";

export default function ProjectsCarousel({ projects, lang = "en", dict }: Props) {
	const t = dict ?? getDict(lang);
	const [index, setIndex] = useState(0);
	const [leaving, setLeaving] = useState<1 | -1 | null>(null);
	const [entering, setEntering] = useState(false);
	const [reducedMotion, setReducedMotion] = useState(false);
	const [isGrid, setIsGrid] = useState(false);
	// Pre-hydration skeleton: false until the island mounts, so the
	// section shows glass skeleton cards (same footprint as the real
	// layout — 1 card below 640px, 6 cards in the grid from 640px)
	// while the carousel JS loads instead of a blank gap.
	const [ready, setReady] = useState(false);
	const [loadedThumbs, setLoadedThumbs] = useState<Record<string, boolean>>({});
	const timer = useRef<number | null>(null);
	const raf1 = useRef<number | null>(null);
	const raf2 = useRef<number | null>(null);
	const dragStart = useRef<{ x: number; y: number } | null>(null);
	const suppressClick = useRef(false);

	const count = projects.length;
	const current = projects[index];
	const flipping = leaving !== null || entering;

	// Dots are CAPPED: at most MAX_DOTS dots ever render, no matter how
	// many projects the carousel receives. The homepage caps at 6 today,
	// but this component must hold everywhere — even if that limit is
	// ever raised or the carousel is reused elsewhere. At or below the
	// cap every dot shows (6 dots at the current homepage size, exactly
	// as today). Above the cap a sliding window of MAX_DOTS dots follows
	// the current slide; the counter ("1 of N") always carries the exact
	// position, and each shown dot navigates to its real project index.
	const MAX_DOTS = 6;
	const dotStart =
		count <= MAX_DOTS
			? 0
			: Math.min(Math.max(index - 2, 0), count - MAX_DOTS);
	const dotIndices = Array.from(
		{ length: Math.min(count, MAX_DOTS) },
		(_, i) => dotStart + i,
	);

	useEffect(() => {
		setReady(true);
		const motionMq = window.matchMedia("(prefers-reduced-motion: reduce)");
		setReducedMotion(motionMq.matches);
		const onMotionChange = (e: MediaQueryListEvent) =>
			setReducedMotion(e.matches);
		motionMq.addEventListener("change", onMotionChange);

		const gridMq = window.matchMedia(GRID_QUERY);
		setIsGrid(gridMq.matches);
		const onGridChange = (e: MediaQueryListEvent) =>
			setIsGrid(e.matches);
		gridMq.addEventListener("change", onGridChange);

		return () => {
			motionMq.removeEventListener("change", onMotionChange);
			gridMq.removeEventListener("change", onGridChange);
		};
	}, []);

	useEffect(
		() => () => {
			if (timer.current !== null) window.clearTimeout(timer.current);
			if (raf1.current !== null) window.cancelAnimationFrame(raf1.current);
			if (raf2.current !== null) window.cancelAnimationFrame(raf2.current);
		},
		[],
	);

	const moveTo = useCallback(
		(target: number, dir: 1 | -1) => {
			if (count <= 1 || leaving !== null || entering) return;
			const next = (target + count) % count;
			if (next === index) return;
			if (reducedMotion) {
				setIndex(next);
				return;
			}
			// Page-flip, two beats around the RIGHT edge (the spine).
			// Beat 1: the outgoing card turns away, rotateY 0 → +104deg,
			// opacity 1 → 0.2, over 0.52s. The peek pages fade out while
			// the card is turning, so no second image can ghost through
			// the fading card (no cross-fade / double exposure).
			setLeaving(dir);
			timer.current = window.setTimeout(() => {
				// Beat 2: swap the content while the card is edge-on,
				// then turn the incoming card in from the same edge.
				// The incoming card is painted at +104deg first (double
				// rAF guarantees a paint), then the transition carries it
				// to flat — a real entrance, not a silent swap.
				setIndex(next);
				setLeaving(null);
				setEntering(true);
				raf1.current = window.requestAnimationFrame(() => {
					raf2.current = window.requestAnimationFrame(() => {
						setEntering(false);
					});
				});
			}, FLIP_MS);
		},
		[count, index, leaving, entering, reducedMotion],
	);

	const go = useCallback(
		(dir: 1 | -1) => moveTo(index + dir, dir),
		[index, moveTo],
	);

	const goTo = useCallback(
		(target: number) => moveTo(target, target > index ? 1 : -1),
		[index, moveTo],
	);

	// Swipe: pointer events for mouse/pen, touch events for touch.
	// Pointer events are ignored for touch so a swipe never fires twice.
	// A drag only counts as a swipe when it is mostly horizontal
	// (|dx| > |dy|) — a vertical scroll must never flip the card.
	const finishDrag = (dx: number, dy: number) => {
		dragStart.current = null;
		if (Math.abs(dx) >= SWIPE_THRESHOLD && Math.abs(dx) > Math.abs(dy)) {
			suppressClick.current = true;
			go(dx < 0 ? 1 : -1);
		}
	};

	const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (e.pointerType === "touch") return;
		dragStart.current = { x: e.clientX, y: e.clientY };
	};

	const onPointerUp = (e: PointerEvent<HTMLDivElement>) => {
		if (e.pointerType === "touch" || !dragStart.current) return;
		const dx = e.clientX - dragStart.current.x;
		const dy = e.clientY - dragStart.current.y;
		finishDrag(dx, dy);
	};

	const onTouchStart = (e: TouchEvent<HTMLDivElement>) => {
		const touch = e.touches[0];
		if (touch) dragStart.current = { x: touch.clientX, y: touch.clientY };
	};

	const onTouchEnd = (e: TouchEvent<HTMLDivElement>) => {
		const touch = e.changedTouches[0];
		if (!touch || !dragStart.current) return;
		const dx = touch.clientX - dragStart.current.x;
		const dy = touch.clientY - dragStart.current.y;
		finishDrag(dx, dy);
	};

	const onTouchCancel = () => {
		dragStart.current = null;
	};

	const onClickCapture = (e: MouseEvent<HTMLDivElement>) => {
		if (suppressClick.current) {
			e.preventDefault();
			e.stopPropagation();
			suppressClick.current = false;
		}
	};

	if (count === 0 || !current) {
		return <p className="empty-state">{t.emptyProjects}</p>;
	}

	// Skeleton while the island hydrates — same footprint as the real
	// layout, glass shimmer (loading.css), no layout jump when the real
	// cards land: 6 cards so the grid (2 rows) is covered; CSS hides
	// cards 2–6 below 640px where only one carousel card shows.
	if (!ready) {
		return (
			<div className="skel-grid" role="status" aria-label={t.loadingProjects}>
				{[0, 1, 2, 3, 4, 5].map((i) => (
					<div key={i} className="skel-card" aria-hidden="true">
						<div className="skel skel-thumb" />
						<div className="skel-body">
							<div className="skel skel-line skel-line--title" />
							<div className="skel skel-line" />
							<div className="skel skel-line skel-line--short" />
						</div>
					</div>
				))}
			</div>
		);
	}

	const markThumbLoaded = (slug: string) =>
		setLoadedThumbs((prev) => (prev[slug] ? prev : { ...prev, [slug]: true }));

	// GRID: 2-per-row at 640–1023px, 3-per-row at >= 1024px, with a
	// staggered fade+rise reveal. No carousel, no dots, no chevrons —
	// every project is visible.
	if (isGrid) {
		return (
			<div className="projects-grid">
				{projects.map((project, i) => (
					<a
						key={project.slug}
						className="grid-card projects-grid-card"
						href={langUrl(`/projects/${project.slug}`, lang)}
						style={{ animationDelay: `${i * 80}ms` }}
					>
						<div className="grid-thumb">
							{project.thumbnail ? (
								project.thumbnailType === "video" ? (
									<video
										src={project.thumbnail}
										aria-label={project.title}
										muted
										loop
										playsInline
										autoPlay={project.thumbnailAutoplay !== false}
										preload="metadata"
										className={loadedThumbs[project.slug] ? "img-loaded" : undefined}
										onLoadedData={() => markThumbLoaded(project.slug)}
										onError={() => markThumbLoaded(project.slug)}
									/>
								) : (
									<img
										src={sizedThumb(project.thumbnail)}
										srcSet={carouselSrcset(project.thumbnail)}
										sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 360px"
										alt={project.title}
										width="800"
										height="500"
										loading="lazy"
										decoding="async"
										className={loadedThumbs[project.slug] ? "img-loaded" : undefined}
										onLoad={() => markThumbLoaded(project.slug)}
										onError={() => markThumbLoaded(project.slug)}
									/>
								)
							) : (
								<span className="thumb-fallback" aria-hidden="true">
									{project.title.charAt(0)}
								</span>
							)}
						</div>
						<div className="grid-body">
							<h3>{project.title}</h3>
							<p>{truncateShort(project.description)}</p>
							{project.tags.length > 0 && (
								<div className="tag-row">
									{project.tags.map((tag) => (
										<span key={tag} className="tag">
											{tag}
										</span>
									))}
								</div>
							)}
						</div>
					</a>
				))}
			</div>
		);
	}

	// MOBILE: single-card carousel with the page-flip.
	return (
		<div className="projects-carousel">
			{/* Split-arrow controls: minimal bare chevrons, no filled
			    circle, no border, no shadow — Prev on the LEFT, Next on
			    the RIGHT, flanking the centred dots + counter. Scoped
			    here (not glass.css) so parallel workers never clash. */}
			<style dangerouslySetInnerHTML={{ __html: `
				.deck-arrow {
					width: 40px;
					height: 40px;
					flex: none;
					display: inline-flex;
					align-items: center;
					justify-content: center;
					padding: 0;
					border: 0;
					background: transparent;
					box-shadow: none;
					color: var(--ink-dim);
					cursor: pointer;
					border-radius: 50%;
					transition: color 180ms ease, opacity 180ms ease, transform 180ms ease;
				}
				.deck-arrow:hover:not(:disabled) { color: var(--accent); }
				.deck-arrow:active:not(:disabled) { transform: scale(0.92); }
				.deck-arrow:disabled { opacity: 0.3; cursor: default; }
				.deck-arrow:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
				.deck-arrow--prev { justify-self: start; }
				.deck-arrow--next { justify-self: end; }
			` }} />
			<div
				className={`deck${flipping ? " deck--flipping" : ""}`}
				role="region"
				aria-roledescription="carousel"
				aria-label={t.projectsTitle}
				style={{
					touchAction: "pan-y",
					// Reserve for the left-fanning peek stack (deepest peek
					// overhangs ~18px left after the 0.94 scale pull-in, a
					// few px below): 20px left / 18px below is enough, so
					// the main card is wider and the deck eats less height
					// than the old 30px / 26px reserves.
					margin: "4px 4px 18px 20px",
				}}
				onPointerDown={onPointerDown}
				onPointerUp={onPointerUp}
				onPointerCancel={() => {
					dragStart.current = null;
				}}
				onTouchStart={onTouchStart}
				onTouchEnd={onTouchEnd}
				onTouchCancel={onTouchCancel}
				onClickCapture={onClickCapture}
			>
				{[1, 2, 3].map((depth) => {
					if (count <= depth) return null;
					const peek = projects[(index + depth) % count];
					if (!peek) return null;
					// Stacked pages, right → left: every page behind the
					// main card pivots on the RIGHT edge (the spine) and
					// steps further LEFT and slightly down, so the pages
					// fan out to the left in a clear right-to-left
					// progression — the side the flipping card came from.
					// TIGHT stack (preview): each peek is a little smaller
					// than the card (scale 0.98 / 0.96 / 0.94) and steps
					// only 12px left / 5px down per depth, so the stack
					// reads as close, compact pages — never a loose fan.
					return (
						<div
							key={`${peek.slug}-${depth}`}
							className="deck-peek"
							aria-hidden="true"
							style={{
								transform: `translate(${-depth * 12}px, ${depth * 5}px) rotate(${-depth * 1}deg) scale(${1 - depth * 0.02})`,
								transformOrigin: "right center",
								opacity: 1 - depth * 0.18,
								zIndex: PEEK_COUNT - depth,
							}}
						>
							{peek.thumbnail ? (
								peek.thumbnailType === "video" ? (
									<div className="deck-peek-thumb">
										<video
											src={peek.thumbnail}
											aria-hidden="true"
											muted
											loop
											playsInline
											preload="metadata"
										/>
									</div>
								) : (
									<div
										className="deck-peek-thumb"
										style={{
											backgroundImage: `url(${sizedThumb(peek.thumbnail)})`,
										}}
									/>
								)
							) : (
								<div className="deck-peek-thumb deck-peek-thumb--empty" />
							)}
							<div className="deck-peek-lines" aria-hidden="true">
								<span className="deck-peek-line deck-peek-line--title" />
								<span className="deck-peek-line" />
								<span className="deck-peek-line deck-peek-line--short" />
							</div>
						</div>
					);
				})}
				<a
					className="deck-card"
					href={langUrl(`/projects/${current.slug}`, lang)}
					style={{
						zIndex: 10,
						transformStyle: "preserve-3d",
						transformOrigin: "right center",
						backfaceVisibility: "hidden",
						transition: `transform ${FLIP_MS}ms ${FLIP_EASE}, opacity ${FLIP_MS}ms ${FLIP_EASE}`,
						...(leaving !== null || entering
							? {
									transform: "rotateY(104deg)",
									opacity: 0.2,
								}
							: {}),
					}}
				>
					<div className="deck-thumb">
						{current.thumbnail ? (
							current.thumbnailType === "video" ? (
								<video
									src={current.thumbnail}
									aria-label={current.title}
									muted
									loop
									playsInline
									autoPlay={current.thumbnailAutoplay !== false}
									preload="metadata"
									className={loadedThumbs[current.slug] ? "img-loaded" : undefined}
									onLoadedData={() => markThumbLoaded(current.slug)}
									onError={() => markThumbLoaded(current.slug)}
								/>
							) : (
								<img
									src={sizedThumb(current.thumbnail)}
									srcSet={carouselSrcset(current.thumbnail)}
									sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 360px"
									alt={current.title}
									width="800"
									height="500"
									loading="lazy"
									decoding="async"
									className={loadedThumbs[current.slug] ? "img-loaded" : undefined}
									onLoad={() => markThumbLoaded(current.slug)}
									onError={() => markThumbLoaded(current.slug)}
								/>
							)
						) : (
							<span className="thumb-fallback" aria-hidden="true">
								{current.title.charAt(0)}
							</span>
						)}
					</div>
					<div className="deck-body">
						<h3>{current.title}</h3>
						<p>{truncateShort(current.description)}</p>
						{current.tags.length > 0 && (
							<div className="tag-row">
								{current.tags.map((tag) => (
									<span key={tag} className="tag">
										{tag}
									</span>
								))}
							</div>
						)}
					</div>
				</a>
			</div>

			<div className="deck-indicator">
				<button
					type="button"
					className="deck-arrow deck-arrow--prev"
					onClick={() => go(-1)}
					disabled={count <= 1 || flipping}
					aria-label={t.previousProject}
					aria-busy={flipping}
				>
					<ChevronLeft size={20} />
				</button>
				<div className="deck-indicator-center">
					<div className="deck-dots">
						{dotIndices.map((realIndex) => {
							const project = projects[realIndex];
							if (!project) return null;
							return (
								<button
									key={project.slug}
									type="button"
									className={`deck-dot${realIndex === index ? " active" : ""}`}
									onClick={() => goTo(realIndex)}
									disabled={flipping}
									aria-label={
										lang === "bn"
											? `${project.title} দেখান`
											: `Show ${project.title}`
									}
									aria-current={realIndex === index}
								/>
							);
						})}
					</div>
					<span className="deck-counter">
						{lang === "bn"
							? `${(index + 1).toLocaleString("bn-BD")} / ${count.toLocaleString("bn-BD")}`
							: `${index + 1} of ${count}`}
					</span>
				</div>
				<button
					type="button"
					className="deck-arrow deck-arrow--next"
					onClick={() => go(1)}
					disabled={count <= 1 || flipping}
					aria-label={t.nextProject}
					aria-busy={flipping}
				>
					<ChevronRight size={20} />
				</button>
			</div>
		</div>
	);
}
