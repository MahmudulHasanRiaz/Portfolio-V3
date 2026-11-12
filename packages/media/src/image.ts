import sharp from "sharp";
import { MEDIA_CONFIG } from "./config";
import type { VariantName } from "./config";
import type { VariantResult, ImageProcessorOptions } from "./types";

export interface ImageInfo {
  width: number;
  height: number;
  format: string;
  size: number;
}

export async function getImageInfo(buffer: Buffer): Promise<ImageInfo> {
  const metadata = await sharp(buffer).metadata();
  return {
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: metadata.format || "unknown",
    size: buffer.length,
  };
}

export async function generateVariants(
  buffer: Buffer,
  options: ImageProcessorOptions = {},
): Promise<VariantResult[]> {
  const formats = options.formats || MEDIA_CONFIG.formats;
  const quality = options.quality || 80;
  const results: VariantResult[] = [];

  for (const format of formats) {
    for (const [name, cfg] of Object.entries(MEDIA_CONFIG.variants)) {
      let pipeline = sharp(buffer);

      const vCfg = cfg as { width?: number; height?: number; fit: "cover" | "inside" | "outside" | "contain" | "fill" };
      if (vCfg.width || vCfg.height) {
        pipeline = pipeline.resize(vCfg.width, vCfg.height, {
          fit: vCfg.fit,
          withoutEnlargement: true,
        });
      }

      switch (format) {
        case "avif":
          pipeline = pipeline.avif({ quality });
          break;
        case "webp":
          pipeline = pipeline.webp({ quality });
          break;
        case "jpeg":
        default:
          pipeline = pipeline.jpeg({ quality, mozjpeg: true });
          break;
      }

      const processed = await pipeline.toBuffer({ resolveWithObject: true });

      results.push({
        name: name as VariantName,
        format,
        width: processed.info.width,
        height: processed.info.height,
        size: processed.info.size,
        key: "",
        url: "",
      });
    }
  }

  return results;
}

export async function compressImage(
  buffer: Buffer,
  format: "jpeg" | "webp" | "avif" = "jpeg",
  quality = 80,
): Promise<Buffer> {
  let pipeline = sharp(buffer);

  switch (format) {
    case "avif":
      pipeline = pipeline.avif({ quality });
      break;
    case "webp":
      pipeline = pipeline.webp({ quality });
      break;
    case "jpeg":
    default:
      pipeline = pipeline.jpeg({ quality, mozjpeg: true });
      break;
  }

  return pipeline.toBuffer();
}

export async function generateBlurPlaceholder(
  buffer: Buffer,
  size = 32,
): Promise<string> {
  const result = await sharp(buffer)
    .resize(size, size, { fit: "cover" })
    .jpeg({ quality: 30 })
    .toBuffer({ resolveWithObject: true });

  return `data:image/jpeg;base64,${result.data.toString("base64")}`;
}

export async function generateThumbnail(
  buffer: Buffer,
  width = 150,
  height = 150,
): Promise<Buffer> {
  return sharp(buffer)
    .resize(width, height, { fit: "cover" })
    .jpeg({ quality: 60 })
    .toBuffer();
}

export function buildVariantKey(
  baseKey: string,
  variantName: string,
  format: string,
): string {
  const dotIdx = baseKey.lastIndexOf(".");
  const base = dotIdx === -1 ? baseKey : baseKey.substring(0, dotIdx);
  return `${base}_${variantName}.${format}`;
}
