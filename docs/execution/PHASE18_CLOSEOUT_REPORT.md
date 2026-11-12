# Phase 18 Closeout Report

> **Date:** 2026-10-22
> **Phase:** 18 — Finance & Proposal Operations
> **Status:** CODE COMPLETE — runtime verification pending (see Verification)

---

## Summary

Phase 18 turns the previously stubbed finance and proposals packages into a working commercial lifecycle: Lead → Proposal → Acceptance → Project → Invoice → Payment → Reporting. The empty `@repo/finance` and `@repo/proposals` packages are implemented, the dashboard gains Finance and Proposals sections with APIs and pages, invoice/proposal PDFs are generated to R2, workflow triggers fire for invoice payment and proposal acceptance, and two pre-existing portal defects (broken proposal rejection, invisible proposal content) are fixed.

All work was merged directly on GitHub in small, verified PRs (#1–#8) under the frozen architecture: Supabase PostgreSQL, Cloudflare R2, Vercel, repository pattern, no payment gateway (payments are manually logged, per PRD).

---

## Product decisions applied

| Decision | Source |
|----------|--------|
| Base currency is **BDT**; USD transactions record `exchange_rate` + BDT equivalent, dashboard totals in BDT | User, 2026-10-22 |
| Payment methods are an admin-managed CRUD list (Settings → Payment Methods); **no gateway**, manual logging | PRD Finance System |
| Wise/Payoneer not seeded (not usable by the user yet); the managed list can add them later | User, 2026-10-22 |
| Proposals show content in the portal **and** generate a PDF | User, 2026-10-22 |
| Invoice numbers: `INV-DDMMYY-NNNN` (date = issued date, serial per day) — overrides the MASTERPLAN `INV-YYYY-NNN` placeholder | User, 2026-10-22 |
| Expense categories are **not** fixed — full CRUD category management | User, 2026-10-22 |
| Proposal versioning: **each version is a separate document row**; previous versions stay as history (version + parent_document_id chain) | User, 2026-10-22 |

---

## Deliverables by sub-step

### Pre-step — Portal proposal rejection defect (PR #1)
`ProposalRepository.reject()` wrote to `rejected_at` / `rejection_reason` columns that did not exist, so rejecting a proposal always failed. Migration **0004** adds both columns; schema/snapshot/journal updated; `ProposalDocumentRow` aligned.

### 18.1 — DB foundation (PR #2, migration 0005)
New `expense_categories` table (CRUD-managed). `finance_expenses` gains `category_id`, `exchange_rate`, `amount_bdt`; `finance_payments` gains `exchange_rate`, `amount_bdt`; `finance_invoices` gains `exchange_rate`, `total_bdt`.

### 18.2 — `@repo/finance` package (PR #3)
Payment-method and expense-category CRUD repositories; payments/expenses with the BDT conversion rule (non-BDT requires an exchange rate, stores `amount_bdt`); invoices with line-item totals, discount, `total_bdt`, status lifecycle, `INV-DDMMYY-NNNN` auto-numbering; summary repository for per-source and global finance aggregates (totals, current month, 12-month trend, top clients, income by source type).

### 18.3 — Proposal versioning + `@repo/proposals` package (PRs #4, #5, migration 0006)
`proposal_documents` gains `version` and `parent_document_id`. Template CRUD; document generation with `{{variable}}` substitution; `createNewVersion()` (new row, version + 1, parent link); version-chain listing; send/accept/reject lifecycle guards; on accept, a `projects_freelance` record is auto-created and linked when the document has no project (PRD workflow).

### 18.4a — Dashboard API + PDF (PR #6)
23 session-guarded, zod-validated API routes for finance and proposals. `lib/pdf.ts` generates invoice and proposal PDFs (pdfkit), stores them to R2 under `documents/`, and persists `pdf_url`. Invoice status change dispatches `invoice_paid`; proposal accept dispatches `proposal_accepted` (isolated so workflow failures never fail requests). Validation package updated for the new fields + expense categories.

### 18.4b — Dashboard pages (PR #7)
Finance overview (BDT summary cards, income by source, monthly trend, top clients), payments, expenses, expense-categories CRUD, invoices list + detail (status actions, PDF), proposals documents + generate dialog, templates CRUD, document detail (version chain, actions), Settings → Payment Methods page; sidebar navigation updated. Template `projectCategoryId` made optional to match the nullable DB column.

### 18.5 — Triggers + portal display fix (PR #8)
`payment_received` added wherever trigger types are enumerated (workflow pages, trigger-test route) and dispatched from the payments API. Portal proposal repository now LEFT JOINs `proposal_templates` and returns the display shape the portal pages render (title, type, content, PDF link, version, rejection details) — clients could previously not see proposal content at all.

---

## Verification

**Done (code-level):**
- Strict TypeScript compile (`tsc`, strict mode, real dependencies) is clean for `packages/finance`, `packages/proposals`, `packages/portal`, and the updated validation schemas (with the repo's declared zod v3).
- Logic exercised with unit-style tests against stubbed SQL: BDT/USD conversion + missing-rate error, invoice numbering (`INV-010126-0004`), slug generation, variable substitution (incl. `{{ key }}` spacing), version increment + parent chain, accept auto-project flow, portal display SQL shape.
- Drizzle snapshots 0004–0006 programmatically diffed against their predecessors: exactly the intended tables/columns, nothing else.
- Every PR's contents were re-read from GitHub after merging. This process caught one real incident: PR #4 initially merged only the 0006 snapshot after a branch-creation race failed the main push; it was detected on verification and fully repaired by PR #5 before any further work built on it.

**Not yet done (runtime):**
- Migrations **0004, 0005, 0006** must be applied to Supabase (`drizzle-kit migrate`) — no database access from the agent environment.
- After migrating: live test of the full loop (create payment method → log payment → expense with category → invoice + PDF → proposal generate → send → portal accept/reject → auto project → finance overview totals).
- Full workspace build (`turbo build`) and a visual check of the generated PDFs.

---

## Known follow-ups

- `validate-integrations.ts` in `@repo/workflows` still validates only the six Phase 16.1 triggers; `invoice_paid` / `payment_received` coverage can be added the same way.
- Portal proposal detail page declares a local `content` type of `Record | null` while the API returns a string — runtime-safe, can be aligned in a cleanup pass.
- Old merged feature branches remain on the remote; safe to delete.

## Next

Phase 19 scope is not yet defined in the PRD/MASTERPLAN checkpoint; likely candidates from the project context: production hardening, testing, security audit, deployment readiness, then the dedicated UI/design overhaul phase.
