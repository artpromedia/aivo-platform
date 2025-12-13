/// API Client Library
///
/// Provides Dio-based HTTP client with interceptors for:
/// - JWT authentication with auto-refresh
/// - Correlation ID tracking
/// - Retry with exponential backoff
/// - Error handling and transformation
library;

export 'api_client.dart';
export 'api_interceptors.dart';
export 'api_config.dart';
export 'api_exceptions.dart';
