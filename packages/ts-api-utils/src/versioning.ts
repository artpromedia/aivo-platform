/**
 * API Versioning Middleware
 *
 * Handles version extraction from URL paths, deprecation headers, and sunset enforcement
 * for AIVO public APIs.
 *
 * Usage:
 * ```typescript
 * import { apiVersioning, type ApiVersion } from '@aivo/ts-api-utils/versioning';
 *
 * const versions: ApiVersion[] = [
 *   { version: 'v1', major: 1, status: 'current' },
 * ];
 *
 * await app.register(apiVersioning, {
 *   versions,
 *   currentVersion: 'v1',
 *   basePath: '/public',
 * });
 * ```
 *
 * Response headers (always):
 *   API-Version: v1
 *   API-Current-Version: v1
 *
 * Response headers (deprecated):
 *   API-Deprecation: true
 *   API-Sunset: 2027-06-01
 *   API-Successor: v2
 *   Deprecation: 2027-06-01
 *   Sunset: Sun, 01 Jun 2027 00:00:00 GMT
 *   Link: <https://docs.aivolearning.com/api/migration/v1-to-v2>; rel="deprecation"
 *
 * Sunset version response:
 *   410 Gone with migration guide link
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/** Describes a single API version and its lifecycle status. */
export interface ApiVersion {
  /** Version identifier, e.g. "v1", "v2" */
  version: string;
  /** Major version number, e.g. 1, 2 */
  major: number;
  /** Lifecycle status */
  status: 'current' | 'supported' | 'deprecated' | 'sunset';
  /** ISO date when this version will be sunset (e.g. "2027-06-01") */
  sunsetDate?: string;
  /** The successor version to migrate to (e.g. "v2") */
  successor?: string;
}

/** Options for the versioning plugin. */
export interface VersioningOptions {
  /** All registered API versions */
  versions: ApiVersion[];
  /** The current (latest) version identifier */
  currentVersion: string;
  /** URL prefix before version segment (default: "/public") */
  basePath?: string;
  /** Base URL for documentation links */
  docsBaseUrl?: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// FASTIFY AUGMENTATION
// ══════════════════════════════════════════════════════════════════════════════

declare module 'fastify' {
  interface FastifyRequest {
    /** The API version extracted from the URL path (e.g. "v1") */
    apiVersion?: string;
    /** Full version config for the requested version */
    apiVersionConfig?: ApiVersion;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PLUGIN
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fastify plugin that adds API versioning support.
 *
 * Extracts the version from the URL path, validates it, sets deprecation
 * headers, and enforces sunset (410 Gone) for retired versions.
 */
export async function apiVersioning(
  fastify: FastifyInstance,
  options: VersioningOptions,
): Promise<void> {
  const {
    versions,
    currentVersion,
    basePath = '/public',
    docsBaseUrl = 'https://docs.aivolearning.com/api',
  } = options;

  // Build a fast lookup map
  const versionMap = new Map<string, ApiVersion>();
  for (const v of versions) {
    versionMap.set(v.version, v);
  }

  // Escape basePath for regex safety
  const escapedBase = basePath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const versionRegex = new RegExp(`^${escapedBase}/(v\\d+)/`);

  fastify.addHook(
    'onRequest',
    async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
      const url = request.url;

      // Extract version from URL: /public/v1/... → "v1"
      const match = url.match(versionRegex);
      if (!match) return; // Not a versioned endpoint — skip

      const requestedVersion = match[1]!;
      const versionConfig = versionMap.get(requestedVersion);

      // ── Unknown version ──────────────────────────────────────────────────
      if (!versionConfig) {
        const available = versions
          .filter((v) => v.status !== 'sunset')
          .map((v) => v.version)
          .join(', ');

        return reply.status(400).send({
          error: 'INVALID_API_VERSION',
          message: `API version '${requestedVersion}' does not exist. Available versions: ${available}`,
          currentVersion,
        });
      }

      // ── Sunset — reject with 410 ────────────────────────────────────────
      if (versionConfig.status === 'sunset') {
        const successor = versionConfig.successor ?? currentVersion;
        return reply.status(410).send({
          error: 'API_VERSION_SUNSET',
          message: `API version '${requestedVersion}' has been sunset. Please migrate to ${successor}.`,
          successor,
          migrationGuide: `${docsBaseUrl}/migration/${requestedVersion}-to-${successor}`,
        });
      }

      // ── Set version headers (always) ────────────────────────────────────
      reply.header('API-Version', requestedVersion);
      reply.header('API-Current-Version', currentVersion);

      // ── Deprecated — add deprecation headers ────────────────────────────
      if (versionConfig.status === 'deprecated') {
        reply.header('API-Deprecation', 'true');

        if (versionConfig.sunsetDate) {
          reply.header('API-Sunset', versionConfig.sunsetDate);
          reply.header('Deprecation', versionConfig.sunsetDate);
          reply.header(
            'Sunset',
            new Date(versionConfig.sunsetDate).toUTCString(),
          );
        } else {
          reply.header('Deprecation', 'true');
        }

        if (versionConfig.successor) {
          reply.header('API-Successor', versionConfig.successor);
          reply.header(
            'Link',
            `<${docsBaseUrl}/migration/${requestedVersion}-to-${versionConfig.successor}>; rel="deprecation"`,
          );
        }
      }

      // ── Supported — add current-version hint but no deprecation ────────
      if (versionConfig.status === 'supported' && currentVersion !== requestedVersion) {
        // Gentle nudge: "a newer version exists"
        reply.header('API-Latest', currentVersion);
      }

      // ── Attach to request for downstream handlers ──────────────────────
      request.apiVersion = requestedVersion;
      request.apiVersionConfig = versionConfig;
    },
  );
}
