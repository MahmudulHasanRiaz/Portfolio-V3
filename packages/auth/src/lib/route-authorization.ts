import { requireRole, requirePermission } from "./authorization";

export interface RouteGuard {
  roles?: string[];
  permissions?: string[];
}

export type RouteGuardMap = Record<string, RouteGuard>;

export const routeGuards: RouteGuardMap = {
  "/dashboard": { roles: ["super_admin", "admin", "writer", "media_manager", "marketer", "sales_executive", "project_manager", "finance_manager", "artist_manager"] },
  "/dashboard/users": { roles: ["super_admin"] },
  "/dashboard/crm": { roles: ["sales_executive", "admin", "super_admin"] },
  "/dashboard/media": { roles: ["media_manager", "admin", "super_admin"] },
  "/dashboard/seo": { roles: ["marketer", "admin", "super_admin"] },
  "/dashboard/finance": { roles: ["finance_manager", "admin", "super_admin"] },
  "/dashboard/freelance": { roles: ["project_manager", "admin", "super_admin"] },
  "/dashboard/events": { roles: ["artist_manager", "admin", "super_admin"] },
  "/dashboard/proposals": { roles: ["admin", "super_admin"] },
  "/dashboard/portal": { roles: ["project_manager", "admin", "super_admin"] },
  "/dashboard/blog": { roles: ["writer", "admin", "super_admin"] },
  "/dashboard/content": { roles: ["writer", "admin", "super_admin"] },
  "/dashboard/services": { roles: ["writer", "admin", "super_admin"] },
  "/dashboard/releases": { roles: ["media_manager", "admin", "super_admin"] },
  "/dashboard/ventures": { roles: ["admin", "super_admin"] },
  "/dashboard/settings": { roles: ["admin", "super_admin"] },
  "/dashboard/notifications": { roles: ["admin", "super_admin"] },
};

export function getMatchingGuard(pathname: string): RouteGuard | null {
  const sorted = Object.entries(routeGuards).sort(([a], [b]) => b.length - a.length);
  for (const [prefix, guard] of sorted) {
    if (pathname === prefix || pathname.startsWith(prefix + "/") || pathname.startsWith(prefix + "?")) {
      return guard;
    }
  }
  return null;
}

export async function checkRouteAuthorization(
  userId: string,
  pathname: string
): Promise<void> {
  const guard = getMatchingGuard(pathname);
  if (!guard) return;
  if (guard.roles && guard.roles.length > 0) {
    await requireRole(userId, ...guard.roles);
  }
  if (guard.permissions && guard.permissions.length > 0) {
    await requirePermission(userId, ...guard.permissions);
  }
}

export function createApiGuard(requiredRoles?: string[], requiredPermissions?: string[]) {
  return async (userId: string): Promise<void> => {
    if (requiredRoles && requiredRoles.length > 0) {
      await requireRole(userId, ...requiredRoles);
    }
    if (requiredPermissions && requiredPermissions.length > 0) {
      await requirePermission(userId, ...requiredPermissions);
    }
  };
}
