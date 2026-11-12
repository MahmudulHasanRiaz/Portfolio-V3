import { getDb } from "@repo/database";
import { roles, permissions, userRoles, rolePermissions } from "@repo/database";
import { eq, inArray } from "drizzle-orm";

export interface UserWithRoles {
  id: string;
  email: string;
  name: string | null;
  roleIds: string[];
  roleNames: string[];
}

const permissionCache = new Map<string, { permissions: string[]; expiresAt: number }>();

const CACHE_TTL_MS = 60_000;

export async function getUserRoles(userId: string): Promise<{ id: string; name: string }[]> {
  const db = getDb();
  const userRoleRows = await db
    .select({
      id: roles.id,
      name: roles.name,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));
  return userRoleRows;
}

export async function getUserPermissions(userId: string): Promise<string[]> {
  const cached = permissionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.permissions;
  }
  const db = getDb();
  const userRoleRows = await db
    .select({ roleId: userRoles.roleId })
    .from(userRoles)
    .where(eq(userRoles.userId, userId));
  if (userRoleRows.length === 0) {
    permissionCache.set(userId, { permissions: [], expiresAt: Date.now() + CACHE_TTL_MS });
    return [];
  }
  const roleIds = userRoleRows.map((r) => r.roleId);
  const permRows = await db
    .select({ name: permissions.name })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(inArray(rolePermissions.roleId, roleIds));
  const perms = [...new Set(permRows.map((r) => r.name))];
  permissionCache.set(userId, { permissions: perms, expiresAt: Date.now() + CACHE_TTL_MS });
  return perms;
}

export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  return perms.includes(permission);
}

export async function hasRole(userId: string, roleName: string): Promise<boolean> {
  const userRoleRows = await getUserRoles(userId);
  return userRoleRows.some((r) => r.name === roleName);
}

export async function hasAnyRole(userId: string, roleNames: string[]): Promise<boolean> {
  const userRoleRows = await getUserRoles(userId);
  return userRoleRows.some((r) => roleNames.includes(r.name));
}

export async function hasAllPermissions(userId: string, required: string[]): Promise<boolean> {
  const perms = await getUserPermissions(userId);
  return required.every((p) => perms.includes(p));
}

export function invalidatePermissionCache(userId: string): void {
  permissionCache.delete(userId);
}

export class UnauthorizedError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "ForbiddenError";
  }
}
