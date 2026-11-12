import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
  CopyObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { Env } from "@repo/shared";
import { StorageError } from "./errors";

let client: S3Client | null = null;
let bucketName = "";
let publicUrl = "";

export function initR2(env: Env): void {
  client = new S3Client({
    region: "auto",
    endpoint: env.R2_ENDPOINT,
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    // Path-style addressing works with both Cloudflare R2 and S3-compatible
    // local storage (e.g. MinIO), where virtual-host style would not resolve.
    forcePathStyle: true,
    requestChecksumCalculation: "WHEN_REQUIRED",
  });
  bucketName = env.R2_BUCKET;
  publicUrl = env.R2_PUBLIC_URL || "";
}

// Lazily initialize from process.env when initR2() was never called
// explicitly (e.g. dashboard media routes) so every consumer works.
function ensureInitialized(): void {
  if (client) return;
  const { R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET, R2_PUBLIC_URL } =
    process.env;
  if (!R2_ENDPOINT || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
    throw new StorageError("R2 client not initialized. Call initR2() first.");
  }
  initR2({
    R2_ENDPOINT,
    R2_ACCESS_KEY_ID,
    R2_SECRET_ACCESS_KEY,
    R2_BUCKET,
    R2_PUBLIC_URL,
  } as Env);
}

function getClient(): S3Client {
  ensureInitialized();
  return client as S3Client;
}

function getBucket(): string {
  ensureInitialized();
  if (!bucketName) {
    throw new StorageError("R2 bucket not configured.");
  }
  return bucketName;
}

export async function uploadFile(
  key: string,
  body: Buffer | Uint8Array | Blob,
  contentType: string,
  metadata?: Record<string, string>,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    Body: body,
    ContentType: contentType,
    Metadata: metadata,
  });
  await getClient().send(cmd);
  return getPublicUrl(key);
}

export async function deleteFile(key: string): Promise<void> {
  const cmd = new DeleteObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  await getClient().send(cmd);
}

export async function getFileMetadata(key: string) {
  const cmd = new HeadObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  try {
    const response = await getClient().send(cmd);
    return {
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      metadata: response.Metadata,
      lastModified: response.LastModified,
      etag: response.ETag,
    };
  } catch {
    return null;
  }
}

export async function fileExists(key: string): Promise<boolean> {
  const meta = await getFileMetadata(key);
  return meta !== null;
}

export async function listFiles(prefix: string, maxKeys = 100) {
  const cmd = new ListObjectsV2Command({
    Bucket: getBucket(),
    Prefix: prefix,
    MaxKeys: maxKeys,
  });
  const response = await getClient().send(cmd);
  return (response.Contents || []).map((item) => ({
    key: item.Key || "",
    size: item.Size || 0,
    lastModified: item.LastModified,
    etag: item.ETag,
  }));
}

export async function copyFile(sourceKey: string, destKey: string): Promise<string> {
  const cmd = new CopyObjectCommand({
    Bucket: getBucket(),
    CopySource: `${getBucket()}/${sourceKey}`,
    Key: destKey,
  });
  await getClient().send(cmd);
  return getPublicUrl(destKey);
}

export async function generatePresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 3600,
): Promise<string> {
  const cmd = new PutObjectCommand({
    Bucket: getBucket(),
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn });
}

export async function generatePresignedDownloadUrl(
  key: string,
  expiresIn = 3600,
): Promise<string> {
  const cmd = new GetObjectCommand({
    Bucket: getBucket(),
    Key: key,
  });
  return getSignedUrl(getClient(), cmd, { expiresIn });
}

export function getPublicUrl(key: string): string {
  if (publicUrl) {
    const base = publicUrl.replace(/\/+$/, "");
    return `${base}/${key}`;
  }
  return `${getBucket()}/${key}`;
}

export function buildKey(folder: string, filename: string): string {
  const normalizedFolder = folder.replace(/^\/+|\/+$/g, "");
  return `${normalizedFolder}/${filename}`;
}

export function parseKey(key: string): { folder: string; filename: string } {
  const lastSlash = key.lastIndexOf("/");
  if (lastSlash === -1) {
    return { folder: "", filename: key };
  }
  return {
    folder: key.substring(0, lastSlash),
    filename: key.substring(lastSlash + 1),
  };
}
