import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { MouseEvent, PointerEvent } from "preact/compat";
import { RotateCw, X } from "lucide-react";
import { getDict, type StackGlobeDict, type Lang } from "../lib/i18n";
import { hasSpriteIcon } from "../lib/icons";
import SpriteIcon from "./SpriteIcon";
import {
	STACK,
	STACK_CATEGORIES,
	WOOCOMMERCE_W_PATH,
	platformIconSrc,
	type StackTech,
} from "../data/site";

// 3D rotating tag sphere — HTML elements (NOT canvas) so every tech name
// stays in the DOM (SEO). Positions come from a Fibonacci sphere; the globe
// auto-rotates and never stops by default — it resumes within ~2s after a
// detail card closes, after drag/snap, and ~2.6s after Spin. Only
// prefers-reduced-motion stops it (static by design).

interface Vec {
	x: number;
	y: number;
	z: number;
}

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function fibonacciSphere(n: number): Vec[] {
	const pts: Vec[] = [];
	for (let i = 0; i < n; i++) {
		const y = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
		const r = Math.sqrt(Math.max(0, 1 - y * y));
		const theta = GOLDEN_ANGLE * i;
		pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
	}
	return pts;
}

function rotatePoint(p: Vec, rotX: number, rotY: number): Vec {
	const cosY = Math.cos(rotY);
	const sinY = Math.sin(rotY);
	const x1 = p.x * cosY + p.z * sinY;
	const z1 = -p.x * sinY + p.z * cosY;
	const cosX = Math.cos(rotX);
	const sinX = Math.sin(rotX);
	const y2 = p.y * cosX - z1 * sinX;
	const z2 = p.y * sinX + z1 * cosX;
	return { x: x1, y: y2, z: z2 };
}

function easeInOutCubic(t: number): number {
	return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

// Rotation that brings technology i to front-and-center, taking the short
// way from the current Y rotation (nearest equivalent angle).
function frontTarget(points: Vec[], i: number, rotY: number): { rx: number; ry: number } {
	const p = points[i];
	const ryBase = Math.atan2(-p.x, p.z);
	const rx = Math.atan2(p.y, Math.hypot(p.x, p.z));
	let ry = ryBase;
	while (ry - rotY > Math.PI) ry -= Math.PI * 2;
	while (ry - rotY < -Math.PI) ry += Math.PI * 2;
	return { rx, ry };
}

// (Sphere points live in the component now — fibonacciSphere over the
// live techs — so a live row count other than 44 still lays out.)

// Dark-on-transparent logos that render white in dark mode.
const DARK_INVERT_NAMES = new Set([
	"Next.js",
	"Express.js",
	"Fastify",
	"Rust",
	"Vercel",
	"Prisma",
	"MySQL",
	"CSS",
	"WordPress",
]);

// Category colors (preview): a colored dot in each filter chip, in the
// "Now:" label, and on every tag marks which family a tech belongs to.
const CATEGORY_COLORS: Record<string, string> = {
	Frontend: "#22d3ee",
	Backend: "#2dd4bf",
	Database: "#60a5fa",
	"Cloud & Tools": "#fb923c",
	"CMS & E-commerce": "#c084fc",
	Auth: "#fb7185",
	Concepts: "#9ca3af",
};

// Category labels in the page language — the filter STATE keys stay
// the English names from site.ts (never translated in state), only the
// rendered chip / card / aria-label text is localised via the dict.
const CATEGORY_LABEL_KEYS: Record<string, keyof StackGlobeDict> = {
	Frontend: "catFrontend",
	Backend: "catBackend",
	Database: "catDatabase",
	"Cloud & Tools": "catCloudTools",
	"CMS & E-commerce": "catCmsEcommerce",
	Concepts: "catConcepts",
	Auth: "catAuth",
};

// Constellation lines: thin, faint hairlines between related
// technologies — 20 named pairs, resolved to live-row indices inside
// the component (a pair drops out if the API renames a tech).
const CONSTELLATION_PAIRS: Array<[string, string]> = [
	["Next.js", "React"],
	["React", "TypeScript"],
	["TypeScript", "Tailwind CSS"],
	["Node.js", "Nest.js"],
	["Nest.js", "Express.js"],
	["Express.js", "Fastify"],
	["PostgreSQL", "Prisma"],
	["Prisma", "Drizzle ORM"],
	["PostgreSQL", "MySQL"],
	["WordPress", "WooCommerce"],
	["WooCommerce", "PHP"],
	["Docker", "Vercel"],
	["Vercel", "Cloudflare"],
	["Cloudflare", "DigitalOcean"],
	["Supabase", "PostgreSQL"],
	["Clerk", "Firebase"],
	["Firebase", "Better Auth"],
	["Shopify", "WooCommerce"],
	["Redis", "BullMQ"],
	["S3/R2", "Cloudflare"],
];

// (Line pairs live in the component now — resolved from the live
// techs — so a renamed / added tech cannot point at a stale index.)

// Filter cluster: matching techs gather on a small sphere in front.
const CLUSTER_CENTER: Vec = { x: 0, y: 0, z: 0.62 };
const CLUSTER_RADIUS = 0.38;
// Tag spread: % of the stage half-width a sphere unit maps to. 42 (was
// 40) pushes tags further toward the sphere edge so centre neighbours
// collide less. 42 is the widest that still keeps tags inside the stage:
// the longest edge tags (e.g. "TanStack Start", "DigitalOcean") sit with
// their pill edge just on the ball edge, as in the preview — any wider
// and their centres + half-widths would run past the stage edge.
const SPREAD = 42;
const LANDING_MS = 1600;
const MAX_VEL = 0.12;
const INERTIA_DECAY = 0.9;
// Auto-rotation speed (CORRECTED 2026-11-08 ~18:43): the old code added
// a FIXED 0.0035 rad per animation frame with NO delta-time, so the
// speed depended on the display refresh rate (60fps ≈ 1 rev/30s, 120Hz
// ≈ 1 rev/15s) and the "Now:" front label flipped ~every 0.7s — the
// user saw "a thousand percent speed". The globe now turns at a slow,
// steady, TIME-based rate: one full revolution per 60 seconds, identical
// on 60Hz and 120Hz displays. Spin is unchanged (two extra turns over
// 1.5s, then a ~2.6s hold before auto-rotate resumes).
const AUTO_ROTATE_RAD_PER_SEC = (2 * Math.PI) / 60;
const CLUSTER_ROTATE_RAD_PER_SEC = 0.12;

// Ambient dust: 16 deterministic particles (seeded by index, so every
// render and every visitor sees the same calm field — no per-render
// flicker). 8s drift, opacity 0.1–0.26 (see particle-drift in glass.css).
const DUST_SPOTS = Array.from({ length: 16 }, (_, i) => {
	const rnd = (seed: number) => {
		const v = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
		return v - Math.floor(v);
	};
	return {
		left: `${3 + rnd(i * 3 + 1) * 94}%`,
		top: `${3 + rnd(i * 3 + 2) * 94}%`,
		size: 2 + rnd(i * 3 + 3) * 2.5,
		delay: -rnd(i * 7 + 3) * 8,
	};
});

function TechLogo({ tech }: { tech: StackTech }) {
	if (tech.icon === "woocommerce-w") {
		return (
			<svg
				viewBox="0 0 88 47.5"
				width={14}
				height={8}
				role="img"
				aria-label={tech.name}
			>
				<path d={WOOCOMMERCE_W_PATH} fill="#873EFF" />
			</svg>
		);
	}
	const src = platformIconSrc(tech.icon);
	if (!src) return null;
	// Sprite first (one self-hosted request for all icons); a slug the
	// sprite does not cover (e.g. a new live-API tech) falls back to
	// the CDN <img> so the tag never renders blank.
	if (tech.icon && hasSpriteIcon(tech.icon)) {
		return (
			<SpriteIcon
				slug={tech.icon}
				name={tech.name}
				size={12}
				decorative
				className={
					DARK_INVERT_NAMES.has(tech.name) ? "logo-dark-invert" : undefined
				}
			/>
		);
	}
	return (
		<img
			src={src}
			alt=""
			width={12}
			height={12}
			loading="lazy"
			decoding="async"
			className={
				DARK_INVERT_NAMES.has(tech.name) ? "logo-dark-invert" : undefined
			}
		/>
	);
}

export default function StackGlobe({
	lang = "en",
	dict,
	techs: techsProp,
}: {
	lang?: Lang;
	/** Subset dict only (Issue 7B) — the 8 keys the globe reads. */
	dict?: StackGlobeDict;
	/** Live-merged techs (getTechnologies()); defaults to build-time STACK. */
	techs?: StackTech[];
}) {
	// Live rows win; build-time STACK is the fallback until the API
	// `technologies` type exists. The prop is fixed for the island's
	// lifetime (serialised once at SSR), so the sphere points, lines
	// and categories below are computed once from it.
	const techs = techsProp ?? STACK;
	const basePoints = useMemo(
		() => fibonacciSphere(techs.length),
		[techs.length],
	);
	// Constellation lines: the 20 named pairs, resolved to indices in
	// the live rows.
	const linePairs = useMemo<Array<[number, number]>>(
		() =>
			CONSTELLATION_PAIRS.flatMap(([a, b]) => {
				const ia = techs.findIndex((t) => t.name === a);
				const ib = techs.findIndex((t) => t.name === b);
				return ia >= 0 && ib >= 0
					? [[ia, ib] as [number, number]]
					: [];
			}),
		[techs],
	);
	// Filter chips derive from the live rows: the known categories in
	// seed order, then any new category the API adds, in row order.
	const categories = useMemo(() => {
		const ordered: string[] = [];
		const seen = new Set<string>();
		for (const cat of STACK_CATEGORIES) {
			if (techs.some((t) => t.category === cat) && !seen.has(cat)) {
				seen.add(cat);
				ordered.push(cat);
			}
		}
		for (const t of techs) {
			if (!seen.has(t.category)) {
				seen.add(t.category);
				ordered.push(t.category);
			}
		}
		return ordered;
	}, [techs]);
	const t = dict ?? getDict(lang);
	const catLabel = (cat: string): string => {
		const key = CATEGORY_LABEL_KEYS[cat];
		return key ? t[key] : cat;
	};
	const [filter, setFilter] = useState("All");
	const [selected, setSelected] = useState<StackTech | null>(null);
	const [frontName, setFrontName] = useState(techs[0]?.name ?? "");
	const [reduced, setReduced] = useState(false);
	// Skeleton: false until the island has hydrated AND the first
	// animation frame has positioned every tag. Before that the stage
	// shows the frosted ball + a shimmer sweep with the (unpositioned)
	// tags hidden — never a pile of tags at the centre, never an empty
	// area. SSR renders ready=false, so the skeleton is the first paint.
	const [ready, setReady] = useState(false);

	const tagRefs = useRef<Array<HTMLButtonElement | null>>([]);
	// Globe redesign (2026-11-09): each tag is a button hit target
	// wrapping a visual pill span. Depth scale applies to the PILL
	// only — the button never scales, so its ≥24px tap target holds
	// at every depth. Collision + clamp read the pill's size.
	const pillRefs = useRef<Array<HTMLSpanElement | null>>([]);
	const stageRef = useRef<HTMLDivElement | null>(null);
	const lineRefs = useRef<Array<SVGLineElement | null>>([]);
	const rotRef = useRef({ x: 0.25, y: 0 });
	const velRef = useRef({ x: 0, y: 0 });
	const curRef = useRef<Vec[]>(basePoints.map((p) => ({ ...p })));
	const resumeAtRef = useRef(0);
	const readyRef = useRef(false);
	const landingUntilRef = useRef(0);
	const clusterAngleRef = useRef(0);
	const flyToRef = useRef<number | null>(null);
	const tweenRef = useRef<{
		fx: number;
		fy: number;
		tx: number;
		ty: number;
		start: number;
		dur: number;
	} | null>(null);
	const snapPendingRef = useRef(false);
	const snapAfterInertiaRef = useRef(false);
	const draggingRef = useRef(false);
	const movedRef = useRef(false);
	// Filter-chip tap tracking (fix 2026-11-09): pointer-down position
	// per chip, and a flag so the synthetic click that follows a
	// pointer-up selection is ignored instead of selecting twice.
	const chipDownRef = useRef<{ x: number; y: number; cat: string } | null>(
		null,
	);
	const chipTapHandledRef = useRef(false);
	const downIndexRef = useRef<number | null>(null);
	const lastPointerRef = useRef({ x: 0, y: 0 });
	const frontIdxRef = useRef(0);
	const frontNameRef = useRef(techs[0]?.name ?? "");
	const lastNowRef = useRef<number | null>(null);
	// Off-screen pause (fix 2026-11-13): the rAF loop below repositions
	// 44 tech nodes + all constellation lines via DOM writes EVERY
	// frame. With no off-screen pause it ran forever once hydrated
	// (client:visible), saturating the mobile main thread so service
	// taps (click -> "open-service" -> Preact setState) got delayed or
	// dropped. An IntersectionObserver on the stage flips this flag;
	// the loop then skips all DOM work while off-screen (and while the
	// tab is hidden) but keeps scheduling rAF, so it resumes instantly
	// on return. Default true: the island only hydrates when visible
	// (client:visible), so it starts visible.
	const visibleRef = useRef(true);
	const filterRef = useRef("All");
	const selectedRef = useRef<StackTech | null>(null);
	const reducedRef = useRef(false);
	const matchingRef = useRef<number[]>([]);
	const clusterBaseRef = useRef<Vec[]>([]);

	reducedRef.current = reduced;

	useEffect(() => {
		const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
		const update = () => setReduced(mq.matches);
		update();
		mq.addEventListener("change", update);
		return () => mq.removeEventListener("change", update);
	}, []);

	useEffect(() => {
		const stage = stageRef.current;
		if (!stage || typeof IntersectionObserver === "undefined") return;
		const observer = new IntersectionObserver(
			([entry]) => {
				visibleRef.current = entry.isIntersecting;
			},
			{ threshold: 0 },
		);
		observer.observe(stage);
		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		let raf = 0;

		const loop = (now: number) => {
			// Off-screen / hidden-tab pause: skip ALL positioning and
			// DOM work, but keep the rAF chain alive and refresh the
			// timestamp so no huge dt accumulates (the existing
			// Math.min(0.05, ...) clamp already guards resume too).
			// All existing pause conditions (card open, dragging,
			// fly-to, tween) are untouched below.
			if (!visibleRef.current || document.hidden) {
				lastNowRef.current = now;
				raf = requestAnimationFrame(loop);
				return;
			}
			// Delta time (seconds since the previous frame, clamped to
			// 50ms so a tab-switch never causes a jump). dt60 is the
			// same span expressed in 60fps frames — every per-frame
			// increment below is scaled by it, so the globe moves at
			// the same WALL-CLOCK speed on 60Hz and 120Hz displays.
			const last = lastNowRef.current;
			const dt =
				last === null
					? 0
					: Math.min(0.05, Math.max(0, (now - last) / 1000));
			lastNowRef.current = now;
			const dt60 = dt * 60;

			const rot = rotRef.current;
			const vel = velRef.current;
			const paused =
				selectedRef.current !== null ||
				draggingRef.current ||
				flyToRef.current !== null ||
				tweenRef.current !== null;

			// Spin fly-to (and any tweened move): eased rotation onto the
			// target, then a ~2.6s hold before auto-rotation resumes.
			if (tweenRef.current !== null) {
				const tw = tweenRef.current;
				const t = Math.min(1, (now - tw.start) / tw.dur);
				const e = easeInOutCubic(t);
				rot.x = tw.fx + (tw.tx - tw.fx) * e;
				rot.y = tw.fy + (tw.ty - tw.fy) * e;
				if (t >= 1) {
					tweenRef.current = null;
					resumeAtRef.current = now + 2600;
				}
			} else if (flyToRef.current !== null) {
				// Magnetic fly-to-front (tap a tech, or snap after a drag).
				// Scaled by dt60: same wall-clock convergence at any
				// refresh rate.
				// SIGN (fixed 2026-11-08): deltaY/deltaX are the target's
				// angular shortfall FROM front, so rot must move AGAINST
				// them. The old code added +atan2(...) to rot — positive
				// feedback: deltaY grew every frame, wrapped at ±π, and
				// the globe spun at ~0.44 rad/frame FOREVER after any
				// drag (only Spin, whose tween uses frontTarget, could
				// stop it). Verified by standalone simulation: old signs
				// diverge from deltaY=0.08 within ~30 frames and never
				// converge; flipped signs converge in 21–65 frames for
				// 20 random starts/targets.
				const target = rotatePoint(
					basePoints[flyToRef.current],
					rot.x,
					rot.y,
				);
				const deltaY = -Math.atan2(target.x, target.z);
				const deltaX = Math.atan2(
					target.y,
					Math.hypot(target.x, target.z),
				);
				rot.y += deltaY * 0.14 * dt60;
				rot.x = Math.max(
					-1.2,
					Math.min(1.2, rot.x + deltaX * 0.14 * dt60),
				);
				// rot.x is clamped to ±1.2: if the target needs more tilt
				// than the clamp allows, the X axis can never converge —
				// treat "pressed against the clamp" as done for X.
				const atLimitX =
					(rot.x <= -1.2 && deltaX < 0) ||
					(rot.x >= 1.2 && deltaX > 0);
				if (
					Math.abs(deltaY) < 0.01 &&
					(Math.abs(deltaX) < 0.01 || atLimitX)
				) {
					flyToRef.current = null;
					if (snapPendingRef.current) {
						snapPendingRef.current = false;
						// Resume auto-rotation shortly after the snap.
						resumeAtRef.current = now + 800;
					}
				}
			} else if (!draggingRef.current) {
				// While a detail card is open the globe holds still:
				// leftover velocity decays fast and is never applied.
				if (selectedRef.current !== null) {
					vel.x *= Math.pow(0.5, dt60);
					vel.y *= Math.pow(0.5, dt60);
					if (Math.abs(vel.x) < 0.0004) vel.x = 0;
					if (Math.abs(vel.y) < 0.0004) vel.y = 0;
				} else if (
					Math.abs(vel.x) > 0.0004 ||
					Math.abs(vel.y) > 0.0004
				) {
					// Inertia decay after a drag; then magnetic snap.
					// Velocity is applied and decayed by dt60, so a flick
					// behaves the same at 60Hz and 120Hz and can never
					// run away: Spin/drag/tap all reset it to 0 first.
					rot.x = Math.max(
						-1.2,
						Math.min(1.2, rot.x + vel.x * dt60),
					);
					rot.y += vel.y * dt60;
					vel.x *= Math.pow(INERTIA_DECAY, dt60);
					vel.y *= Math.pow(INERTIA_DECAY, dt60);
				} else if (snapAfterInertiaRef.current) {
					snapAfterInertiaRef.current = false;
					vel.x = 0;
					vel.y = 0;
					flyToRef.current = frontIdxRef.current;
					snapPendingRef.current = true;
				}
			}

			// Auto-rotation: never stops by default, only paused while a
			// card is open, while dragging/flying, or briefly after resume.
			// TIME-based (rad/sec), not per-frame — the same slow, steady
			// ~60s/rev on every display.
			const still =
				Math.abs(vel.x) < 0.0004 && Math.abs(vel.y) < 0.0004;
			if (
				!reducedRef.current &&
				!paused &&
				still &&
				now >= resumeAtRef.current
			) {
				rot.y += AUTO_ROTATE_RAD_PER_SEC * dt;
			}

			// Filter cluster: frozen ~1.6s for landing, then it keeps
			// turning as one compact group (time-based, same rate as before
			// at 60fps: 0.002/frame = 0.12 rad/s).
			const filterActive = filterRef.current !== "All";
			const landing = now < landingUntilRef.current;
			if (filterActive && !landing) {
				clusterAngleRef.current += CLUSTER_ROTATE_RAD_PER_SEC * dt;
			}

			const matching = matchingRef.current;
			const matchingSet = new Set(matching);
			const clusterBase = clusterBaseRef.current;
			const clusterAngle = clusterAngleRef.current;
			const cur = curRef.current;

			// Pass 1: settle positions and find the front (spotlight) tag.
			// The front tag is only known after the whole sphere is
			// evaluated — it must not be decided mid-loop.
			let frontIdx = 0;
			let frontZ = -Infinity;

			for (let i = 0; i < techs.length; i++) {
				let target: Vec;
				if (filterActive && matchingSet.has(i)) {
					const k = matching.indexOf(i);
					const local = rotatePoint(clusterBase[k], 0, clusterAngle);
					target = {
						x: CLUSTER_CENTER.x + CLUSTER_RADIUS * local.x,
						y: CLUSTER_CENTER.y + CLUSTER_RADIUS * local.y,
						z: CLUSTER_CENTER.z + CLUSTER_RADIUS * local.z,
					};
				} else {
					target = rotatePoint(basePoints[i], rot.x, rot.y);
				}

				if (landing) {
					// Glide into place during the landing window.
					// Time-based: same wall-clock glide at any refresh rate.
					const glide = Math.min(1, 0.08 * dt60);
					cur[i].x += (target.x - cur[i].x) * glide;
					cur[i].y += (target.y - cur[i].y) * glide;
					cur[i].z += (target.z - cur[i].z) * glide;
				} else {
					cur[i] = target;
				}

				const p = cur[i];
				// While a filter is active the spotlight (front halo /
				// scale, and the "Now:" label) must be a MATCHING tag in
				// the cluster — never a dimmed tag from the rest of the
				// sphere. Before this, filtering Frontend spotlighted
				// PostgreSQL (Database, dimmed) as "Now:".
				if (
					(!filterActive || matchingSet.has(i)) &&
					p.z > frontZ
				) {
					frontZ = p.z;
					frontIdx = i;
				}
			}

			// Pass 2 — collision avoidance in the 2D projection. The
			// Fibonacci sphere puts several tags at nearly the same
			// (x, y) with different z, so centre tags stacked on each
			// other. After positions are known, nudge overlapping tags
			// apart (12 relaxation passes — 4 was not enough for the
			// centre cluster to settle — using each tag's real
			// measured size × its scale). The front tag never moves —
			// neighbours move away from it — so the spotlight tag is
			// always clearly readable and never overlapped. Back tags
			// move more than front ones. Offsets are small and clamped,
			// so tags stay on the sphere; no tech is ever removed.
			const stageW =
				stageRef.current?.clientWidth || 440;
			const stageH = stageW; // the stage is square
			const scales: number[] = new Array(techs.length);
			const depths: number[] = new Array(techs.length);
			const posX: number[] = new Array(techs.length);
			const posY: number[] = new Array(techs.length);
			const offX: number[] = new Array(techs.length).fill(0);
			const offY: number[] = new Array(techs.length).fill(0);
			for (let i = 0; i < techs.length; i++) {
				const p = cur[i];
				const depth = (p.z + 1) / 2;
				depths[i] = depth;
				// Back tags recede so the centre reads clean: scale floor
				// 0.60 (was 0.72), so back tags are small and faint like
				// the preview and the front/mid tags dominate. Smaller
				// back tags also shrink their collision boxes, which is
				// what lets the relaxation below actually separate them.
				let scale = 0.6 + 0.4 * depth;
				if (i === frontIdx) scale *= 1.35;
				scales[i] = scale;
				posX[i] = 50 + p.x * SPREAD;
				posY[i] = 50 + p.y * SPREAD;
			}
			for (let pass = 0; pass < 12; pass++) {
				for (let i = 0; i < techs.length; i++) {
					for (let j = i + 1; j < techs.length; j++) {
						// Filter cluster (fix 2026-11-09): matching tags
						// must keep their exact cluster positions. The
						// preview has NO collision pass at all — its
						// cluster tags sit close together by design.
						// Relaxing them here pushed the compact front
						// cluster apart again (measured in simulation:
						// Frontend y-span 32% → 47% of the stage at
						// 390px), so a tap showed no regrouping. Skip
						// any pair touching a matching tag; dimmed tags
						// also never push cluster tags. Non-matching
						// pairs still relax among themselves.
						if (
							filterActive &&
							(matchingSet.has(i) || matchingSet.has(j))
						) {
							continue;
						}
						// Sizes come from the PILL (the visual), not the
						// button: the button is a larger invisible hit
						// target, and the collision box must match what
						// the visitor actually sees.
						const pillI = pillRefs.current[i];
						const pillJ = pillRefs.current[j];
						const wI =
							(pillI?.offsetWidth || 64) * scales[i];
						const wJ =
							(pillJ?.offsetWidth || 64) * scales[j];
						const hI =
							(pillI?.offsetHeight || 18) * scales[i];
						const hJ =
							(pillJ?.offsetHeight || 18) * scales[j];
						// 1.05 demands a full gap plus a hair of
						// breathing room between tags (0.92 let them sit
						// 8% overlapped, which is what stacked the centre
						// cluster on top of each other).
						const minDx =
							((wI + wJ) / 2 / stageW) * 100 * 1.05;
						const minDy =
							((hI + hJ) / 2 / stageH) * 100 * 1.05;
						const dx =
							posX[j] + offX[j] - (posX[i] + offX[i]);
						const dy =
							posY[j] + offY[j] - (posY[i] + offY[i]);
						if (
							Math.abs(dx) < minDx &&
							Math.abs(dy) < minDy
						) {
							const overlapX = minDx - Math.abs(dx);
							const overlapY = minDy - Math.abs(dy);
							// Push along the axis of least penetration.
							const pushX = overlapX <= overlapY;
							const wi =
								i === frontIdx
									? 0
									: 0.6 + 0.4 * (1 - depths[i]);
							const wj =
								j === frontIdx
									? 0
									: 0.6 + 0.4 * (1 - depths[j]);
							const wSum = wi + wj || 1;
							const push =
								(pushX ? overlapX : overlapY) + 1.0;
							const dirX = dx === 0 ? (i % 2 ? 1 : -1) : Math.sign(dx);
							const dirY = dy === 0 ? (j % 2 ? 1 : -1) : Math.sign(dy);
							if (pushX) {
								offX[i] -= dirX * push * (wi / wSum);
								offX[j] += dirX * push * (wj / wSum);
							} else {
								offY[i] -= dirY * push * (wi / wSum);
								offY[j] += dirY * push * (wj / wSum);
							}
						}
					}
				}
			}
			for (let i = 0; i < techs.length; i++) {
				// Clamp tightened (±10 x / ±8 y, was ±14 / ±10) to match
				// the wider SPREAD: nudged tags stay on the sphere and
				// inside the stage instead of being pushed past its edge.
				// On SMALL stages (<400px, e.g. ~308px at 390px) the
				// clamp loosens (±14 / ±12): tags are wider relative to
				// the ball there, so they need more room to escape the
				// centre pile — the tight clamp is what kept them
				// stacked.
				const clampX = stageW < 400 ? 14 : 10;
				const clampY = stageW < 400 ? 12 : 8;
				offX[i] = Math.max(-clampX, Math.min(clampX, offX[i]));
				offY[i] = Math.max(-clampY, Math.min(clampY, offY[i]));
				posX[i] += offX[i];
				posY[i] += offY[i];
				// Final-centre clamp (2026-11-08): the nudge clamp above
				// only bounds the NUDGE, not the centre — base centre
				// 50 + p.x * 42 already reaches 92%, +14% nudge put the
				// centre at 106%, and the pill's half-width stuck out
				// further (~29px overrun @390px — the mobile right-edge
				// overflow). Clamp the final centre so the WHOLE pill
				// stays inside the stage. Constellation lines read
				// posX/posY afterwards, so they stay attached. Do NOT
				// use overflow: clip on the stage — it would cut the
				// orbit ring (inset -7%).
				const pillEl = pillRefs.current[i];
				const halfW = pillEl
					? ((pillEl.offsetWidth * scales[i]) / 2 / stageW) * 100
					: 8;
				const halfH = pillEl
					? ((pillEl.offsetHeight * scales[i]) / 2 / stageH) * 100
					: 3;
				posX[i] = Math.max(halfW, Math.min(100 - halfW, posX[i]));
				posY[i] = Math.max(halfH, Math.min(100 - halfH, posY[i]));
			}

			// Pass 3: apply positions, scale, opacity and z-order.
			for (let i = 0; i < techs.length; i++) {
				const el = tagRefs.current[i];
				if (el) {
					const depth = depths[i];
					const dimmed = filterActive && !matchingSet.has(i);
					// The front tag reads ~35% larger (preview spotlight).
					const scale = scales[i];
					el.style.left = `${posX[i]}%`;
					el.style.top = `${posY[i]}%`;
					// The BUTTON gets translate only — never scale — so
					// its ≥24px hit area holds at every depth. The depth
					// scale goes on the visual pill inside it.
					el.style.transform = "translate(-50%, -50%)";
					const pillEl = pillRefs.current[i];
					if (pillEl) {
						pillEl.style.transform = `scale(${scale})`;
					}
					// Front tag sits above everything; nothing may cover it.
					el.style.zIndex =
						i === frontIdx
							? "200"
							: String(Math.round(depth * 100));
					// Back tags recede: opacity floor 0.38 (was 0.55),
					// so back tags are faint and the front/mid tags
					// dominate, like the preview.
					// Dimmed tags fade to a whisper (preview: ×0.05) so
					// the clustered family is unmistakable. The old ""
					// left it to .globe-tag.dimmed at 0.55 in glass.css
					// — still half-visible, so filtering looked like
					// nothing had changed.
					el.style.opacity = dimmed
						? "0.08"
						: String(0.38 + 0.62 * depth);
					el.classList.toggle("front", i === frontIdx);
					el.classList.toggle("dimmed", dimmed);
				}
			}

			frontIdxRef.current = frontIdx;
			if (techs[frontIdx].name !== frontNameRef.current) {
				frontNameRef.current = techs[frontIdx].name;
				setFrontName(techs[frontIdx].name);
			}

			// Constellation lines follow their tags' final (post-nudge)
			// positions, fading with depth (never brighter than 0.32)
			// and with a non-matching filter.
			for (let k = 0; k < linePairs.length; k++) {
				const line = lineRefs.current[k];
				if (!line) continue;
				const [a, b] = linePairs[k];
				const pa = cur[a];
				const pb = cur[b];
				line.setAttribute("x1", String(posX[a]));
				line.setAttribute("y1", String(posY[a]));
				line.setAttribute("x2", String(posX[b]));
				line.setAttribute("y2", String(posY[b]));
				const minDepth = (Math.min(pa.z, pb.z) + 1) / 2;
				let lineOp = 0.32 * Math.pow(Math.max(0, minDepth), 1.4);
				if (
					filterActive &&
					(techs[a].category !== filterRef.current ||
						techs[b].category !== filterRef.current)
				) {
					lineOp *= 0.2;
				}
				line.style.opacity = String(lineOp);
			}

			// First positioned frame: the globe is live — drop the
			// skeleton. Guarded by ref so this setState runs exactly once.
			if (!readyRef.current) {
				readyRef.current = true;
				setReady(true);
			}

			raf = requestAnimationFrame(loop);
		};

		raf = requestAnimationFrame(loop);
		return () => cancelAnimationFrame(raf);
	}, []);

	const handleTap = (index: number) => {
		// A drag that ends on a tag must not open its card.
		if (movedRef.current) {
			movedRef.current = false;
			return;
		}
		const tech = techs[index];
		selectedRef.current = tech;
		setSelected(tech);
		// Kill any leftover drag velocity at once: the globe must hold
		// still while a detail card is open, never keep spinning.
		velRef.current = { x: 0, y: 0 };
		snapAfterInertiaRef.current = false;
		if (!reducedRef.current) {
			flyToRef.current = index;
		}
	};

	const closeCard = () => {
		selectedRef.current = null;
		setSelected(null);
		// No leftover velocity: rotation resumes cleanly, from rest.
		velRef.current = { x: 0, y: 0 };
		flyToRef.current = null;
		// Rotation resumes within ~2s of closing.
		resumeAtRef.current = performance.now() + 900;
	};

	const applyFilter = (cat: string) => {
		filterRef.current = cat;
		setFilter(cat);
		landingUntilRef.current = performance.now() + LANDING_MS;
		clusterAngleRef.current = 0;
		if (cat === "All") {
			matchingRef.current = [];
			clusterBaseRef.current = [];
		} else {
			const matching = techs.map((t, i) =>
				t.category === cat ? i : -1,
			).filter((i) => i >= 0);
			matchingRef.current = matching;
			// Centre the cluster on its own centroid: fibonacciSphere
			// points are only centred for larger n — for 1 tag the point
			// is (1, 0, 0), which sat ~70px off-centre (Concepts), and
			// for 3 tags ~24px off (CMS & E-commerce). The cluster
			// rotates about the origin, so centred points stay centred.
			const base = fibonacciSphere(matching.length);
			const n = Math.max(1, base.length);
			const centroid = base.reduce(
				(s, p) => ({
					x: s.x + p.x / n,
					y: s.y + p.y / n,
					z: s.z + p.z / n,
				}),
				{ x: 0, y: 0, z: 0 },
			);
			clusterBaseRef.current = base.map((p) => ({
				x: p.x - centroid.x,
				y: p.y - centroid.y,
				z: p.z - centroid.z,
			}));
		}
		if (selectedRef.current) {
			selectedRef.current = null;
			setSelected(null);
		}
	};

	// Filter-chip selection (touch-robust, fix 2026-11-09): the chips sit
	// OUTSIDE the globe stage, so the stage drag handlers never see their
	// touches — but a plain onClick is still fragile on a phone, where a
	// tap with a few px of finger drift is taken over for page scroll and
	// no click is ever synthesized. Selection therefore happens on
	// pointer-up, gated by a 10px movement threshold (a tap with tiny
	// drift still counts), with pointer capture so the up event is
	// reliably delivered to the chip. onClick remains only as the
	// keyboard path (detail === 0); a pointer-up selection sets
	// chipTapHandledRef so the synthetic click that follows it is
	// ignored instead of toggling the filter twice. Tapping the
	// already-active chip clears the filter (same as "All"), per the
	// React preview.
	const selectChip = (cat: string) => {
		applyFilter(cat === filterRef.current ? "All" : cat);
	};
	const onChipPointerDown = (
		e: PointerEvent<HTMLButtonElement>,
		cat: string,
	) => {
		chipDownRef.current = { x: e.clientX, y: e.clientY, cat };
		e.currentTarget.setPointerCapture(e.pointerId);
	};
	const onChipPointerUp = (
		e: PointerEvent<HTMLButtonElement>,
		cat: string,
	) => {
		const down = chipDownRef.current;
		chipDownRef.current = null;
		if (!down || down.cat !== cat) return;
		if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 10) return;
		chipTapHandledRef.current = true;
		selectChip(cat);
	};
	const onChipPointerCancel = () => {
		chipDownRef.current = null;
	};
	const onChipClick = (e: MouseEvent<HTMLButtonElement>, cat: string) => {
		if (chipTapHandledRef.current) {
			chipTapHandledRef.current = false;
			return;
		}
		// Keyboard activation only — pointer taps selected above.
		if (e.detail === 0) selectChip(cat);
	};

	const spin = () => {
		if (draggingRef.current) return;
		if (selectedRef.current) {
			selectedRef.current = null;
			setSelected(null);
		}
		flyToRef.current = null;
		snapPendingRef.current = false;
		snapAfterInertiaRef.current = false;
		velRef.current = { x: 0, y: 0 };
		// Fly TWO extra full turns onto a RANDOM tech over 1.5s, then
		// hold ~2.6s before auto-rotation resumes (the tween's landing
		// sets resumeAtRef). Repeat taps re-target; velocity never stacks.
		const target = Math.floor(Math.random() * techs.length);
		if (reducedRef.current) {
			const { rx, ry } = frontTarget(basePoints, target, rotRef.current.y);
			rotRef.current.x = rx;
			rotRef.current.y = ry;
			resumeAtRef.current = performance.now() + 2600;
			return;
		}
		const { rx, ry } = frontTarget(basePoints, target, rotRef.current.y);
		tweenRef.current = {
			fx: rotRef.current.x,
			fy: rotRef.current.y,
			tx: rx,
			ty: ry + 2 * Math.PI * 2,
			start: performance.now(),
			dur: 1500,
		};
		resumeAtRef.current = 0;
	};

	const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
		if (reducedRef.current) return;
		draggingRef.current = true;
		movedRef.current = false;
		// Remember which tag (if any) the pointer went down on. A rotating
		// tag can move between pointer-down and click, so the tap target is
		// taken from here, not from the click event.
		const target = (
			e.target as HTMLElement | null
		)?.closest?.("[data-tech]") as HTMLElement | null;
		downIndexRef.current = target
			? Number(target.getAttribute("data-tech"))
			: null;
		lastPointerRef.current = { x: e.clientX, y: e.clientY };
		velRef.current = { x: 0, y: 0 };
		flyToRef.current = null;
		tweenRef.current = null;
		e.currentTarget.setPointerCapture(e.pointerId);
	};

	const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
		if (!draggingRef.current) return;
		const dx = e.clientX - lastPointerRef.current.x;
		const dy = e.clientY - lastPointerRef.current.y;
		lastPointerRef.current = { x: e.clientX, y: e.clientY };
		if (Math.abs(dx) + Math.abs(dy) > 4) movedRef.current = true;
		rotRef.current.y += dx * 0.005;
		rotRef.current.x = Math.max(
			-1.2,
			Math.min(1.2, rotRef.current.x + dy * 0.005),
		);
		velRef.current = {
			x: Math.max(
				-MAX_VEL,
				Math.min(
					MAX_VEL,
					velRef.current.x * 0.7 + dy * 0.005 * 0.3,
				),
			),
			y: Math.max(
				-MAX_VEL,
				Math.min(
					MAX_VEL,
					velRef.current.y * 0.7 + dx * 0.005 * 0.3,
				),
			),
		};
	};

	const onPointerUp = () => {
		if (!draggingRef.current) return;
		draggingRef.current = false;
		// A tap (no real movement) on a tag opens its card. Pointer-up is
		// used instead of click: a rotating tag can drift between
		// pointer-down and click, so the click lands on the wrong tag.
		if (!movedRef.current && downIndexRef.current !== null) {
			handleTap(downIndexRef.current);
		}
		downIndexRef.current = null;
		snapAfterInertiaRef.current = true;
	};

	const onPointerCancel = () => {
		// Interrupted gesture (browser took over for scroll, etc.): end the
		// drag without opening anything.
		draggingRef.current = false;
		downIndexRef.current = null;
	};

	const frontTech = techs.find((t) => t.name === frontName);

	return (
		<section className="glass section" id="stack">
			<style dangerouslySetInnerHTML={{ __html: `
				/* Globe skeleton (loading state): the frosted ball is
				   already in the stage from SSR; while the island
				   hydrates the unpositioned tags stay hidden and a soft
				   light sweep travels across the ball — never a pile of
				   tags at the centre, never an empty area. */
				.globe-stage.globe-loading .globe-tag { visibility: hidden; }
				.globe-skeleton-shimmer {
					position: absolute; inset: 0; z-index: 150;
					border-radius: 50%; overflow: hidden;
					pointer-events: none;
				}
				.globe-skeleton-shimmer::after {
					content: ""; position: absolute; inset: -10% -30%;
					background: linear-gradient(105deg, transparent 42%, rgba(255, 255, 255, 0.55) 50%, transparent 58%);
					transform: translateX(-70%);
					animation: globe-skeleton-shimmer 1.9s ease-in-out infinite alternate;
				}
				[data-theme="dark"] .globe-skeleton-shimmer::after {
					background: linear-gradient(105deg, transparent 42%, rgba(255, 255, 255, 0.16) 50%, transparent 58%);
				}
				@media (prefers-color-scheme: dark) {
					:root:not([data-theme="light"]) .globe-skeleton-shimmer::after {
						background: linear-gradient(105deg, transparent 42%, rgba(255, 255, 255, 0.16) 50%, transparent 58%);
					}
				}
				@keyframes globe-skeleton-shimmer { to { transform: translateX(70%); } }
				@media (prefers-reduced-motion: reduce) {
					.globe-skeleton-shimmer::after { animation: none; }
				}
			` }} />
			<div className="section-head">
				<div>
					<h2>{t.stackTitle}</h2>
					<p>
						{t.stackSub}
					</p>
				</div>
			</div>
			<div className="globe-wrap">
				<div
					className="chip-row globe-filters"
					role="group"
					aria-label={t.stackFilter}
				>
					<button
						type="button"
						className={filter === "All" ? "chip active" : "chip"}
						aria-pressed={filter === "All"}
						style={{
							// touch-action manipulation: no double-tap
							// zoom delay, taps stay taps on touch.
							touchAction: "manipulation",
							// The preview's light-pill active state is
							// low-contrast on its own — a teal ring
							// makes the active chip unmistakable.
							boxShadow:
								filter === "All"
									? "0 0 0 1.5px var(--accent)"
									: undefined,
						}}
						onPointerDown={(e) => onChipPointerDown(e, "All")}
						onPointerUp={(e) => onChipPointerUp(e, "All")}
						onPointerCancel={onChipPointerCancel}
						onClick={(e) => onChipClick(e, "All")}
					>
						{t.allChip}
					</button>
					{categories.map((cat) => (
						<button
							key={cat}
							type="button"
							className={
								filter === cat ? "chip active" : "chip"
							}
							aria-pressed={filter === cat}
							style={{
								touchAction: "manipulation",
								boxShadow:
									filter === cat
										? "0 0 0 1.5px var(--accent)"
										: undefined,
							}}
							onPointerDown={(e) => onChipPointerDown(e, cat)}
							onPointerUp={(e) => onChipPointerUp(e, cat)}
							onPointerCancel={onChipPointerCancel}
							onClick={(e) => onChipClick(e, cat)}
						>
							<span
								aria-hidden="true"
								style={{
									display: "inline-block",
									/* Preview globe-chip color dot is 4px. */
									width: 4,
									height: 4,
									flex: "none",
									borderRadius: "50%",
									background: CATEGORY_COLORS[cat],
									marginRight: 6,
									verticalAlign: "1px",
								}}
							/>
							{catLabel(cat)}
						</button>
					))}
				</div>
				<div
					className={
						ready ? "globe-stage" : "globe-stage globe-loading"
					}
					ref={stageRef}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					onPointerCancel={onPointerCancel}
					style={{ touchAction: "none", cursor: "grab" }}
				>
					<div className="globe-ball" aria-hidden="true" />
					{!ready ? (
						<div
							className="globe-skeleton-shimmer"
							aria-hidden="true"
						/>
					) : null}
					<div
						className="globe-orbit"
						aria-hidden="true"
						style={{ inset: "-7%" }}
					>
						<span className="globe-satellite" aria-hidden="true" />
					</div>
					<svg
						aria-hidden="true"
						viewBox="0 0 100 100"
						preserveAspectRatio="none"
						style={{
							position: "absolute",
							inset: 0,
							width: "100%",
							height: "100%",
							pointerEvents: "none",
						}}
					>
						{linePairs.map(([a, b], k) => (
							<line
								key={`${a}-${b}`}
								ref={(el) => {
									lineRefs.current[k] = el;
								}}
								x1="50"
								y1="50"
								x2="50"
								y2="50"
								stroke="var(--ink)"
								strokeOpacity={1}
								strokeWidth={1}
								vectorEffect="non-scaling-stroke"
							/>
						))}
					</svg>
					{!reduced &&
						DUST_SPOTS.map((spot, i) => (
							<span
								key={i}
								aria-hidden="true"
								className="globe-particle"
								style={{
									position: "absolute",
									left: spot.left,
									top: spot.top,
									width: spot.size,
									height: spot.size,
									borderRadius: "50%",
									background: "var(--accent)",
									animationDelay: `${spot.delay}s`,
								}}
							/>
						))}
					{techs.map((tech, i) => {
						// A11y (2026-11-09): a filtered-out tag is faded
						// to opacity 0.08 by the animation loop — still
						// focusable at that opacity, so keyboard users
						// would tab onto a near-invisible tag. While its
						// category is filtered out it leaves the tab
						// order and the accessibility tree; the filter
						// chips remain the keyboard path back (clearing
						// the filter restores the tag).
						const isDimmed =
							filter !== "All" && tech.category !== filter;
						return (
							<button
								key={tech.name}
								type="button"
								ref={(el) => {
									tagRefs.current[i] = el;
								}}
								className="globe-tag"
								data-tech={i}
								tabIndex={isDimmed ? -1 : undefined}
								aria-hidden={isDimmed || undefined}
								onClick={(e) => {
									// Pointer taps open via pointer-up (see
									// onPointerUp); a click with detail 0 is
									// keyboard activation.
									if (e.detail === 0) handleTap(i);
								}}
								aria-label={`${tech.name} — ${catLabel(tech.category)}`}
							>
								<span
									className="globe-tag-pill"
									aria-hidden="true"
									ref={(el) => {
										pillRefs.current[i] = el;
									}}
								>
									<span
										aria-hidden="true"
										className="globe-tag-dot"
										style={{
											background:
												CATEGORY_COLORS[tech.category] ??
												"var(--accent)",
										}}
									/>
									<TechLogo tech={tech} />
									{tech.name}
								</span>
							</button>
						);
					})}
				</div>
				<div className="globe-now-row">
					<p className="globe-now">
						<span
							aria-hidden="true"
							className="globe-now-dot"
							style={{
								background:
									(frontTech
										? CATEGORY_COLORS[frontTech.category]
										: undefined) ?? "var(--accent)",
							}}
						/>
						{t.nowLabel} <b>{frontName}</b>
					</p>
					<button
						type="button"
						className="spin-btn"
						onClick={spin}
						aria-label={t.spinLabel}
					>
						<RotateCw size={15} />
						{t.spin}
					</button>
				</div>
				{selected ? (
					<div className="globe-card">
						<button
							type="button"
							onClick={closeCard}
							aria-label={t.close}
							style={{
								float: "right",
								background: "transparent",
								border: 0,
								color: "var(--ink-dim)",
								padding: 4,
							}}
						>
							<X size={18} />
						</button>
						<h3>
							<TechLogo tech={selected} />
							{selected.name}
						</h3>
						<p className="globe-cat">{catLabel(selected.category)}</p>
						{selected.use ? (
							<p className="globe-use">{selected.use}</p>
						) : null}
					</div>
				) : null}
				<p className="globe-hint">{t.globeHint}</p>
			</div>
		</section>
	);
}
