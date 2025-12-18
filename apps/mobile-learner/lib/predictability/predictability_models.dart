import 'package:flutter/foundation.dart';

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/// Types of session routines.
enum RoutineType {
  welcome('WELCOME', 'Welcome'),
  checkin('CHECKIN', 'Check-in'),
  transition('TRANSITION', 'Transition'),
  breakRoutine('BREAK', 'Break'),
  returnToTask('RETURN', 'Return'),
  goodbye('GOODBYE', 'Goodbye'),
  celebration('CELEBRATION', 'Celebration'),
  calming('CALMING', 'Calming');

  const RoutineType(this.code, this.displayName);
  final String code;
  final String displayName;

  static RoutineType fromCode(String code) {
    return RoutineType.values.firstWhere(
      (e) => e.code == code,
      orElse: () => RoutineType.transition,
    );
  }
}

/// Current phase of the session.
enum SessionPhase {
  welcome('welcome', 'Welcome!'),
  checkin('checkin', 'Check-In'),
  main('main', 'Learning Time'),
  breakPhase('break', 'Break Time'),
  goodbye('goodbye', 'All Done!');

  const SessionPhase(this.code, this.displayName);
  final String code;
  final String displayName;

  static SessionPhase fromCode(String code) {
    return SessionPhase.values.firstWhere(
      (e) => e.code == code,
      orElse: () => SessionPhase.main,
    );
  }
}

/// Status of an outline item.
enum OutlineItemStatus {
  upcoming('upcoming', 'Coming up'),
  current('current', 'Now'),
  completed('completed', 'Done'),
  skipped('skipped', 'Skipped');

  const OutlineItemStatus(this.code, this.displayName);
  final String code;
  final String displayName;

  static OutlineItemStatus fromCode(String code) {
    return OutlineItemStatus.values.firstWhere(
      (e) => e.code == code,
      orElse: () => OutlineItemStatus.upcoming,
    );
  }
}

/// Severity of a schedule change.
enum ChangeSeverity {
  low('low', 'Minor Change'),
  medium('medium', 'Notable Change'),
  high('high', 'Significant Change');

  const ChangeSeverity(this.code, this.displayName);
  final String code;
  final String displayName;

  static ChangeSeverity fromCode(String code) {
    return ChangeSeverity.values.firstWhere(
      (e) => e.code == code,
      orElse: () => ChangeSeverity.medium,
    );
  }
}

/// Anxiety level reported by learner.
enum AnxietyLevel {
  mild('mild', 'A little worried'),
  moderate('moderate', 'Pretty worried'),
  severe('severe', 'Very worried');

  const AnxietyLevel(this.code, this.displayName);
  final String code;
  final String displayName;

  static AnxietyLevel fromCode(String code) {
    return AnxietyLevel.values.firstWhere(
      (e) => e.code == code,
      orElse: () => AnxietyLevel.mild,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MODELS
// ═══════════════════════════════════════════════════════════════════════════════

/// Predictability preferences for a learner.
@immutable
class PredictabilityPreferences {
  const PredictabilityPreferences({
    required this.enabled,
    required this.warnMinutesBefore,
    required this.showRemainingTime,
    required this.useVisualSchedule,
    required this.preferredRoutineTypes,
    this.customSettings = const {},
  });

  final bool enabled;
  final int warnMinutesBefore;
  final bool showRemainingTime;
  final bool useVisualSchedule;
  final List<RoutineType> preferredRoutineTypes;
  final Map<String, dynamic> customSettings;

  factory PredictabilityPreferences.fromJson(Map<String, dynamic> json) {
    return PredictabilityPreferences(
      enabled: json['enabled'] as bool? ?? true,
      warnMinutesBefore: json['warnMinutesBefore'] as int? ?? 5,
      showRemainingTime: json['showRemainingTime'] as bool? ?? true,
      useVisualSchedule: json['useVisualSchedule'] as bool? ?? true,
      preferredRoutineTypes: (json['preferredRoutineTypes'] as List<dynamic>?)
              ?.map((e) => RoutineType.fromCode(e as String))
              .toList() ??
          [],
      customSettings: json['customSettings'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() => {
        'enabled': enabled,
        'warnMinutesBefore': warnMinutesBefore,
        'showRemainingTime': showRemainingTime,
        'useVisualSchedule': useVisualSchedule,
        'preferredRoutineTypes': preferredRoutineTypes.map((e) => e.code).toList(),
        'customSettings': customSettings,
      };

  PredictabilityPreferences copyWith({
    bool? enabled,
    int? warnMinutesBefore,
    bool? showRemainingTime,
    bool? useVisualSchedule,
    List<RoutineType>? preferredRoutineTypes,
    Map<String, dynamic>? customSettings,
  }) {
    return PredictabilityPreferences(
      enabled: enabled ?? this.enabled,
      warnMinutesBefore: warnMinutesBefore ?? this.warnMinutesBefore,
      showRemainingTime: showRemainingTime ?? this.showRemainingTime,
      useVisualSchedule: useVisualSchedule ?? this.useVisualSchedule,
      preferredRoutineTypes: preferredRoutineTypes ?? this.preferredRoutineTypes,
      customSettings: customSettings ?? this.customSettings,
    );
  }

  /// Default preferences for learners who need predictability.
  static const PredictabilityPreferences defaultPreferences = PredictabilityPreferences(
    enabled: true,
    warnMinutesBefore: 5,
    showRemainingTime: true,
    useVisualSchedule: true,
    preferredRoutineTypes: [RoutineType.welcome, RoutineType.goodbye],
  );
}

/// A single step in a routine.
@immutable
class RoutineStep {
  const RoutineStep({
    required this.type,
    required this.durationSeconds,
    this.instruction,
    this.imageUrl,
    this.audioUrl,
  });

  final String type;
  final int durationSeconds;
  final String? instruction;
  final String? imageUrl;
  final String? audioUrl;

  factory RoutineStep.fromJson(Map<String, dynamic> json) {
    return RoutineStep(
      type: json['type'] as String? ?? 'unknown',
      durationSeconds: json['durationSeconds'] as int? ?? 5,
      instruction: json['instruction'] as String?,
      imageUrl: json['imageUrl'] as String?,
      audioUrl: json['audioUrl'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'type': type,
        'durationSeconds': durationSeconds,
        if (instruction != null) 'instruction': instruction,
        if (imageUrl != null) 'imageUrl': imageUrl,
        if (audioUrl != null) 'audioUrl': audioUrl,
      };
}

/// A routine (e.g., welcome, goodbye) with its steps.
@immutable
class SessionRoutine {
  const SessionRoutine({
    required this.id,
    required this.type,
    required this.name,
    required this.steps,
    required this.totalDurationSeconds,
    this.iconName,
    this.color,
  });

  final String id;
  final RoutineType type;
  final String name;
  final List<RoutineStep> steps;
  final int totalDurationSeconds;
  final String? iconName;
  final String? color;

  factory SessionRoutine.fromJson(Map<String, dynamic> json) {
    return SessionRoutine(
      id: json['id'] as String? ?? '',
      type: RoutineType.fromCode(json['type'] as String? ?? ''),
      name: json['name'] as String? ?? '',
      steps: (json['steps'] as List<dynamic>?)
              ?.map((e) => RoutineStep.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      totalDurationSeconds: json['totalDurationSeconds'] as int? ?? 0,
      iconName: json['iconName'] as String?,
      color: json['color'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'type': type.code,
        'name': name,
        'steps': steps.map((e) => e.toJson()).toList(),
        'totalDurationSeconds': totalDurationSeconds,
        if (iconName != null) 'iconName': iconName,
        if (color != null) 'color': color,
      };
}

/// An item in the session outline (activity, routine, or break).
@immutable
class SessionOutlineItem {
  const SessionOutlineItem({
    required this.id,
    required this.title,
    required this.type,
    required this.estimatedMinutes,
    required this.status,
    this.icon,
    this.color,
    this.isNew = false,
    this.description,
  });

  final String id;
  final String title;
  final String type; // 'activity', 'routine', 'break'
  final int estimatedMinutes;
  final OutlineItemStatus status;
  final String? icon;
  final String? color;
  final bool isNew;
  final String? description;

  factory SessionOutlineItem.fromJson(Map<String, dynamic> json) {
    return SessionOutlineItem(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      type: json['type'] as String? ?? 'activity',
      estimatedMinutes: json['estimatedMinutes'] as int? ?? 5,
      status: OutlineItemStatus.fromCode(json['status'] as String? ?? 'upcoming'),
      icon: json['icon'] as String?,
      color: json['color'] as String?,
      isNew: json['isNew'] as bool? ?? false,
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'title': title,
        'type': type,
        'estimatedMinutes': estimatedMinutes,
        'status': status.code,
        if (icon != null) 'icon': icon,
        if (color != null) 'color': color,
        'isNew': isNew,
        if (description != null) 'description': description,
      };

  SessionOutlineItem copyWith({
    String? id,
    String? title,
    String? type,
    int? estimatedMinutes,
    OutlineItemStatus? status,
    String? icon,
    String? color,
    bool? isNew,
    String? description,
  }) {
    return SessionOutlineItem(
      id: id ?? this.id,
      title: title ?? this.title,
      type: type ?? this.type,
      estimatedMinutes: estimatedMinutes ?? this.estimatedMinutes,
      status: status ?? this.status,
      icon: icon ?? this.icon,
      color: color ?? this.color,
      isNew: isNew ?? this.isNew,
      description: description ?? this.description,
    );
  }
}

/// A predictable session plan with outline and progress tracking.
@immutable
class PredictableSessionPlan {
  const PredictableSessionPlan({
    required this.id,
    required this.sessionId,
    required this.learnerId,
    required this.outline,
    required this.currentPhase,
    required this.currentItemIndex,
    required this.totalMinutes,
    required this.completedMinutes,
    required this.progressPercent,
    this.welcomeRoutine,
    this.goodbyeRoutine,
    this.breakRoutine,
  });

  final String id;
  final String sessionId;
  final String learnerId;
  final List<SessionOutlineItem> outline;
  final SessionPhase currentPhase;
  final int currentItemIndex;
  final int totalMinutes;
  final int completedMinutes;
  final int progressPercent;
  final SessionRoutine? welcomeRoutine;
  final SessionRoutine? goodbyeRoutine;
  final SessionRoutine? breakRoutine;

  factory PredictableSessionPlan.fromJson(Map<String, dynamic> json) {
    return PredictableSessionPlan(
      id: json['id'] as String? ?? '',
      sessionId: json['sessionId'] as String? ?? '',
      learnerId: json['learnerId'] as String? ?? '',
      outline: (json['outline'] as List<dynamic>?)
              ?.map((e) => SessionOutlineItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      currentPhase: SessionPhase.fromCode(json['currentPhase'] as String? ?? 'main'),
      currentItemIndex: json['currentItemIndex'] as int? ?? 0,
      totalMinutes: json['totalMinutes'] as int? ?? 0,
      completedMinutes: json['completedMinutes'] as int? ?? 0,
      progressPercent: json['progressPercent'] as int? ?? 0,
      welcomeRoutine: json['welcomeRoutine'] != null
          ? SessionRoutine.fromJson(json['welcomeRoutine'] as Map<String, dynamic>)
          : null,
      goodbyeRoutine: json['goodbyeRoutine'] != null
          ? SessionRoutine.fromJson(json['goodbyeRoutine'] as Map<String, dynamic>)
          : null,
      breakRoutine: json['breakRoutine'] != null
          ? SessionRoutine.fromJson(json['breakRoutine'] as Map<String, dynamic>)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        'id': id,
        'sessionId': sessionId,
        'learnerId': learnerId,
        'outline': outline.map((e) => e.toJson()).toList(),
        'currentPhase': currentPhase.code,
        'currentItemIndex': currentItemIndex,
        'totalMinutes': totalMinutes,
        'completedMinutes': completedMinutes,
        'progressPercent': progressPercent,
        if (welcomeRoutine != null) 'welcomeRoutine': welcomeRoutine!.toJson(),
        if (goodbyeRoutine != null) 'goodbyeRoutine': goodbyeRoutine!.toJson(),
        if (breakRoutine != null) 'breakRoutine': breakRoutine!.toJson(),
      };

  /// Get the current outline item.
  SessionOutlineItem? get currentItem {
    if (currentItemIndex >= 0 && currentItemIndex < outline.length) {
      return outline[currentItemIndex];
    }
    return null;
  }

  /// Get the next outline item.
  SessionOutlineItem? get nextItem {
    final nextIndex = currentItemIndex + 1;
    if (nextIndex >= 0 && nextIndex < outline.length) {
      return outline[nextIndex];
    }
    return null;
  }

  /// Get remaining minutes.
  int get remainingMinutes => totalMinutes - completedMinutes;

  /// Check if session is complete.
  bool get isComplete => currentItemIndex >= outline.length - 1 &&
      outline.lastOrNull?.status == OutlineItemStatus.completed;
}

/// Explanation of an unexpected change to the session plan.
@immutable
class ChangeExplanation {
  const ChangeExplanation({
    required this.message,
    required this.socialStory,
    required this.visualCue,
    required this.severity,
    required this.copingStrategies,
  });

  final String message;
  final String socialStory;
  final String visualCue;
  final ChangeSeverity severity;
  final List<String> copingStrategies;

  factory ChangeExplanation.fromJson(Map<String, dynamic> json) {
    return ChangeExplanation(
      message: json['message'] as String? ?? '',
      socialStory: json['socialStory'] as String? ?? '',
      visualCue: json['visualCue'] as String? ?? '',
      severity: ChangeSeverity.fromCode(json['severity'] as String? ?? 'medium'),
      copingStrategies: (json['copingStrategies'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() => {
        'message': message,
        'socialStory': socialStory,
        'visualCue': visualCue,
        'severity': severity.code,
        'copingStrategies': copingStrategies,
      };
}

/// Result of an anxiety report.
@immutable
class AnxietyReportResult {
  const AnxietyReportResult({
    required this.logged,
    required this.level,
    required this.supportActions,
    this.recommendedRoutine,
    this.calmingMessage,
  });

  final bool logged;
  final AnxietyLevel level;
  final List<String> supportActions;
  final SessionRoutine? recommendedRoutine;
  final String? calmingMessage;

  factory AnxietyReportResult.fromJson(Map<String, dynamic> json) {
    return AnxietyReportResult(
      logged: json['logged'] as bool? ?? true,
      level: AnxietyLevel.fromCode(json['level'] as String? ?? 'mild'),
      supportActions: (json['supportActions'] as List<dynamic>?)
              ?.map((e) => e as String)
              .toList() ??
          [],
      recommendedRoutine: json['recommendedRoutine'] != null
          ? SessionRoutine.fromJson(json['recommendedRoutine'] as Map<String, dynamic>)
          : null,
      calmingMessage: json['calmingMessage'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'logged': logged,
        'level': level.code,
        'supportActions': supportActions,
        if (recommendedRoutine != null) 'recommendedRoutine': recommendedRoutine!.toJson(),
        if (calmingMessage != null) 'calmingMessage': calmingMessage,
      };
}
