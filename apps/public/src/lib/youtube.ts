// YouTube helpers — derive video IDs, thumbnails and privacy-enhanced
// embeds from a release's own stored YouTube URL. Never invent a URL.
export function youtubeIdFromUrl(url: string | undefined | null): string | null {
	if (!url) return null;
	const m =
		url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/) ||
		url.match(/[?&]v=([\w-]{6,})/);
	return m?.[1] ?? null;
}

export function youtubeThumb(id: string | null | undefined): string | null {
	if (!id) return null;
	return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

export function youtubeEmbed(id: string): string {
	return `https://www.youtube-nocookie.com/embed/${id}`;
}
