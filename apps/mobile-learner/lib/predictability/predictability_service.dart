import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'predictability_models.dart';

const _baseUrl = String.fromEnvironment('SESSION_BASE_URL', defaultValue: 'http://localhost:4020');
const _usePredictabilityMock = bool.fromEnvironment('USE_PREDICTABILITY_MOCK', defaultValue: false);

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for the predictability service.
final predictabilityServiceProvider = Provider<PredictabilityService>((ref) {
  return PredictabilityService();
});

/// Provider for checking if predictability is required for a learner.
final requiresPredictabilityProvider = FutureProvider.family<bool, ({String tenantId, String learnerId})>(
  (ref, params) async {
    final service = ref.read(predictabilityServiceProvider);
    return service.requiresPredictability(params.tenantId, params.learnerId);
  },
);

/// Provider for predictability preferences.
final predictabilityPreferencesProvider = FutureProvider.family<PredictabilityPreferences, ({String tenantId, String learnerId})>(
  (ref, params) async {
    final service = ref.read(predictabilityServiceProvider);
    return service.getPreferences(params.tenantId, params.learnerId);
  },
);

/// Provider for the current session plan.
final sessionPlanProvider = StateNotifierProvider.family<SessionPlanNotifier, AsyncValue<PredictableSessionPlan?>, ({String tenantId, String planId})>(
  (ref, params) {
    return SessionPlanNotifier(ref, params.tenantId, params.planId);
  },
);

// ═══════════════════════════════════════════════════════════════════════════════
// NOTIFIERS
// ═══════════════════════════════════════════════════════════════════════════════

/// State notifier for managing session plan state.
class SessionPlanNotifier extends StateNotifier<AsyncValue<PredictableSessionPlan?>> {
  SessionPlanNotifier(this._ref, this._tenantId, this._planId) : super(const AsyncValue.loading()) {
    _loadPlan();
  }

  final Ref _ref;
  final String _tenantId;
  final String _planId;

  Future<void> _loadPlan() async {
    state = const AsyncValue.loading();
    try {
      final service = _ref.read(predictabilityServiceProvider);
      final plan = await service.getSessionPlan(_tenantId, _planId);
      state = AsyncValue.data(plan);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Update progress to a new current item.
  Future<void> updateProgress(String currentItemId) async {
    final currentPlan = state.valueOrNull;
    if (currentPlan == null) return;

    try {
      final service = _ref.read(predictabilityServiceProvider);
      final updatedPlan = await service.updateProgress(_tenantId, _planId, currentItemId);
      if (updatedPlan != null) {
        state = AsyncValue.data(updatedPlan);
      }
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Refresh the plan from the server.
  Future<void> refresh() => _loadPlan();
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for predictability API calls.
class PredictabilityService {
  final Dio _dio = Dio(BaseOptions(
    baseUrl: _baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 10),
  ));

  /// Check if predictability is required for a learner.
  Future<bool> requiresPredictability(String tenantId, String learnerId) async {
    if (_usePredictabilityMock) {
      // Mock: return true for testing
      return Future.delayed(const Duration(milliseconds: 100), () => true);
    }

    try {
      final response = await _dio.get(
        '/predictability/check',
        queryParameters: {'tenantId': tenantId, 'learnerId': learnerId},
      );
      return response.data['requiresPredictability'] as bool? ?? false;
    } catch (e) {
      return false;
    }
  }

  /// Get predictability preferences for a learner.
  Future<PredictabilityPreferences> getPreferences(String tenantId, String learnerId) async {
    if (_usePredictabilityMock) {
      return Future.delayed(
        const Duration(milliseconds: 100),
        () => PredictabilityPreferences.defaultPreferences,
      );
    }

    try {
      final response = await _dio.get(
        '/predictability/preferences',
        queryParameters: {'tenantId': tenantId, 'learnerId': learnerId},
      );
      return PredictabilityPreferences.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return PredictabilityPreferences.defaultPreferences;
    }
  }

  /// Update predictability preferences.
  Future<PredictabilityPreferences> updatePreferences(
    String tenantId,
    String learnerId,
    PredictabilityPreferences preferences,
  ) async {
    if (_usePredictabilityMock) {
      return Future.delayed(const Duration(milliseconds: 100), () => preferences);
    }

    final response = await _dio.put(
      '/predictability/preferences',
      data: {
        'tenantId': tenantId,
        'learnerId': learnerId,
        ...preferences.toJson(),
      },
    );
    return PredictabilityPreferences.fromJson(response.data as Map<String, dynamic>);
  }

  /// Create a predictable session plan.
  Future<PredictableSessionPlan> createSessionPlan({
    required String tenantId,
    required String sessionId,
    required String learnerId,
    required List<Map<String, dynamic>> activities,
    String structureType = 'default',
  }) async {
    if (_usePredictabilityMock) {
      return Future.delayed(
        const Duration(milliseconds: 200),
        () => _mockSessionPlan(sessionId, learnerId, activities),
      );
    }

    final response = await _dio.post(
      '/predictability/plans',
      data: {
        'tenantId': tenantId,
        'sessionId': sessionId,
        'learnerId': learnerId,
        'activities': activities,
        'structureType': structureType,
      },
    );
    return PredictableSessionPlan.fromJson(response.data as Map<String, dynamic>);
  }

  /// Get a session plan by ID.
  Future<PredictableSessionPlan?> getSessionPlan(String tenantId, String planId) async {
    if (_usePredictabilityMock) {
      return Future.delayed(
        const Duration(milliseconds: 100),
        () => _mockSessionPlan('session-1', 'learner-1', []),
      );
    }

    try {
      final response = await _dio.get(
        '/predictability/plans/$planId',
        queryParameters: {'tenantId': tenantId},
      );
      return PredictableSessionPlan.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Update session progress.
  Future<PredictableSessionPlan?> updateProgress(
    String tenantId,
    String planId,
    String currentItemId,
  ) async {
    if (_usePredictabilityMock) {
      return Future.delayed(
        const Duration(milliseconds: 100),
        () => _mockSessionPlan('session-1', 'learner-1', []),
      );
    }

    try {
      final response = await _dio.patch(
        '/predictability/plans/$planId/progress',
        data: {
          'tenantId': tenantId,
          'currentItemId': currentItemId,
        },
      );
      return PredictableSessionPlan.fromJson(response.data as Map<String, dynamic>);
    } catch (e) {
      return null;
    }
  }

  /// Get a routine by type.
  Future<SessionRoutine?> getRoutine(
    String tenantId,
    String learnerId,
    RoutineType routineType,
  ) async {
    if (_usePredictabilityMock) {
      return Future.delayed(
        const Duration(milliseconds: 100),
        () => _mockRoutine(routineType),
      );
    }

    try {
      final response = await _dio.get(
        '/predictability/routines',
        queryParameters: {
          'tenantId': tenantId,
          'learnerId': learnerId,
          'routineType': routineType.code,
        },
      );
      final routineData = response.data['routine'];
      if (routineData != null) {
        return SessionRoutine.fromJson(routineData as Map<String, dynamic>);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  /// Report anxiety during a session.
  Future<AnxietyReportResult> reportAnxiety({
    required String tenantId,
    required String sessionId,
    required String learnerId,
    required AnxietyLevel level,
    String? triggerCategory,
    String? triggerId,
  }) async {
    if (_usePredictabilityMock) {
      return Future.delayed(
        const Duration(milliseconds: 100),
        () => AnxietyReportResult(
          logged: true,
          level: level,
          supportActions: ['Take deep breaths', 'Use the calming corner'],
          calmingMessage: "It's okay to feel worried. Let's take a break.",
          recommendedRoutine: _mockRoutine(RoutineType.calming),
        ),
      );
    }

    final response = await _dio.post(
      '/predictability/anxiety',
      data: {
        'tenantId': tenantId,
        'sessionId': sessionId,
        'learnerId': learnerId,
        'level': level.code,
        if (triggerCategory != null) 'triggerCategory': triggerCategory,
        if (triggerId != null) 'triggerId': triggerId,
      },
    );
    return AnxietyReportResult.fromJson(response.data as Map<String, dynamic>);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK DATA
  // ═══════════════════════════════════════════════════════════════════════════

  PredictableSessionPlan _mockSessionPlan(
    String sessionId,
    String learnerId,
    List<Map<String, dynamic>> activities,
  ) {
    return PredictableSessionPlan(
      id: 'plan-${DateTime.now().millisecondsSinceEpoch}',
      sessionId: sessionId,
      learnerId: learnerId,
      outline: [
        const SessionOutlineItem(
          id: 'welcome',
          title: 'Welcome!',
          type: 'routine',
          estimatedMinutes: 2,
          status: OutlineItemStatus.completed,
          icon: 'waving_hand',
          color: '#4CAF50',
        ),
        const SessionOutlineItem(
          id: 'checkin',
          title: 'How are you feeling?',
          type: 'routine',
          estimatedMinutes: 2,
          status: OutlineItemStatus.current,
          icon: 'mood',
          color: '#2196F3',
        ),
        const SessionOutlineItem(
          id: 'activity_1',
          title: 'Math Practice',
          type: 'activity',
          estimatedMinutes: 10,
          status: OutlineItemStatus.upcoming,
          icon: 'calculate',
          color: '#3F51B5',
        ),
        const SessionOutlineItem(
          id: 'break_1',
          title: 'Quick Break',
          type: 'break',
          estimatedMinutes: 2,
          status: OutlineItemStatus.upcoming,
          icon: 'self_improvement',
          color: '#8BC34A',
        ),
        const SessionOutlineItem(
          id: 'activity_2',
          title: 'Reading Time',
          type: 'activity',
          estimatedMinutes: 10,
          status: OutlineItemStatus.upcoming,
          icon: 'auto_stories',
          color: '#009688',
        ),
        const SessionOutlineItem(
          id: 'goodbye',
          title: 'All Done!',
          type: 'routine',
          estimatedMinutes: 2,
          status: OutlineItemStatus.upcoming,
          icon: 'celebration',
          color: '#FFD700',
        ),
      ],
      currentPhase: SessionPhase.checkin,
      currentItemIndex: 1,
      totalMinutes: 28,
      completedMinutes: 2,
      progressPercent: 7,
      welcomeRoutine: _mockRoutine(RoutineType.welcome),
      goodbyeRoutine: _mockRoutine(RoutineType.goodbye),
      breakRoutine: _mockRoutine(RoutineType.breakRoutine),
    );
  }

  SessionRoutine _mockRoutine(RoutineType type) {
    switch (type) {
      case RoutineType.welcome:
        return const SessionRoutine(
          id: 'system_welcome',
          type: RoutineType.welcome,
          name: 'Welcome Routine',
          steps: [
            RoutineStep(type: 'greeting', durationSeconds: 5, instruction: 'Wave hello!'),
            RoutineStep(type: 'breathing', durationSeconds: 15, instruction: 'Take 3 deep breaths'),
            RoutineStep(type: 'preview', durationSeconds: 10, instruction: "Let's see what we'll do today"),
          ],
          totalDurationSeconds: 30,
          iconName: 'waving_hand',
          color: '#4CAF50',
        );
      case RoutineType.goodbye:
        return const SessionRoutine(
          id: 'system_goodbye',
          type: RoutineType.goodbye,
          name: 'Goodbye Routine',
          steps: [
            RoutineStep(type: 'review', durationSeconds: 10, instruction: 'Look at what you did today!'),
            RoutineStep(type: 'celebration', durationSeconds: 10, instruction: 'Great job! 🎉'),
            RoutineStep(type: 'farewell', durationSeconds: 5, instruction: 'Wave goodbye!'),
          ],
          totalDurationSeconds: 25,
          iconName: 'celebration',
          color: '#FFD700',
        );
      case RoutineType.breakRoutine:
        return const SessionRoutine(
          id: 'system_break',
          type: RoutineType.breakRoutine,
          name: 'Break Routine',
          steps: [
            RoutineStep(type: 'movement', durationSeconds: 20, instruction: 'Stretch your arms up high!'),
            RoutineStep(type: 'breathing', durationSeconds: 15, instruction: 'Take slow, deep breaths'),
            RoutineStep(type: 'sensory', durationSeconds: 15, instruction: 'Squeeze and release your hands'),
          ],
          totalDurationSeconds: 50,
          iconName: 'self_improvement',
          color: '#8BC34A',
        );
      case RoutineType.calming:
        return const SessionRoutine(
          id: 'system_calming',
          type: RoutineType.calming,
          name: 'Calming Routine',
          steps: [
            RoutineStep(type: 'breathing', durationSeconds: 20, instruction: 'Breathe in slowly... and out...'),
            RoutineStep(type: 'grounding', durationSeconds: 15, instruction: 'Feel your feet on the floor'),
            RoutineStep(type: 'sensory', durationSeconds: 15, instruction: 'Gently squeeze a stress ball'),
            RoutineStep(type: 'affirmation', durationSeconds: 10, instruction: "You're doing great!"),
          ],
          totalDurationSeconds: 60,
          iconName: 'spa',
          color: '#7986CB',
        );
      default:
        return SessionRoutine(
          id: 'system_${type.code.toLowerCase()}',
          type: type,
          name: '${type.displayName} Routine',
          steps: const [
            RoutineStep(type: 'default', durationSeconds: 10, instruction: 'Get ready'),
          ],
          totalDurationSeconds: 10,
        );
    }
  }
}
