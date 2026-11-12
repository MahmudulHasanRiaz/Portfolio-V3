import type { MetadataInput } from "@repo/seo";
import { generateMetadata } from "@repo/seo";
import { isSearchIndexingEnabled } from "./search-indexing";

export interface ContentSEOInput {
  title?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  ogImage?: string | null;
  canonicalUrl?: string | null;
  keywords?: string | null;
  indexable?: boolean | null;
  followLinks?: boolean | null;
  slug?: string | null;
  excerpt?: string | null;
}

export interface SEOOutput {
  metaTitle: string;
  metaDescription: string;
  ogImage?: string;
  canonicalUrl?: string;
  keywords?: string;
  indexable: boolean;
  followLinks: boolean;
}

export function buildSEOData(content: ContentSEOInput, defaultTitle: string): SEOOutput {
  return {
    metaTitle: content.metaTitle || content.title || defaultTitle,
    metaDescription: content.metaDescription || content.excerpt || "",
    ogImage: content.ogImage || undefined,
    canonicalUrl: content.canonicalUrl || undefined,
    keywords: content.keywords || undefined,
    indexable: content.indexable !== false,
    followLinks: content.followLinks !== false,
  };
}

export function buildNextMetadata(content: ContentSEOInput, baseUrl: string, defaultTitle: string): MetadataInput {
  const seo = buildSEOData(content, defaultTitle);
  const url = content.slug ? `${baseUrl}/${content.slug}` : baseUrl;

  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    url: seo.canonicalUrl || url,
    image: seo.ogImage,
    keywords: seo.keywords ? seo.keywords.split(",").map((k) => k.trim()).filter(Boolean) : undefined,
    noIndex: !seo.indexable,
  };
}

export async function generateContentMetadata(content: ContentSEOInput, baseUrl: string, defaultTitle: string) {
  const input = buildNextMetadata(content, baseUrl, defaultTitle);
  // Global kill-switch: even indexable content stays noindex while the
  // owner has search indexing off (default off until the site is final).
  const globallyIndexable = await isSearchIndexingEnabled();
  return generateMetadata({ ...input, noIndex: input.noIndex || !globallyIndexable });
}
