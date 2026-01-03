export { Role, allRoles, isRole } from './roles';
export { Permission, rolePermissions, hasPermission } from './permissions';
export { authMiddleware, requireRole, hasRole } from './auth';
// GraphQL directive support (optional - requires graphql and @graphql-tools/utils)
export { createDirectiveTransformers, extractAuthFromHeaders, hasRequiredRole, AUTH_ERRORS, } from './graphql-directives';
//# sourceMappingURL=index.js.map