export { Role, allRoles, isRole } from './roles.js';
export { Permission, rolePermissions, hasPermission } from './permissions.js';
export { authMiddleware, requireRole, hasRole } from './auth.js';
// GraphQL directive support (optional - requires graphql and @graphql-tools/utils)
export {
  createDirectiveTransformers,
  extractAuthFromHeaders,
  hasRequiredRole,
  AUTH_ERRORS,
} from './graphql-directives.js';
//# sourceMappingURL=index.js.map
