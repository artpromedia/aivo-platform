/**
 * GraphQL RBAC Directive Implementation
 *
 * This module provides the @rbac, @auth, and @consent directives for field-level
 * access control in Apollo Federation subgraphs.
 *
 * Usage:
 *   type Query {
 *     me: User @auth
 *     users: [User!]! @auth @rbac(roles: [PLATFORM_ADMIN])
 *     learnerProfile(id: ID!): LearnerProfile @consent(type: "AI_TUTOR")
 *   }
 *
 * Note: This module requires graphql and @graphql-tools/utils as optional dependencies.
 * If not installed, the directive transformers will not be available.
 */
import type { Role } from './roles.js';
export interface GraphQLContext {
    auth?: AuthInfo | undefined;
    headers?: HeadersMap | undefined;
}
export interface AuthInfo {
    userId: string;
    tenantId: string;
    roles: Role[];
    learnerId?: string | undefined;
}
export interface HeadersMap {
    'x-tenant-id'?: string;
    'x-user-id'?: string;
    'x-roles'?: string;
    'x-learner-id'?: string;
    'x-request-id'?: string;
}
export declare const AUTH_ERRORS: {
    readonly UNAUTHENTICATED: "UNAUTHENTICATED";
    readonly FORBIDDEN: "FORBIDDEN";
    readonly CONSENT_REQUIRED: "CONSENT_REQUIRED";
};
/**
 * Extract auth context from HTTP headers (set by Kong dash_context plugin)
 */
export declare function extractAuthFromHeaders(headers: HeadersMap | undefined): AuthInfo | undefined;
/**
 * Check if user has any of the required roles
 */
export declare function hasRequiredRole(userRoles: Role[], requiredRoles: string[]): boolean;
export { Role } from './roles.js';
/** Directive transformer return type */
export interface DirectiveTransformers {
    authDirectiveTransformer: (schema: unknown, directiveName?: string) => unknown;
    rbacDirectiveTransformer: (schema: unknown, directiveName?: string) => unknown;
    consentDirectiveTransformer: (schema: unknown, checkConsent: (tenantId: string, learnerId: string, consentType: string) => Promise<boolean>, directiveName?: string) => unknown;
    applyDirectives: (schema: unknown, options?: {
        checkConsent?: (tenantId: string, learnerId: string, consentType: string) => Promise<boolean>;
    }) => unknown;
}
/**
 * Create directive transformers for GraphQL schema.
 * This function is only available when graphql and @graphql-tools/utils are installed.
 *
 * Example usage:
 *   import { createDirectiveTransformers } from '@aivo/ts-rbac';
 *   const transformers = await createDirectiveTransformers();
 *   if (transformers) {
 *     schema = transformers.applyDirectives(schema, { checkConsent });
 *   }
 */
export declare function createDirectiveTransformers(): Promise<DirectiveTransformers | null>;
//# sourceMappingURL=graphql-directives.d.ts.map