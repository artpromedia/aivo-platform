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
import { isRole } from './roles.js';

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

// Error codes for GraphQL errors
export const AUTH_ERRORS = {
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  FORBIDDEN: 'FORBIDDEN',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',
} as const;

/**
 * Extract auth context from HTTP headers (set by Kong dash_context plugin)
 */
export function extractAuthFromHeaders(headers: HeadersMap | undefined): AuthInfo | undefined {
  if (!headers) return undefined;

  const userId = headers['x-user-id'];
  const tenantId = headers['x-tenant-id'];
  const rolesHeader = headers['x-roles'];
  const learnerId = headers['x-learner-id'];

  if (!userId || !tenantId) {
    return undefined;
  }

  const roles: Role[] = [];
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
export function hasRequiredRole(userRoles: Role[], requiredRoles: string[]): boolean {
  return requiredRoles.some((role) => userRoles.includes(role as Role));
}

// Re-export for convenience
export { Role } from './roles.js';

// =============================================================================
// GraphQL Directive Transformers (require graphql and @graphql-tools/utils)
// =============================================================================

/** Directive transformer return type */
export interface DirectiveTransformers {
  authDirectiveTransformer: (schema: unknown, directiveName?: string) => unknown;
  rbacDirectiveTransformer: (schema: unknown, directiveName?: string) => unknown;
  consentDirectiveTransformer: (
    schema: unknown,
    checkConsent: (tenantId: string, learnerId: string, consentType: string) => Promise<boolean>,
    directiveName?: string
  ) => unknown;
  applyDirectives: (
    schema: unknown,
    options?: {
      checkConsent?: (tenantId: string, learnerId: string, consentType: string) => Promise<boolean>;
    }
  ) => unknown;
}

type ResolverFn = (
  source: unknown,
  args: unknown,
  context: GraphQLContext,
  info: unknown
) => unknown;

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
export async function createDirectiveTransformers(): Promise<DirectiveTransformers | null> {
  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-imports */
  try {
    // Dynamic imports - graphql is optional
    const graphqlTools = await import('@graphql-tools/utils');
    const graphql = await import('graphql');

    type GraphQLSchema = import('graphql').GraphQLSchema;
    type GraphQLFieldConfig = import('graphql').GraphQLFieldConfig<any, GraphQLContext, any>;
    const { getDirective, MapperKind, mapSchema } = graphqlTools;
    const { defaultFieldResolver, GraphQLError } = graphql;

    /**
     * Apply @auth directive transformer - requires authentication
     */
    function authDirectiveTransformer(schema: unknown, directiveName = 'auth'): unknown {
      return mapSchema(schema as GraphQLSchema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLFieldConfig) => {
          const authDirective = getDirective(
            schema as GraphQLSchema,
            fieldConfig,
            directiveName
          )?.[0];

          if (authDirective) {
            const originalResolve = (fieldConfig.resolve ?? defaultFieldResolver) as ResolverFn;

            fieldConfig.resolve = async function (
              source: unknown,
              args: unknown,
              context: GraphQLContext,
              info: unknown
            ) {
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
    function rbacDirectiveTransformer(schema: unknown, directiveName = 'rbac'): unknown {
      return mapSchema(schema as GraphQLSchema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLFieldConfig) => {
          const rbacDirective = getDirective(
            schema as GraphQLSchema,
            fieldConfig,
            directiveName
          )?.[0] as { roles: string[] } | undefined;

          if (rbacDirective) {
            const { roles: requiredRoles } = rbacDirective;
            const originalResolve = (fieldConfig.resolve ?? defaultFieldResolver) as ResolverFn;

            fieldConfig.resolve = async function (
              source: unknown,
              args: unknown,
              context: GraphQLContext,
              info: unknown
            ) {
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
                throw new GraphQLError(
                  `Access denied. Required roles: ${requiredRoles.join(', ')}`,
                  {
                    extensions: {
                      code: AUTH_ERRORS.FORBIDDEN,
                      requiredRoles,
                      userRoles: context.auth.roles,
                      http: { status: 403 },
                    },
                  }
                );
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
    function consentDirectiveTransformer(
      schema: unknown,
      checkConsent: (tenantId: string, learnerId: string, consentType: string) => Promise<boolean>,
      directiveName = 'consent'
    ): unknown {
      return mapSchema(schema as GraphQLSchema, {
        [MapperKind.OBJECT_FIELD]: (fieldConfig: GraphQLFieldConfig) => {
          const consentDirective = getDirective(
            schema as GraphQLSchema,
            fieldConfig,
            directiveName
          )?.[0] as { type: string } | undefined;

          if (consentDirective) {
            const { type: requiredConsentType } = consentDirective;
            const originalResolve = (fieldConfig.resolve ?? defaultFieldResolver) as ResolverFn;

            fieldConfig.resolve = async function (
              source: unknown,
              args: unknown,
              context: GraphQLContext,
              info: unknown
            ) {
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

              const learnerId =
                context.auth.learnerId ??
                (source as { learnerId?: string } | null)?.learnerId ??
                (source as { id?: string } | null)?.id;

              if (!learnerId) {
                throw new GraphQLError('Learner ID required for consent check', {
                  extensions: {
                    code: AUTH_ERRORS.CONSENT_REQUIRED,
                    consentType: requiredConsentType,
                  },
                });
              }

              const hasConsent = await checkConsent(
                context.auth.tenantId,
                learnerId,
                requiredConsentType
              );

              if (!hasConsent) {
                throw new GraphQLError(
                  `Consent of type '${requiredConsentType}' has not been granted for this learner`,
                  {
                    extensions: {
                      code: AUTH_ERRORS.CONSENT_REQUIRED,
                      consentType: requiredConsentType,
                      learnerId,
                      http: { status: 451 },
                    },
                  }
                );
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
    function applyDirectives(
      schema: unknown,
      options?: {
        checkConsent?: (
          tenantId: string,
          learnerId: string,
          consentType: string
        ) => Promise<boolean>;
      }
    ): unknown {
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
  } catch {
    // graphql dependencies not available
    return null;
  }
}
