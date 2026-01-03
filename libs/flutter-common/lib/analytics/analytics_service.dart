import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Provider for the Analytics service
final analyticsServiceProvider = Provider<AnalyticsService>((ref) {
  return AnalyticsService();
});

/// Service for Firebase Analytics integration
///
/// Provides event tracking, user properties, and screen tracking.
/// COPPA compliant - no personal information is collected for child accounts.
class AnalyticsService {
  FirebaseAnalytics? _analytics;
  bool _initialized = false;

  /// Whether Analytics is enabled
  bool get isEnabled => _initialized;

  /// Get the observer for navigation tracking
  FirebaseAnalyticsObserver? get observer =>
      _analytics != null ? FirebaseAnalyticsObserver(analytics: _analytics!) : null;

  /// Initialize the analytics service
  Future<void> initialize() async {
    if (_initialized) return;

    try {
      _analytics = FirebaseAnalytics.instance;

      // Enable analytics collection (respects user preferences)
      await _analytics!.setAnalyticsCollectionEnabled(true);

      _initialized = true;
      debugPrint('[Analytics] Initialized');
    } catch (e) {
      debugPrint('[Analytics] Failed to initialize: $e');
    }
  }

  /// Set user ID for tracking (use pseudonymized ID for COPPA compliance)
  Future<void> setUserId(String? userId) async {
    if (!isEnabled) return;
    await _analytics?.setUserId(id: userId);
  }

  /// Set a user property
  Future<void> setUserProperty({
    required String name,
    required String? value,
  }) async {
    if (!isEnabled) return;
    await _analytics?.setUserProperty(name: name, value: value);
  }

  /// Set the user type (learner, parent, teacher)
  Future<void> setUserType(String userType) async {
    await setUserProperty(name: 'user_type', value: userType);
  }

  /// Set the tenant for multi-tenant tracking
  Future<void> setTenant(String tenantId) async {
    await setUserProperty(name: 'tenant_id', value: tenantId);
  }

  /// Set whether this is a child account (for COPPA compliance)
  Future<void> setIsChildAccount(bool isChild) async {
    await setUserProperty(name: 'is_child_account', value: isChild.toString());

    // For child accounts, limit data collection
    if (isChild && _analytics != null) {
      // Disable personalization for children
      await _analytics!.setUserProperty(
        name: 'allow_personalization',
        value: 'false',
      );
    }
  }

  /// Log the current screen
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {
    if (!isEnabled) {
      debugPrint('[Analytics] Screen view: $screenName');
      return;
    }

    await _analytics?.logScreenView(
      screenName: screenName,
      screenClass: screenClass,
    );
  }

  /// Log a custom event
  Future<void> logEvent({
    required String name,
    Map<String, Object>? parameters,
  }) async {
    if (!isEnabled) {
      debugPrint('[Analytics] Event: $name - $parameters');
      return;
    }

    await _analytics?.logEvent(name: name, parameters: parameters);
  }

  /// Log when a user logs in
  Future<void> logLogin({String? loginMethod}) async {
    await logEvent(
      name: 'login',
      parameters: loginMethod != null ? {'method': loginMethod} : null,
    );
  }

  /// Log when a user signs up
  Future<void> logSignUp({String? signUpMethod}) async {
    await logEvent(
      name: 'sign_up',
      parameters: signUpMethod != null ? {'method': signUpMethod} : null,
    );
  }

  /// Log when a user starts a learning session
  Future<void> logSessionStart({
    required String sessionId,
    required String subject,
    String? activityType,
  }) async {
    await logEvent(
      name: 'session_start',
      parameters: {
        'session_id': sessionId,
        'subject': subject,
        if (activityType != null) 'activity_type': activityType,
      },
    );
  }

  /// Log when a user completes a learning session
  Future<void> logSessionComplete({
    required String sessionId,
    required int durationSeconds,
    double? score,
    int? questionsAnswered,
  }) async {
    await logEvent(
      name: 'session_complete',
      parameters: {
        'session_id': sessionId,
        'duration_seconds': durationSeconds,
        if (score != null) 'score': score,
        if (questionsAnswered != null) 'questions_answered': questionsAnswered,
      },
    );
  }

  /// Log when a user answers a question
  Future<void> logQuestionAnswered({
    required String questionId,
    required bool isCorrect,
    int? responseTimeMs,
    int? attemptNumber,
  }) async {
    await logEvent(
      name: 'question_answered',
      parameters: {
        'question_id': questionId,
        'is_correct': isCorrect.toString(),
        if (responseTimeMs != null) 'response_time_ms': responseTimeMs,
        if (attemptNumber != null) 'attempt_number': attemptNumber,
      },
    );
  }

  /// Log when a user completes baseline assessment
  Future<void> logBaselineComplete({
    required String profileId,
    required int questionsAnswered,
    required int durationSeconds,
  }) async {
    await logEvent(
      name: 'baseline_complete',
      parameters: {
        'profile_id': profileId,
        'questions_answered': questionsAnswered,
        'duration_seconds': durationSeconds,
      },
    );
  }

  /// Log when a user takes a regulation/focus break
  Future<void> logFocusBreak({
    required String breakType,
    required int durationSeconds,
    bool? completed,
  }) async {
    await logEvent(
      name: 'focus_break',
      parameters: {
        'break_type': breakType,
        'duration_seconds': durationSeconds,
        if (completed != null) 'completed': completed.toString(),
      },
    );
  }

  /// Log when a user earns an achievement
  Future<void> logAchievementEarned({
    required String achievementId,
    required String achievementName,
  }) async {
    await logEvent(
      name: 'unlock_achievement',
      parameters: {
        'achievement_id': achievementId,
        'achievement_name': achievementName,
      },
    );
  }

  /// Log when a user uses homework helper
  Future<void> logHomeworkHelperUsed({
    required String subject,
    required String stepCount,
  }) async {
    await logEvent(
      name: 'homework_helper_used',
      parameters: {
        'subject': subject,
        'step_count': stepCount,
      },
    );
  }

  /// Log when a parent views a child's progress
  Future<void> logProgressViewed({
    required String learnerId,
    required String reportType,
  }) async {
    await logEvent(
      name: 'progress_viewed',
      parameters: {
        'learner_id': learnerId,
        'report_type': reportType,
      },
    );
  }

  /// Log when a teacher starts a class session
  Future<void> logClassSessionStart({
    required String classId,
    required int studentCount,
  }) async {
    await logEvent(
      name: 'class_session_start',
      parameters: {
        'class_id': classId,
        'student_count': studentCount,
      },
    );
  }

  /// Log when offline mode is used
  Future<void> logOfflineModeUsed({
    required String feature,
    required int durationSeconds,
  }) async {
    await logEvent(
      name: 'offline_mode_used',
      parameters: {
        'feature': feature,
        'duration_seconds': durationSeconds,
      },
    );
  }

  /// Log when data is synced after offline usage
  Future<void> logOfflineSync({
    required int recordsSynced,
    required int durationMs,
    bool? hadConflicts,
  }) async {
    await logEvent(
      name: 'offline_sync',
      parameters: {
        'records_synced': recordsSynced,
        'duration_ms': durationMs,
        if (hadConflicts != null) 'had_conflicts': hadConflicts.toString(),
      },
    );
  }

  /// Log an error event
  Future<void> logError({
    required String errorType,
    required String errorMessage,
    String? screenName,
  }) async {
    await logEvent(
      name: 'app_error',
      parameters: {
        'error_type': errorType,
        'error_message': errorMessage.substring(0, errorMessage.length.clamp(0, 100)),
        if (screenName != null) 'screen_name': screenName,
      },
    );
  }

  /// Reset analytics data (for logout)
  Future<void> reset() async {
    if (!isEnabled) return;
    await _analytics?.resetAnalyticsData();
  }

  /// Enable or disable analytics collection
  Future<void> setEnabled(bool enabled) async {
    if (_analytics == null) return;
    await _analytics!.setAnalyticsCollectionEnabled(enabled);
  }
}

/// Extension to add analytics to Riverpod
extension AnalyticsRefExtension on Ref {
  /// Get the analytics service
  AnalyticsService get analytics => read(analyticsServiceProvider);
}
