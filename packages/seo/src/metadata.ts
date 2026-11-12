import type { Metadata } from "next";

export interface MetadataInput {
  title: string;
  description: string;
  siteName?: string;
  url?: string;
  image?: string;
  imageAlt?: string;
  locale?: string;
  publishedTime?: string;
  authors?: string[];
  type?: "website" | "article";
  keywords?: string[];
  noIndex?: boolean;
}

export function generateMetadata(input: MetadataInput): Metadata {
  const metadata: Metadata = {
    title: input.title,
    description: input.description,
    openGraph: {
      title: input.title,
      description: input.description,
      ...(input.image && { images: [{ url: input.image, alt: input.imageAlt ?? "" }] }),
      ...(input.url && { url: input.url }),
      ...(input.type && { type: input.type }),
      ...(input.siteName && { siteName: input.siteName }),
      ...(input.locale && { locale: input.locale }),
      ...(input.publishedTime && { publishedTime: input.publishedTime }),
      ...(input.authors && { authors: input.authors }),
    },
    twitter: {
      card: "summary_large_image",
      title: input.title,
      description: input.description,
      ...(input.image && { images: [input.image] }),
    },
    // Robots are emitted only when the caller decides (noIndex defined).
    // Otherwise the root layout's setting-driven robots apply — a page
    // must not silently override the global search-indexing setting.
    ...(input.noIndex !== undefined && {
      robots: {
        index: !input.noIndex,
        follow: !input.noIndex,
      },
    }),
    ...(input.url && {
      alternates: {
        canonical: input.url,
      },
    }),
    ...(input.keywords && { keywords: input.keywords }),
  };

  return metadata;
}
