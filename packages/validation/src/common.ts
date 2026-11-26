import { z } from "zod";

export const uuidSchema = z.string().uuid();

export const slugSchema = z.string().min(1).max(255).regex(/^[a-z0-9-]+$/);

export const entityStatusSchema = z.enum(["draft", "published", "archived"]);

export const timestampSchema = z.string().datetime();
