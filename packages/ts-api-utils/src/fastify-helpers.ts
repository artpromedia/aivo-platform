/**
 * Fastify Helper Utilities
 *
 * Provides type-safe helpers for registering Fastify plugins
 * that have type provider mismatches.
 */

import type { FastifyPluginAsync } from 'fastify';

/**
 * Type assertion helper for Fastify plugins with type provider mismatches.
 *
 * This is needed because some Fastify plugins (like @fastify/rate-limit,
 * @fastify/helmet, @fastify/cors, etc.) have type definitions that expect
 * a specific FastifyTypeProviderDefault, but when using a plain Fastify
 * instance without a type provider, TypeScript complains about type
 * incompatibilities.
 *
 * @example
 * ```typescript
 * import rateLimit from '@fastify/rate-limit';
 * import helmet from '@fastify/helmet';
 * import { asPlugin } from '@aivo/ts-api-utils';
 *
 * app.register(asPlugin(rateLimit), { max: 100, timeWindow: '1 minute' });
 * app.register(asPlugin(helmet), { contentSecurityPolicy: false });
 * ```
 */
export function asPlugin(plugin: unknown): FastifyPluginAsync {
  return plugin as FastifyPluginAsync;
}

/**
 * Alternative name for asPlugin for better readability in some contexts
 */
export const fastifyPlugin = asPlugin;
