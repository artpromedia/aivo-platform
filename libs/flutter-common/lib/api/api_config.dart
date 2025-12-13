/// API Configuration
///
/// Centralized configuration for API endpoints and settings.
library;

/// API environment configuration.
class ApiConfig {
  const ApiConfig({
    required this.gatewayUrl,
    this.connectTimeout = const Duration(seconds: 10),
    this.receiveTimeout = const Duration(seconds: 30),
    this.sendTimeout = const Duration(seconds: 30),
  });

  /// Base URL for the API gateway (Kong).
  final String gatewayUrl;

  /// Connection timeout.
  final Duration connectTimeout;

  /// Response receive timeout.
  final Duration receiveTimeout;

  /// Request send timeout.
  final Duration sendTimeout;

  /// Development configuration.
  static const development = ApiConfig(
    gatewayUrl: 'http://localhost:8000',
  );

  /// Staging configuration.
  static const staging = ApiConfig(
    gatewayUrl: 'https://api-staging.aivo.app',
  );

  /// Production configuration.
  static const production = ApiConfig(
    gatewayUrl: 'https://api.aivo.app',
  );

  /// Get config from environment.
  factory ApiConfig.fromEnvironment() {
    const env = String.fromEnvironment('API_ENV', defaultValue: 'development');
    const customUrl = String.fromEnvironment('API_GATEWAY_URL');

    if (customUrl.isNotEmpty) {
      return ApiConfig(gatewayUrl: customUrl);
    }

    switch (env) {
      case 'production':
        return ApiConfig.production;
      case 'staging':
        return ApiConfig.staging;
      default:
        return ApiConfig.development;
    }
  }
}

/// API endpoint paths.
abstract class ApiEndpoints {
  // Auth endpoints
  static const String login = '/auth/login';
  static const String register = '/auth/register';
  static const String refreshToken = '/auth/refresh';
  static const String logout = '/auth/logout';
  static const String forgotPassword = '/auth/forgot-password';
  static const String resetPassword = '/auth/reset-password';

  // Learner endpoints
  static const String learners = '/learners';
  static String learner(String id) => '/learners/$id';
  static String learnerPlan(String id) => '/learners/$id/plan';
  static String learnerProgress(String id) => '/learners/$id/progress';
  static String learnerVirtualBrain(String id) => '/learners/$id/virtual-brain';

  // Consent endpoints
  static const String consents = '/consents';
  static String consentGrant(String learnerId) => '/consents/$learnerId/grant';
  static String consentRevoke(String learnerId) => '/consents/$learnerId/revoke';

  // Baseline endpoints
  static const String baseline = '/baseline';
  static String baselineProfile(String id) => '/baseline/profiles/$id';
  static String baselineStart(String profileId) => '/baseline/profiles/$profileId/start';
  static String baselineQuestion(String sessionId) => '/baseline/sessions/$sessionId/question';
  static String baselineAnswer(String sessionId) => '/baseline/sessions/$sessionId/answer';

  // Session endpoints
  static const String sessions = '/sessions';
  static String session(String id) => '/sessions/$id';
  static String sessionEvents(String id) => '/sessions/$id/events';

  // AI endpoints
  static const String aiExplain = '/ai/explain';
  static const String aiHint = '/ai/hint';
  static const String aiHomeworkHelp = '/ai/homework-help';

  // Focus/regulation endpoints
  static String focusCheck(String learnerId) => '/focus/$learnerId/check';
  static String focusLog(String learnerId) => '/focus/$learnerId/log';

  // Teacher endpoints
  static const String classrooms = '/classrooms';
  static String classroom(String id) => '/classrooms/$id';
  static String classroomRoster(String id) => '/classrooms/$id/roster';
  static String classroomPlan(String id) => '/classrooms/$id/plan';
  static String sessionLog(String sessionId) => '/sessions/$sessionId/log';

  // Parent messaging
  static const String messages = '/messages';
  static String messageThread(String childId) => '/messages/threads/$childId';
  static String markRead(String messageId) => '/messages/$messageId/read';

  // Subscription endpoints
  static const String subscription = '/subscription';
  static const String modules = '/subscription/modules';
}
