/// Environment Configuration
///
/// Compile-time environment configuration for the Teacher app.
library;

/// Environment configuration loaded from compile-time constants.
class EnvConfig {
  EnvConfig._();

  /// Base URL for API calls.
  static const apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: 'https://api.aivolearning.com',
  );

  /// Base URL for WebSocket connections.
  static const wsBaseUrl = String.fromEnvironment(
    'WS_BASE_URL',
    defaultValue: 'wss://api.aivolearning.com',
  );

  /// Interval for background sync when online (in minutes).
  static const syncIntervalMinutes = int.fromEnvironment(
    'SYNC_INTERVAL_MINUTES',
    defaultValue: 5,
  );

  /// Maximum retries for failed sync operations.
  static const maxSyncRetries = int.fromEnvironment(
    'MAX_SYNC_RETRIES',
    defaultValue: 3,
  );

  /// Enable debug logging.
  static const enableDebugLogging = bool.fromEnvironment(
    'ENABLE_DEBUG_LOGGING',
    defaultValue: false,
  );

  /// Cache expiry duration (in hours).
  static const cacheExpiryHours = int.fromEnvironment(
    'CACHE_EXPIRY_HOURS',
    defaultValue: 24,
  );

  /// Maximum offline queue size.
  static const maxOfflineQueueSize = int.fromEnvironment(
    'MAX_OFFLINE_QUEUE_SIZE',
    defaultValue: 1000,
  );
}
