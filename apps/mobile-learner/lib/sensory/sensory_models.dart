/// Sensory Models - ND-2.1
///
/// Data models for sensory profile matching and content adaptation.

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/// Sensory category classification
enum SensoryCategory {
  hyposensitive,
  typical,
  hypersensitive,
  avoiding;

  static SensoryCategory fromString(String value) {
    return SensoryCategory.values.firstWhere(
      (e) => e.name.toLowerCase() == value.toLowerCase(),
      orElse: () => SensoryCategory.typical,
    );
  }
}

/// Visual complexity level
enum VisualComplexity {
  simple,
  moderate,
  complex;

  static VisualComplexity fromString(String value) {
    return VisualComplexity.values.firstWhere(
      (e) => e.name.toLowerCase() == value.toLowerCase(),
      orElse: () => VisualComplexity.moderate,
    );
  }
}

/// Animation intensity level
enum AnimationIntensity {
  none,
  mild,
  moderate,
  intense;

  static AnimationIntensity fromString(String value) {
    return AnimationIntensity.values.firstWhere(
      (e) => e.name.toLowerCase() == value.toLowerCase(),
      orElse: () => AnimationIntensity.none,
    );
  }
}

/// Cognitive load level
enum CognitiveLoad {
  low,
  medium,
  high;

  static CognitiveLoad fromString(String value) {
    return CognitiveLoad.values.firstWhere(
      (e) => e.name.toLowerCase() == value.toLowerCase(),
      orElse: () => CognitiveLoad.medium,
    );
  }
}

/// Warning severity level
enum WarningSeverity {
  info,
  warning,
  critical;

  static WarningSeverity fromString(String value) {
    return WarningSeverity.values.firstWhere(
      (e) => e.name.toLowerCase() == value.toLowerCase(),
      orElse: () => WarningSeverity.info,
    );
  }
}

/// Incident severity level
enum IncidentSeverity {
  low,
  medium,
  high,
  critical;

  static IncidentSeverity fromString(String value) {
    return IncidentSeverity.values.firstWhere(
      (e) => e.name.toLowerCase() == value.toLowerCase(),
      orElse: () => IncidentSeverity.medium,
    );
  }
}

/// Trigger category for incidents
enum TriggerCategory {
  audio,
  visual,
  motion,
  tactile,
  cognitive;

  static TriggerCategory fromString(String value) {
    return TriggerCategory.values.firstWhere(
      (e) => e.name.toLowerCase() == value.toLowerCase(),
      orElse: () => TriggerCategory.visual,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENSORY PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

/// Learner's sensory profile for content matching
class SensoryProfile {
  const SensoryProfile({
    required this.learnerId,
    this.audioSensitivity = 5,
    this.audioCategory = SensoryCategory.typical,
    this.prefersNoSuddenSounds = false,
    this.maxVolume = 100,
    this.prefersQuietEnvironment = false,
    this.visualSensitivity = 5,
    this.visualCategory = SensoryCategory.typical,
    this.avoidsFlashing = false,
    this.prefersSimpleVisuals = false,
    this.preferredBrightness = 80,
    this.preferredContrast = 'normal',
    this.motionSensitivity = 5,
    this.motionCategory = SensoryCategory.typical,
    this.prefersReducedMotion = false,
    this.preferredAnimationSpeed = 'normal',
    this.avoidsParallax = false,
    this.tactileSensitivity = 5,
    this.tactileCategory = SensoryCategory.typical,
    this.prefersNoHaptic = false,
    this.processingSpeed = 'normal',
    this.preferredPacing = 'normal',
    this.needsExtendedTime = false,
    this.timeExtensionFactor = 1.0,
    this.isPhotosensitive = false,
    this.photosensitivityLevel,
    this.needsFrequentBreaks = false,
    this.preferredBreakFrequency = 'normal',
    this.preferredTextSize = 'normal',
    this.prefersDyslexiaFont = false,
    this.typicalEnvironment = 'mixed',
  });

  final String learnerId;

  // Audio sensitivities
  final int audioSensitivity;
  final SensoryCategory audioCategory;
  final bool prefersNoSuddenSounds;
  final int maxVolume;
  final bool prefersQuietEnvironment;

  // Visual sensitivities
  final int visualSensitivity;
  final SensoryCategory visualCategory;
  final bool avoidsFlashing;
  final bool prefersSimpleVisuals;
  final int preferredBrightness;
  final String preferredContrast;

  // Motion sensitivities
  final int motionSensitivity;
  final SensoryCategory motionCategory;
  final bool prefersReducedMotion;
  final String preferredAnimationSpeed;
  final bool avoidsParallax;

  // Tactile sensitivities
  final int tactileSensitivity;
  final SensoryCategory tactileCategory;
  final bool prefersNoHaptic;

  // Cognitive/processing preferences
  final String processingSpeed;
  final String preferredPacing;
  final bool needsExtendedTime;
  final double timeExtensionFactor;

  // Photosensitivity
  final bool isPhotosensitive;
  final int? photosensitivityLevel;

  // Break preferences
  final bool needsFrequentBreaks;
  final String preferredBreakFrequency;

  // Text preferences
  final String preferredTextSize;
  final bool prefersDyslexiaFont;

  // Environment
  final String typicalEnvironment;

  /// Check if user has high sensitivity in any category
  bool get hasHighSensitivity =>
      audioSensitivity >= 7 ||
      visualSensitivity >= 7 ||
      motionSensitivity >= 7 ||
      tactileSensitivity >= 7;

  /// Check if user needs special accommodations
  bool get needsAccommodations =>
      hasHighSensitivity ||
      isPhotosensitive ||
      avoidsFlashing ||
      prefersReducedMotion ||
      needsExtendedTime ||
      prefersNoHaptic;

  factory SensoryProfile.fromJson(Map<String, dynamic> json) {
    return SensoryProfile(
      learnerId: json['learnerId'] as String,
      audioSensitivity: json['audioSensitivity'] as int? ?? 5,
      audioCategory: SensoryCategory.fromString(
          json['audioCategory'] as String? ?? 'typical'),
      prefersNoSuddenSounds: json['prefersNoSuddenSounds'] as bool? ?? false,
      maxVolume: json['maxVolume'] as int? ?? 100,
      prefersQuietEnvironment:
          json['prefersQuietEnvironment'] as bool? ?? false,
      visualSensitivity: json['visualSensitivity'] as int? ?? 5,
      visualCategory: SensoryCategory.fromString(
          json['visualCategory'] as String? ?? 'typical'),
      avoidsFlashing: json['avoidsFlashing'] as bool? ?? false,
      prefersSimpleVisuals: json['prefersSimpleVisuals'] as bool? ?? false,
      preferredBrightness: json['preferredBrightness'] as int? ?? 80,
      preferredContrast: json['preferredContrast'] as String? ?? 'normal',
      motionSensitivity: json['motionSensitivity'] as int? ?? 5,
      motionCategory: SensoryCategory.fromString(
          json['motionCategory'] as String? ?? 'typical'),
      prefersReducedMotion: json['prefersReducedMotion'] as bool? ?? false,
      preferredAnimationSpeed:
          json['preferredAnimationSpeed'] as String? ?? 'normal',
      avoidsParallax: json['avoidsParallax'] as bool? ?? false,
      tactileSensitivity: json['tactileSensitivity'] as int? ?? 5,
      tactileCategory: SensoryCategory.fromString(
          json['tactileCategory'] as String? ?? 'typical'),
      prefersNoHaptic: json['prefersNoHaptic'] as bool? ?? false,
      processingSpeed: json['processingSpeed'] as String? ?? 'normal',
      preferredPacing: json['preferredPacing'] as String? ?? 'normal',
      needsExtendedTime: json['needsExtendedTime'] as bool? ?? false,
      timeExtensionFactor:
          (json['timeExtensionFactor'] as num?)?.toDouble() ?? 1.0,
      isPhotosensitive: json['isPhotosensitive'] as bool? ?? false,
      photosensitivityLevel: json['photosensitivityLevel'] as int?,
      needsFrequentBreaks: json['needsFrequentBreaks'] as bool? ?? false,
      preferredBreakFrequency:
          json['preferredBreakFrequency'] as String? ?? 'normal',
      preferredTextSize: json['preferredTextSize'] as String? ?? 'normal',
      prefersDyslexiaFont: json['prefersDyslexiaFont'] as bool? ?? false,
      typicalEnvironment: json['typicalEnvironment'] as String? ?? 'mixed',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'learnerId': learnerId,
      'audioSensitivity': audioSensitivity,
      'audioCategory': audioCategory.name,
      'prefersNoSuddenSounds': prefersNoSuddenSounds,
      'maxVolume': maxVolume,
      'prefersQuietEnvironment': prefersQuietEnvironment,
      'visualSensitivity': visualSensitivity,
      'visualCategory': visualCategory.name,
      'avoidsFlashing': avoidsFlashing,
      'prefersSimpleVisuals': prefersSimpleVisuals,
      'preferredBrightness': preferredBrightness,
      'preferredContrast': preferredContrast,
      'motionSensitivity': motionSensitivity,
      'motionCategory': motionCategory.name,
      'prefersReducedMotion': prefersReducedMotion,
      'preferredAnimationSpeed': preferredAnimationSpeed,
      'avoidsParallax': avoidsParallax,
      'tactileSensitivity': tactileSensitivity,
      'tactileCategory': tactileCategory.name,
      'prefersNoHaptic': prefersNoHaptic,
      'processingSpeed': processingSpeed,
      'preferredPacing': preferredPacing,
      'needsExtendedTime': needsExtendedTime,
      'timeExtensionFactor': timeExtensionFactor,
      'isPhotosensitive': isPhotosensitive,
      if (photosensitivityLevel != null)
        'photosensitivityLevel': photosensitivityLevel,
      'needsFrequentBreaks': needsFrequentBreaks,
      'preferredBreakFrequency': preferredBreakFrequency,
      'preferredTextSize': preferredTextSize,
      'prefersDyslexiaFont': prefersDyslexiaFont,
      'typicalEnvironment': typicalEnvironment,
    };
  }

  SensoryProfile copyWith({
    String? learnerId,
    int? audioSensitivity,
    SensoryCategory? audioCategory,
    bool? prefersNoSuddenSounds,
    int? maxVolume,
    bool? prefersQuietEnvironment,
    int? visualSensitivity,
    SensoryCategory? visualCategory,
    bool? avoidsFlashing,
    bool? prefersSimpleVisuals,
    int? preferredBrightness,
    String? preferredContrast,
    int? motionSensitivity,
    SensoryCategory? motionCategory,
    bool? prefersReducedMotion,
    String? preferredAnimationSpeed,
    bool? avoidsParallax,
    int? tactileSensitivity,
    SensoryCategory? tactileCategory,
    bool? prefersNoHaptic,
    String? processingSpeed,
    String? preferredPacing,
    bool? needsExtendedTime,
    double? timeExtensionFactor,
    bool? isPhotosensitive,
    int? photosensitivityLevel,
    bool? needsFrequentBreaks,
    String? preferredBreakFrequency,
    String? preferredTextSize,
    bool? prefersDyslexiaFont,
    String? typicalEnvironment,
  }) {
    return SensoryProfile(
      learnerId: learnerId ?? this.learnerId,
      audioSensitivity: audioSensitivity ?? this.audioSensitivity,
      audioCategory: audioCategory ?? this.audioCategory,
      prefersNoSuddenSounds:
          prefersNoSuddenSounds ?? this.prefersNoSuddenSounds,
      maxVolume: maxVolume ?? this.maxVolume,
      prefersQuietEnvironment:
          prefersQuietEnvironment ?? this.prefersQuietEnvironment,
      visualSensitivity: visualSensitivity ?? this.visualSensitivity,
      visualCategory: visualCategory ?? this.visualCategory,
      avoidsFlashing: avoidsFlashing ?? this.avoidsFlashing,
      prefersSimpleVisuals: prefersSimpleVisuals ?? this.prefersSimpleVisuals,
      preferredBrightness: preferredBrightness ?? this.preferredBrightness,
      preferredContrast: preferredContrast ?? this.preferredContrast,
      motionSensitivity: motionSensitivity ?? this.motionSensitivity,
      motionCategory: motionCategory ?? this.motionCategory,
      prefersReducedMotion: prefersReducedMotion ?? this.prefersReducedMotion,
      preferredAnimationSpeed:
          preferredAnimationSpeed ?? this.preferredAnimationSpeed,
      avoidsParallax: avoidsParallax ?? this.avoidsParallax,
      tactileSensitivity: tactileSensitivity ?? this.tactileSensitivity,
      tactileCategory: tactileCategory ?? this.tactileCategory,
      prefersNoHaptic: prefersNoHaptic ?? this.prefersNoHaptic,
      processingSpeed: processingSpeed ?? this.processingSpeed,
      preferredPacing: preferredPacing ?? this.preferredPacing,
      needsExtendedTime: needsExtendedTime ?? this.needsExtendedTime,
      timeExtensionFactor: timeExtensionFactor ?? this.timeExtensionFactor,
      isPhotosensitive: isPhotosensitive ?? this.isPhotosensitive,
      photosensitivityLevel:
          photosensitivityLevel ?? this.photosensitivityLevel,
      needsFrequentBreaks: needsFrequentBreaks ?? this.needsFrequentBreaks,
      preferredBreakFrequency:
          preferredBreakFrequency ?? this.preferredBreakFrequency,
      preferredTextSize: preferredTextSize ?? this.preferredTextSize,
      prefersDyslexiaFont: prefersDyslexiaFont ?? this.prefersDyslexiaFont,
      typicalEnvironment: typicalEnvironment ?? this.typicalEnvironment,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENSORY MATCH RESULT
// ═══════════════════════════════════════════════════════════════════════════════

/// Result of matching content against a sensory profile
class SensoryMatchResult {
  const SensoryMatchResult({
    required this.overallScore,
    required this.isSuitable,
    required this.categoryScores,
    required this.warnings,
    required this.adaptations,
    required this.matchedAt,
  });

  final int overallScore;
  final bool isSuitable;
  final Map<String, int> categoryScores;
  final List<SensoryWarning> warnings;
  final List<ContentAdaptation> adaptations;
  final DateTime matchedAt;

  /// Quick check if content is safe (score >= 50 and no critical warnings)
  bool get isSafe =>
      overallScore >= 50 && !warnings.any((w) => w.level == WarningSeverity.critical);

  /// Get match quality label
  String get qualityLabel {
    if (overallScore >= 90) return 'Excellent';
    if (overallScore >= 75) return 'Good';
    if (overallScore >= 50) return 'Acceptable';
    if (overallScore >= 30) return 'Poor';
    return 'Not Recommended';
  }

  factory SensoryMatchResult.fromJson(Map<String, dynamic> json) {
    return SensoryMatchResult(
      overallScore: json['overallScore'] as int,
      isSuitable: json['isSuitable'] as bool,
      categoryScores:
          Map<String, int>.from(json['categoryScores'] as Map<String, dynamic>),
      warnings: (json['warnings'] as List<dynamic>)
          .map((w) => SensoryWarning.fromJson(w as Map<String, dynamic>))
          .toList(),
      adaptations: (json['adaptations'] as List<dynamic>)
          .map((a) => ContentAdaptation.fromJson(a as Map<String, dynamic>))
          .toList(),
      matchedAt: DateTime.parse(json['matchedAt'] as String),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENSORY WARNING
// ═══════════════════════════════════════════════════════════════════════════════

/// Warning about sensory content characteristics
class SensoryWarning {
  const SensoryWarning({
    required this.category,
    required this.level,
    required this.code,
    required this.message,
    this.recommendation,
    this.explanation,
  });

  final String category;
  final WarningSeverity level;
  final String code;
  final String message;
  final String? recommendation;
  final String? explanation;

  factory SensoryWarning.fromJson(Map<String, dynamic> json) {
    return SensoryWarning(
      category: json['category'] as String,
      level: WarningSeverity.fromString(json['level'] as String),
      code: json['code'] as String,
      message: json['message'] as String,
      recommendation: json['recommendation'] as String?,
      explanation: json['explanation'] as String?,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT ADAPTATION
// ═══════════════════════════════════════════════════════════════════════════════

/// Recommended adaptation for content presentation
class ContentAdaptation {
  const ContentAdaptation({
    required this.type,
    required this.setting,
    required this.value,
    required this.reason,
  });

  final String type;
  final String setting;
  final dynamic value;
  final String reason;

  factory ContentAdaptation.fromJson(Map<String, dynamic> json) {
    return ContentAdaptation(
      type: json['type'] as String,
      setting: json['setting'] as String,
      value: json['value'],
      reason: json['reason'] as String,
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SENSORY INCIDENT
// ═══════════════════════════════════════════════════════════════════════════════

/// Reported sensory incident
class SensoryIncident {
  const SensoryIncident({
    required this.id,
    required this.learnerId,
    required this.tenantId,
    required this.incidentType,
    required this.severity,
    required this.triggerCategory,
    required this.createdAt,
    this.contentId,
    this.contentType,
    this.contentTitle,
    this.sessionId,
    this.activityId,
    this.triggerDescription,
    this.triggerTimestamp,
    this.reportedByUserId,
    this.reportedByRole,
    this.userDescription,
    this.systemDetected = false,
    this.detectionMethod,
    this.detectionConfidence,
  });

  final String id;
  final String learnerId;
  final String tenantId;
  final String? contentId;
  final String? contentType;
  final String? contentTitle;
  final String? sessionId;
  final String? activityId;
  final String incidentType;
  final IncidentSeverity severity;
  final TriggerCategory triggerCategory;
  final String? triggerDescription;
  final DateTime? triggerTimestamp;
  final String? reportedByUserId;
  final String? reportedByRole;
  final String? userDescription;
  final bool systemDetected;
  final String? detectionMethod;
  final double? detectionConfidence;
  final DateTime createdAt;

  factory SensoryIncident.fromJson(Map<String, dynamic> json) {
    return SensoryIncident(
      id: json['id'] as String,
      learnerId: json['learnerId'] as String,
      tenantId: json['tenantId'] as String,
      contentId: json['contentId'] as String?,
      contentType: json['contentType'] as String?,
      contentTitle: json['contentTitle'] as String?,
      sessionId: json['sessionId'] as String?,
      activityId: json['activityId'] as String?,
      incidentType: json['incidentType'] as String,
      severity: IncidentSeverity.fromString(json['severity'] as String),
      triggerCategory:
          TriggerCategory.fromString(json['triggerCategory'] as String),
      triggerDescription: json['triggerDescription'] as String?,
      triggerTimestamp: json['triggerTimestamp'] != null
          ? DateTime.parse(json['triggerTimestamp'] as String)
          : null,
      reportedByUserId: json['reportedByUserId'] as String?,
      reportedByRole: json['reportedByRole'] as String?,
      userDescription: json['userDescription'] as String?,
      systemDetected: json['systemDetected'] as bool? ?? false,
      detectionMethod: json['detectionMethod'] as String?,
      detectionConfidence: (json['detectionConfidence'] as num?)?.toDouble(),
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'learnerId': learnerId,
      'tenantId': tenantId,
      if (contentId != null) 'contentId': contentId,
      if (contentType != null) 'contentType': contentType,
      if (contentTitle != null) 'contentTitle': contentTitle,
      if (sessionId != null) 'sessionId': sessionId,
      if (activityId != null) 'activityId': activityId,
      'incidentType': incidentType,
      'severity': severity.name,
      'triggerCategory': triggerCategory.name,
      if (triggerDescription != null) 'triggerDescription': triggerDescription,
      if (triggerTimestamp != null)
        'triggerTimestamp': triggerTimestamp!.toIso8601String(),
      if (reportedByUserId != null) 'reportedByUserId': reportedByUserId,
      if (reportedByRole != null) 'reportedByRole': reportedByRole,
      if (userDescription != null) 'userDescription': userDescription,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTENT SENSORY SETTINGS
// ═══════════════════════════════════════════════════════════════════════════════

/// Applied sensory settings for content presentation
class ContentSensorySettings {
  const ContentSensorySettings({
    this.volume = 100,
    this.brightness = 100,
    this.contrast = 'normal',
    this.reducedMotion = false,
    this.animationSpeed = 1.0,
    this.textScale = 1.0,
    this.useDyslexiaFont = false,
    this.hapticEnabled = true,
    this.timeMultiplier = 1.0,
    this.breakRemindersEnabled = false,
    this.breakFrequencyMinutes = 20,
  });

  final int volume;
  final int brightness;
  final String contrast;
  final bool reducedMotion;
  final double animationSpeed;
  final double textScale;
  final bool useDyslexiaFont;
  final bool hapticEnabled;
  final double timeMultiplier;
  final bool breakRemindersEnabled;
  final int breakFrequencyMinutes;

  /// Create settings from a sensory profile
  factory ContentSensorySettings.fromProfile(SensoryProfile profile) {
    final textScales = {
      'small': 0.85,
      'normal': 1.0,
      'large': 1.3,
      'very_large': 1.5,
    };

    final animationSpeeds = {
      'slow': 0.5,
      'normal': 1.0,
      'fast': 1.5,
    };

    final breakMinutes = {
      'low': 30,
      'normal': 20,
      'high': 10,
      'very_high': 5,
    };

    return ContentSensorySettings(
      volume: profile.maxVolume,
      brightness: profile.preferredBrightness,
      contrast: profile.preferredContrast,
      reducedMotion: profile.prefersReducedMotion,
      animationSpeed: animationSpeeds[profile.preferredAnimationSpeed] ?? 1.0,
      textScale: textScales[profile.preferredTextSize] ?? 1.0,
      useDyslexiaFont: profile.prefersDyslexiaFont,
      hapticEnabled: !profile.prefersNoHaptic,
      timeMultiplier: profile.timeExtensionFactor,
      breakRemindersEnabled: profile.needsFrequentBreaks,
      breakFrequencyMinutes:
          breakMinutes[profile.preferredBreakFrequency] ?? 20,
    );
  }

  /// Create settings from adaptations
  factory ContentSensorySettings.fromAdaptations(
    List<ContentAdaptation> adaptations,
  ) {
    var settings = const ContentSensorySettings();

    for (final adaptation in adaptations) {
      switch (adaptation.setting) {
        case 'volume':
          settings = settings.copyWith(volume: adaptation.value as int);
          break;
        case 'brightness':
          settings = settings.copyWith(brightness: adaptation.value as int);
          break;
        case 'contrast':
          settings = settings.copyWith(contrast: adaptation.value as String);
          break;
        case 'reducedMotion':
          settings = settings.copyWith(reducedMotion: adaptation.value as bool);
          break;
        case 'animationSpeed':
          final speedMap = {'slow': 0.5, 'normal': 1.0, 'fast': 1.5};
          settings = settings.copyWith(
            animationSpeed: speedMap[adaptation.value] ?? 1.0,
          );
          break;
        case 'textScale':
          settings =
              settings.copyWith(textScale: (adaptation.value as num).toDouble());
          break;
        case 'dyslexiaFont':
          settings =
              settings.copyWith(useDyslexiaFont: adaptation.value as bool);
          break;
        case 'hapticEnabled':
          settings = settings.copyWith(hapticEnabled: adaptation.value as bool);
          break;
        case 'timeMultiplier':
          settings = settings.copyWith(
            timeMultiplier: (adaptation.value as num).toDouble(),
          );
          break;
        case 'breakReminders':
          settings = settings.copyWith(breakRemindersEnabled: true);
          break;
      }
    }

    return settings;
  }

  ContentSensorySettings copyWith({
    int? volume,
    int? brightness,
    String? contrast,
    bool? reducedMotion,
    double? animationSpeed,
    double? textScale,
    bool? useDyslexiaFont,
    bool? hapticEnabled,
    double? timeMultiplier,
    bool? breakRemindersEnabled,
    int? breakFrequencyMinutes,
  }) {
    return ContentSensorySettings(
      volume: volume ?? this.volume,
      brightness: brightness ?? this.brightness,
      contrast: contrast ?? this.contrast,
      reducedMotion: reducedMotion ?? this.reducedMotion,
      animationSpeed: animationSpeed ?? this.animationSpeed,
      textScale: textScale ?? this.textScale,
      useDyslexiaFont: useDyslexiaFont ?? this.useDyslexiaFont,
      hapticEnabled: hapticEnabled ?? this.hapticEnabled,
      timeMultiplier: timeMultiplier ?? this.timeMultiplier,
      breakRemindersEnabled:
          breakRemindersEnabled ?? this.breakRemindersEnabled,
      breakFrequencyMinutes:
          breakFrequencyMinutes ?? this.breakFrequencyMinutes,
    );
  }
}
