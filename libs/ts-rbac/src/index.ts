export { Role, allRoles, isRole } from './roles';
export type { AuthContext, AuthenticatedUser, MaybeAuthContext, WithAuth } from './types';
export { Permission, rolePermissions, hasPermission } from './permissions';
export { authMiddleware, requireRole, hasRole } from './auth';

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
} from './graphql-directives';
