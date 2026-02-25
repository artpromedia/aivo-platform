/**
 * Versioned Route Registration
 *
 * Allows registering different route handlers per API version, making it
 * straightforward to maintain multiple handler implementations side-by-side.
 *
 * Usage:
 * ```typescript
 * import { registerVersionedRoutes } from '@aivo/ts-api-utils/versioned-routes';
 *
 * registerVersionedRoutes(app, '/public', [
 *   {
 *     method: 'GET',
 *     path: '/learners',
 *     versions: {
 *       v1: listLearnersV1,
 *       v2: listLearnersV2,
 *     },
 *     schema: { querystring: PaginationSchema },
 *   },
 *   {
 *     method: 'GET',
 *     path: '/learners/:id/progress',
 *     versions: { v1: getLearnerProgressV1 },
 *   },
 * ]);
 * ```
 *
 * This registers:
 *   GET /public/v1/learners       → listLearnersV1
 *   GET /public/v2/learners       → listLearnersV2
 *   GET /public/v1/learners/:id/progress → getLearnerProgressV1
 */

import type {
  FastifyInstance,
  RouteHandlerMethod,
  RouteOptions,
  HTTPMethods,
} from 'fastify';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Describes a single route with per-version handler implementations. */
export interface VersionedRoute {
  /** HTTP method */
  method: HTTPMethods;
  /** Path after the version segment (e.g. "/learners/:id/progress") */
  path: string;
  /** Map of version → handler (e.g. { v1: handlerFnV1, v2: handlerFnV2 }) */
  versions: Record<string, RouteHandlerMethod>;
  /** Optional Fastify route schema (applied to all versions unless overridden) */
  schema?: RouteOptions['schema'];
  /** Optional per-version schema overrides */
  versionSchemas?: Record<string, RouteOptions['schema']>;
  /** Optional preHandler hooks (applied to all versions) */
  preHandler?: RouteOptions['preHandler'];
  /** Optional per-version preHandler overrides */
  versionPreHandlers?: Record<string, RouteOptions['preHandler']>;
}

// ══════════════════════════════════════════════════════════════════════════════
// REGISTRATION
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Register versioned routes on a Fastify instance.
 *
 * For each route / version combination, a concrete Fastify route is
 * registered at `{basePath}/{version}{route.path}`.
 *
 * @param fastify  - The Fastify instance (or encapsulated context)
 * @param basePath - URL prefix before the version segment (e.g. "/public")
 * @param routes   - Array of versioned route definitions
 */
export function registerVersionedRoutes(
  fastify: FastifyInstance,
  basePath: string,
  routes: VersionedRoute[],
): void {
  for (const route of routes) {
    for (const [version, handler] of Object.entries(route.versions)) {
      const fullPath = `${basePath}/${version}${route.path}`;

      const routeOptions: RouteOptions = {
        method: route.method,
        url: fullPath,
        handler,
        schema: route.versionSchemas?.[version] ?? route.schema,
      };

      // Attach preHandler if provided
      const preHandler =
        route.versionPreHandlers?.[version] ?? route.preHandler;
      if (preHandler) {
        routeOptions.preHandler = preHandler;
      }

      fastify.route(routeOptions);
    }
  }
}

/**
 * Helper to create a versioned route definition with strong typing.
 *
 * ```typescript
 * const listLearners = versionedRoute('GET', '/learners', {
 *   v1: async (request, reply) => { ... },
 * });
 * ```
 */
export function versionedRoute(
  method: HTTPMethods,
  path: string,
  versions: Record<string, RouteHandlerMethod>,
  options?: {
    schema?: RouteOptions['schema'];
    preHandler?: RouteOptions['preHandler'];
  },
): VersionedRoute {
  return {
    method,
    path,
    versions,
    schema: options?.schema,
    preHandler: options?.preHandler,
  };
}
