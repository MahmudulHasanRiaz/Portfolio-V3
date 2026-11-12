// Generic Lucide icon resolver for services.
//
// lib/content.ts resolveServiceIcon() already maps a live `icon` value
// onto Service.lucide — but Services.astro / ServiceModal.tsx rendered
// it with a hardcoded 3-way switch (Database / Code / TrendingUp
// fallback), so ANY other Lucide name from the API showed the fallback
// icon. This component resolves any Lucide name via lucide-react's
// `icons` record instead; an unknown / empty name keeps the old
// fallback (TrendingUp), so the existing cards render pixel-identical.
// The `icons` record is synchronous, so .astro pages render it as
// static SVG (no client directive = no JS shipped); inside
// ServiceModal it joins the existing island chunk.
import { icons, type LucideIcon } from "lucide-react";

const FALLBACK: LucideIcon = icons.TrendingUp;

export default function ServiceIcon({
	name,
	size = 26,
}: {
	/** Lucide icon name (PascalCase), e.g. "Database". */
	name?: string;
	size?: number;
}) {
	const Icon =
		(name
			? (icons as Record<string, LucideIcon | undefined>)[name]
			: undefined) ?? FALLBACK;
	return <Icon width={size} height={size} aria-hidden="true" />;
}
