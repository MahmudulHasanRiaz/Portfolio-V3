// Technology category options for the admin directory (platforms /
// technologies / clients) — the dropdown in directory-form.tsx and the
// category validation in the directory server actions.
//
// Plain module on purpose — NEVER move this into a "use server" file:
// Next.js forbids a "use server" file from exporting anything but async
// functions (and types), so exporting this const from
// `actions/directory.ts` broke `next build` with
// `A "use server" file can only export async functions, found object`
// (2026-11-10, PR #97 — see docs/DEPLOYMENT.md).

export const TECHNOLOGY_CATEGORIES = [
  "Frontend",
  "Backend",
  "Database",
  "Cloud & Tools",
  "CMS & E-commerce",
  "Concepts",
  "Auth",
] as const;

export type TechnologyCategory = (typeof TECHNOLOGY_CATEGORIES)[number];
