/* ------------------------------------------------------------------ */
/* Notification preferences — admin-only, edited at                    */
/* Settings → Notifications. Stored as ONE row in the EXISTING generic */
/* settings table (key = "notifications", value = a JSON object).       */
/* No migration is needed: the row is created on first save (upsert).   */
/*                                                                      */
/* Shape: { emailEnabled, newLead, abandonedLead }.                     */
/*                                                                      */
/* HONEST SCOPE — read before extending this: there is NO email sender  */
/* in the codebase today (no SMTP / Resend / mailer anywhere) and no    */
/* in-app notification feed (the admin bell says so explicitly; the     */
/* workflow send_notification action is a stub that persists nothing).  */
/* So these are PREFERENCES, saved now, that a future sender will       */
/* consult — nothing is actually sent today, and the Notifications page */
/* says that plainly. Do not present these toggles as live delivery.    */
/*                                                                      */
/* The two events are real triggers that already exist:                 */
/*   newLead        — POST /api/public/leads (contact-form submission)  */
/*   abandonedLead  — POST /api/abandoned (public capture of a contact  */
/*                     form started but left before submitting)         */
/* Do not add event types with no trigger.                              */
/*                                                                      */
/* Defaults: email OFF (fail-closed — nothing can be sent until a       */
/* sender is connected), both events ON (so when email is turned on,    */
/* both real events notify unless the admin opts out).                  */
/* ------------------------------------------------------------------ */

export const NOTIFICATIONS_KEY = "notifications";

export interface NotificationPreferences {
  emailEnabled: boolean;
  newLead: boolean;
  abandonedLead: boolean;
}

export const NOTIFICATIONS_DEFAULT: NotificationPreferences = {
  emailEnabled: false,
  newLead: true,
  abandonedLead: true,
};

/** Accepts a raw settings-table value (object, or { value: object })
 *  and returns valid preferences, merging over the defaults so a
 *  partial/older stored object never drops a field. */
export function normalizeNotifications(
  value: unknown,
): NotificationPreferences {
  const raw =
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "value" in value &&
    typeof (value as { value: unknown }).value === "object" &&
    (value as { value: unknown }).value !== null
      ? (value as { value: Record<string, unknown> }).value
      : value;
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) {
    return { ...NOTIFICATIONS_DEFAULT };
  }
  const r = raw as Record<string, unknown>;
  return {
    emailEnabled:
      typeof r.emailEnabled === "boolean"
        ? r.emailEnabled
        : NOTIFICATIONS_DEFAULT.emailEnabled,
    newLead:
      typeof r.newLead === "boolean"
        ? r.newLead
        : NOTIFICATIONS_DEFAULT.newLead,
    abandonedLead:
      typeof r.abandonedLead === "boolean"
        ? r.abandonedLead
        : NOTIFICATIONS_DEFAULT.abandonedLead,
  };
}
