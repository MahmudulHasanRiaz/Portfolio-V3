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
})();
