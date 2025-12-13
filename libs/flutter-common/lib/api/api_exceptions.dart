/// API Exceptions
///
/// Typed exceptions for API errors.
library;

/// Base API exception.
sealed class ApiException implements Exception {
  const ApiException({
    required this.message,
    this.statusCode,
    this.correlationId,
    this.originalError,
  });

  final String message;
  final int? statusCode;
  final String? correlationId;
  final Object? originalError;

  @override
  String toString() => 'ApiException: $message (status: $statusCode)';
}

/// Network connectivity error.
class NetworkException extends ApiException {
  const NetworkException({
    required super.message,
    super.originalError,
  });
}

/// Authentication error (401).
class UnauthorizedException extends ApiException {
  const UnauthorizedException({
    super.message = 'Authentication required',
    super.correlationId,
  }) : super(statusCode: 401);
}

/// Authorization error (403).
class ForbiddenException extends ApiException {
  const ForbiddenException({
    super.message = 'Access denied',
    super.correlationId,
  }) : super(statusCode: 403);
}

/// Resource not found (404).
class NotFoundException extends ApiException {
  const NotFoundException({
    super.message = 'Resource not found',
    super.correlationId,
  }) : super(statusCode: 404);
}

/// Validation error (400/422).
class ValidationException extends ApiException {
  const ValidationException({
    required super.message,
    this.errors = const {},
    super.correlationId,
  }) : super(statusCode: 400);

  final Map<String, List<String>> errors;
}

/// Rate limit exceeded (429).
class RateLimitException extends ApiException {
  const RateLimitException({
    super.message = 'Too many requests',
    this.retryAfter,
    super.correlationId,
  }) : super(statusCode: 429);

  final Duration? retryAfter;
}

/// Server error (5xx).
class ServerException extends ApiException {
  const ServerException({
    super.message = 'Server error',
    super.statusCode = 500,
    super.correlationId,
  });
}

/// Consent required error.
class ConsentRequiredException extends ApiException {
  const ConsentRequiredException({
    required this.requiredConsents,
    super.message = 'Consent required',
    super.correlationId,
  }) : super(statusCode: 403);

  final List<String> requiredConsents;
}

/// Timeout error.
class TimeoutException extends ApiException {
  const TimeoutException({
    super.message = 'Request timed out',
    super.originalError,
  });
}
