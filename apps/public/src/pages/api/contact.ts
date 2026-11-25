import type { APIRoute } from "astro";
import { resolvePublicContentToken } from "../../loaders/public-content";
import { leadPayload, validateLead } from "../../lib/lead";

// POST /api/contact — same-origin proxy for the contact form.
//
// The browser only ever talks to this route. It validates with the SAME
// rules/messages as src/lib/lead.ts, then forwards to the dashboard's
// public leads endpoint POST /api/public/leads (Portfolio-V2, PR #94)
// with `Authorization: Bearer <token>`. The token comes from the Worker
// runtime env via the loader's exported resolvePublicContentToken() — it
// is NEVER hardcoded here and NEVER leaves the server: the browser never
// sees it, and neither the token nor the submitted body is ever logged.
//
// HOW the forward reaches Hono (PR #41 — this route was the last caller
// that did not know): a Worker CANNOT fetch another Worker's
// `*.workers.dev` URL from inside the Worker — every such subrequest
// fails with Cloudflare "error code: 1042" (verified 2026-11-13, see
// src/loaders/public-content.ts fetchViaHonoBinding and the admin
// [...path] proxy). The plain-HTTPS forward this route used therefore
// threw on EVERY submit, and the form never delivered a lead in V3
// (0 leads ever, admin CRM 2026-11-25). The forward now goes through
// the HONO_API service binding (wrangler.jsonc `services`), which calls
// the Hono Worker directly with no DNS and no `workers.dev` hostname —
// the same path the content loader and the admin proxy already use.
// Only when no binding exists (local dev / build, where the binding
// does not exist) does it fall back to a plain HTTP fetch of
// {PUBLIC_CONTENT_API_URL}/api/public/leads, which resolves fine
// from Node.
//
// The visitor's IP is forwarded as `x-forwarded-for` on BOTH paths:
// through a service binding there is no `cf-connecting-ip`, so without
// it the API's leads rate limiter (10/hour/IP) would key EVERY
// submission as one shared bucket and break the form for everyone
// after the first 10 submissions/hour. The limiter reads
// `cf-connecting-ip` first, then `x-forwarded-for` — the forwarded
// first entry keeps one bucket per visitor.
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

type HonoBinding = {
	fetch: (req: Request) => Promise<Response>;
};

/**
 * Resolve the HONO_API service binding at request time, same pattern as
 * the loader's fetchViaHonoBinding and the admin [...path] proxy.
 * Returns null when there is no binding (local dev / build) — the
 * caller then falls back to a plain HTTP fetch.
 */
async function getHonoBinding(): Promise<HonoBinding | null> {
	try {
		const { env } = await import("cloudflare:workers");
		const binding = (env as Record<string, unknown>)
			.HONO_API as HonoBinding | undefined;
		if (binding && typeof binding.fetch === "function") return binding;
		return null;
	} catch {
		// Not running in a Worker (local dev / build) — fall through.
		return null;
	}
}

/**
 * Resolve the Public Content API base URL at request time.
 *
 * Same lookup as the loader's (private) resolveApiBase — Worker runtime
 * env first, then build-time import.meta.env — written out here because
 * the loader's resolver is not exported and src/loaders/public-content.ts
 * is frozen while parallel workers own it. Only the base URL is
 * duplicated; the TOKEN resolver is imported, never re-implemented.
 * The base URL is only the path source for the plain-HTTP fallback now;
 * the binding path uses a fixed placeholder origin (see below).
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

/**
 * The visitor's IP from the incoming request, for the API's per-IP
 * leads rate limiter. `cf-connecting-ip` is set by Cloudflare itself
 * and cannot be spoofed through the edge; `x-forwarded-for` first
 * entry is the fallback. Undefined when neither is present — the
 * caller then sends no forwarding header.
 */
function visitorIpOf(request: Request): string | undefined {
	const connecting = request.headers.get("cf-connecting-ip")?.trim();
	if (connecting) return connecting;
	const forwarded = request.headers.get("x-forwarded-for");
	if (forwarded) {
		const first = forwarded.split(",")[0]?.trim();
		if (first) return first;
	}
	return undefined;
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

	const [apiBase, token, binding] = await Promise.all([
		resolveApiBase(),
		resolvePublicContentToken(),
		getHonoBinding(),
	]);
	// The token is always required. The base URL is only required for
	// the plain-HTTP fallback — the binding path needs no base URL.
	if (!token || (!binding && !apiBase)) {
		return Response.json({ error: SUBMIT_FAILED }, { status: 500 });
	}

	const payloadBody = JSON.stringify(
		leadPayload({
			name: asField(input.name),
			email: asField(input.email),
			phone: asField(input.phone),
			service: asField(input.service),
			message: asField(input.message),
			source: asField(input.source),
		}),
	);
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		Authorization: `Bearer ${token}`,
	};
	// Per-visitor rate-limit bucket (see header comment): without this
	// every binding-call submission shares one limiter bucket.
	const visitorIp = visitorIpOf(request);
	if (visitorIp) headers["X-Forwarded-For"] = visitorIp;

	let upstream: Response;
	try {
		if (binding) {
			// Service binding: placeholder origin — the binding routes
			// by the bound service, not by hostname; only the path +
			// headers + body reach Hono (same as the loader).
			upstream = await binding.fetch(
				new Request("https://hono-api/api/public/leads", {
					method: "POST",
					headers,
					body: payloadBody,
					signal: AbortSignal.timeout(8000),
				}),
			);
		} else {
			upstream = await fetch(`${apiBase}/api/public/leads`, {
				method: "POST",
				headers,
				body: payloadBody,
				signal: AbortSignal.timeout(8000),
			});
		}
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
