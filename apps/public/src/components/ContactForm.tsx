import { useEffect, useRef, useState } from "preact/hooks";
import type { FormEvent, KeyboardEvent } from "preact/compat";
import { Check, ChevronDown } from "lucide-react";
import { PROFILE, SERVICES, type Service } from "../data/site";
import { leadPayload, validateLead, type LeadError } from "../lib/lead";
import { getDict, type ContactFormDict, type Lang } from "../lib/i18n";

interface ContactFormProps {
	service?: string;
	source?: string;
	/** Render the bare form (used by the Contact section) — no modal chrome. */
	inline?: boolean;
	lang?: Lang;
	/** Subset dict only (Issue 7B) — the 22 keys ContactForm reads. */
	dict?: ContactFormDict;
	/** Live-merged services (getServices(), passed down by the page) — defaults to build-time SERVICES. */
	services?: Service[];
}

// The ONE shared contact form — used by the modal and inline in Contact.
// Validation is the exact contract in src/lib/lead.ts: Name required;
// Email OR Phone — at least one mandatory; BD phone + email format checks.
// Layout, labels and placeholders match the React preview exactly:
// "Your name *" / Email + Phone side by side / "Service (optional)" /
// "Message (optional)" + a big full-width teal "Send message" button.
// The "Prefer email?" line renders under the INLINE form only — the
// preview's modal has no such line.
export default function ContactForm({
	service,
	source,
	inline = false,
	lang = "en",
	dict,
	services,
}: ContactFormProps) {
	const t = dict ?? getDict(lang);
	// Live services when the page passed them, else the build-time rows
	// (same fallback pattern as Services.astro). The option VALUE stays
	// the English service name — that is what the lead payload sends
	// (projectType) and what the service modal pre-selects by.
	const serviceOptions = services ?? SERVICES;
	const [name, setName] = useState("");
	const [email, setEmail] = useState("");
	const [phone, setPhone] = useState("");
	const [selectedService, setSelectedService] = useState(service ?? "");
	const [message, setMessage] = useState("");
	// Service listbox (custom glass listbox, like the header profile
	// picker — NOT a native <select>: the native open list is the
	// browser/OS default and looks styleless). The VALUE stays the
	// English service name — that is what the lead payload sends.
	const [serviceOpen, setServiceOpen] = useState(false);
	const [serviceActive, setServiceActive] = useState(0);
	const serviceWrapRef = useRef<HTMLDivElement>(null);
	const serviceBtnRef = useRef<HTMLButtonElement>(null);
	const serviceOptionRefs = useRef<Array<HTMLButtonElement | null>>([]);
	// Options: the placeholder first (value "" = no service, the field
	// is optional), then the same 5 services as the native select had.
	const serviceOptionsList = [
		{ value: "", label: t.formSelectService },
		...serviceOptions.map((s) => ({
			value: s.name,
			label: lang === "bn" && s.bn?.title ? s.bn.title : s.name,
		})),
	];
	const selectedServiceLabel =
		serviceOptionsList.find((o) => o.value === selectedService)?.label ??
		t.formSelectService;

	// When the listbox opens, scroll the field into view (inside the
	// modal sheet it can sit near the bottom edge) and focus the
	// active option so arrow keys work immediately.
	useEffect(() => {
		if (!serviceOpen) return;
		serviceWrapRef.current?.scrollIntoView({ block: "nearest" });
		serviceOptionRefs.current[serviceActive]?.focus();
	}, [serviceOpen, serviceActive]);

	// Close on an outside click.
	useEffect(() => {
		if (!serviceOpen) return;
		const onDown = (e: MouseEvent) => {
			if (
				serviceWrapRef.current &&
				!serviceWrapRef.current.contains(e.target as Node)
			) {
				setServiceOpen(false);
			}
		};
		document.addEventListener("mousedown", onDown);
		return () => document.removeEventListener("mousedown", onDown);
	}, [serviceOpen]);

	const openServiceList = (focusIndex: number) => {
		setServiceActive(focusIndex);
		setServiceOpen(true);
	};

	const chooseService = (value: string) => {
		setSelectedService(value);
		setServiceOpen(false);
		serviceBtnRef.current?.focus();
	};

	const onServiceButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
		const selectedIndex = Math.max(
			0,
			serviceOptionsList.findIndex((o) => o.value === selectedService),
		);
		if (e.key === "ArrowDown") {
			e.preventDefault();
			openServiceList(selectedIndex);
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			openServiceList(selectedIndex);
		} else if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			if (serviceOpen) setServiceOpen(false);
			else openServiceList(selectedIndex);
		} else if (e.key === "Escape" && serviceOpen) {
			e.preventDefault();
			setServiceOpen(false);
		}
	};

	const onServiceOptionKeyDown = (
		e: KeyboardEvent<HTMLButtonElement>,
		index: number,
	) => {
		const last = serviceOptionsList.length - 1;
		if (e.key === "ArrowDown") {
			e.preventDefault();
			const next = index >= last ? 0 : index + 1;
			setServiceActive(next);
			serviceOptionRefs.current[next]?.focus();
		} else if (e.key === "ArrowUp") {
			e.preventDefault();
			const prev = index <= 0 ? last : index - 1;
			setServiceActive(prev);
			serviceOptionRefs.current[prev]?.focus();
		} else if (e.key === "Home") {
			e.preventDefault();
			setServiceActive(0);
			serviceOptionRefs.current[0]?.focus();
		} else if (e.key === "End") {
			e.preventDefault();
			setServiceActive(last);
			serviceOptionRefs.current[last]?.focus();
		} else if (e.key === "Escape") {
			e.preventDefault();
			setServiceOpen(false);
			serviceBtnRef.current?.focus();
		} else if (e.key === "Tab") {
			setServiceOpen(false);
		}
	};

	const [errors, setErrors] = useState<LeadError[]>([]);
	// Server-side failure (rate limit, upstream/downstream error) — shown
	// IN the form, never a browser popup. Cleared on the next submit.
	const [serverError, setServerError] = useState<string | null>(null);
	const [submitted, setSubmitted] = useState(false);
	const [sending, setSending] = useState(false);

	// The modal re-opens with a different pre-selected service — follow it.
	useEffect(() => {
		setSelectedService(service ?? "");
	}, [service]);

	// Error display is localised by FIELD (the lead.ts messages stay
	// the server-side contract, untouched — only the rendered text
	// comes from the dictionary).
	const errorFor = (field: LeadError["field"]) => {
		const found = errors.find((e) => e.field === field);
		if (!found) return undefined;
		if (field === "name") return t.formErrorName;
		if (field === "contact") return t.formErrorContact;
		if (field === "email") return t.formErrorEmail;
		return t.formErrorPhone;
	};

	const resetForm = () => {
		setName("");
		setEmail("");
		setPhone("");
		setSelectedService(service ?? "");
		setMessage("");
		setErrors([]);
		setServerError(null);
		setSubmitted(false);
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (sending) return;
		const found = validateLead({
			name,
			email,
			phone,
			service: selectedService,
			message,
			source,
		});
		setErrors(found);
		if (found.length > 0) return;

		const payload = leadPayload({
			name,
			email,
			phone,
			service: selectedService,
			message,
			source,
		});

		// Real submit: same-origin POST /api/contact — the server route
		// validates again (lead.ts contract) and forwards to the
		// dashboard's public leads endpoint with the integration token.
		// The token never reaches the browser.
		setSending(true);
		setServerError(null);
		try {
			const res = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});
			let data: unknown = null;
			try {
				data = await res.json();
			} catch {
				data = null;
			}
			const record =
				data !== null && typeof data === "object"
					? (data as Record<string, unknown>)
					: {};
			if (!res.ok) {
				// Server-side field errors reuse the same per-field
				// display as client-side validation.
				if (Array.isArray(record.errors)) {
					setErrors(record.errors as LeadError[]);
				} else {
					setServerError(
						typeof record.error === "string" && record.error
							? record.error
							: "Failed to submit. Please try again later.",
					);
				}
				setSending(false);
				return;
			}
			setSending(false);
			setSubmitted(true);
		} catch {
			// Network failure (offline, Worker unreachable) — in-form
			// error, same wording as the server's own 500 copy.
			setServerError("Failed to submit. Please try again later.");
			setSending(false);
		}
	};

	if (submitted) {
		return (
			<div className="form-success">
				<h3>{t.formThanks}</h3>
				<p>{t.formReplyPersonal}</p>
				<button type="button" className="btn btn-ghost" onClick={resetForm}>
					{t.formSendAnother}
				</button>
				{inline ? (
					<p className="form-prefer-email">
						{t.formPreferEmail}{" "}
						<a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
					</p>
				) : null}
			</div>
		);
	}

	// The "Prefer email?" fallback lives under the inline (Contact
	// section) form only — the preview's modal has no such line.
	const preferEmail = inline ? (
		<p className="form-prefer-email">
			{t.formPreferEmail}{" "}
			<a href={`mailto:${PROFILE.email}`}>{PROFILE.email}</a>
		</p>
	) : null;

	return (
		<>
		<form
			onSubmit={handleSubmit}
			data-inline={inline ? "true" : undefined}
			data-busy={sending ? "true" : undefined}
			aria-busy={sending}
			noValidate
		>
			<div className="form-field">
				<label htmlFor="contact-name">
					{t.formName}
				</label>
				<input
					id="contact-name"
					type="text"
					value={name}
					onChange={(e) => setName(e.currentTarget.value)}
					autoComplete="name"
					placeholder={t.formNamePlaceholder}
				/>
				{errorFor("name") && <p className="form-error">{errorFor("name")}</p>}
			</div>

			<div className="form-row-2">
				<div className="form-field">
					<label htmlFor="contact-email">{t.formEmail}</label>
					<input
						id="contact-email"
						type="email"
						value={email}
						onChange={(e) => setEmail(e.currentTarget.value)}
						autoComplete="email"
						placeholder={t.formEmailPlaceholder}
					/>
					{errorFor("email") && <p className="form-error">{errorFor("email")}</p>}
				</div>

				<div className="form-field">
					<label htmlFor="contact-phone">{t.formPhone}</label>
					<input
						id="contact-phone"
						type="tel"
						value={phone}
						onChange={(e) => setPhone(e.currentTarget.value)}
						autoComplete="tel"
						placeholder={t.formPhonePlaceholder}
					/>
					{errorFor("phone") && <p className="form-error">{errorFor("phone")}</p>}
				</div>
			</div>

			<p className="form-hint">{t.formHintContact}</p>
			{errorFor("contact") && <p className="form-error">{errorFor("contact")}</p>}

			<div className="form-field service-select" ref={serviceWrapRef}>
				<label htmlFor="contact-service">
					{t.formService}
				</label>
				<button
					type="button"
					id="contact-service"
					ref={serviceBtnRef}
					className="service-select-btn"
					data-empty={selectedService === "" ? "true" : undefined}
					aria-haspopup="listbox"
					aria-expanded={serviceOpen}
					aria-controls="contact-service-listbox"
					onClick={() =>
						serviceOpen
							? setServiceOpen(false)
							: openServiceList(
									Math.max(
										0,
										serviceOptionsList.findIndex(
											(o) => o.value === selectedService,
										),
									),
								)
					}
					onKeyDown={onServiceButtonKeyDown}
				>
					<span className="service-select-value">{selectedServiceLabel}</span>
					<ChevronDown
						size={18}
						className="service-select-chev"
						aria-hidden="true"
					/>
				</button>
				{serviceOpen ? (
					<div
						id="contact-service-listbox"
						className="service-select-panel"
						role="listbox"
						aria-label={t.formService}
					>
						{serviceOptionsList.map((o, i) => {
							const selected = o.value === selectedService;
							return (
								<button
									key={o.value || "placeholder"}
									type="button"
									role="option"
									aria-selected={selected}
									tabIndex={serviceActive === i ? 0 : -1}
									ref={(el) => {
										serviceOptionRefs.current[i] = el;
									}}
									className="service-select-option"
									onClick={() => chooseService(o.value)}
									onKeyDown={(e) => onServiceOptionKeyDown(e, i)}
								>
									<span>{o.label}</span>
									<span
										className="service-select-check"
										aria-hidden="true"
									>
										{selected ? <Check size={16} /> : null}
									</span>
								</button>
							);
						})}
					</div>
				) : null}
				{service ? (
					<p className="form-hint">
						{t.formPreselected}
					</p>
				) : null}
			</div>

			<div className="form-field">
				<label htmlFor="contact-message">
					{t.formMessage}
				</label>
				<textarea
					id="contact-message"
					value={message}
					onChange={(e) => setMessage(e.currentTarget.value)}
					placeholder={t.formMessagePlaceholder}
				/>
			</div>

			{/* Server-side failure — in-form text, never a popup. */}
			{serverError && (
				<p className="form-error" role="alert">
					{serverError}
				</p>
			)}

			<div className="form-field">
				<button
					type="submit"
					className="btn btn-submit-full"
					disabled={sending}
					aria-live="polite"
				>
					{sending ? (
						<>
							<span className="btn-spinner" aria-hidden="true" />
							{t.formSending}
						</>
					) : (
						t.formSend
					)}
				</button>
			</div>
		</form>
		{preferEmail}
		</>
	);
}
