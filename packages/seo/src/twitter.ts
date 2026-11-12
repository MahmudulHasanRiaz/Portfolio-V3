import type { Metadata } from "next";
import type { MetadataInput } from "./metadata";

export function generateTwitterCard(input: MetadataInput): NonNullable<Metadata["twitter"]> {
  return {
    card: "summary_large_image",
    title: input.title,
    description: input.description,
    ...(input.image && { images: [input.image] }),
  };
}
