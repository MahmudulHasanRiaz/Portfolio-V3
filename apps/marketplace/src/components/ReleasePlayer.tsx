import { useState } from "preact/hooks";
import { Play } from "lucide-react";
import { youtubeEmbed, youtubeThumb } from "../lib/youtube";
import { getDict, type ReleasePlayerDict, type Lang } from "../lib/i18n";

// In-page YouTube player. The facade shows the real thumbnail with a play
// button; clicking swaps it for the privacy-enhanced embed in the same
// frame, so the video plays inside the page. Audio-only releases never
// use this component.
export default function ReleasePlayer({
	youtubeId,
	title,
	lang = "en",
	dict,
}: {
	youtubeId: string;
	title: string;
	lang?: Lang;
	/** Subset dict only (Issue 7B) — playHere + watchOnYouTube. */
	dict?: ReleasePlayerDict;
}) {
	const t = dict ?? getDict(lang);
	const playLabel = lang === "bn" ? `${title} প্লে করুন` : `Play ${title}`;
	const [playing, setPlaying] = useState(false);
	const thumb = youtubeThumb(youtubeId);

	return (
		<div>
			{playing ? (
				<iframe
					className="video-frame"
					src={`${youtubeEmbed(youtubeId)}?autoplay=1`}
					title={playLabel}
					allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
					allowFullScreen
				/>
			) : (
				<button
					type="button"
					className="video-facade"
					onClick={() => setPlaying(true)}
					aria-label={playLabel}
				>
					{thumb ? <img src={thumb} alt={title} loading="lazy" decoding="async" /> : null}
					<span className="play-btn">
						<Play size={28} fill="currentColor" />
					</span>
					<span className="play-label">{t.playHere}</span>
				</button>
			)}
			<p style={{ margin: "10px 0 0", fontSize: 13 }}>
				<a
					href={`https://youtu.be/${youtubeId}`}
					target="_blank"
					rel="noreferrer"
				>
					{t.watchOnYouTube}
				</a>
			</p>
		</div>
	);
}
