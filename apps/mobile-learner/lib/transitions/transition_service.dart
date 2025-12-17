import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

const _baseUrl = String.fromEnvironment('SESSION_BASE_URL', defaultValue: 'http://localhost:4020');
const _useTransitionMock = bool.fromEnvironment('USE_TRANSITION_MOCK', defaultValue: true);

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/// Visual warning countdown style.
enum VisualWarningStyle {
  circle('circle', 'Circle'),
  bar('bar', 'Progress Bar'),
  sandTimer('sand_timer', 'Sand Timer'),
  character('character', 'Character Animation');

  const VisualWarningStyle(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// Color scheme for transition warnings.
enum TransitionColorScheme {
  greenYellowRed('green_yellow_red', 'Green → Yellow → Red'),
  bluePurple('blue_purple', 'Blue → Purple'),
  highContrast('high_contrast', 'High Contrast'),
  grayscale('grayscale', 'Grayscale');

  const TransitionColorScheme(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// Audio warning types.
enum AudioWarningType {
  gentleChime('gentle_chime', 'Gentle Chime'),
  natureSound('nature_sound', 'Nature Sound'),
  musical('musical', 'Musical'),
  spoken('spoken', 'Spoken'),
  characterVoice('character_voice', 'Character Voice');

  const AudioWarningType(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// Transition routine step types.
enum RoutineStepType {
  breathing('breathing', 'Breathing'),
  movement('movement', 'Movement'),
  sensory('sensory', 'Sensory'),
  countdown('countdown', 'Countdown'),
  preview('preview', 'Preview'),
  readyCheck('ready_check', 'Ready Check');

  const RoutineStepType(this.code, this.displayName);
  final String code;
  final String displayName;
}

/// Transition outcome.
enum TransitionOutcome {
  smooth('smooth', 'Smooth'),
  successful('successful', 'Successful'),
  struggled('struggled', 'Struggled'),
  refused('refused', 'Refused'),
  timedOut('timed_out', 'Timed Out');

  const TransitionOutcome(this.code, this.displayName);
  final String code;
  final String displayName;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Activity information for First/Then board.
class ActivityInfo {
  const ActivityInfo({
    required this.id,
    required this.title,
    required this.type,
    this.thumbnailUrl,
    this.remainingSeconds,
    this.estimatedDuration,
  });

  final String id;
  final String title;
  final String type;
  final String? thumbnailUrl;
  final int? remainingSeconds;
  final int? estimatedDuration;

  factory ActivityInfo.fromJson(Map<String, dynamic> json) {
    return ActivityInfo(
      id: json['id']?.toString() ?? '',
      title: json['title']?.toString() ?? '',
      type: json['type']?.toString() ?? 'unknown',
      thumbnailUrl: json['thumbnailUrl']?.toString(),
      remainingSeconds: json['remainingSeconds'] is num
          ? (json['remainingSeconds'] as num).toInt()
          : null,
      estimatedDuration: json['estimatedDuration'] is num
          ? (json['estimatedDuration'] as num).toInt()
          : null,
    );
  }
}

/// Visual settings for transition warnings.
class TransitionVisualSettings {
  const TransitionVisualSettings({
    this.style = VisualWarningStyle.circle,
    this.colorScheme = TransitionColorScheme.greenYellowRed,
    this.showTimer = true,
    this.showText = true,
    this.animationSpeed = 'normal',
  });

  final VisualWarningStyle style;
  final TransitionColorScheme colorScheme;
  final bool showTimer;
  final bool showText;
  final String animationSpeed;

  factory TransitionVisualSettings.fromJson(Map<String, dynamic> json) {
    return TransitionVisualSettings(
      style: VisualWarningStyle.values.firstWhere(
        (s) => s.code == json['style'],
        orElse: () => VisualWarningStyle.circle,
      ),
      colorScheme: TransitionColorScheme.values.firstWhere(
        (c) => c.code == json['colorScheme'],
        orElse: () => TransitionColorScheme.greenYellowRed,
      ),
      showTimer: json['showTimer'] != false,
      showText: json['showText'] != false,
      animationSpeed: json['animationSpeed']?.toString() ?? 'normal',
    );
  }
}

/// Audio settings for transition warnings.
class TransitionAudioSettings {
  const TransitionAudioSettings({
    this.enabled = true,
    this.warningType = AudioWarningType.gentleChime,
    this.volume = 0.7,
    this.voiceType,
  });

  final bool enabled;
  final AudioWarningType warningType;
  final double volume;
  final String? voiceType;

  factory TransitionAudioSettings.fromJson(Map<String, dynamic> json) {
    return TransitionAudioSettings(
      enabled: json['enabled'] != false,
      warningType: AudioWarningType.values.firstWhere(
        (t) => t.code == json['warningType'],
        orElse: () => AudioWarningType.gentleChime,
      ),
      volume: json['volume'] is num ? (json['volume'] as num).toDouble() : 0.7,
      voiceType: json['voiceType']?.toString(),
    );
  }
}

/// Haptic settings for transition warnings.
class TransitionHapticSettings {
  const TransitionHapticSettings({
    this.enabled = true,
    this.intensity = 'medium',
    this.pattern,
  });

  final bool enabled;
  final String intensity;
  final String? pattern;

  factory TransitionHapticSettings.fromJson(Map<String, dynamic> json) {
    return TransitionHapticSettings(
      enabled: json['enabled'] != false,
      intensity: json['intensity']?.toString() ?? 'medium',
      pattern: json['pattern']?.toString(),
    );
  }
}

/// A single warning in the transition plan.
class TransitionWarning {
  const TransitionWarning({
    required this.secondsBefore,
    required this.message,
    this.showTimer = true,
    this.visualStyle,
    this.audioType,
    this.hapticPattern,
  });

  final int secondsBefore;
  final String message;
  final bool showTimer;
  final String? visualStyle;
  final String? audioType;
  final String? hapticPattern;

  factory TransitionWarning.fromJson(Map<String, dynamic> json) {
    return TransitionWarning(
      secondsBefore: json['secondsBefore'] is num
          ? (json['secondsBefore'] as num).toInt()
          : 30,
      message: json['message']?.toString() ?? '',
      showTimer: json['showTimer'] != false,
      visualStyle: json['visualStyle']?.toString(),
      audioType: json['audioType']?.toString(),
      hapticPattern: json['hapticPattern']?.toString(),
    );
  }
}

/// A step in a transition routine.
class TransitionRoutineStep {
  const TransitionRoutineStep({
    required this.id,
    required this.type,
    required this.duration,
    required this.instruction,
    this.mediaUrl,
    this.requiresCompletion = false,
  });

  final String id;
  final RoutineStepType type;
  final int duration;
  final String instruction;
  final String? mediaUrl;
  final bool requiresCompletion;

  factory TransitionRoutineStep.fromJson(Map<String, dynamic> json) {
    return TransitionRoutineStep(
      id: json['id']?.toString() ?? '',
      type: RoutineStepType.values.firstWhere(
        (t) => t.code == json['type'],
        orElse: () => RoutineStepType.breathing,
      ),
      duration: json['duration'] is num ? (json['duration'] as num).toInt() : 10,
      instruction: json['instruction']?.toString() ?? '',
      mediaUrl: json['mediaUrl']?.toString(),
      requiresCompletion: json['requiresCompletion'] == true,
    );
  }
}

/// A transition routine with multiple steps.
class TransitionRoutine {
  const TransitionRoutine({
    required this.id,
    required this.name,
    required this.steps,
    this.description,
    this.totalDuration = 0,
  });

  final String id;
  final String name;
  final String? description;
  final List<TransitionRoutineStep> steps;
  final int totalDuration;

  factory TransitionRoutine.fromJson(Map<String, dynamic> json) {
    final stepsList = json['steps'] as List<dynamic>? ?? [];
    final steps = stepsList
        .map((s) => TransitionRoutineStep.fromJson(s as Map<String, dynamic>))
        .toList();

    return TransitionRoutine(
      id: json['id']?.toString() ?? '',
      name: json['name']?.toString() ?? 'Transition',
      description: json['description']?.toString(),
      steps: steps,
      totalDuration: json['totalDuration'] is num
          ? (json['totalDuration'] as num).toInt()
          : steps.fold(0, (sum, s) => sum + s.duration),
    );
  }
}

/// First/Then board showing current and next activity.
class FirstThenBoard {
  const FirstThenBoard({
    required this.currentActivity,
    required this.nextActivity,
  });

  final ActivityInfo currentActivity;
  final ActivityInfo nextActivity;

  factory FirstThenBoard.fromJson(Map<String, dynamic> json) {
    return FirstThenBoard(
      currentActivity: ActivityInfo.fromJson(
        json['currentActivity'] as Map<String, dynamic>? ?? {},
      ),
      nextActivity: ActivityInfo.fromJson(
        json['nextActivity'] as Map<String, dynamic>? ?? {},
      ),
    );
  }
}

/// Complete transition plan from the API.
class TransitionPlan {
  const TransitionPlan({
    required this.transitionId,
    required this.totalDuration,
    required this.warnings,
    required this.visual,
    required this.audio,
    required this.haptic,
    this.routine,
    this.firstThenBoard,
    this.requireAcknowledgment = true,
    this.allowSkip = false,
  });

  final String transitionId;
  final int totalDuration;
  final List<TransitionWarning> warnings;
  final TransitionVisualSettings visual;
  final TransitionAudioSettings audio;
  final TransitionHapticSettings haptic;
  final TransitionRoutine? routine;
  final FirstThenBoard? firstThenBoard;
  final bool requireAcknowledgment;
  final bool allowSkip;

  factory TransitionPlan.fromJson(Map<String, dynamic> json) {
    final warningsList = json['warnings'] as List<dynamic>? ?? [];

    return TransitionPlan(
      transitionId: json['transitionId']?.toString() ?? '',
      totalDuration: json['totalDuration'] is num
          ? (json['totalDuration'] as num).toInt()
          : 30,
      warnings: warningsList
          .map((w) => TransitionWarning.fromJson(w as Map<String, dynamic>))
          .toList(),
      visual: json['visual'] != null
          ? TransitionVisualSettings.fromJson(json['visual'] as Map<String, dynamic>)
          : const TransitionVisualSettings(),
      audio: json['audio'] != null
          ? TransitionAudioSettings.fromJson(json['audio'] as Map<String, dynamic>)
          : const TransitionAudioSettings(),
      haptic: json['haptic'] != null
          ? TransitionHapticSettings.fromJson(json['haptic'] as Map<String, dynamic>)
          : const TransitionHapticSettings(),
      routine: json['routine'] != null
          ? TransitionRoutine.fromJson(json['routine'] as Map<String, dynamic>)
          : null,
      firstThenBoard: json['firstThenBoard'] != null
          ? FirstThenBoard.fromJson(json['firstThenBoard'] as Map<String, dynamic>)
          : null,
      requireAcknowledgment: json['requireAcknowledgment'] != false,
      allowSkip: json['allowSkip'] == true,
    );
  }
}

/// Learner's transition preferences.
class TransitionPreferences {
  const TransitionPreferences({
    this.warningStyle = 'visual_audio',
    this.defaultWarningSeconds = const [30, 15, 5],
    this.visualSettings,
    this.audioSettings,
    this.hapticSettings,
    this.preferredRoutineId,
    this.showFirstThenBoard = true,
    this.requireAcknowledgment = true,
    this.allowSkipTransition = false,
    this.extendedTimeMultiplier = 1.0,
  });

  final String warningStyle;
  final List<int> defaultWarningSeconds;
  final TransitionVisualSettings? visualSettings;
  final TransitionAudioSettings? audioSettings;
  final TransitionHapticSettings? hapticSettings;
  final String? preferredRoutineId;
  final bool showFirstThenBoard;
  final bool requireAcknowledgment;
  final bool allowSkipTransition;
  final double extendedTimeMultiplier;

  factory TransitionPreferences.fromJson(Map<String, dynamic> json) {
    final warningSecondsList = json['defaultWarningSeconds'] as List<dynamic>?;

    return TransitionPreferences(
      warningStyle: json['warningStyle']?.toString() ?? 'visual_audio',
      defaultWarningSeconds: warningSecondsList != null
          ? warningSecondsList.map((s) => s is num ? s.toInt() : 30).toList()
          : [30, 15, 5],
      visualSettings: json['visualSettings'] != null
          ? TransitionVisualSettings.fromJson(json['visualSettings'] as Map<String, dynamic>)
          : null,
      audioSettings: json['audioSettings'] != null
          ? TransitionAudioSettings.fromJson(json['audioSettings'] as Map<String, dynamic>)
          : null,
      hapticSettings: json['hapticSettings'] != null
          ? TransitionHapticSettings.fromJson(json['hapticSettings'] as Map<String, dynamic>)
          : null,
      preferredRoutineId: json['preferredRoutineId']?.toString(),
      showFirstThenBoard: json['showFirstThenBoard'] != false,
      requireAcknowledgment: json['requireAcknowledgment'] != false,
      allowSkipTransition: json['allowSkipTransition'] == true,
      extendedTimeMultiplier: json['extendedTimeMultiplier'] is num
          ? (json['extendedTimeMultiplier'] as num).toDouble()
          : 1.0,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEPTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/// Exception thrown by transition API operations.
class TransitionException implements Exception {
  const TransitionException(this.message, {this.code});
  final String message;
  final int? code;

  @override
  String toString() => message;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ═══════════════════════════════════════════════════════════════════════════════

/// Service for Transition Support API calls.
class TransitionService {
  TransitionService({String? accessToken})
      : _dio = Dio(BaseOptions(
          baseUrl: _baseUrl,
          headers: accessToken != null ? {'Authorization': 'Bearer $accessToken'} : null,
        ));

  final Dio _dio;

  /// Get transition preferences for a learner.
  /// GET /transitions/preferences/:learnerId
  Future<TransitionPreferences> getPreferences({
    required String learnerId,
  }) async {
    if (_useTransitionMock) {
      await Future.delayed(const Duration(milliseconds: 100));
      return _mockPreferences();
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/transitions/preferences/$learnerId',
      );

      if (response.data == null) {
        throw const TransitionException('No preferences returned');
      }

      return TransitionPreferences.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Plan a transition between activities.
  /// POST /transitions/plan
  Future<TransitionPlan> planTransition({
    required String sessionId,
    required String tenantId,
    required String learnerId,
    required ActivityInfo currentActivity,
    required ActivityInfo nextActivity,
    String? gradeBand,
    bool? requiresPredictableFlow,
    List<String>? sensorySensitivities,
    bool? avoidTimers,
    String? urgency,
  }) async {
    if (_useTransitionMock) {
      await Future.delayed(const Duration(milliseconds: 200));
      return _mockTransitionPlan(
        currentActivity: currentActivity,
        nextActivity: nextActivity,
        requiresPredictableFlow: requiresPredictableFlow ?? false,
      );
    }

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/transitions/plan',
        data: {
          'sessionId': sessionId,
          'tenantId': tenantId,
          'learnerId': learnerId,
          'currentActivity': {
            'id': currentActivity.id,
            'title': currentActivity.title,
            'type': currentActivity.type,
            if (currentActivity.thumbnailUrl != null)
              'thumbnailUrl': currentActivity.thumbnailUrl,
            if (currentActivity.remainingSeconds != null)
              'remainingSeconds': currentActivity.remainingSeconds,
          },
          'nextActivity': {
            'id': nextActivity.id,
            'title': nextActivity.title,
            'type': nextActivity.type,
            if (nextActivity.thumbnailUrl != null)
              'thumbnailUrl': nextActivity.thumbnailUrl,
            if (nextActivity.estimatedDuration != null)
              'estimatedDuration': nextActivity.estimatedDuration,
          },
          'learnerProfile': {
            if (gradeBand != null) 'gradeBand': gradeBand,
            if (requiresPredictableFlow != null)
              'requiresPredictableFlow': requiresPredictableFlow,
            if (sensorySensitivities != null)
              'sensorySensitivities': sensorySensitivities,
            if (avoidTimers != null) 'avoidTimers': avoidTimers,
          },
          if (urgency != null) 'urgency': urgency,
        },
      );

      if (response.data == null) {
        throw const TransitionException('No transition plan returned');
      }

      return TransitionPlan.fromJson(response.data!);
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Acknowledge a transition (learner is ready).
  /// POST /transitions/:transitionId/acknowledge
  Future<void> acknowledgeTransition({
    required String transitionId,
    required String sessionId,
    required String tenantId,
    required String learnerId,
    String readyState = 'ready',
  }) async {
    if (_useTransitionMock) {
      await Future.delayed(const Duration(milliseconds: 100));
      return;
    }

    try {
      await _dio.post(
        '/transitions/$transitionId/acknowledge',
        data: {
          'sessionId': sessionId,
          'tenantId': tenantId,
          'learnerId': learnerId,
          'readyState': readyState,
        },
      );
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Complete a transition and record analytics.
  /// POST /transitions/:transitionId/complete
  Future<void> completeTransition({
    required String transitionId,
    required String sessionId,
    required String tenantId,
    required String learnerId,
    required TransitionOutcome outcome,
    required int actualDuration,
    required int warningsAcknowledged,
    int routineStepsCompleted = 0,
    int learnerInteractions = 0,
  }) async {
    if (_useTransitionMock) {
      await Future.delayed(const Duration(milliseconds: 100));
      return;
    }

    try {
      await _dio.post(
        '/transitions/$transitionId/complete',
        data: {
          'sessionId': sessionId,
          'tenantId': tenantId,
          'learnerId': learnerId,
          'outcome': outcome.code,
          'actualDuration': actualDuration,
          'warningsAcknowledged': warningsAcknowledged,
          'routineStepsCompleted': routineStepsCompleted,
          'learnerInteractions': learnerInteractions,
        },
      );
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  /// Get available transition routines.
  /// GET /transitions/routines
  Future<List<TransitionRoutine>> getRoutines({
    required String tenantId,
    String? learnerId,
    bool includeSystem = true,
  }) async {
    if (_useTransitionMock) {
      await Future.delayed(const Duration(milliseconds: 100));
      return _mockRoutines();
    }

    try {
      final response = await _dio.get<Map<String, dynamic>>(
        '/transitions/routines',
        queryParameters: {
          'tenantId': tenantId,
          if (learnerId != null) 'learnerId': learnerId,
          'includeSystem': includeSystem.toString(),
        },
      );

      if (response.data == null || response.data!['routines'] == null) {
        return [];
      }

      final routinesList = response.data!['routines'] as List<dynamic>;
      return routinesList
          .map((r) => TransitionRoutine.fromJson(r as Map<String, dynamic>))
          .toList();
    } on DioException catch (err) {
      throw _handleError(err);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // ERROR HANDLING
  // ═══════════════════════════════════════════════════════════════════════════

  TransitionException _handleError(DioException err) {
    final statusCode = err.response?.statusCode;
    final data = err.response?.data;

    String message = 'Transition service error';
    if (data is Map<String, dynamic> && data['error'] != null) {
      message = data['error'].toString();
    } else if (err.message != null) {
      message = err.message!;
    }

    return TransitionException(message, code: statusCode);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // MOCK DATA
  // ═══════════════════════════════════════════════════════════════════════════

  TransitionPreferences _mockPreferences() {
    return const TransitionPreferences(
      warningStyle: 'visual_audio',
      defaultWarningSeconds: [30, 15, 5],
      visualSettings: TransitionVisualSettings(
        style: VisualWarningStyle.circle,
        colorScheme: TransitionColorScheme.greenYellowRed,
        showTimer: true,
        showText: true,
      ),
      audioSettings: TransitionAudioSettings(
        enabled: true,
        warningType: AudioWarningType.gentleChime,
        volume: 0.7,
      ),
      hapticSettings: TransitionHapticSettings(
        enabled: true,
        intensity: 'medium',
      ),
      showFirstThenBoard: true,
      requireAcknowledgment: true,
      allowSkipTransition: false,
      extendedTimeMultiplier: 1.0,
    );
  }

  TransitionPlan _mockTransitionPlan({
    required ActivityInfo currentActivity,
    required ActivityInfo nextActivity,
    required bool requiresPredictableFlow,
  }) {
    final duration = requiresPredictableFlow ? 45 : 30;
    final warnings = [
      TransitionWarning(
        secondsBefore: duration,
        message: "We'll be finishing up soon!",
        showTimer: true,
      ),
      TransitionWarning(
        secondsBefore: duration ~/ 2,
        message: "Almost time to move on!",
        showTimer: true,
      ),
      const TransitionWarning(
        secondsBefore: 5,
        message: "Get ready for the next activity!",
        showTimer: true,
      ),
    ];

    return TransitionPlan(
      transitionId: 'mock-transition-${DateTime.now().millisecondsSinceEpoch}',
      totalDuration: duration,
      warnings: warnings,
      visual: const TransitionVisualSettings(),
      audio: const TransitionAudioSettings(),
      haptic: const TransitionHapticSettings(),
      routine: _mockRoutines().first,
      firstThenBoard: FirstThenBoard(
        currentActivity: currentActivity,
        nextActivity: nextActivity,
      ),
      requireAcknowledgment: requiresPredictableFlow,
      allowSkip: !requiresPredictableFlow,
    );
  }

  List<TransitionRoutine> _mockRoutines() {
    return [
      const TransitionRoutine(
        id: 'routine-001',
        name: 'Quick Calm',
        description: 'A short routine with breathing and movement',
        totalDuration: 40,
        steps: [
          TransitionRoutineStep(
            id: 'step-1',
            type: RoutineStepType.breathing,
            duration: 15,
            instruction: 'Take 3 big balloon breaths - breathe in through your nose, out through your mouth',
          ),
          TransitionRoutineStep(
            id: 'step-2',
            type: RoutineStepType.movement,
            duration: 10,
            instruction: 'Wiggle your fingers and toes, then stretch your arms up high!',
          ),
          TransitionRoutineStep(
            id: 'step-3',
            type: RoutineStepType.preview,
            duration: 10,
            instruction: "Let's see what fun thing is coming next!",
          ),
          TransitionRoutineStep(
            id: 'step-4',
            type: RoutineStepType.readyCheck,
            duration: 5,
            instruction: "Give a thumbs up when you're ready! 👍",
            requiresCompletion: true,
          ),
        ],
      ),
    ];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS
// ═══════════════════════════════════════════════════════════════════════════════

/// Provider for the transition service.
final transitionServiceProvider = Provider<TransitionService>((ref) {
  // TODO: Get access token from auth provider
  return TransitionService();
});

/// Provider for current transition plan.
final currentTransitionPlanProvider = StateProvider<TransitionPlan?>((ref) => null);

/// Provider for transition preferences.
final transitionPreferencesProvider = FutureProvider.family<TransitionPreferences, String>(
  (ref, learnerId) async {
    final service = ref.watch(transitionServiceProvider);
    return service.getPreferences(learnerId: learnerId);
  },
);

/// Provider for available routines.
final transitionRoutinesProvider = FutureProvider.family<List<TransitionRoutine>, String>(
  (ref, tenantId) async {
    final service = ref.watch(transitionServiceProvider);
    return service.getRoutines(tenantId: tenantId);
  },
);
