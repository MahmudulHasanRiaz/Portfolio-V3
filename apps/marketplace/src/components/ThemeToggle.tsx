import { useEffect, useState } from "preact/hooks";
import { getDict, type Lang, type ThemeToggleDict } from "../lib/i18n";

// Theme toggle island — light / dark, system preference by default.
// The <html data-theme> attribute is set before paint by the inline script
// in Layout.astro; this island only flips it and remembers the choice.
export default function ThemeToggle({
	lang = "en",
	dict,
}: {
	lang?: Lang;
	/** Subset dict only — the 2 switch labels (aria-label). */
	dict?: ThemeToggleDict;
}) {
	const t = dict ?? getDict(lang);
	const [theme, setTheme] = useState<"light" | "dark">("light");

	useEffect(() => {
		const current =
			document.documentElement.getAttribute("data-theme") === "dark"
				? "dark"
				: "light";
		setTheme(current);
	}, []);

	const toggle = () => {
		const next = theme === "dark" ? "light" : "dark";
		document.documentElement.setAttribute("data-theme", next);
		try {
			localStorage.setItem("theme", next);
		} catch {
			/* storage unavailable */
		}
		setTheme(next);
	};

	return (
		<button
			type="button"
			onClick={toggle}
			aria-label={theme === "dark" ? t.switchToLight : t.switchToDark}
			style={{
				width: 48,
				height: 32,
				borderRadius: 14,
				border: "1px solid var(--card-border)",
				background: "transparent",
				color: "var(--accent-strong)",
				cursor: "pointer",
				fontSize: 13,
			}}
		>
			{theme === "dark" ? "☀️" : "🌙"}
		</button>
	);
}
