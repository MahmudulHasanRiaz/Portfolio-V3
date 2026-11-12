// Lead validation — the shared contract for the universal contact form.
// Name required; Email OR Phone — at least one mandatory, the other
// optional. Bangladeshi phone formats: 01XXXXXXXXX, +8801XXXXXXXXX.
// The error strings are the contract: the form and the server action
// (when the real leads endpoint lands) must use these exact messages.
export interface LeadInput {
	name: string;
	email?: string;
	phone?: string;
	service?: string;
	message?: string;
	source?: string;
}

export interface LeadError {
	field: "name" | "contact" | "email" | "phone";
	message: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// 01XXXXXXXXX (11 digits, starts 01) or +8801XXXXXXXXX
const BD_PHONE_RE = /^(?:\+8801\d{9}|01\d{9})$/;

export function validateLead(input: LeadInput): LeadError[] {
	const errors: LeadError[] = [];
	const name = (input.name ?? "").trim();
	const email = (input.email ?? "").trim();
	const phone = (input.phone ?? "").trim();

	if (!name) {
		errors.push({ field: "name", message: "Please tell me your name." });
	}
	if (!email && !phone) {
		errors.push({
			field: "contact",
			message: "Please give your email or phone number so I can reply.",
		});
	}
	if (email && !EMAIL_RE.test(email)) {
		errors.push({
			field: "email",
			message: "That email address does not look right.",
		});
	}
	if (phone && !BD_PHONE_RE.test(phone.replace(/[\s-]/g, ""))) {
		errors.push({
			field: "phone",
			message:
				"Please give a Bangladeshi mobile number — 01XXXXXXXXX or +8801XXXXXXXXX.",
		});
	}
	return errors;
}

export function leadPayload(input: LeadInput) {
	return {
		name: (input.name ?? "").trim(),
		email: (input.email ?? "").trim() || null,
		phone: (input.phone ?? "").trim() || null,
		service: (input.service ?? "").trim() || null,
		message: (input.message ?? "").trim() || null,
		source: (input.source ?? "").trim() || null,
	};
}
