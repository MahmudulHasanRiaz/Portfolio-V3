// Reference-counted body scroll lock, shared by ContactModal and
// ServiceModal. The two modals hand over to each other (service card
// -> "Contact about this service" -> contact form): the lock count
// keeps the page locked across that handover, so the page behind the
// modals is NEVER unlocked for a frame in between — the unlock-then-
// relock gap in the old code (ServiceModal closed, then a setTimeout(0)
// opened the contact modal) let the page jump/scroll and the mobile
// toolbar resize, which the bottom-anchored sheet then followed up and
// down. Locking is done on BOTH <html> and <body>: on mobile the
// scrolling element is the document element, and body overflow alone
// does not lock iOS Safari at all. The body is additionally fixed at
// the saved scroll offset (the iOS-proof part): with the body fixed,
// no touch drag, focus move, or scroll-anchoring adjustment can move
// the page behind the modal by even a pixel. On unlock the exact
// saved scrollY is restored, so the page returns to precisely where
// the visitor was — never the top, never a few pixels off.
let lockCount = 0;
let savedScrollY = 0;
let savedBody = {
	overflow: "",
	position: "",
	top: "",
	width: "",
	overscrollBehavior: "",
};
let savedHtml = { overflow: "", overscrollBehavior: "" };

export function lockBodyScroll(): void {
	if (typeof document === "undefined") return;
	lockCount += 1;
	if (lockCount > 1) return;
	const docEl = document.documentElement;
	const body = document.body;
	savedScrollY = window.scrollY || 0;
	savedBody = {
		overflow: body.style.overflow,
		position: body.style.position,
		top: body.style.top,
		width: body.style.width,
		overscrollBehavior: body.style.overscrollBehavior,
	};
	savedHtml = {
		overflow: docEl.style.overflow,
		overscrollBehavior: docEl.style.overscrollBehavior,
	};
	docEl.style.overflow = "hidden";
	docEl.style.overscrollBehavior = "none";
	body.style.overflow = "hidden";
	body.style.overscrollBehavior = "none";
	body.style.position = "fixed";
	body.style.top = `-${savedScrollY}px`;
	body.style.width = "100%";
}

export function unlockBodyScroll(): void {
	if (typeof document === "undefined") return;
	if (lockCount === 0) return;
	lockCount -= 1;
	if (lockCount > 0) return;
	const docEl = document.documentElement;
	const body = document.body;
	docEl.style.overflow = savedHtml.overflow;
	docEl.style.overscrollBehavior = savedHtml.overscrollBehavior;
	body.style.overflow = savedBody.overflow;
	body.style.overscrollBehavior = savedBody.overscrollBehavior;
	body.style.position = savedBody.position;
	body.style.top = savedBody.top;
	body.style.width = savedBody.width;
	// Restore the exact pre-modal scroll position. The body was fixed
	// at -savedScrollY, so without this the page would land at the top.
	window.scrollTo(0, savedScrollY);
}
