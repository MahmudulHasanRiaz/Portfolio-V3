import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── Users ───────────────────────────────────────────────────────────────────

// ─── Roles ───────────────────────────────────────────────────────────────────
// ─── Permissions ─────────────────────────────────────────────────────────────
// ─── Role Permissions (junction) ─────────────────────────────────────────────
// ─── User Roles (junction) ───────────────────────────────────────────────────

// ─── Person Profiles ─────────────────────────────────────────────────────────

export const personProfileSchema = z.object({
  id: uuidSchema,
  fullName: z.string().optional(),
  headline: z.string().optional(),
  bioShort: z.string().optional(),
  bioLong: z.string().optional(),
  profileImage: z.string().optional(),
  coverImage: z.string().optional(),
  location: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  resumeUrl: z.string().optional(),
  pressKitUrl: z.string().optional(),
  socialLinks: z.record(z.string(), z.unknown()).optional(),
  streamingLinks: z.record(z.string(), z.unknown()).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const updatePersonProfileSchema = personProfileSchema.partial();
