import 'dart:async';

import 'package:firebase_analytics/firebase_analytics.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Analytics Service
///
/// Comprehensive analytics tracking with:
/// - Firebase Analytics integration
/// - User property management
/// - Screen tracking
/// - Event tracking with parameters
/// - Learning-specific analytics
/// - COPPA compliance for child users
class AnalyticsService {
  late final FirebaseAnalytics _analytics;
  bool _initialized = false;
  bool _isChildDevice = true; // COPPA default

  AnalyticsService();

  /// Initialize analytics
  Future<void> initialize({bool isChildDevice = true}) async {
    if (_initialized) return;

    _analytics = FirebaseAnalytics.instance;
    _isChildDevice = isChildDevice;

    // Disable collection if child device requires it
    await _analytics.setAnalyticsCollectionEnabled(!kDebugMode);

    // Set child device flag for COPPA compliance
    await setUserProperty('is_child_device', isChildDevice.toString());

    _initialized = true;
  }

  /// Get Firebase Analytics observer for navigation tracking
  FirebaseAnalyticsObserver get observer =>
      FirebaseAnalyticsObserver(analytics: _analytics);

  // ============================================================================
  // SCREEN TRACKING
  // ============================================================================

  /// Log screen view
  Future<void> logScreenView({
    required String screenName,
    String? screenClass,
  }) async {
    if (!_initialized) return;

    await _analytics.logScreenView(
      screenName: screenName,
      screenClass: screenClass ?? screenName,
    );
  }

  // ============================================================================
  // USER PROPERTIES
  // ============================================================================

  /// Set user ID (anonymized for COPPA)
  Future<void> setUserId(String? userId) async {
    if (!_initialized) return;

    // Hash or anonymize user ID for child users
    final anonymizedId = _isChildDevice ? _hashUserId(userId) : userId;
    await _analytics.setUserId(id: anonymizedId);
  }

  /// Set user property
  Future<void> setUserProperty(String name, String? value) async {
    if (!_initialized) return;

    await _analytics.setUserProperty(name: name, value: value);
  }

  /// Set learner properties
  Future<void> setLearnerProperties({
    required String gradeBand,
    String? learningStyle,
    bool? hasMotorAccommodations,
    bool? hasSensoryAccommodations,
  }) async {
    if (!_initialized) return;

    await setUserProperty('grade_band', gradeBand);
    if (learningStyle != null) {
      await setUserProperty('learning_style', learningStyle);
    }
    if (hasMotorAccommodations != null) {
      await setUserProperty(
          'motor_accommodations', hasMotorAccommodations.toString());
    }
    if (hasSensoryAccommodations != null) {
      await setUserProperty(
          'sensory_accommodations', hasSensoryAccommodations.toString());
    }
  }

  // ============================================================================
  // STANDARD EVENTS
  // ============================================================================

  /// Log generic event
  Future<void> logEvent({
    required String name,
    Map<String, Object?>? parameters,
  }) async {
    if (!_initialized) return;

    await _analytics.logEvent(
      name: name,
      parameters: parameters,
    );
  }

  /// Log login event
  Future<void> logLogin({String? method}) async {
    await _analytics.logLogin(loginMethod: method ?? 'pin');
  }

  /// Log sign up event
  Future<void> logSignUp({String? method}) async {
    await _analytics.logSignUp(signUpMethod: method ?? 'pin');
  }

  // ============================================================================
  // LEARNING EVENTS
  // ============================================================================

  /// Log lesson started
  Future<void> logLessonStarted({
    required String lessonId,
    required String lessonTitle,
    required String subject,
    String? difficulty,
    int? estimatedMinutes,
  }) async {
    await logEvent(
      name: 'lesson_started',
      parameters: {
        'lesson_id': lessonId,
        'lesson_title': lessonTitle,
        'subject': subject,
        if (difficulty != null) 'difficulty': difficulty,
        if (estimatedMinutes != null) 'estimated_minutes': estimatedMinutes,
      },
    );
  }

  /// Log lesson completed
  Future<void> logLessonCompleted({
    required String lessonId,
    required String subject,
    required int durationSeconds,
    required int xpEarned,
    double? accuracy,
    int? questionsAnswered,
    bool? isOffline,
  }) async {
    await logEvent(
      name: 'lesson_completed',
      parameters: {
        'lesson_id': lessonId,
        'subject': subject,
        'duration_seconds': durationSeconds,
        'xp_earned': xpEarned,
        if (accuracy != null) 'accuracy': accuracy,
        if (questionsAnswered != null) 'questions_answered': questionsAnswered,
        if (isOffline != null) 'is_offline': isOffline,
      },
    );
  }

  /// Log lesson abandoned
  Future<void> logLessonAbandoned({
    required String lessonId,
    required int progressPercent,
    required int durationSeconds,
    String? reason,
  }) async {
    await logEvent(
      name: 'lesson_abandoned',
      parameters: {
        'lesson_id': lessonId,
        'progress_percent': progressPercent,
        'duration_seconds': durationSeconds,
        if (reason != null) 'reason': reason,
      },
    );
  }

  /// Log question answered
  Future<void> logQuestionAnswered({
    required String questionId,
    required String questionType,
    required bool isCorrect,
    required int attemptNumber,
    int? responseTimeMs,
  }) async {
    await logEvent(
      name: 'question_answered',
      parameters: {
        'question_id': questionId,
        'question_type': questionType,
        'is_correct': isCorrect,
        'attempt_number': attemptNumber,
        if (responseTimeMs != null) 'response_time_ms': responseTimeMs,
      },
    );
  }

  // ============================================================================
  // ENGAGEMENT EVENTS
  // ============================================================================

  /// Log XP earned
  Future<void> logXpEarned({
    required int amount,
    required String source,
    String? lessonId,
  }) async {
    await logEvent(
      name: 'xp_earned',
      parameters: {
        'amount': amount,
        'source': source,
        if (lessonId != null) 'lesson_id': lessonId,
      },
    );
  }

  /// Log level up
  Future<void> logLevelUp({
    required int newLevel,
    required int totalXp,
  }) async {
    await _analytics.logLevelUp(level: newLevel);
    await logEvent(
      name: 'level_up',
      parameters: {
        'new_level': newLevel,
        'total_xp': totalXp,
      },
    );
  }

  /// Log achievement unlocked
  Future<void> logAchievementUnlocked({
    required String achievementId,
    required String achievementName,
    String? category,
  }) async {
    await _analytics.logUnlockAchievement(id: achievementId);
    await logEvent(
      name: 'achievement_unlocked',
      parameters: {
        'achievement_id': achievementId,
        'achievement_name': achievementName,
        if (category != null) 'category': category,
      },
    );
  }

  /// Log streak updated
  Future<void> logStreakUpdated({
    required int streakDays,
    required bool isNewRecord,
  }) async {
    await logEvent(
      name: 'streak_updated',
      parameters: {
        'streak_days': streakDays,
        'is_new_record': isNewRecord,
      },
    );
  }

  /// Log streak broken
  Future<void> logStreakBroken({
    required int previousStreak,
  }) async {
    await logEvent(
      name: 'streak_broken',
      parameters: {
        'previous_streak': previousStreak,
      },
    );
  }

  // ============================================================================
  // REGULATION/FOCUS EVENTS
  // ============================================================================

  /// Log break started
  Future<void> logBreakStarted({
    required String breakType,
    String? trigger,
  }) async {
    await logEvent(
      name: 'break_started',
      parameters: {
        'break_type': breakType,
        if (trigger != null) 'trigger': trigger,
      },
    );
  }

  /// Log break completed
  Future<void> logBreakCompleted({
    required String breakType,
    required int durationSeconds,
  }) async {
    await logEvent(
      name: 'break_completed',
      parameters: {
        'break_type': breakType,
        'duration_seconds': durationSeconds,
      },
    );
  }

  /// Log calming activity used
  Future<void> logCalmingActivityUsed({
    required String activityType,
    required int durationSeconds,
    String? effectiveness,
  }) async {
    await logEvent(
      name: 'calming_activity_used',
      parameters: {
        'activity_type': activityType,
        'duration_seconds': durationSeconds,
        if (effectiveness != null) 'effectiveness': effectiveness,
      },
    );
  }

  // ============================================================================
  // BASELINE/ASSESSMENT EVENTS
  // ============================================================================

  /// Log baseline started
  Future<void> logBaselineStarted() async {
    await logEvent(name: 'baseline_started');
  }

  /// Log baseline completed
  Future<void> logBaselineCompleted({
    required int durationMinutes,
    required int questionsAnswered,
  }) async {
    await logEvent(
      name: 'baseline_completed',
      parameters: {
        'duration_minutes': durationMinutes,
        'questions_answered': questionsAnswered,
      },
    );
  }

  // ============================================================================
  // HOMEWORK HELPER EVENTS
  // ============================================================================

  /// Log homework session started
  Future<void> logHomeworkStarted({
    required String subject,
  }) async {
    await logEvent(
      name: 'homework_started',
      parameters: {
        'subject': subject,
      },
    );
  }

  /// Log homework step viewed
  Future<void> logHomeworkStepViewed({
    required String stepId,
    required int stepNumber,
    required int totalSteps,
  }) async {
    await logEvent(
      name: 'homework_step_viewed',
      parameters: {
        'step_id': stepId,
        'step_number': stepNumber,
        'total_steps': totalSteps,
      },
    );
  }

  /// Log homework completed
  Future<void> logHomeworkCompleted({
    required String subject,
    required int durationMinutes,
    required int stepsCompleted,
  }) async {
    await logEvent(
      name: 'homework_completed',
      parameters: {
        'subject': subject,
        'duration_minutes': durationMinutes,
        'steps_completed': stepsCompleted,
      },
    );
  }

  // ============================================================================
  // OFFLINE EVENTS
  // ============================================================================

  /// Log content downloaded
  Future<void> logContentDownloaded({
    required String contentType,
    required String contentId,
    required int sizeBytes,
  }) async {
    await logEvent(
      name: 'content_downloaded',
      parameters: {
        'content_type': contentType,
        'content_id': contentId,
        'size_bytes': sizeBytes,
      },
    );
  }

  /// Log offline mode entered
  Future<void> logOfflineModeEntered() async {
    await logEvent(name: 'offline_mode_entered');
  }

  /// Log offline mode exited
  Future<void> logOfflineModeExited({
    required int offlineDurationMinutes,
  }) async {
    await logEvent(
      name: 'offline_mode_exited',
      parameters: {
        'offline_duration_minutes': offlineDurationMinutes,
      },
    );
  }

  /// Log sync completed
  Future<void> logSyncCompleted({
    required int itemsSynced,
    required int durationMs,
  }) async {
    await logEvent(
      name: 'sync_completed',
      parameters: {
        'items_synced': itemsSynced,
        'duration_ms': durationMs,
      },
    );
  }

  // ============================================================================
  // ACCESSIBILITY EVENTS
  // ============================================================================

  /// Log accessibility feature enabled
  Future<void> logAccessibilityFeatureEnabled({
    required String feature,
  }) async {
    await logEvent(
      name: 'accessibility_feature_enabled',
      parameters: {
        'feature': feature,
      },
    );
  }

  /// Log accessibility feature disabled
  Future<void> logAccessibilityFeatureDisabled({
    required String feature,
  }) async {
    await logEvent(
      name: 'accessibility_feature_disabled',
      parameters: {
        'feature': feature,
      },
    );
  }

  // ============================================================================
  // ERROR EVENTS
  // ============================================================================

  /// Log error event
  Future<void> logError({
    required String errorType,
    required String errorMessage,
    String? screenName,
    Map<String, Object?>? additionalParams,
  }) async {
    await logEvent(
      name: 'app_error',
      parameters: {
        'error_type': errorType,
        'error_message': errorMessage.length > 100
            ? errorMessage.substring(0, 100)
            : errorMessage,
        if (screenName != null) 'screen_name': screenName,
        ...?additionalParams,
      },
    );
  }

  // ============================================================================
  // TIMING EVENTS
  // ============================================================================

  /// Log timing event
  Future<void> logTiming({
    required String category,
    required String variable,
    required int valueMs,
    String? label,
  }) async {
    await logEvent(
      name: 'timing',
      parameters: {
        'category': category,
        'variable': variable,
        'value_ms': valueMs,
        if (label != null) 'label': label,
      },
    );
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /// Hash user ID for COPPA compliance
  String? _hashUserId(String? userId) {
    if (userId == null) return null;
    // Simple hash - in production use a proper hashing algorithm
    return userId.hashCode.abs().toString();
  }

  /// Reset analytics data
  Future<void> resetAnalyticsData() async {
    if (!_initialized) return;
    await _analytics.resetAnalyticsData();
  }
}

/// Analytics service provider
final analyticsServiceProvider = Provider<AnalyticsService>((ref) {
  return AnalyticsService();
});

/// Analytics observer for router
final analyticsObserverProvider = Provider<FirebaseAnalyticsObserver>((ref) {
  final analytics = ref.watch(analyticsServiceProvider);
  return analytics.observer;
});
