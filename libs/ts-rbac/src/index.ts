export { Role, allRoles, isRole } from './roles.js';
export type { AuthContext, AuthenticatedUser, MaybeAuthContext, WithAuth } from './types.js';
export { Permission, rolePermissions, hasPermission } from './permissions.js';
export { authMiddleware, requireRole, hasRole } from './auth.js';

// GraphQL directive support (optional - requires graphql and @graphql-tools/utils)
export {
  createDirectiveTransformers,
  extractAuthFromHeaders,
  hasRequiredRole,
  AUTH_ERRORS,
  type GraphQLContext,
  type AuthInfo,
  type HeadersMap,
  type DirectiveTransformers,
} from './graphql-directives.js';
