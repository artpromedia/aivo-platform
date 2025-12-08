import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';

export interface ApiErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

export class AppError extends Error {
  statusCode: number;
  details?: unknown;

  constructor(message: string, statusCode: number = 500, details?: unknown) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id ${id} not found` : `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class BadRequestError extends AppError {
  constructor(message: string, details?: unknown) {
    super(message, 400, details);
    this.name = 'BadRequestError';
  }
}

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  request.log.error(error);

  // Zod validation errors
  if (error instanceof ZodError) {
    const response: ApiErrorResponse = {
      error: 'ValidationError',
      message: 'Invalid request data',
      statusCode: 400,
      details: error.errors,
    };
    void reply.status(400).send(response);
    return;
  }

  // Custom app errors
  if (error instanceof AppError) {
    const response: ApiErrorResponse = {
      error: error.name,
      message: error.message,
      statusCode: error.statusCode,
      details: error.details,
    };
    void reply.status(error.statusCode).send(response);
    return;
  }

  // Fastify errors (e.g., auth failures)
  if ('statusCode' in error && typeof error.statusCode === 'number') {
    const response: ApiErrorResponse = {
      error: error.name || 'Error',
      message: error.message,
      statusCode: error.statusCode,
    };
    void reply.status(error.statusCode).send(response);
    return;
  }

  // Unknown errors
  const response: ApiErrorResponse = {
    error: 'InternalServerError',
    message: 'An unexpected error occurred',
    statusCode: 500,
  };
  void reply.status(500).send(response);
}
