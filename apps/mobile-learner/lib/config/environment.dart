/// Environment Configuration for Mobile Learner App
///
/// Centralizes all environment-related configuration including:
/// - Environment detection (development, staging, production)
/// - Mock service flags
/// - API base URLs
///
/// All mock flags default to FALSE and can only be enabled in development mode.
/// This is critical for the learner app to ensure children always interact
/// with real educational content and proper authentication.
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

/// Centralized environment configuration for the Learner App.
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
  /// This ensures production builds NEVER use mock data, which is critical
  /// for the learner app where children need real educational content.
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

  /// Whether to use mock auth/PIN service.
  static bool get useAuthMock => useMockServices;

  /// Whether to use mock learner service.
  static bool get useLearnerMock => useMockServices;

  /// Whether to use mock baseline service.
  static bool get useBaselineMock => useMockServices;

  /// Whether to use mock plan service.
  static bool get usePlanMock => useMockServices;

  /// Whether to use mock homework service.
  static bool get useHomeworkMock => useMockServices;

  /// Whether to use mock game library service.
  static bool get useGameMock => useMockServices;

  /// Whether to use mock focus service.
  static bool get useFocusMock => useMockServices;

  /// Whether to use mock executive function service.
  static bool get useEFMock => useMockServices;

  /// Whether to use mock writing assistant service.
  static bool get useWritingMock => useMockServices;

  /// Whether to use mock predictability service.
  static bool get usePredictabilityMock => useMockServices;

  /// Whether to use mock transition service.
  static bool get useTransitionMock => useMockServices;

  /// Whether to use mock analytics service.
  static bool get useAnalyticsMock => useMockServices;

  /// Whether to use mock reading tools service.
  static bool get useReadingMock => useMockServices;

  /// Whether to use mock SEL service.
  static bool get useSELMock => useMockServices;

  /// Whether to use mock social stories service.
  static bool get useSocialStoriesMock => useMockServices;

  /// Whether to use mock motor skills service.
  static bool get useMotorSkillsMock => useMockServices;

  /// Whether to use mock study skills service.
  static bool get useStudySkillsMock => useMockServices;

  /// Whether to use mock visual learning service.
  static bool get useVisualLearningMock => useMockServices;

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

  /// Learner model (virtual brain) service base URL.
  static const String learnerModelBaseUrl = String.fromEnvironment(
    'LEARNER_MODEL_BASE_URL',
    defaultValue: 'http://localhost:4015',
  );

  /// AI orchestrator base URL.
  static const String aiOrchestratorBaseUrl = String.fromEnvironment(
    'AI_ORCHESTRATOR_BASE_URL',
    defaultValue: 'http://localhost:4020',
  );

  /// Session service base URL.
  static const String sessionBaseUrl = String.fromEnvironment(
    'SESSION_BASE_URL',
    defaultValue: 'http://localhost:4020',
  );

  /// Homework helper service base URL.
  static const String homeworkHelperBaseUrl = String.fromEnvironment(
    'HOMEWORK_HELPER_BASE_URL',
    defaultValue: 'http://localhost:4025',
  );

  /// Focus service base URL.
  static const String focusBaseUrl = String.fromEnvironment(
    'FOCUS_BASE_URL',
    defaultValue: 'http://localhost:4026',
  );

  /// Analytics service base URL.
  static const String analyticsBaseUrl = String.fromEnvironment(
    'ANALYTICS_BASE_URL',
    defaultValue: 'http://localhost:4030',
  );

  /// Game library service base URL.
  static const String gameLibraryBaseUrl = String.fromEnvironment(
    'GAME_LIBRARY_BASE_URL',
    defaultValue: 'http://localhost:4030',
  );

  /// Executive function service base URL.
  static const String executiveFunctionBaseUrl = String.fromEnvironment(
    'EXECUTIVE_FUNCTION_BASE_URL',
    defaultValue: 'http://localhost:4031',
  );

  /// Reading tools service base URL (uses embedded-tools-svc).
  static const String readingToolsBaseUrl = String.fromEnvironment(
    'READING_TOOLS_BASE_URL',
    defaultValue: 'http://localhost:4022',
  );

  /// Gamification service base URL.
  static const String gamificationBaseUrl = String.fromEnvironment(
    'GAMIFICATION_BASE_URL',
    defaultValue: 'http://localhost:4035',
  );

  /// SEL (Social-Emotional Learning) service base URL.
  static const String selBaseUrl = String.fromEnvironment(
    'SEL_BASE_URL',
    defaultValue: 'http://localhost:4036',
  );

  /// Social Stories service base URL.
  static const String socialStoriesBaseUrl = String.fromEnvironment(
    'SOCIAL_STORIES_BASE_URL',
    defaultValue: 'http://localhost:4037',
  );

  /// Motor Skills service base URL.
  static const String motorSkillsBaseUrl = String.fromEnvironment(
    'MOTOR_SKILLS_BASE_URL',
    defaultValue: 'http://localhost:4038',
  );

  /// Study Skills service base URL.
  static const String studySkillsBaseUrl = String.fromEnvironment(
    'STUDY_SKILLS_BASE_URL',
    defaultValue: 'http://localhost:4039',
  );

  /// Visual Learning service base URL.
  static const String visualLearningBaseUrl = String.fromEnvironment(
    'VISUAL_LEARNING_BASE_URL',
    defaultValue: 'http://localhost:4040',
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
        'This is a security violation for child authentication.',
      );
    }

    // Warn in debug mode if mocks are enabled
    if (useMockServices) {
      debugPrint('⚠️ WARNING: Mock services are enabled. '
          'Learner app is using mock data instead of real APIs.');
    }

    // Log configuration in debug mode
    if (kDebugMode) {
      debugPrint('🎒 Environment: $current');
      debugPrint('🎒 Mock services: ${useMockServices ? "ENABLED" : "disabled"}');
      debugPrint('🎒 Auth URL: $authBaseUrl');
      debugPrint('🎒 Learner URL: $learnerBaseUrl');
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
      'learnerBaseUrl': learnerBaseUrl,
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
