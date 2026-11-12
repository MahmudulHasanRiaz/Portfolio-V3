/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // pdfkit (and its fontkit dependency) must stay a runtime require:
  // Turbopack cannot bundle fontkit's ESM build (@swc/helpers mismatch).
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
