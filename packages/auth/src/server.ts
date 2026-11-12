export { auth } from "./auth";
export {
  lookupUserByEmail,
  resolveInternalUser,
  getInternalRoles,
  getInternalPermissions,
  hasInternalRole,
  hasInternalPermission,
  requireRole,
  requirePermission,
  authorizeByEmail,
  invalidatePermissionCache,
  UnauthorizedError,
  ForbiddenError,
} from "./lib/authorization";
export {
  routeGuards,
  getMatchingGuard,
  checkRouteAuthorization,
  createApiGuard,
} from "./lib/route-authorization";
