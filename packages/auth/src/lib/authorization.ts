import { getDb } from "@repo/database";
import { users, roles, permissions, userRoles, rolePermissions } from "@repo/database";
import { eq, inArray } from "drizzle-orm";

const permissionCache = new Map<string, { permissions: string[]; roles: string[]; expiresAt: number }>();

const CACHE_TTL_MS = 60_000;

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

export interface InternalUser {
  id: string;
  email: string;
  name: string | null;
  isActive: boolean | null;
}

export async function lookupUserByEmail(email: string): Promise<InternalUser | null> {
  const db = getDb();
  const rows = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function resolveInternalUser(betterAuthEmail: string): Promise<InternalUser> {
  const user = await lookupUserByEmail(betterAuthEmail);
  if (!user) throw new UnauthorizedError("User not found in internal registry");
  if (!user.isActive) throw new ForbiddenError("User account is disabled");
  return user;
}

export function slugifyRoleName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

async function fetchRolesAndPermissions(userId: string): Promise<{ roles: string[]; permissions: string[] }> {
  const cached = permissionCache.get(userId);
  if (cached && cached.expiresAt > Date.now()) {
    return { roles: cached.roles, permissions: cached.permissions };
  }

  const db = getDb();

  const userRoleRows = await db
    .select({ roleId: userRoles.roleId, roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(eq(userRoles.userId, userId));

  // The DB stores display names ("Super Admin"); every consumer of these
  // role strings (route guards, navigation, authorizeByEmail role checks)
  // expects snake_case slugs ("super_admin"). Normalize at the source.
  const roleNames = [
    ...new Set(userRoleRows.map((r) => slugifyRoleName(r.roleName))),
  ];
  const roleIds = userRoleRows.map((r) => r.roleId);

  let permNames: string[] = [];
  if (roleIds.length > 0) {
    const permRows = await db
      .select({ name: permissions.name })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(inArray(rolePermissions.roleId, roleIds));
    permNames = [...new Set(permRows.map((r) => r.name))];
  }

  permissionCache.set(userId, {
    roles: roleNames,
    permissions: permNames,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });

  return { roles: roleNames, permissions: permNames };
}

export function invalidatePermissionCache(userId: string): void {
  permissionCache.delete(userId);
}

export async function getInternalRoles(userId: string): Promise<string[]> {
  const data = await fetchRolesAndPermissions(userId);
  return data.roles;
}

export async function getInternalPermissions(userId: string): Promise<string[]> {
  const data = await fetchRolesAndPermissions(userId);
  return data.permissions;
}

export async function hasInternalRole(userId: string, roleName: string): Promise<boolean> {
  const roles = await getInternalRoles(userId);
  return roles.includes(roleName);
}

export async function hasInternalPermission(userId: string, permission: string): Promise<boolean> {
  const perms = await getInternalPermissions(userId);
  return perms.includes(permission);
}

export async function requireRole(userId: string, ...requiredRoles: string[]): Promise<void> {
  const userRoles = await getInternalRoles(userId);
  const hasRole = requiredRoles.some((r) => userRoles.includes(r));
  if (!hasRole) {
    throw new ForbiddenError(
      `Required role: ${requiredRoles.join(" or ")}. Actual: ${userRoles.join(", ") || "none"}`
    );
  }
}

export async function requirePermission(userId: string, ...requiredPermissions: string[]): Promise<void> {
  const userPerms = await getInternalPermissions(userId);
  const hasAll = requiredPermissions.every((p) => userPerms.includes(p));
  if (!hasAll) {
    throw new ForbiddenError(`Missing required permission(s): ${requiredPermissions.join(", ")}`);
  }
}

export async function authorizeByEmail(
  betterAuthEmail: string,
  ...requiredRoles: string[]
): Promise<InternalUser> {
  const user = await resolveInternalUser(betterAuthEmail);
  if (requiredRoles.length > 0) {
    await requireRole(user.id, ...requiredRoles);
  }
  return user;
}
