import { useEffect, useRef, useState } from "preact/hooks";
import { SERVICES, simpleIconsUrl, type Service } from "../data/site";
import { hasSpriteIcon } from "../lib/icons";
import SpriteIcon from "./SpriteIcon";
import { lockBodyScroll, unlockBodyScroll } from "../lib/scrollLock";
import type { ServiceModalDict, Lang } from "../lib/i18n";

interface OpenServiceDetail {
	slug?: string;
}

// Service detail modal — mounted once per page by Services.astro.
// Opens when a service card dispatches `window.dispatchEvent(
// new CustomEvent("open-service", { detail: { slug } }))`.
// Shows the service's existing description (no invented copy).
//
// MARKETPLACE COPY: the "Contact about this service" CTA is removed —
// there is no contact modal on this copy, so the service modal shows
// the description only (with the × button / backdrop / Escape to
// close). See docs/MARKETPLACE.md.
//
// Chrome matches the public site's modal exactly: same
// .modal-backdrop / .modal-sheet classes (bottom sheet on mobile,
// centred from 640px), backdrop click, the × button, and Escape all
// close it.
//
// SCROLL STABILITY (worker H, 2026-11-08): the content renders at its
// final height in the opening frame (no one-frame skeleton swap), the
// shared reference-counted scroll lock (src/lib/scrollLock.ts) holds
// the page locked, the sheet caps at 92dvh, and focus lands on the
// sheet with preventScroll.
export default function ServiceModal({
	lang = "en",
	dict,
	services: servicesProp,
}: {
	lang?: Lang;
	/** Subset dict only (Issue 7B) — close. (The contactAboutService /
	    openingContact keys are not used on the marketplace copy.) */
	dict?: ServiceModalDict;
	/** Live-merged services (getServices()); defaults to build-time SERVICES. */
	services?: Service[];
}) {
	const services = servicesProp ?? SERVICES;
	const [open, setOpen] = useState(false);
	const [service, setService] = useState<Service | undefined>(undefined);
	const sheetRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<OpenServiceDetail>).detail ?? {};
			const found = services.find((s) => s.slug === detail.slug);
			if (!found) return;
			setService(found);
			setOpen(true);
		};
		window.addEventListener("open-service", handler);
		return () => window.removeEventListener("open-service", handler);
	}, [services]);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setOpen(false);
				return;
			}
			// A11y (2026-11-09): focus trap — Tab cycles inside the
			// dialog instead of escaping to the locked page behind it.
			// (Same gap as ContactModal: focus landed on the sheet on
			// open, but Tab could walk out onto the background page.)
			if (e.key !== "Tab") return;
			const sheet = sheetRef.current;
			if (!sheet) return;
			const focusable = Array.from(
				sheet.querySelectorAll<HTMLElement>(
					'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
				),
			).filter((el) => el.offsetParent !== null);
			if (focusable.length === 0) {
				e.preventDefault();
				return;
			}
			const first = focusable[0]!;
			const last = focusable[focusable.length - 1]!;
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (
				!e.shiftKey &&
				document.activeElement === last
			) {
				e.preventDefault();
				first.focus();
			}
		};
		window.addEventListener("keydown", onKey);
		// Lock the page behind the modal; the cleanup runs on close AND
		// on unmount, so the page never stays locked.
		lockBodyScroll();
		// Land keyboard focus inside the dialog without scrolling
		// anything (the sheet is already fully in view).
		sheetRef.current?.focus({ preventScroll: true });
		return () => {
			window.removeEventListener("keydown", onKey);
			unlockBodyScroll();
		};
	}, [open ]);

	if (!open || !service) return null;

	// Bangla display copy when lang is bn (bn overlay from the API);
	// English otherwise.
	const displayName =
		lang === "bn" && service.bn?.title ? service.bn.title : service.name;
	const displayDescription =
		lang === "bn"
			? (service.bn?.description ?? service.bn?.summary ?? service.description)
			: service.description;

	return (
		<div
			className="modal-backdrop"
			onClick={() => setOpen(false)}
			role="presentation"
		>
			<div
				ref={sheetRef}
				className="modal-sheet"
				role="dialog"
				aria-modal="true"
				aria-label={displayName}
				tabIndex={-1}
				onClick={(e) => e.stopPropagation()}
				style={{
					// Dynamic viewport height: stable while the mobile
					// toolbar shows/hides (vh would resize the sheet).
					maxHeight: "92dvh",
					// A tall sheet scrolls INSIDE itself; never let
					// that scroll chain out to the page behind it.
					overscrollBehavior: "contain",
				}}
			>
				<button
					type="button"
					className="modal-close"
					aria-label={dict?.close ?? "Close"}
					onClick={() => setOpen(false)}
				>
					×
				</button>
				<span className="service-icon" aria-hidden="true">
					{service.icon && hasSpriteIcon(service.icon) ? (
						<SpriteIcon
							slug={service.icon}
							name={service.name}
							size={26}
							decorative
							className={
								service.icon === "wordpress" ? "logo-dark-invert" : undefined
							}
						/>
					) : service.icon ? (
						<img
							src={simpleIconsUrl(service.icon)}
							alt=""
							width={26}
							height={26}
							loading="lazy"
							decoding="async"
							className={
								service.icon === "wordpress" ? "logo-dark-invert" : undefined
							}
						/>
					) : service.lucide === "Database" ? (
						<svg
							width="26"
							height="26"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<ellipse cx="12" cy="5" rx="9" ry="3" />
							<path d="M3 5v14a9 3 0 0 0 18 0V5" />
							<path d="M3 12a9 3 0 0 0 18 0" />
						</svg>
					) : service.lucide === "Code" ? (
						<svg
							width="26"
							height="26"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<polyline points="16 18 22 12 16 6" />
							<polyline points="8 6 2 12 8 18" />
						</svg>
					) : (
						<svg
							width="26"
							height="26"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							aria-hidden="true"
						>
							<polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
							<polyline points="16 7 22 7 22 13" />
						</svg>
					)}
				</span>
				<h2 style={{ marginTop: "14px" }}>{displayName}</h2>
				<p className="modal-sub" style={{ fontSize: "15px", lineHeight: 1.6 }}>
					{displayDescription}
				</p>
				{/* MARKETPLACE COPY: no "Contact about this service" button
				    here — there is no contact modal on this copy. */}
			</div>
		</div>
	);
}
