// Homepage / Know Me preview limits — maximum cards shown in each
// preview section. The full listing pages (/projects/, /posts/,
// /ventures/, /releases/, /case-studies/) are NOT capped: they still
// show everything. Only these previews are capped, so a growing
// content set can never make the homepage (or Know Me page) endless.
// Every preview has a "View All" link to its full listing page.

// Projects: 6 — 3-col desktop grid x 2 full rows; the mobile
// carousel swipes through 6.
export const HOMEPAGE_PROJECTS_LIMIT = 6;
// Case studies: 3 — 3-col grid x 1 full row.
export const HOMEPAGE_CASE_STUDIES_LIMIT = 3;
// Posts: 3 — one full row of the 3-col grid.
export const HOMEPAGE_POSTS_LIMIT = 3;
// Services: 5 — the services-grid CSS in styles/glass.css is
// explicitly designed for exactly 5 cards (3+2 layout at >=1024px);
// a 6th card would break it. Cap at 5 so a 6th can't break the layout.
export const HOMEPAGE_SERVICES_LIMIT = 5;
// Ventures (Combined.astro mini-rows, half-width column): 4 — keeps
// the Combined section balanced against the artist column.
export const HOMEPAGE_VENTURES_LIMIT = 4;
// Know Me page, selected projects: 3 — one full row of the 3-col grid.
export const KNOW_ME_PROJECTS_LIMIT = 3;
// Know Me page, releases: 6 — 3-col release grid x 2 full rows.
export const KNOW_ME_RELEASES_LIMIT = 6;
