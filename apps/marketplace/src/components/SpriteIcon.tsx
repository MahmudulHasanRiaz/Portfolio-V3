// Sprite icon (React) — renders a Simple Icons slug from the single
// self-hosted sprite (src/assets/icons.svg) instead of one
// cdn.simpleicons.org request per icon. Returns null when the slug is
// NOT in the sprite so the caller can fall back to the CDN <img>.
import { ICON_SPRITE_URL, hasSpriteIcon } from "../lib/icons";

interface Props {
	slug: string;
	name: string;
	size?: number;
	className?: string;
	decorative?: boolean;
}

export default function SpriteIcon({
	slug,
	name,
	size = 20,
	className,
	decorative = false,
}: Props) {
	if (!hasSpriteIcon(slug)) return null;
	return (
		<svg
			viewBox="0 0 24 24"
			width={size}
			height={size}
			role={decorative ? undefined : "img"}
			aria-label={decorative ? undefined : name}
			aria-hidden={decorative ? true : undefined}
			className={className}
		>
			<use href={`${ICON_SPRITE_URL}#${slug}`} />
		</svg>
	);
}
