/**
 * HTTP Error Classes
 *
 * Fastify-compatible error classes that replace NestJS exceptions.
 * The errorHandler in app.ts catches these and sends the proper HTTP response.
 */

export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly error: string;

  constructor(statusCode: number, message: string, error?: string) {
    super(message);
    this.statusCode = statusCode;
    this.error = error ?? httpStatusText(statusCode);
  }
}

export class BadRequestException extends HttpError {
  constructor(message = 'Bad Request') {
    super(400, message, 'Bad Request');
  }
}

export class UnauthorizedException extends HttpError {
  constructor(message = 'Unauthorized') {
    super(401, message, 'Unauthorized');
  }
}

export class ForbiddenException extends HttpError {
  constructor(message = 'Forbidden') {
    super(403, message, 'Forbidden');
  }
}

export class NotFoundException extends HttpError {
  constructor(message = 'Not Found') {
    super(404, message, 'Not Found');
  }
}

export class ConflictException extends HttpError {
  constructor(message = 'Conflict') {
    super(409, message, 'Conflict');
  }
}

export class TooManyRequestsException extends HttpError {
  constructor(message = 'Too Many Requests') {
    super(429, message, 'Too Many Requests');
  }
}

export class InternalServerErrorException extends HttpError {
  constructor(message = 'Internal Server Error') {
    super(500, message, 'Internal Server Error');
  }
}

function httpStatusText(code: number): string {
  const map: Record<number, string> = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
  };
  return map[code] ?? 'Error';
}
