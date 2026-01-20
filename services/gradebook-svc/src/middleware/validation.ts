/**
 * Zod Validation Middleware
 *
 * Express middleware for validating request body, params, and query using Zod schemas.
 * Provides detailed validation error messages and proper TypeScript type inference.
 */

import type { Request, Response, NextFunction, RequestHandler } from 'express';
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
function formatZodErrors(error: ZodError): ValidationErrorResponse {
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
 * Creates a validation middleware that validates request body, params, and/or query
 *
 * @example
 * // Validate body only
 * router.post('/config', validate({ body: upsertGradebookConfigBodySchema }), handler);
 *
 * @example
 * // Validate params and body
 * router.put('/grades/:id', validate({
 *   params: gradeIdParamsSchema,
 *   body: updateGradeBodySchema
 * }), handler);
 *
 * @example
 * // Validate all three
 * router.get('/search', validate({
 *   params: idParamsSchema,
 *   query: searchQuerySchema,
 *   body: filterBodySchema
 * }), handler);
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Validate params if schema provided
      if (schemas.params) {
        const paramsResult = schemas.params.safeParse(req.params);
        if (!paramsResult.success) {
          res.status(400).json(formatZodErrors(paramsResult.error));
          return;
        }
        req.params = paramsResult.data;
      }

      // Validate query if schema provided
      if (schemas.query) {
        const queryResult = schemas.query.safeParse(req.query);
        if (!queryResult.success) {
          res.status(400).json(formatZodErrors(queryResult.error));
          return;
        }
        req.query = queryResult.data;
      }

      // Validate body if schema provided
      if (schemas.body) {
        const bodyResult = schemas.body.safeParse(req.body);
        if (!bodyResult.success) {
          res.status(400).json(formatZodErrors(bodyResult.error));
          return;
        }
        req.body = bodyResult.data;
      }

      next();
    } catch (error) {
      // Handle unexpected errors
      console.error('Validation middleware error:', error);
      res.status(500).json({ error: 'Internal validation error' });
    }
  };
}

/**
 * Convenience function for validating body only
 *
 * @example
 * router.post('/grades', validateBody(submitGradeBodySchema), handler);
 */
export function validateBody(schema: ZodSchema): RequestHandler {
  return validate({ body: schema });
}

/**
 * Convenience function for validating params only
 *
 * @example
 * router.get('/assignments/:id', validateParams(idParamsSchema), handler);
 */
export function validateParams(schema: ZodSchema): RequestHandler {
  return validate({ params: schema });
}

/**
 * Convenience function for validating query only
 *
 * @example
 * router.get('/search', validateQuery(searchQuerySchema), handler);
 */
export function validateQuery(schema: ZodSchema): RequestHandler {
  return validate({ query: schema });
}

/**
 * Type helper for extracting validated request types
 * Use this in route handlers to get properly typed request data
 *
 * @example
 * import type { CreateAssignmentBody } from '../schemas/gradebook.schemas';
 *
 * router.post('/assignments',
 *   validateBody(createAssignmentBodySchema),
 *   async (req: Request<{}, {}, CreateAssignmentBody>, res) => {
 *     // req.body is now typed as CreateAssignmentBody
 *     const { title, totalPoints } = req.body;
 *   }
 * );
 */
export type ValidatedRequest<
  TParams = Record<string, string>,
  TQuery = Record<string, string>,
  TBody = unknown
> = Request<TParams, unknown, TBody, TQuery>;
