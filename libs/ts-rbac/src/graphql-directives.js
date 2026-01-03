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
import { isRole } from './roles.js';
// Error codes for GraphQL errors
export const AUTH_ERRORS = {
    UNAUTHENTICATED: 'UNAUTHENTICATED',
    FORBIDDEN: 'FORBIDDEN',
    CONSENT_REQUIRED: 'CONSENT_REQUIRED',
};
/**
 * Extract auth context from HTTP headers (set by Kong dash_context plugin)
 */
export function extractAuthFromHeaders(headers) {
    if (!headers)
        return undefined;
    const userId = headers['x-user-id'];
    const tenantId = headers['x-tenant-id'];
    const rolesHeader = headers['x-roles'];
    const learnerId = headers['x-learner-id'];
    if (!userId || !tenantId) {
        return undefined;
    }
    const roles = [];
    if (rolesHeader) {
        const roleStrings = rolesHeader.split(',').map((r) => r.trim());
        for (const role of roleStrings) {
            if (isRole(role)) {
                roles.push(role);
            }
        }
    }
    return {
        userId,
        tenantId,
        roles,
        learnerId,
    };
}
/**
 * Check if user has any of the required roles
 */
export function hasRequiredRole(userRoles, requiredRoles) {
    return requiredRoles.some((role) => userRoles.includes(role));
}
// Re-export for convenience
export { Role } from './roles.js';
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
export async function createDirectiveTransformers() {
    /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-imports */
    try {
        // Dynamic imports - graphql is optional
        const graphqlTools = await import('@graphql-tools/utils');
        const graphql = await import('graphql');
        const { getDirective, MapperKind, mapSchema } = graphqlTools;
        const { defaultFieldResolver, GraphQLError } = graphql;
        /**
         * Apply @auth directive transformer - requires authentication
         */
        function authDirectiveTransformer(schema, directiveName = 'auth') {
            return mapSchema(schema, {
                [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
                    const authDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
                    if (authDirective) {
                        const originalResolve = (fieldConfig.resolve ?? defaultFieldResolver);
                        fieldConfig.resolve = async function (source, args, context, info) {
                            if (!context.auth && context.headers) {
                                context.auth = extractAuthFromHeaders(context.headers);
                            }
                            if (!context.auth?.userId) {
                                throw new GraphQLError('Authentication required', {
                                    extensions: {
                                        code: AUTH_ERRORS.UNAUTHENTICATED,
                                        http: { status: 401 },
                                    },
                                });
                            }
                            return originalResolve(source, args, context, info);
                        };
                    }
                    return fieldConfig;
                },
            });
        }
        /**
         * Apply @rbac directive transformer - requires specific roles
         */
        function rbacDirectiveTransformer(schema, directiveName = 'rbac') {
            return mapSchema(schema, {
                [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
                    const rbacDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
                    if (rbacDirective) {
                        const { roles: requiredRoles } = rbacDirective;
                        const originalResolve = (fieldConfig.resolve ?? defaultFieldResolver);
                        fieldConfig.resolve = async function (source, args, context, info) {
                            if (!context.auth && context.headers) {
                                context.auth = extractAuthFromHeaders(context.headers);
                            }
                            if (!context.auth?.userId) {
                                throw new GraphQLError('Authentication required', {
                                    extensions: {
                                        code: AUTH_ERRORS.UNAUTHENTICATED,
                                        http: { status: 401 },
                                    },
                                });
                            }
                            if (!hasRequiredRole(context.auth.roles, requiredRoles)) {
                                throw new GraphQLError(`Access denied. Required roles: ${requiredRoles.join(', ')}`, {
                                    extensions: {
                                        code: AUTH_ERRORS.FORBIDDEN,
                                        requiredRoles,
                                        userRoles: context.auth.roles,
                                        http: { status: 403 },
                                    },
                                });
                            }
                            return originalResolve(source, args, context, info);
                        };
                    }
                    return fieldConfig;
                },
            });
        }
        /**
         * Apply @consent directive transformer - requires consent verification
         */
        function consentDirectiveTransformer(schema, checkConsent, directiveName = 'consent') {
            return mapSchema(schema, {
                [MapperKind.OBJECT_FIELD]: (fieldConfig) => {
                    const consentDirective = getDirective(schema, fieldConfig, directiveName)?.[0];
                    if (consentDirective) {
                        const { type: requiredConsentType } = consentDirective;
                        const originalResolve = (fieldConfig.resolve ?? defaultFieldResolver);
                        fieldConfig.resolve = async function (source, args, context, info) {
                            if (!context.auth && context.headers) {
                                context.auth = extractAuthFromHeaders(context.headers);
                            }
                            if (!context.auth?.userId || !context.auth.tenantId) {
                                throw new GraphQLError('Authentication required', {
                                    extensions: {
                                        code: AUTH_ERRORS.UNAUTHENTICATED,
                                        http: { status: 401 },
                                    },
                                });
                            }
                            const learnerId = context.auth.learnerId ??
                                source?.learnerId ??
                                source?.id;
                            if (!learnerId) {
                                throw new GraphQLError('Learner ID required for consent check', {
                                    extensions: {
                                        code: AUTH_ERRORS.CONSENT_REQUIRED,
                                        consentType: requiredConsentType,
                                    },
                                });
                            }
                            const hasConsent = await checkConsent(context.auth.tenantId, learnerId, requiredConsentType);
                            if (!hasConsent) {
                                throw new GraphQLError(`Consent of type '${requiredConsentType}' has not been granted for this learner`, {
                                    extensions: {
                                        code: AUTH_ERRORS.CONSENT_REQUIRED,
                                        consentType: requiredConsentType,
                                        learnerId,
                                        http: { status: 451 },
                                    },
                                });
                            }
                            return originalResolve(source, args, context, info);
                        };
                    }
                    return fieldConfig;
                },
            });
        }
        /**
         * Apply all directive transformers to a schema
         */
        function applyDirectives(schema, options) {
            let transformedSchema = schema;
            transformedSchema = authDirectiveTransformer(transformedSchema);
            transformedSchema = rbacDirectiveTransformer(transformedSchema);
            if (options?.checkConsent) {
                transformedSchema = consentDirectiveTransformer(transformedSchema, options.checkConsent);
            }
            return transformedSchema;
        }
        return {
            authDirectiveTransformer,
            rbacDirectiveTransformer,
            consentDirectiveTransformer,
            applyDirectives,
        };
    }
    catch {
        // graphql dependencies not available
        return null;
    }
}
//# sourceMappingURL=graphql-directives.js.map