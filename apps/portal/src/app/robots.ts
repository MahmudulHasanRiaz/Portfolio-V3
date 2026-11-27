import type { MetadataRoute } from "next";

// The portal is an authenticated client area: nothing is indexed.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
