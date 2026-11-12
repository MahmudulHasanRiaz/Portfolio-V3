import { useEffect, useRef, useState } from "preact/hooks";
import ContactForm from "./ContactForm";
import { SERVICES, type Service } from "../data/site";
import { lockBodyScroll, unlockBodyScroll } from "../lib/scrollLock";
import { getDict, pickDict, CONTACT_FORM_DICT_KEYS, type ContactModalDict, type Lang } from "../lib/i18n";

interface OpenContactDetail {
	service?: string;
	source?: string;
}

// Shared contact modal — mounted once per page by the Layout.
// Opens when any CTA dispatches `window.dispatchEvent(new CustomEvent(
// "open-contact", { detail: { service?, source? } }))`.
// Backdrop click, the × button, and Escape all close it.
//
// SCROLL STABILITY (worker H, 2026-11-08): the modal used to BOUNCE on
// open — up once, then down once, oscillating — when opened from a
// service. Three stacked causes, all fixed here:
//  1. The sheet opened as a short skeleton and the full form replaced
//     it one frame later, so the bottom-anchored sheet's top edge
//     jumped UP ~500px in a single frame. The form is fully local
//     (no async data), so the skeleton served no purpose: the form now
//     renders in the same frame as the sheet, at its final height.
//  2. The scroll lock only set body overflow, and the service ->
//     contact handover unlocked the page for a whole task (setTimeout
//     0) between the two modals. The shared reference-counted lock in
//     src/lib/scrollLock.ts locks <html> AND <body>, fixes the body at
//     the saved scroll offset, and never unlocks across the handover.
//  3. The sheet capped at 92vh — vh tracks the mobile toolbar, so the
//     sheet resized whenever the toolbar showed/hid. It now caps at
//     92dvh (stylesheet 92vh stays as the fallback for old browsers).
// The sheet is focused on open with preventScroll (keyboard users land
// in the dialog; no focus-driven scroll can move it), and nothing in
// the modal ever autofocuses an input.
export default function ContactModal({
	lang = "en",
	dict,
	services,
}: {
	lang?: Lang;
	/** Subset dict only (Issue 7B) — own 3 keys + the ContactForm keys forwarded below. */
	dict?: ContactModalDict;
	/** Live-merged services (getServices(), via the page → Layout) — defaults to build-time SERVICES. */
	services?: Service[];
}) {
	const t = dict ?? getDict(lang);
	const [open, setOpen] = useState(false);
	const [service, setService] = useState<string | undefined>(undefined);
	const [source, setSource] = useState<string | undefined>(undefined);
	const sheetRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handler = (e: Event) => {
			const detail = (e as CustomEvent<OpenContactDetail>).detail ?? {};
			setService(detail.service);
			setSource(detail.source);
			setOpen(true);
		};
		window.addEventListener("open-contact", handler);
		return () => window.removeEventListener("open-contact", handler);
	}, []);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				setOpen(false);
				return;
			}
			// A11y (2026-11-09): focus trap — Tab cycles inside the
			// dialog instead of escaping to the locked page behind it.
			// (Before this, focus landed on the sheet on open but Tab
			// could walk out onto the background page.)
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

	if (!open) return null;

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
				aria-label={t.contactMe}
				tabIndex={-1}
				onClick={(e) => e.stopPropagation()}
				style={{
					// Dynamic viewport height: stable while the mobile
					// toolbar shows/hides (vh would resize the sheet).
					maxHeight: "92dvh",
					// A tall form scrolls INSIDE the sheet; never let
					// that scroll chain out to the page behind it.
					overscrollBehavior: "contain",
				}}
			>
				<button
					type="button"
					className="modal-close"
					aria-label={t.close}
					onClick={() => setOpen(false)}
				>
					×
				</button>
				<h2>{t.contactMe}</h2>
				<p className="modal-sub">{t.modalSub}</p>
				<ContactForm service={service} source={source} lang={lang} dict={pickDict(t, CONTACT_FORM_DICT_KEYS)} services={services ?? SERVICES} />
			</div>
		</div>
	);
}
