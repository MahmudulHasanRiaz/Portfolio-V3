// Homepage + Know Me preview limits — how many items each preview
// section shows. The full listing pages (/projects/, /posts/,
// /ventures/, /releases/, /case-studies/) still show EVERYTHING;
// these caps apply ONLY to the homepage and Know Me previews, so a
// growing content library never turns the homepage into an endless
// wall. Every preview section has a "View All" link to its full page.

// Projects: 6 — a 3-col desktop grid x 2 full rows; the mobile
// carousel swipes through 6.
export const HOMEPAGE_PROJECTS_LIMIT = 6;

// Case studies: 3 — a 3-col grid x 1 full row.
export const HOMEPAGE_CASE_STUDIES_LIMIT = 3;

// Posts: 3 — a 3-col grid x 1 full row.
export const HOMEPAGE_POSTS_LIMIT = 3;

// Services: 5 — the services-grid CSS (styles/glass.css) is designed
// for exactly 5 cards (3+2 layout at >=1024px); a 6th card would
// break the layout, so the cap keeps the grid intact.
export const HOMEPAGE_SERVICES_LIMIT = 5;

// Ventures (Combined "Beyond the code" mini-rows, half-width column):
// 4 — keeps the Combined section balanced against the artist half.
export const HOMEPAGE_VENTURES_LIMIT = 4;

// Know Me page, selected projects: 3 — a 3-col grid x 1 full row.
export const KNOW_ME_PROJECTS_LIMIT = 3;

// Know Me page, releases: 6 — a 3-col release grid x 2 full rows.
export const KNOW_ME_RELEASES_LIMIT = 6;
