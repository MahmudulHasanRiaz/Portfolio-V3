import { z } from "zod";
import { uuidSchema, timestampSchema } from "./common";

// ─── Users ───────────────────────────────────────────────────────────────────

export const userSchema = z.object({
  id: uuidSchema,
  email: z.string().max(255),
  emailVerified: z.boolean().default(false),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  phone: z.string().max(50).optional(),
  isActive: z.boolean().default(true),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createUserSchema = z.object({
  email: z.string().max(255),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  phone: z.string().max(50).optional(),
});

export const updateUserSchema = userSchema.partial();

// ─── Roles ───────────────────────────────────────────────────────────────────

export const roleSchema = z.object({
  id: uuidSchema,
  name: z.string().max(100),
  description: z.string().optional(),
  isSystem: z.boolean().default(false),
  createdAt: timestampSchema.optional(),
});

export const createRoleSchema = z.object({
  name: z.string().max(100),
  description: z.string().optional(),
});

export const updateRoleSchema = roleSchema.partial();

// ─── Permissions ─────────────────────────────────────────────────────────────

export const permissionSchema = z.object({
  id: uuidSchema,
  name: z.string().max(100),
  description: z.string().optional(),
  group: z.string().max(50).optional(),
  createdAt: timestampSchema.optional(),
});

export const createPermissionSchema = z.object({
  name: z.string().max(100),
  description: z.string().optional(),
  group: z.string().max(50).optional(),
});

export const updatePermissionSchema = permissionSchema.partial();

// ─── Role Permissions (junction) ─────────────────────────────────────────────

export const rolePermissionSchema = z.object({
  roleId: uuidSchema,
  permissionId: uuidSchema,
});

export const createRolePermissionSchema = rolePermissionSchema;
export const updateRolePermissionSchema = rolePermissionSchema.partial();

// ─── User Roles (junction) ───────────────────────────────────────────────────

export const userRoleSchema = z.object({
  userId: uuidSchema,
  roleId: uuidSchema,
});

export const createUserRoleSchema = userRoleSchema;
export const updateUserRoleSchema = userRoleSchema.partial();

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
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  resumeUrl: z.string().optional(),
  pressKitUrl: z.string().optional(),
  socialLinks: z.record(z.string(), z.unknown()).optional(),
  streamingLinks: z.record(z.string(), z.unknown()).optional(),
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
});

export const createPersonProfileSchema = z.object({
  id: uuidSchema,
  fullName: z.string().optional(),
  headline: z.string().optional(),
  bioShort: z.string().optional(),
  bioLong: z.string().optional(),
  profileImage: z.string().optional(),
  coverImage: z.string().optional(),
  location: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  resumeUrl: z.string().optional(),
  pressKitUrl: z.string().optional(),
  socialLinks: z.record(z.string(), z.unknown()).optional(),
  streamingLinks: z.record(z.string(), z.unknown()).optional(),
});

export const updatePersonProfileSchema = personProfileSchema.partial();

// ─── Developer Profiles ──────────────────────────────────────────────────────

export const developerProfileSchema = z.object({
  id: uuidSchema,
  yearsExperience: z.coerce.number().int().optional(),
  skills: z.record(z.string(), z.unknown()).optional(),
  certifications: z.record(z.string(), z.unknown()).optional(),
  resumeText: z.string().optional(),
});

export const createDeveloperProfileSchema = z.object({
  id: uuidSchema,
  yearsExperience: z.coerce.number().int().optional(),
  skills: z.record(z.string(), z.unknown()).optional(),
  certifications: z.record(z.string(), z.unknown()).optional(),
  resumeText: z.string().optional(),
});

export const updateDeveloperProfileSchema = developerProfileSchema.partial();

// ─── Entrepreneur Profiles ───────────────────────────────────────────────────

export const entrepreneurProfileSchema = z.object({
  id: uuidSchema,
  founderStory: z.string().optional(),
  businessPhilosophy: z.string().optional(),
  missionStatement: z.string().optional(),
  visionStatement: z.string().optional(),
});

export const createEntrepreneurProfileSchema = z.object({
  id: uuidSchema,
  founderStory: z.string().optional(),
  businessPhilosophy: z.string().optional(),
  missionStatement: z.string().optional(),
  visionStatement: z.string().optional(),
});

export const updateEntrepreneurProfileSchema = entrepreneurProfileSchema.partial();

// ─── Artist Profiles ─────────────────────────────────────────────────────────

export const artistProfileSchema = z.object({
  id: uuidSchema,
  artistName: z.string().optional(),
  biography: z.string().optional(),
  genre: z.string().optional(),
  bookingInfo: z.string().optional(),
});

export const createArtistProfileSchema = z.object({
  id: uuidSchema,
  artistName: z.string().optional(),
  biography: z.string().optional(),
  genre: z.string().optional(),
  bookingInfo: z.string().optional(),
});

export const updateArtistProfileSchema = artistProfileSchema.partial();
