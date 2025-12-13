/**
 * Request Correlation ID Middleware
 *
 * Provides Fastify middleware for propagating X-Request-ID headers
 * throughout the request lifecycle and into logs.
 *
 * The correlation ID flow:
 * 1. Kong gateway generates X-Request-ID if not present
 * 2. This middleware extracts X-Request-ID from incoming request
 * 3. Adds it to the request context for logging
 * 4. Includes it in all outgoing HTTP calls
 * 5. Includes it in response headers
 */

import { randomUUID } from 'node:crypto';

import type { FastifyPluginCallback, FastifyRequest, FastifyReply } from 'fastify';
import fp from 'fastify-plugin';

// Extend Fastify types
declare module 'fastify' {
  interface FastifyRequest {
    requestId: string;
    correlationId: string;
  }
}

export interface CorrelationIdOptions {
  /** Header name to read/write correlation ID (default: X-Request-ID) */
  headerName?: string;
  /** Alternative header names to check (default: ['X-Correlation-ID']) */
  alternativeHeaders?: string[];
  /** Whether to generate an ID if none provided (default: true) */
  generateIfMissing?: boolean;
  /** Whether to include in response headers (default: true) */
  includeInResponse?: boolean;
}

const DEFAULT_OPTIONS: Required<CorrelationIdOptions> = {
  headerName: 'X-Request-ID',
  alternativeHeaders: ['X-Correlation-ID'],
  generateIfMissing: true,
  includeInResponse: true,
};

/**
 * Extract correlation ID from request headers
 */
function extractCorrelationId(
  request: FastifyRequest,
  options: Required<CorrelationIdOptions>
): string | undefined {
  // Check primary header
  const primaryId = request.headers[options.headerName.toLowerCase()] as string | undefined;
  if (primaryId) {
    return primaryId;
  }

  // Check alternative headers
  for (const altHeader of options.alternativeHeaders) {
    const altId = request.headers[altHeader.toLowerCase()] as string | undefined;
    if (altId) {
      return altId;
    }
  }

  return undefined;
}

/**
 * Correlation ID plugin for Fastify
 */
const correlationIdPlugin: FastifyPluginCallback<CorrelationIdOptions> = (fastify, opts, done) => {
  const options = { ...DEFAULT_OPTIONS, ...opts };

  // Add hook to extract/generate correlation ID
  fastify.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
    let correlationId = extractCorrelationId(request, options);

    // Generate if missing and configured to do so
    if (!correlationId && options.generateIfMissing) {
      correlationId = randomUUID();
    }

    // Store on request object
    if (correlationId) {
      request.requestId = correlationId;
      request.correlationId = correlationId;

      // Add to request log context
      request.log = request.log.child({ requestId: correlationId });
    }
  });

  // Add hook to include in response
  if (options.includeInResponse) {
    fastify.addHook('onSend', async (request: FastifyRequest, reply: FastifyReply) => {
      if (request.correlationId) {
        reply.header(options.headerName, request.correlationId);
      }
    });
  }

  done();
};

export const correlationIdMiddleware = fp(correlationIdPlugin, {
  name: 'correlation-id',
  fastify: '4.x',
});

/**
 * Create headers object with correlation ID for outgoing requests
 */
export function createCorrelatedHeaders(
  request: FastifyRequest,
  additionalHeaders?: Record<string, string>
): Record<string, string> {
  const headers: Record<string, string> = {
    ...additionalHeaders,
  };

  if (request.correlationId) {
    headers['X-Request-ID'] = request.correlationId;
  }

  // Also include tenant context if available
  const tenantId = request.headers['x-tenant-id'] as string | undefined;
  if (tenantId) {
    headers['X-Tenant-ID'] = tenantId;
  }

  const userId = request.headers['x-user-id'] as string | undefined;
  if (userId) {
    headers['X-User-ID'] = userId;
  }

  return headers;
}

/**
 * Logger child with correlation ID context
 */
export function createCorrelatedLogger(request: FastifyRequest) {
  return request.log.child({
    requestId: request.correlationId,
    tenantId: request.headers['x-tenant-id'],
    userId: request.headers['x-user-id'],
  });
}

export default correlationIdMiddleware;
