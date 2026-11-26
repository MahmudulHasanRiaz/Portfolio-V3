// Rich inline runs for detail bodies (TipTap editor, 0043).
//
// Renders the `rich` runs parseHtmlBlocks produces: bold / italic /
// underline / strikethrough / links (href already validated to
// http(s) / site-relative / anchor by the sanitizer in lib/detail).
// Preact escapes text and attribute values, so nothing here can emit
// raw HTML. This component is STATIC — used from MarkdownBody.astro
// with no client:* directive — so it renders to HTML at build / SSR
// time and ships ZERO JavaScript to the public site.
import { Fragment } from "preact";
import type { InlineRun } from "../lib/detail";

interface Props {
	/** Formatted runs; when absent, `text` renders as one plain run. */
	runs?: InlineRun[];
	text?: string;
}

export function RichText({ runs, text }: Props) {
	const items: InlineRun[] =
		runs && runs.length > 0 ? runs : text ? [{ text }] : [];
	return (
		<>
			{items.map((run, i) => {
				if (run.br) return <br key={i} />;
				let node: preact.ComponentChild = run.text;
				if (run.strike) node = <s>{node}</s>;
				if (run.underline) node = <u>{node}</u>;
				if (run.italic) node = <em>{node}</em>;
				if (run.bold) node = <strong>{node}</strong>;
				if (run.href) node = <a href={run.href}>{node}</a>;
				return <span key={i}>{node}</span>;
			})}
		</>
	);
}
