// Shared detail-page wiring — loaded once by the Layout (defer), so no
// inline script ever sits inside <main>.
//  1. [data-open-contact] buttons dispatch "open-contact" (service
//     pre-selection + source) for the ContactModal island.
//  2. [data-media-slider] scroll-snap sliders: prev/next page buttons,
//     "N of M" page counter + progress bar, updated on scroll.
//  3. [data-video-facade] poster buttons swap in a <video> on tap.
(function () {
	if (window.__detailJsWired) return;
	window.__detailJsWired = true;

	var reduceMotion =
		window.matchMedia &&
		window.matchMedia("(prefers-reduced-motion: reduce)").matches;

	// 1. Contact buttons (delegated — works for DetailCta, footer and
	// any future [data-open-contact] button on the page).
	document.addEventListener("click", function (event) {
		var target = event.target;
		if (!(target instanceof HTMLElement)) return;
		var button = target.closest("[data-open-contact]");
		if (!button) return;
		var service = button.getAttribute("data-service") || undefined;
		var source = button.getAttribute("data-source") || undefined;
		window.dispatchEvent(
			new CustomEvent("open-contact", { detail: { service: service, source: source } }),
		);
	});

	// 2. Media sliders.
	// Re-run on EVERY `astro:page-load`: this file loads once (defer)
	// and the IIFE's `__detailJsWired` guard means the top-level code
	// never re-runs — so sliders on a page reached by a 2nd+ client
	// navigation were never wired. `astro:page-load` fires on every
	// navigation; the `:not([data-slider-bound])` guard keeps a
	// slider from being wired twice.
	function wireSliders() {
	document.querySelectorAll("[data-media-slider]:not([data-slider-bound])").forEach(function (slider) {
		slider.setAttribute("data-slider-bound", "");
		var track = slider.querySelector(".media-track");
		if (!track) return;
		var slides = Array.prototype.slice.call(
			track.querySelectorAll(".media-slide"),
		);
		if (slides.length <= 1) return;
		var perView =
			parseInt(slider.getAttribute("data-per-view") || "1", 10) || 1;
		var pages = Math.max(1, Math.ceil(slides.length / perView));
		var counter = slider.querySelector("[data-slider-counter]");
		// Counter in the page language: the template ("{current} of
		// {total}" / "{current} / {total}") + language ride on the
		// slider's data attributes (DetailMedia.astro renders them
		// from the dictionary); without them, fall back to English.
		var counterTemplate =
			slider.getAttribute("data-counter-template") ||
			"{current} of {total}";
		var counterLang = slider.getAttribute("data-counter-lang") || "en";
		var fmtNum = function (n) {
			return counterLang === "bn" ? n.toLocaleString("bn-BD") : String(n);
		};
		var progress = slider.querySelector("[data-slider-progress]");
		var prev = slider.querySelector("[data-slider-prev]");
		var next = slider.querySelector("[data-slider-next]");

		function pageWidth() {
			var slide = slides[0];
			if (!slide) return track.clientWidth;
			var style = window.getComputedStyle(track);
			var gap = parseFloat(style.columnGap || style.gap || "0") || 0;
			return (slide.offsetWidth + gap) * perView;
		}
		function currentPage() {
			var w = pageWidth();
			if (w <= 0) return 1;
			return Math.min(
				pages,
				Math.max(1, Math.round(track.scrollLeft / w) + 1),
			);
		}
		function render() {
			var page = currentPage();
			if (counter)
				counter.textContent = counterTemplate
					.replace("{current}", fmtNum(page))
					.replace("{total}", fmtNum(pages));
			if (progress)
				progress.style.width = (page / pages) * 100 + "%";
			if (prev) prev.disabled = page <= 1;
			if (next) next.disabled = page >= pages;
		}
		function go(dir) {
			var w = pageWidth();
			track.scrollBy({
				left: dir * w,
				behavior: reduceMotion ? "auto" : "smooth",
			});
			track.querySelectorAll("video").forEach(function (v) {
				v.pause();
			});
		}
		if (prev) prev.addEventListener("click", function () { go(-1); });
		if (next) next.addEventListener("click", function () { go(1); });
		track.addEventListener("scroll", render, { passive: true });
		window.addEventListener("resize", render);
		render();
	});
	}
	document.addEventListener("astro:page-load", wireSliders);
	wireSliders();

	// 3. Video facades (project / case-study / venture video thumbnails).
	document.addEventListener("click", function (event) {
		var target = event.target;
		if (!(target instanceof HTMLElement)) return;
		var facade = target.closest("[data-video-facade]");
		if (!facade) return;
		var src = facade.getAttribute("data-src");
		if (!src) return;
		var poster = facade.getAttribute("data-poster") || "";
		var video = document.createElement("video");
		video.src = src;
		video.controls = true;
		// No Download entry in the native controls (2026-11-09): the
		// Pexels video was downloaded as a file from the controls'
		// overflow menu. Playback only — the file stays on the site.
		video.controlsList = "nodownload";
		video.autoplay = true;
		video.playsInline = true;
		video.className = "video-frame";
		if (poster) video.poster = poster;
		facade.replaceWith(video);
		video.focus();
	});

	// 4. Gallery lightbox (detail pages). Any [data-lightbox-open]
	// button opens the overlay at the FULL-resolution URL (data-full),
	// never the sized thumbnail. Prev/next buttons + arrow keys,
	// Esc / backdrop click / close button to close, swipe on touch,
	// and a "N of M" counter in the page language (template rides on
	// the lightbox's data attributes, like the sliders). The click
	// listener is delegated and bound once, so it survives client
	// navigations (astro:page-load re-renders the gallery).
	var lightboxState = null; // { lb, items, index, opener, img, counter, template, fmtNum }

	function renderLightboxItem() {
		var s = lightboxState;
		if (!s) return;
		var item = s.items[s.index];
		s.img.src = item.full;
		s.img.alt = item.alt;
		if (s.counter)
			s.counter.textContent = s.template
				.replace("{current}", s.fmtNum(s.index + 1))
				.replace("{total}", s.fmtNum(s.items.length));
		var prev = s.lb.querySelector("[data-lightbox-prev]");
		var next = s.lb.querySelector("[data-lightbox-next]");
		if (prev) prev.disabled = s.index <= 0;
		if (next) next.disabled = s.index >= s.items.length - 1;
	}

	function navLightbox(dir) {
		var s = lightboxState;
		if (!s) return;
		var next = Math.min(s.items.length - 1, Math.max(0, s.index + dir));
		if (next === s.index) return;
		s.index = next;
		renderLightboxItem();
	}

	function openLightbox(lb, items, index, opener) {
		var template =
			lb.getAttribute("data-counter-template") || "{current} of {total}";
		var counterLang = lb.getAttribute("data-counter-lang") || "en";
		lightboxState = {
			lb: lb,
			items: items,
			index: index,
			opener: opener,
			img: lb.querySelector("[data-lightbox-img]"),
			counter: lb.querySelector("[data-lightbox-counter]"),
			template: template,
			fmtNum: function (n) {
				return counterLang === "bn" ? n.toLocaleString("bn-BD") : String(n);
			},
		};
		renderLightboxItem();
		lb.hidden = false;
		lb.setAttribute("aria-hidden", "false");
		document.body.style.overflow = "hidden";
		window.__lightboxOpen = true;
		var closeBtn = lb.querySelector("[data-lightbox-close]");
		if (closeBtn) closeBtn.focus();
	}

	function closeLightbox() {
		var s = lightboxState;
		if (!s) return;
		lightboxState = null;
		s.lb.hidden = true;
		s.lb.setAttribute("aria-hidden", "true");
		document.body.style.overflow = "";
		window.__lightboxOpen = false;
		if (s.opener && s.opener.focus) s.opener.focus();
	}

	document.addEventListener("click", function (event) {
		var target = event.target;
		if (!(target instanceof HTMLElement)) return;
		var opener = target.closest("[data-lightbox-open]");
		if (opener) {
			var lb = document.querySelector("[data-lightbox]");
			if (!lb) return;
			var items = Array.prototype.slice
				.call(document.querySelectorAll("[data-lightbox-open]"))
				.map(function (el) {
					return {
						full: el.getAttribute("data-full") || "",
						alt: el.getAttribute("data-alt") || "",
					};
				});
			var index = parseInt(opener.getAttribute("data-index") || "0", 10) || 0;
			openLightbox(lb, items, index, opener);
			return;
		}
		if (!lightboxState) return;
		if (target === lightboxState.lb) {
			// Backdrop click (outside the figure/buttons) closes.
			closeLightbox();
			return;
		}
		if (target.closest("[data-lightbox-close]")) closeLightbox();
		else if (target.closest("[data-lightbox-prev]")) navLightbox(-1);
		else if (target.closest("[data-lightbox-next]")) navLightbox(1);
	});

	document.addEventListener("keydown", function (event) {
		if (!lightboxState) return;
		if (event.key === "Escape") {
			event.preventDefault();
			closeLightbox();
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			navLightbox(-1);
		} else if (event.key === "ArrowRight") {
			event.preventDefault();
			navLightbox(1);
		}
	});

	// Touch swipe: horizontal swipe over 50px navigates; a vertical
	// swipe is ignored (the image itself never scrolls).
	var touchStartX = null;
	var touchStartY = null;
	document.addEventListener(
		"touchstart",
		function (event) {
			if (!lightboxState) return;
			var t = event.touches[0];
			touchStartX = t.clientX;
			touchStartY = t.clientY;
		},
		{ passive: true },
	);
	document.addEventListener(
		"touchend",
		function (event) {
			if (!lightboxState || touchStartX === null) return;
			var t = event.changedTouches[0];
			var dx = t.clientX - touchStartX;
			var dy = t.clientY - touchStartY;
			touchStartX = null;
			touchStartY = null;
			if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy))
				navLightbox(dx < 0 ? 1 : -1);
		},
		{ passive: true },
	);

	// 5. Scroll-frames for full-page screenshots (detail page only —
	// the homepage never renders [data-scroll-frame]). The frame is a
	// fixed-aspect viewport over a tall image; the script slowly
	// scrolls it down and back up (ping-pong, with a pause at each
	// end) so the whole long page is readable. Pauses while the
	// pointer is over the frame or the user scrolls it by hand, and
	// while the lightbox is open. With prefers-reduced-motion (or
	// without JS) the frame stays manually scrollable instead.
	function wireScrollFrames() {
		document
			.querySelectorAll("[data-scroll-frame]:not([data-scroll-bound])")
			.forEach(function (frame) {
				frame.setAttribute("data-scroll-bound", "");
				if (reduceMotion) return;
				var img = frame.querySelector("img");
				if (!img) return;
				var dir = 1;
				var last = null;
				var holdUntil = 0;
				var paused = false;
				var SPEED_PX_PER_SEC = 120; // a full pass takes ~20-30s
				var HOLD_MS = 1500;
				function tick(ts) {
					// The frame was swapped out (client-side navigation,
					// e.g. a language switch) — stop this loop; the new
					// page's frames get their own via wireScrollFrames
					// on astro:page-load.
					if (!frame.isConnected) return;
					if (last === null) last = ts;
					var dt = Math.min(0.1, (ts - last) / 1000);
					last = ts;
					var max = Math.max(0, frame.scrollHeight - frame.clientHeight);
					if (max > 0 && !paused && !window.__lightboxOpen && ts >= holdUntil) {
						frame.scrollTop += dir * SPEED_PX_PER_SEC * dt;
						if (frame.scrollTop >= max) {
							frame.scrollTop = max;
							dir = -1;
							holdUntil = ts + HOLD_MS;
						} else if (frame.scrollTop <= 0) {
							frame.scrollTop = 0;
							dir = 1;
							holdUntil = ts + HOLD_MS;
						}
					}
					requestAnimationFrame(tick);
				}
				var host = frame.closest("button, figure") || frame;
				host.addEventListener("mouseenter", function () {
					paused = true;
				});
				host.addEventListener("mouseleave", function () {
					paused = false;
				});
				host.addEventListener("pointerdown", function () {
					paused = true;
				});
				host.addEventListener("pointerup", function () {
					setTimeout(function () {
						paused = false;
					}, 2000);
				});
				if (img.complete) requestAnimationFrame(tick);
				else
					img.addEventListener(
						"load",
						function () {
							requestAnimationFrame(tick);
						},
						{ once: true },
					);
			});
	}
	document.addEventListener("astro:page-load", wireScrollFrames);
	wireScrollFrames();

	// 6. Filter-link pills — tag pills on cards (projects, posts,
	// homepage) that filter an archive instead of opening the detail
	// page. The pill is a <button> inside the card link; this
	// delegated document handler intercepts the click
	// (preventDefault stops the card navigation), then either applies
	// the filter in place — same archive page, by clicking the
	// matching chip — or navigates to the archive URL with
	// ?filter=<tag>. Delegated on `document` and bound once, so it
	// survives client-side navigation (language switch) without
	// re-binding, the same resilience pattern as the lightbox above.
	// Without JS the pill is just a button inside the card link, so
	// the click falls through to the detail page as before.
	document.addEventListener("click", function (event) {
		var target = event.target;
		if (!(target instanceof HTMLElement)) return;
		var pill = target.closest("[data-filter-link]");
		if (!pill) return;
		event.preventDefault();
		var href = pill.getAttribute("data-filter-href") || "";
		var value = pill.getAttribute("data-filter-value") || "";
		if (!href || !value) return;
		var url;
		try {
			url = new URL(href, window.location.origin);
		} catch (e) {
			return;
		}
		url.searchParams.set("filter", value);
		var root = document.querySelector("[data-archive-filter]");
		var samePage = window.location.pathname === url.pathname;
		if (root && samePage) {
			var chips = root.querySelectorAll(".chip[data-filter]");
			for (var i = 0; i < chips.length; i++) {
				if (chips[i].getAttribute("data-filter") === value) {
					chips[i].click();
					return;
				}
			}
		}
		window.location.href = url.toString();
	});
})();
