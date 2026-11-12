import type { APIRoute } from "astro";
import { resolvePublicContentToken } from "../../loaders/public-content";
import { leadPayload, validateLead } from "../../lib/lead";

// POST /api/contact — same-origin proxy for the contact form.
//
// The browser only ever talks to this route. It validates with the SAME
// rules/messages as src/lib/lead.ts, then forwards to the dashboard's
// public leads endpoint POST {PUBLIC_CONTENT_API_URL}/api/public/leads
// (Portfolio-V2, PR #94) with `Authorization: Bearer <token>`. The token
// comes from the Worker runtime env via the loader's exported
// resolvePublicContentToken() — it is NEVER hardcoded here and NEVER
// leaves the server: the browser never sees it, and neither the token
// nor the submitted body is ever logged.
//
// The dashboard endpoint inserts into `leads` with leadSource
// "website", rate-limits 10/hour/IP, and returns 201 + { id }.
// Responses mirror it: 201 + { id } on success, 400 + { errors }
// (lead.ts field errors) on validation failure, 429 + { error } on
// rate limit, 500 + a generic message on anything else (a rejected
// token or an upstream failure must never leak auth/config state to
// the browser).
export const prerender = false;

/** Generic submit failure — the dashboard's own 500 copy, reused so no new copy is invented. */
const SUBMIT_FAILED = "Failed to submit. Please try again later.";

/**
 * Resolve the Public Content API base URL at request time.
 *
 * Same lookup as the loader's (private) resolveApiBase — Worker runtime
 * env first, then build-time import.meta.env — written out here because
 * the loader's resolver is not exported and src/loaders/public-content.ts
 * is frozen while parallel workers own it. Only the base URL is
 * duplicated; the TOKEN resolver is imported, never re-implemented.
 */
async function resolveApiBase(): Promise<string | undefined> {
	try {
		// Worker runtime — dynamic import so the Node prerender build stays green.
		const { env } = await import("cloudflare:workers");
		const runtime = (env as Record<string, unknown>)
			.PUBLIC_CONTENT_API_URL;
		if (typeof runtime === "string" && runtime) {
			return runtime.replace(/\/$/, "");
		}
	} catch {
		// Not running in a Worker (local dev / build) — fall through.
	}
	const fromEnv = import.meta.env.PUBLIC_CONTENT_API_URL as
		| string
		| undefined;
	return (fromEnv ?? "").replace(/\/$/, "") || undefined;
}

function asField(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

export const POST: APIRoute = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return Response.json(
			{
				errors: [
					{ field: "name", message: "Please tell me your name." },
				],
			},
			{ status: 400 },
		);
	}
	const input =
		body !== null && typeof body === "object"
			? (body as Record<string, unknown>)
			: {};

	// Same contract as src/lib/lead.ts — the form already validated
	// client-side, but the server never trusts the browser.
	const errors = validateLead({
		name: asField(input.name),
		email: asField(input.email),
		phone: asField(input.phone),
		service: asField(input.service),
		message: asField(input.message),
		source: asField(input.source),
	});
	if (errors.length > 0) {
		return Response.json({ errors }, { status: 400 });
	}

	const [apiBase, token] = await Promise.all([
		resolveApiBase(),
		resolvePublicContentToken(),
	]);
	if (!apiBase || !token) {
		return Response.json({ error: SUBMIT_FAILED }, { status: 500 });
	}

	let upstream: Response;
	try {
		upstream = await fetch(`${apiBase}/api/public/leads`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${token}`,
			},
			body: JSON.stringify(leadPayload({
				name: asField(input.name),
				email: asField(input.email),
				phone: asField(input.phone),
				service: asField(input.service),
				message: asField(input.message),
				source: asField(input.source),
			})),
			signal: AbortSignal.timeout(8000),
		});
	} catch {
		return Response.json({ error: SUBMIT_FAILED }, { status: 500 });
	}

	let upstreamBody: unknown = null;
	try {
		upstreamBody = await upstream.json();
	} catch {
		upstreamBody = null;
	}
	const record =
		upstreamBody !== null && typeof upstreamBody === "object"
			? (upstreamBody as Record<string, unknown>)
			: {};

	if (upstream.status === 201) {
		return Response.json(
			{ id: typeof record.id === "string" ? record.id : undefined },
			{ status: 201 },
		);
	}
	// Field errors pass through untouched — the form maps them to the
	// same localised per-field strings as its client-side validation.
	if (upstream.status === 400 && Array.isArray(record.errors)) {
		return Response.json({ errors: record.errors }, { status: 400 });
	}
	// Rate limit: the dashboard's own user-facing message passes through.
	if (
		upstream.status === 429 &&
		typeof record.error === "string" &&
		record.error
	) {
		return Response.json({ error: record.error }, { status: 429 });
	}
	return Response.json({ error: SUBMIT_FAILED }, { status: 500 });
};
