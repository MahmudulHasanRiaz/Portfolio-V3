import { pgEnum } from "drizzle-orm/pg-core";

export const contentStatus = pgEnum("content_status", [
  "draft",
  "published",
  "archived",
]);

export const postStatus = pgEnum("post_status", [
  "draft",
  "review",
  "scheduled",
  "published",
  "archived",
]);

export const resourceType = pgEnum("resource_type", [
  "guide",
  "checklist",
  "template",
  "download",
]);

export const releaseType = pgEnum("release_type", [
  "nasheed",
  "tilawat",
  "acting",
  "podcast",
  "interview",
  "documentary",
]);

export const ventureStatus = pgEnum("venture_status", [
  "active",
  "paused",
  "acquired",
  "closed",
]);

export const productStatus = pgEnum("product_status", [
  "active",
  "deprecated",
]);

export const freelanceProjectStatus = pgEnum(
  "freelance_project_status",
  [
    "draft",
    "in_progress",
    "under_review",
    "revision_requested",
    "completed",
    "archived",
  ],
);

export const milestoneStatus = pgEnum("milestone_status", [
  "pending",
  "in_progress",
  "completed",
  "approved",
]);

export const deliverableStatus = pgEnum("deliverable_status", [
  "pending",
  "submitted",
  "approved",
  "revision_requested",
]);

export const eventStatus = pgEnum("event_status", [
  "inquiry",
  "negotiating",
  "confirmed",
  "logistics_finalized",
  "completed",
  "declined",
  "cancelled",
  "archived",
]);

export const attendanceStatus = pgEnum("attendance_status", [
  "attended",
  "did_not_attend",
]);

export const leadStatus = pgEnum("lead_status", [
  "new",
  "contacted",
  "qualified",
  "proposal_sent",
  "negotiation",
  "won",
  "lost",
  "archived",
]);

export const slaResponseStatus = pgEnum("sla_response_status", [
  "within_sla",
  "warning",
  "breached",
]);

export const testimonialSourceType = pgEnum(
  "testimonial_source_type",
  ["freelance_client", "event_organizer", "collaborator", "general"],
);

export const testimonialStatus = pgEnum("testimonial_status", [
  "pending_review",
  "approved",
  "rejected",
]);

export const paymentMethodType = pgEnum("payment_method_type", [
  "mobile_banking",
  "bank",
  "cash",
  "international",
]);

export const paymentSourceType = pgEnum("payment_source_type", [
  "freelance_project",
  "artist_event",
]);

export const expenseSourceType = pgEnum("expense_source_type", [
  "freelance_project",
  "artist_event",
  "general",
]);

export const paymentType = pgEnum("payment_type", [
  "advance",
  "installment",
  "final",
  "full",
]);

export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "cancelled",
]);

export const portalSenderType = pgEnum("portal_sender_type", [
  "admin",
  "client",
]);

export const proposalType = pgEnum("proposal_type", [
  "proposal",
  "contract",
]);

export const proposalDocStatus = pgEnum("proposal_document_status", [
  "draft",
  "sent",
  "accepted",
  "rejected",
]);

export const formFieldType = pgEnum("form_field_type", [
  "text",
  "email",
  "phone",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "date",
  "file",
  "url",
  "number",
]);

export const subscriberStatus = pgEnum("subscriber_status", [
  "pending",
  "verified",
  "active",
  "unsubscribed",
  "bounced",
  "blocked",
]);

export const campaignStatus = pgEnum("campaign_status", [
  "draft",
  "scheduled",
  "sending",
  "sent",
  "failed",
]);

export const workflowRunStatus = pgEnum("workflow_run_status", [
  "pending",
  "running",
  "completed",
  "failed",
  "partially_failed",
]);

export const workflowActionStatus = pgEnum("workflow_action_status", [
  "pending",
  "running",
  "completed",
  "failed",
]);
