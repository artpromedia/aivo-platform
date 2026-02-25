/**
 * Internal Service API Versioning
 *
 * Uses the `Accept-Version` header for inter-service communication.
 * Internal versions use calendar dates (e.g. "2026-01-15") rather than
 * major version numbers to distinguish them from public API versions.
 *
 * Default version is always "latest" when no header is present — this is
 * safe because internal services are deployed together.
 *
 * Usage:
 * ```typescript
 * import { internalVersioning, INTERNAL_API_VERSION_HEADER } from '@aivo/ts-api-utils/internal-versioning';
 *
 * await app.register(internalVersioning);
 *
 * // In a route handler
 * app.get('/learners/:id', async (request, reply) => {
 *   const apiVersion = request.internalApiVersion; // "latest" | "2026-01-15"
 *   if (apiVersion === '2025-06-01') {
 *     return legacyHandler(request, reply);
 *   }
 *   return currentHandler(request, reply);
 * });
 * ```
 *
 * Callers set the header:
 * ```typescript
 * const response = await fetch(url, {
 *   headers: {
 *     'Accept-Version': '2026-01-15',
 *   },
 * });
 * ```
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

/** Header name for internal API version negotiation. */
export const INTERNAL_API_VERSION_HEADER = 'Accept-Version';

/** Value used when no version header is present. */
export const INTERNAL_VERSION_LATEST = 'latest';

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY AUGMENTATION
// ══════════════════════════════════════════════════════════════════════════════

declare module 'fastify' {
  interface FastifyRequest {
    /** Internal API version from Accept-Version header, or "latest" */
    internalApiVersion?: string;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PLUGIN
// ══════════════════════════════════════════════════════════════════════════════

export interface InternalVersioningOptions {
  /** Default version when header is missing (default: "latest") */
  defaultVersion?: string;
  /** If true, set X-API-Version response header (default: false) */
  echoVersion?: boolean;
}

/**
 * Fastify plugin that reads the `Accept-Version` header and attaches
 * it to `request.internalApiVersion`.
 */
export async function internalVersioning(
  fastify: FastifyInstance,
  options?: InternalVersioningOptions,
): Promise<void> {
  const defaultVersion = options?.defaultVersion ?? INTERNAL_VERSION_LATEST;
  const echoVersion = options?.echoVersion ?? false;

  fastify.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const headerValue = request.headers[
        INTERNAL_API_VERSION_HEADER.toLowerCase()
      ] as string | undefined;

      request.internalApiVersion = headerValue?.trim() || defaultVersion;

      if (echoVersion) {
        reply.header('X-API-Version', request.internalApiVersion);
      }
    },
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Check if the internal API version is at least the given date.
 *
 * Useful for feature-flagging new internal API behaviour:
 * ```typescript
 * if (isVersionAtLeast(request.internalApiVersion, '2026-03-01')) {
 *   // New behaviour
 * } else {
 *   // Legacy behaviour
 * }
 * ```
 */
export function isVersionAtLeast(
  version: string | undefined,
  minDate: string,
): boolean {
  if (!version || version === INTERNAL_VERSION_LATEST) return true;

  // Calendar version comparison (lexicographic works for YYYY-MM-DD)
  return version >= minDate;
}

/**
 * Create headers object with the internal API version for service-to-service calls.
 *
 * ```typescript
 * const headers = withInternalVersion('2026-01-15');
 * await fetch(url, { headers });
 * ```
 */
export function withInternalVersion(
  version: string,
  additionalHeaders?: Record<string, string>,
): Record<string, string> {
  return {
    [INTERNAL_API_VERSION_HEADER]: version,
    ...additionalHeaders,
  };
}
