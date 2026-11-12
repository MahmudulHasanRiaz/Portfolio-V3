import { z } from "zod";

export const databaseConfigSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_POOL_URL: z.string().url().optional(),
  LOG_LEVEL: z
    .enum(["debug", "info", "warn", "error"])
    .default("debug"),
});

export type DatabaseConfig = z.infer<typeof databaseConfigSchema>;

let cachedConfig: DatabaseConfig | null = null;

export function getDatabaseConfig(): DatabaseConfig {
  if (cachedConfig) return cachedConfig;

  const result = databaseConfigSchema.safeParse(process.env);
  if (!result.success) {
    const missing = result.error.issues
      .map((e) => `${e.path.join(".")}: ${e.message}`)
      .join("\n  ");
    throw new Error(`Database configuration invalid:\n  ${missing}`);
  }

  cachedConfig = result.data;
  return result.data;
}
