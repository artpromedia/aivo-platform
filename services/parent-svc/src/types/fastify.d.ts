/**
 * Fastify Type Extensions
 *
 * Extends Fastify schema types to include Swagger/OpenAPI documentation fields.
 * These fields are used for API documentation but are not required by Fastify core.
 */

import 'fastify';

declare module 'fastify' {
  interface FastifySchema {
    description?: string;
    tags?: string[];
    summary?: string;
    consumes?: string[];
    produces?: string[];
    security?: Record<string, string[]>[];
    deprecated?: boolean;
    externalDocs?: { description?: string; url: string };
    operationId?: string;
    hide?: boolean;
    hideUntagged?: boolean;
  }

  interface FastifyRequest {
    user?: {
      sub?: string;
      tenant_id?: string;
      id?: string;
      tenantId?: string;
      roles?: string[];
      email?: string;
      name?: string;
    };
  }
}
