import type { Metadata } from "next";
import type { MetadataInput } from "./metadata";

export function generateOpenGraph(input: MetadataInput): NonNullable<Metadata["openGraph"]> {
  return {
    title: input.title,
    description: input.description,
    ...(input.image && { images: [{ url: input.image, alt: input.imageAlt ?? "" }] }),
    ...(input.url && { url: input.url }),
    ...(input.type && { type: input.type }),
    ...(input.siteName && { siteName: input.siteName }),
    ...(input.locale && { locale: input.locale }),
  };
}
