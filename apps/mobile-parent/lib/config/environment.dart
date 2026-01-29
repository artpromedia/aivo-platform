/// Environment Configuration for Mobile Parent App
///
/// Centralizes all environment-related configuration including:
/// - Environment detection (development, staging, production)
/// - Mock service flags
/// - API base URLs
///
/// All mock flags default to FALSE and can only be enabled in development mode.
library;

import 'package:flutter/foundation.dart';

/// Environment types supported by the application.
enum Environment {
  /// Local development environment
  development,

  /// Staging/testing environment
  staging,

  /// Production environment
  production,
}

/// Centralized environment configuration.
///
/// Usage:
/// ```dart
/// if (EnvironmentConfig.useMockServices) {
///   return _mockData();
/// }
/// ```
///
/// Mock services can ONLY be enabled when:
/// 1. Running in development mode (APP_ENV=development)
/// 2. Mock mode is explicitly enabled (ENABLE_MOCK_MODE=true)
/// 3. The app is in debug mode (kDebugMode is true)
class EnvironmentConfig {
  EnvironmentConfig._();

  // ══════════════════════════════════════════════════════════════════════════
  // ENVIRONMENT DETECTION
  // ══════════════════════════════════════════════════════════════════════════

  /// Current environment from dart-define or defaults to production.
  static const String _envString = String.fromEnvironment(
    'APP_ENV',
    defaultValue: 'production',
  );

  /// Parsed environment enum.
  static Environment get current {
    switch (_envString.toLowerCase()) {
      case 'development':
      case 'dev':
        return Environment.development;
      case 'staging':
      case 'stage':
        return Environment.staging;
      case 'production':
      case 'prod':
      default:
        return Environment.production;
    }
  }

  /// Whether the app is running in development mode.
  static bool get isDevelopment => current == Environment.development;

  /// Whether the app is running in staging mode.
  static bool get isStaging => current == Environment.staging;

  /// Whether the app is running in production mode.
  static bool get isProduction => current == Environment.production;

  // ══════════════════════════════════════════════════════════════════════════
  // MOCK MODE CONFIGURATION
  // ══════════════════════════════════════════════════════════════════════════

  /// Explicit mock mode flag from dart-define.
  /// Only applies when running in development mode.
  static const bool _explicitMockMode = bool.fromEnvironment(
    'ENABLE_MOCK_MODE',
    defaultValue: false,
  );

  /// Whether mock services should be used.
  ///
  /// Mock services can ONLY be enabled when ALL of these conditions are met:
  /// 1. App is in debug mode (kDebugMode is true)
  /// 2. Environment is development
  /// 3. Mock mode is explicitly enabled
  ///
  /// This ensures production builds NEVER use mock data.
  static bool get useMockServices {
    // CRITICAL: Never allow mocks in release mode
    if (!kDebugMode) return false;

    // Only allow mocks in development environment
    if (!isDevelopment) return false;

    // Require explicit opt-in
    return _explicitMockMode;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // INDIVIDUAL MOCK FLAGS (Legacy Support)
  // ══════════════════════════════════════════════════════════════════════════

  // These are kept for backward compatibility but all respect useMockServices

  /// Whether to use mock auth service.
  static bool get useAuthMock => useMockServices;

  /// Whether to use mock learner service.
  static bool get useLearnerMock => useMockServices;

  /// Whether to use mock baseline service.
  static bool get useBaselineMock => useMockServices;

  /// Whether to use mock analytics service.
  static bool get useAnalyticsMock => useMockServices;

  /// Whether to use mock reports service.
  static bool get useReportsMock => useMockServices;

  /// Whether to use mock collaboration service.
  static bool get useCollaborationMock => useMockServices;

  /// Whether to use mock messaging service.
  static bool get useMessagingMock => useMockServices;

  /// Whether to use mock subscription service.
  static bool get useSubscriptionMock => useMockServices;

  /// Whether to use mock coverage profile service.
  static bool get useCoverageMock => useMockServices;

  /// Whether to use mock difficulty service.
  static bool get useDifficultyMock => useMockServices;

  /// Whether to use mock plan service.
  static bool get usePlanMock => useMockServices;

  // ══════════════════════════════════════════════════════════════════════════
  // API BASE URLS
  // ══════════════════════════════════════════════════════════════════════════

  /// Auth service base URL.
  static const String authBaseUrl = String.fromEnvironment(
    'AUTH_BASE_URL',
    defaultValue: 'http://localhost:4001',
  );

  /// Learner service base URL.
  static const String learnerBaseUrl = String.fromEnvironment(
    'LEARNER_BASE_URL',
    defaultValue: 'http://localhost:4002',
  );

  /// Baseline service base URL.
  static const String baselineBaseUrl = String.fromEnvironment(
    'BASELINE_BASE_URL',
    defaultValue: 'http://localhost:4003',
  );

  /// API gateway base URL.
  static const String apiBaseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'http://localhost:4004',
  );

  /// Analytics service base URL.
  static const String analyticsBaseUrl = String.fromEnvironment(
    'ANALYTICS_BASE_URL',
    defaultValue: 'http://localhost:4030',
  );

  /// Reports service base URL.
  static const String reportsBaseUrl = String.fromEnvironment(
    'REPORTS_BASE_URL',
    defaultValue: 'http://localhost:4050',
  );

  /// Billing service base URL.
  static const String billingBaseUrl = String.fromEnvironment(
    'BILLING_BASE_URL',
    defaultValue: 'http://localhost:4060',
  );

  /// Payments service base URL.
  static const String paymentsBaseUrl = String.fromEnvironment(
    'PAYMENTS_BASE_URL',
    defaultValue: 'http://localhost:4070',
  );

  /// Entitlements service base URL.
  static const String entitlementsBaseUrl = String.fromEnvironment(
    'ENTITLEMENTS_BASE_URL',
    defaultValue: 'http://localhost:4080',
  );

  /// Collaboration service base URL.
  static const String collaborationBaseUrl = String.fromEnvironment(
    'COLLABORATION_BASE_URL',
    defaultValue: 'http://localhost:3020',
  );

  /// Parent API base URL.
  static const String parentApiBaseUrl = String.fromEnvironment(
    'PARENT_API_BASE_URL',
    defaultValue: 'http://localhost:3010',
  );

  /// Learner model (virtual brain) service base URL.
  static const String learnerModelBaseUrl = String.fromEnvironment(
    'LEARNER_MODEL_BASE_URL',
    defaultValue: 'http://localhost:4015',
  );

  /// Messaging API base URL.
  static const String messagingBaseUrl = String.fromEnvironment(
    'MESSAGING_API_URL',
    defaultValue: 'https://api.aivo.app',
  );
  /// Home activities service base URL.
  static const String homeActivitiesBaseUrl = String.fromEnvironment(
    'HOME_ACTIVITIES_BASE_URL',
    defaultValue: 'https://api.aivo.app/home-activities',
  );
  // ══════════════════════════════════════════════════════════════════════════
  // VALIDATION
  // ══════════════════════════════════════════════════════════════════════════

  /// Validates environment configuration.
  ///
  /// Should be called at app startup to catch misconfigurations early.
  /// Throws [EnvironmentConfigException] if validation fails.
  static void validate() {
    // In production, ensure mock mode is NOT enabled
    if (isProduction && _explicitMockMode) {
      throw const EnvironmentConfigException(
        'ENABLE_MOCK_MODE cannot be set in production environment. '
        'This is a security violation.',
      );
    }

    // Warn in debug mode if mocks are enabled
    if (useMockServices) {
      debugPrint('⚠️ WARNING: Mock services are enabled. '
          'App is using mock data instead of real APIs.');
    }

    // Log configuration in debug mode
    if (kDebugMode) {
      debugPrint('📱 Environment: $current');
      debugPrint(
          '📱 Mock services: ${useMockServices ? "ENABLED" : "disabled"}');
      debugPrint('📱 Auth URL: $authBaseUrl');
      debugPrint('📱 API URL: $apiBaseUrl');
    }
  }

  /// Returns a summary of the current configuration for logging.
  static Map<String, dynamic> toDebugMap() {
    return {
      'environment': current.name,
      'isDevelopment': isDevelopment,
      'isStaging': isStaging,
      'isProduction': isProduction,
      'useMockServices': useMockServices,
      'kDebugMode': kDebugMode,
      'explicitMockMode': _explicitMockMode,
      'authBaseUrl': authBaseUrl,
      'apiBaseUrl': apiBaseUrl,
    };
  }
}

/// Exception thrown when environment configuration is invalid.
class EnvironmentConfigException implements Exception {
  const EnvironmentConfigException(this.message);

  final String message;

  @override
  String toString() => 'EnvironmentConfigException: $message';
}
