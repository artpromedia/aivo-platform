/**
 * Zod Validation Helpers
 *
 * Validation helpers for Fastify route handlers using Zod schemas.
 * In Fastify, validation is done inline in handlers rather than as middleware.
 * These helpers provide consistent error formatting.
 */

import type { FastifyReply } from 'fastify';
import type { ZodSchema, ZodError } from 'zod';

/**
 * Validation error response format
 */
export interface ValidationErrorResponse {
  error: 'Validation failed';
  details: {
    path: string;
    message: string;
  }[];
}

/**
 * Format Zod errors into a consistent response format
 */
export function formatZodErrors(error: ZodError): ValidationErrorResponse {
  return {
    error: 'Validation failed',
    details: error.errors.map((err) => ({
      path: err.path.join('.'),
      message: err.message,
    })),
  };
}

/**
 * Validation schema configuration
 */
export interface ValidationSchemas {
  body?: ZodSchema;
  params?: ZodSchema;
  query?: ZodSchema;
}

/**
 * Validate request data against schemas and send error response if invalid.
 * Returns the validated data or null if validation failed (reply already sent).
 *
 * @example
 * app.post('/config', async (request, reply) => {
 *   const data = validateRequest(reply, {
 *     body: upsertGradebookConfigBodySchema,
 *   }, { body: request.body });
 *   if (!data) return;
 *   // use data.body
 * });
 */
export function validateRequest<T extends ValidationSchemas>(
  reply: FastifyReply,
  schemas: T,
  data: { params?: unknown; query?: unknown; body?: unknown }
): { params: unknown; query: unknown; body: unknown } | null {
  if (schemas.params) {
    const result = schemas.params.safeParse(data.params);
    if (!result.success) {
      reply.status(400).send(formatZodErrors(result.error));
      return null;
    }
    data.params = result.data;
  }

  if (schemas.query) {
    const result = schemas.query.safeParse(data.query);
    if (!result.success) {
      reply.status(400).send(formatZodErrors(result.error));
      return null;
    }
    data.query = result.data;
  }

  if (schemas.body) {
    const result = schemas.body.safeParse(data.body);
    if (!result.success) {
      reply.status(400).send(formatZodErrors(result.error));
      return null;
    }
    data.body = result.data;
  }

  return data as { params: unknown; query: unknown; body: unknown };
}

/**
 * Validate body only. Returns validated body or null (reply already sent).
 */
export function validateBody<T>(
  reply: FastifyReply,
  schema: ZodSchema<T>,
  body: unknown
): T | null {
  const result = schema.safeParse(body);
  if (!result.success) {
    reply.status(400).send(formatZodErrors(result.error));
    return null;
  }
  return result.data;
}

/**
 * Validate params only. Returns validated params or null (reply already sent).
 */
export function validateParams<T>(
  reply: FastifyReply,
  schema: ZodSchema<T>,
  params: unknown
): T | null {
  const result = schema.safeParse(params);
  if (!result.success) {
    reply.status(400).send(formatZodErrors(result.error));
    return null;
  }
  return result.data;
}

/**
 * Validate query only. Returns validated query or null (reply already sent).
 */
export function validateQuery<T>(
  reply: FastifyReply,
  schema: ZodSchema<T>,
  query: unknown
): T | null {
  const result = schema.safeParse(query);
  if (!result.success) {
    reply.status(400).send(formatZodErrors(result.error));
    return null;
  }
  return result.data;
}
