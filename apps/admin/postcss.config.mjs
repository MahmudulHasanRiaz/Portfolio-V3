/** PostCSS config for the dashboard (Tailwind CSS v4).
 * Next.js 16 (Turbopack) picks this up automatically. Tailwind v4 bundles
 * Lightning CSS, which handles vendor prefixing — no autoprefixer needed.
 */
export default {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};
