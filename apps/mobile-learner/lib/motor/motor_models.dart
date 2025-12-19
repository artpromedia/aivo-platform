/// Motor Models - ND-3.3
///
/// Data models for motor accommodation profiles and input adaptations
/// for learners with fine or gross motor challenges.

// ═══════════════════════════════════════════════════════════════════════════════
// ENUMS
// ═══════════════════════════════════════════════════════════════════════════════

/// Motor ability level classification
enum MotorAbilityLevel {
  ageAppropriate,
  mildDifficulty,
  moderateDifficulty,
  significantDifficulty,
  requiresFullSupport;

  static MotorAbilityLevel fromString(String value) {
    const mapping = {
      'AGE_APPROPRIATE': MotorAbilityLevel.ageAppropriate,
      'MILD_DIFFICULTY': MotorAbilityLevel.mildDifficulty,
      'MODERATE_DIFFICULTY': MotorAbilityLevel.moderateDifficulty,
      'SIGNIFICANT_DIFFICULTY': MotorAbilityLevel.significantDifficulty,
      'REQUIRES_FULL_SUPPORT': MotorAbilityLevel.requiresFullSupport,
    };
    return mapping[value.toUpperCase()] ?? MotorAbilityLevel.ageAppropriate;
  }

  String toApiString() {
    const mapping = {
      MotorAbilityLevel.ageAppropriate: 'AGE_APPROPRIATE',
      MotorAbilityLevel.mildDifficulty: 'MILD_DIFFICULTY',
      MotorAbilityLevel.moderateDifficulty: 'MODERATE_DIFFICULTY',
      MotorAbilityLevel.significantDifficulty: 'SIGNIFICANT_DIFFICULTY',
      MotorAbilityLevel.requiresFullSupport: 'REQUIRES_FULL_SUPPORT',
    };
    return mapping[this]!;
  }
}

/// Haptic feedback intensity
enum HapticIntensity {
  none,
  light,
  normal,
  strong;

  static HapticIntensity fromString(String value) {
    return HapticIntensity.values.firstWhere(
      (e) => e.name.toLowerCase() == value.toLowerCase(),
      orElse: () => HapticIntensity.normal,
    );
  }
}

/// Keyboard type preference
enum KeyboardType {
  standard,
  large,
  split,
  oneHanded;

  static KeyboardType fromString(String value) {
    const mapping = {
      'standard': KeyboardType.standard,
      'large': KeyboardType.large,
      'split': KeyboardType.split,
      'one_handed': KeyboardType.oneHanded,
    };
    return mapping[value.toLowerCase()] ?? KeyboardType.standard;
  }

  String toApiString() {
    const mapping = {
      KeyboardType.standard: 'standard',
      KeyboardType.large: 'large',
      KeyboardType.split: 'split',
      KeyboardType.oneHanded: 'one_handed',
    };
    return mapping[this]!;
  }
}

/// Dwell indicator style
enum DwellIndicatorStyle {
  circle,
  shrink,
  fill;

  static DwellIndicatorStyle fromString(String value) {
    return DwellIndicatorStyle.values.firstWhere(
      (e) => e.name.toLowerCase() == value.toLowerCase(),
      orElse: () => DwellIndicatorStyle.circle,
    );
  }
}

/// Switch access scan mode
enum SwitchAccessMode {
  autoScan,
  manual,
  stepScan;

  static SwitchAccessMode fromString(String value) {
    const mapping = {
      'auto_scan': SwitchAccessMode.autoScan,
      'manual': SwitchAccessMode.manual,
      'step_scan': SwitchAccessMode.stepScan,
    };
    return mapping[value.toLowerCase()] ?? SwitchAccessMode.autoScan;
  }

  String toApiString() {
    const mapping = {
      SwitchAccessMode.autoScan: 'auto_scan',
      SwitchAccessMode.manual: 'manual',
      SwitchAccessMode.stepScan: 'step_scan',
    };
    return mapping[this]!;
  }
}

/// Tremor filter algorithm
enum TremorFilterAlgorithm {
  movingAverage,
  kalman,
  exponential;

  static TremorFilterAlgorithm fromString(String value) {
    const mapping = {
      'moving_average': TremorFilterAlgorithm.movingAverage,
      'kalman': TremorFilterAlgorithm.kalman,
      'exponential': TremorFilterAlgorithm.exponential,
    };
    return mapping[value.toLowerCase()] ?? TremorFilterAlgorithm.movingAverage;
  }
}

/// Interaction type for logging
enum InteractionType {
  tap,
  doubleTap,
  longPress,
  drag,
  pinch,
  swipe,
  voiceCommand,
  dwellSelect,
  switchSelect;

  static InteractionType fromString(String value) {
    const mapping = {
      'tap': InteractionType.tap,
      'double_tap': InteractionType.doubleTap,
      'long_press': InteractionType.longPress,
      'drag': InteractionType.drag,
      'pinch': InteractionType.pinch,
      'swipe': InteractionType.swipe,
      'voice_command': InteractionType.voiceCommand,
      'dwell_select': InteractionType.dwellSelect,
      'switch_select': InteractionType.switchSelect,
    };
    return mapping[value.toLowerCase()] ?? InteractionType.tap;
  }

  String toApiString() {
    const mapping = {
      InteractionType.tap: 'tap',
      InteractionType.doubleTap: 'double_tap',
      InteractionType.longPress: 'long_press',
      InteractionType.drag: 'drag',
      InteractionType.pinch: 'pinch',
      InteractionType.swipe: 'swipe',
      InteractionType.voiceCommand: 'voice_command',
      InteractionType.dwellSelect: 'dwell_select',
      InteractionType.switchSelect: 'switch_select',
    };
    return mapping[this]!;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR PROFILE
// ═══════════════════════════════════════════════════════════════════════════════

/// Complete motor accommodation profile for a learner
class MotorProfile {
  const MotorProfile({
    required this.learnerId,
    required this.tenantId,
    this.id,
    // Motor levels
    this.fineMotorLevel = MotorAbilityLevel.ageAppropriate,
    this.grossMotorLevel = MotorAbilityLevel.ageAppropriate,
    // Physical characteristics
    this.hasTremor = false,
    this.tremorSeverity,
    this.hasLimitedRange = false,
    this.limitedRangeSide,
    this.hasFatigue = false,
    this.fatigueThresholdMinutes,
    // Touch accommodations
    this.enlargedTouchTargets = false,
    this.touchTargetMultiplier = 1.0,
    this.touchHoldDuration = 0,
    this.accidentalTouchFilter = false,
    this.edgeIgnoreMargin = 0,
    // Gesture accommodations
    this.simplifiedGestures = false,
    this.allowSingleFingerGestures = true,
    this.disableMultiTouch = false,
    this.disablePinchZoom = false,
    this.disableSwipe = false,
    this.swipeDistanceMultiplier = 1.0,
    // Drag & drop
    this.dragAssistEnabled = false,
    this.dragSnapToGrid = false,
    this.dragGridSize = 32,
    this.dragAutoComplete = false,
    this.dragAutoCompleteThreshold = 50,
    // Timing
    this.extendedResponseTime = false,
    this.responseTimeMultiplier = 1.0,
    this.disableTimedElements = false,
    this.autoAdvanceDelay = 0,
    // Voice input
    this.voiceInputEnabled = false,
    this.voiceInputForText = false,
    this.voiceInputForNavigation = false,
    // Dwell selection
    this.dwellSelectionEnabled = false,
    this.dwellTimeMs = 1000,
    this.dwellIndicatorStyle = DwellIndicatorStyle.circle,
    // Switch access
    this.switchAccessEnabled = false,
    this.switchAccessMode = SwitchAccessMode.autoScan,
    this.switchScanSpeed = 1000,
    // Input preferences
    this.preferTyping = false,
    this.preferVoiceInput = false,
    this.preferMultipleChoice = true,
    this.showWordPrediction = false,
    this.enlargedKeyboard = false,
    this.keyboardType = KeyboardType.standard,
    // Feedback
    this.enhancedTouchFeedback = false,
    this.hapticFeedbackIntensity = HapticIntensity.normal,
    this.showTouchRipples = true,
    this.highlightFocusedElement = false,
    // Tremor filter
    this.tremorFilterEnabled = false,
    this.tremorFilterStrength = 0.5,
    this.tremorFilterAlgorithm = TremorFilterAlgorithm.movingAverage,
    // Fatigue management
    this.autoBreakReminders = false,
    this.breakReminderIntervalMinutes = 20,
    this.reduceRequirementsOnFatigue = false,
    // Custom gestures
    this.customGestures,
    // Assessment info
    this.assessedBy,
    this.assessedAt,
    this.accommodationNotes,
    this.createdAt,
    this.updatedAt,
  });

  final String? id;
  final String learnerId;
  final String tenantId;

  // Motor levels
  final MotorAbilityLevel fineMotorLevel;
  final MotorAbilityLevel grossMotorLevel;

  // Physical characteristics
  final bool hasTremor;
  final int? tremorSeverity;
  final bool hasLimitedRange;
  final String? limitedRangeSide;
  final bool hasFatigue;
  final int? fatigueThresholdMinutes;

  // Touch accommodations
  final bool enlargedTouchTargets;
  final double touchTargetMultiplier;
  final int touchHoldDuration;
  final bool accidentalTouchFilter;
  final int edgeIgnoreMargin;

  // Gesture accommodations
  final bool simplifiedGestures;
  final bool allowSingleFingerGestures;
  final bool disableMultiTouch;
  final bool disablePinchZoom;
  final bool disableSwipe;
  final double swipeDistanceMultiplier;

  // Drag & drop
  final bool dragAssistEnabled;
  final bool dragSnapToGrid;
  final int dragGridSize;
  final bool dragAutoComplete;
  final int dragAutoCompleteThreshold;

  // Timing
  final bool extendedResponseTime;
  final double responseTimeMultiplier;
  final bool disableTimedElements;
  final int autoAdvanceDelay;

  // Voice input
  final bool voiceInputEnabled;
  final bool voiceInputForText;
  final bool voiceInputForNavigation;

  // Dwell selection
  final bool dwellSelectionEnabled;
  final int dwellTimeMs;
  final DwellIndicatorStyle dwellIndicatorStyle;

  // Switch access
  final bool switchAccessEnabled;
  final SwitchAccessMode switchAccessMode;
  final int switchScanSpeed;

  // Input preferences
  final bool preferTyping;
  final bool preferVoiceInput;
  final bool preferMultipleChoice;
  final bool showWordPrediction;
  final bool enlargedKeyboard;
  final KeyboardType keyboardType;

  // Feedback
  final bool enhancedTouchFeedback;
  final HapticIntensity hapticFeedbackIntensity;
  final bool showTouchRipples;
  final bool highlightFocusedElement;

  // Tremor filter
  final bool tremorFilterEnabled;
  final double tremorFilterStrength;
  final TremorFilterAlgorithm tremorFilterAlgorithm;

  // Fatigue management
  final bool autoBreakReminders;
  final int breakReminderIntervalMinutes;
  final bool reduceRequirementsOnFatigue;

  // Custom gestures
  final Map<String, CustomGesture>? customGestures;

  // Assessment info
  final String? assessedBy;
  final DateTime? assessedAt;
  final String? accommodationNotes;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  /// Check if any motor accommodations are needed
  bool get needsAccommodations =>
      fineMotorLevel != MotorAbilityLevel.ageAppropriate ||
      grossMotorLevel != MotorAbilityLevel.ageAppropriate ||
      hasTremor ||
      hasLimitedRange ||
      hasFatigue;

  /// Check if alternative input methods are enabled
  bool get hasAlternativeInput =>
      voiceInputEnabled || dwellSelectionEnabled || switchAccessEnabled;

  /// Get recommended touch target size in logical pixels
  double get recommendedTouchTargetSize {
    const baseSize = 44.0;
    return baseSize * touchTargetMultiplier;
  }

  factory MotorProfile.fromJson(Map<String, dynamic> json) {
    return MotorProfile(
      id: json['id'] as String?,
      learnerId: json['learnerId'] as String,
      tenantId: json['tenantId'] as String,
      fineMotorLevel: MotorAbilityLevel.fromString(
        json['fineMotorLevel'] as String? ?? 'AGE_APPROPRIATE',
      ),
      grossMotorLevel: MotorAbilityLevel.fromString(
        json['grossMotorLevel'] as String? ?? 'AGE_APPROPRIATE',
      ),
      hasTremor: json['hasTremor'] as bool? ?? false,
      tremorSeverity: json['tremorSeverity'] as int?,
      hasLimitedRange: json['hasLimitedRange'] as bool? ?? false,
      limitedRangeSide: json['limitedRangeSide'] as String?,
      hasFatigue: json['hasFatigue'] as bool? ?? false,
      fatigueThresholdMinutes: json['fatigueThresholdMinutes'] as int?,
      enlargedTouchTargets: json['enlargedTouchTargets'] as bool? ?? false,
      touchTargetMultiplier:
          (json['touchTargetMultiplier'] as num?)?.toDouble() ?? 1.0,
      touchHoldDuration: json['touchHoldDuration'] as int? ?? 0,
      accidentalTouchFilter: json['accidentalTouchFilter'] as bool? ?? false,
      edgeIgnoreMargin: json['edgeIgnoreMargin'] as int? ?? 0,
      simplifiedGestures: json['simplifiedGestures'] as bool? ?? false,
      allowSingleFingerGestures:
          json['allowSingleFingerGestures'] as bool? ?? true,
      disableMultiTouch: json['disableMultiTouch'] as bool? ?? false,
      disablePinchZoom: json['disablePinchZoom'] as bool? ?? false,
      disableSwipe: json['disableSwipe'] as bool? ?? false,
      swipeDistanceMultiplier:
          (json['swipeDistanceMultiplier'] as num?)?.toDouble() ?? 1.0,
      dragAssistEnabled: json['dragAssistEnabled'] as bool? ?? false,
      dragSnapToGrid: json['dragSnapToGrid'] as bool? ?? false,
      dragGridSize: json['dragGridSize'] as int? ?? 32,
      dragAutoComplete: json['dragAutoComplete'] as bool? ?? false,
      dragAutoCompleteThreshold:
          json['dragAutoCompleteThreshold'] as int? ?? 50,
      extendedResponseTime: json['extendedResponseTime'] as bool? ?? false,
      responseTimeMultiplier:
          (json['responseTimeMultiplier'] as num?)?.toDouble() ?? 1.0,
      disableTimedElements: json['disableTimedElements'] as bool? ?? false,
      autoAdvanceDelay: json['autoAdvanceDelay'] as int? ?? 0,
      voiceInputEnabled: json['voiceInputEnabled'] as bool? ?? false,
      voiceInputForText: json['voiceInputForText'] as bool? ?? false,
      voiceInputForNavigation:
          json['voiceInputForNavigation'] as bool? ?? false,
      dwellSelectionEnabled: json['dwellSelectionEnabled'] as bool? ?? false,
      dwellTimeMs: json['dwellTimeMs'] as int? ?? 1000,
      dwellIndicatorStyle: DwellIndicatorStyle.fromString(
        json['dwellIndicatorStyle'] as String? ?? 'circle',
      ),
      switchAccessEnabled: json['switchAccessEnabled'] as bool? ?? false,
      switchAccessMode: SwitchAccessMode.fromString(
        json['switchAccessMode'] as String? ?? 'auto_scan',
      ),
      switchScanSpeed: json['switchScanSpeed'] as int? ?? 1000,
      preferTyping: json['preferTyping'] as bool? ?? false,
      preferVoiceInput: json['preferVoiceInput'] as bool? ?? false,
      preferMultipleChoice: json['preferMultipleChoice'] as bool? ?? true,
      showWordPrediction: json['showWordPrediction'] as bool? ?? false,
      enlargedKeyboard: json['enlargedKeyboard'] as bool? ?? false,
      keyboardType: KeyboardType.fromString(
        json['keyboardType'] as String? ?? 'standard',
      ),
      enhancedTouchFeedback: json['enhancedTouchFeedback'] as bool? ?? false,
      hapticFeedbackIntensity: HapticIntensity.fromString(
        json['hapticFeedbackIntensity'] as String? ?? 'normal',
      ),
      showTouchRipples: json['showTouchRipples'] as bool? ?? true,
      highlightFocusedElement:
          json['highlightFocusedElement'] as bool? ?? false,
      tremorFilterEnabled: json['tremorFilterEnabled'] as bool? ?? false,
      tremorFilterStrength:
          (json['tremorFilterStrength'] as num?)?.toDouble() ?? 0.5,
      tremorFilterAlgorithm: TremorFilterAlgorithm.fromString(
        json['tremorFilterAlgorithm'] as String? ?? 'moving_average',
      ),
      autoBreakReminders: json['autoBreakReminders'] as bool? ?? false,
      breakReminderIntervalMinutes:
          json['breakReminderIntervalMinutes'] as int? ?? 20,
      reduceRequirementsOnFatigue:
          json['reduceRequirementsOnFatigue'] as bool? ?? false,
      customGestures: (json['customGestures'] as Map<String, dynamic>?)?.map(
        (k, v) => MapEntry(k, CustomGesture.fromJson(v as Map<String, dynamic>)),
      ),
      assessedBy: json['assessedBy'] as String?,
      assessedAt: json['assessedAt'] != null
          ? DateTime.parse(json['assessedAt'] as String)
          : null,
      accommodationNotes: json['accommodationNotes'] as String?,
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'] as String)
          : null,
      updatedAt: json['updatedAt'] != null
          ? DateTime.parse(json['updatedAt'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'learnerId': learnerId,
      'tenantId': tenantId,
      'fineMotorLevel': fineMotorLevel.toApiString(),
      'grossMotorLevel': grossMotorLevel.toApiString(),
      'hasTremor': hasTremor,
      if (tremorSeverity != null) 'tremorSeverity': tremorSeverity,
      'hasLimitedRange': hasLimitedRange,
      if (limitedRangeSide != null) 'limitedRangeSide': limitedRangeSide,
      'hasFatigue': hasFatigue,
      if (fatigueThresholdMinutes != null)
        'fatigueThresholdMinutes': fatigueThresholdMinutes,
      'enlargedTouchTargets': enlargedTouchTargets,
      'touchTargetMultiplier': touchTargetMultiplier,
      'touchHoldDuration': touchHoldDuration,
      'accidentalTouchFilter': accidentalTouchFilter,
      'edgeIgnoreMargin': edgeIgnoreMargin,
      'simplifiedGestures': simplifiedGestures,
      'allowSingleFingerGestures': allowSingleFingerGestures,
      'disableMultiTouch': disableMultiTouch,
      'disablePinchZoom': disablePinchZoom,
      'disableSwipe': disableSwipe,
      'swipeDistanceMultiplier': swipeDistanceMultiplier,
      'dragAssistEnabled': dragAssistEnabled,
      'dragSnapToGrid': dragSnapToGrid,
      'dragGridSize': dragGridSize,
      'dragAutoComplete': dragAutoComplete,
      'dragAutoCompleteThreshold': dragAutoCompleteThreshold,
      'extendedResponseTime': extendedResponseTime,
      'responseTimeMultiplier': responseTimeMultiplier,
      'disableTimedElements': disableTimedElements,
      'autoAdvanceDelay': autoAdvanceDelay,
      'voiceInputEnabled': voiceInputEnabled,
      'voiceInputForText': voiceInputForText,
      'voiceInputForNavigation': voiceInputForNavigation,
      'dwellSelectionEnabled': dwellSelectionEnabled,
      'dwellTimeMs': dwellTimeMs,
      'dwellIndicatorStyle': dwellIndicatorStyle.name,
      'switchAccessEnabled': switchAccessEnabled,
      'switchAccessMode': switchAccessMode.toApiString(),
      'switchScanSpeed': switchScanSpeed,
      'preferTyping': preferTyping,
      'preferVoiceInput': preferVoiceInput,
      'preferMultipleChoice': preferMultipleChoice,
      'showWordPrediction': showWordPrediction,
      'enlargedKeyboard': enlargedKeyboard,
      'keyboardType': keyboardType.toApiString(),
      'enhancedTouchFeedback': enhancedTouchFeedback,
      'hapticFeedbackIntensity': hapticFeedbackIntensity.name,
      'showTouchRipples': showTouchRipples,
      'highlightFocusedElement': highlightFocusedElement,
      'tremorFilterEnabled': tremorFilterEnabled,
      'tremorFilterStrength': tremorFilterStrength,
      'tremorFilterAlgorithm': tremorFilterAlgorithm.name,
      'autoBreakReminders': autoBreakReminders,
      'breakReminderIntervalMinutes': breakReminderIntervalMinutes,
      'reduceRequirementsOnFatigue': reduceRequirementsOnFatigue,
      if (customGestures != null)
        'customGestures':
            customGestures!.map((k, v) => MapEntry(k, v.toJson())),
      if (assessedBy != null) 'assessedBy': assessedBy,
      if (assessedAt != null) 'assessedAt': assessedAt!.toIso8601String(),
      if (accommodationNotes != null) 'accommodationNotes': accommodationNotes,
      if (createdAt != null) 'createdAt': createdAt!.toIso8601String(),
      if (updatedAt != null) 'updatedAt': updatedAt!.toIso8601String(),
    };
  }

  MotorProfile copyWith({
    String? id,
    String? learnerId,
    String? tenantId,
    MotorAbilityLevel? fineMotorLevel,
    MotorAbilityLevel? grossMotorLevel,
    bool? hasTremor,
    int? tremorSeverity,
    bool? hasLimitedRange,
    String? limitedRangeSide,
    bool? hasFatigue,
    int? fatigueThresholdMinutes,
    bool? enlargedTouchTargets,
    double? touchTargetMultiplier,
    int? touchHoldDuration,
    bool? accidentalTouchFilter,
    int? edgeIgnoreMargin,
    bool? simplifiedGestures,
    bool? allowSingleFingerGestures,
    bool? disableMultiTouch,
    bool? disablePinchZoom,
    bool? disableSwipe,
    double? swipeDistanceMultiplier,
    bool? dragAssistEnabled,
    bool? dragSnapToGrid,
    int? dragGridSize,
    bool? dragAutoComplete,
    int? dragAutoCompleteThreshold,
    bool? extendedResponseTime,
    double? responseTimeMultiplier,
    bool? disableTimedElements,
    int? autoAdvanceDelay,
    bool? voiceInputEnabled,
    bool? voiceInputForText,
    bool? voiceInputForNavigation,
    bool? dwellSelectionEnabled,
    int? dwellTimeMs,
    DwellIndicatorStyle? dwellIndicatorStyle,
    bool? switchAccessEnabled,
    SwitchAccessMode? switchAccessMode,
    int? switchScanSpeed,
    bool? preferTyping,
    bool? preferVoiceInput,
    bool? preferMultipleChoice,
    bool? showWordPrediction,
    bool? enlargedKeyboard,
    KeyboardType? keyboardType,
    bool? enhancedTouchFeedback,
    HapticIntensity? hapticFeedbackIntensity,
    bool? showTouchRipples,
    bool? highlightFocusedElement,
    bool? tremorFilterEnabled,
    double? tremorFilterStrength,
    TremorFilterAlgorithm? tremorFilterAlgorithm,
    bool? autoBreakReminders,
    int? breakReminderIntervalMinutes,
    bool? reduceRequirementsOnFatigue,
    Map<String, CustomGesture>? customGestures,
    String? assessedBy,
    DateTime? assessedAt,
    String? accommodationNotes,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return MotorProfile(
      id: id ?? this.id,
      learnerId: learnerId ?? this.learnerId,
      tenantId: tenantId ?? this.tenantId,
      fineMotorLevel: fineMotorLevel ?? this.fineMotorLevel,
      grossMotorLevel: grossMotorLevel ?? this.grossMotorLevel,
      hasTremor: hasTremor ?? this.hasTremor,
      tremorSeverity: tremorSeverity ?? this.tremorSeverity,
      hasLimitedRange: hasLimitedRange ?? this.hasLimitedRange,
      limitedRangeSide: limitedRangeSide ?? this.limitedRangeSide,
      hasFatigue: hasFatigue ?? this.hasFatigue,
      fatigueThresholdMinutes:
          fatigueThresholdMinutes ?? this.fatigueThresholdMinutes,
      enlargedTouchTargets: enlargedTouchTargets ?? this.enlargedTouchTargets,
      touchTargetMultiplier:
          touchTargetMultiplier ?? this.touchTargetMultiplier,
      touchHoldDuration: touchHoldDuration ?? this.touchHoldDuration,
      accidentalTouchFilter:
          accidentalTouchFilter ?? this.accidentalTouchFilter,
      edgeIgnoreMargin: edgeIgnoreMargin ?? this.edgeIgnoreMargin,
      simplifiedGestures: simplifiedGestures ?? this.simplifiedGestures,
      allowSingleFingerGestures:
          allowSingleFingerGestures ?? this.allowSingleFingerGestures,
      disableMultiTouch: disableMultiTouch ?? this.disableMultiTouch,
      disablePinchZoom: disablePinchZoom ?? this.disablePinchZoom,
      disableSwipe: disableSwipe ?? this.disableSwipe,
      swipeDistanceMultiplier:
          swipeDistanceMultiplier ?? this.swipeDistanceMultiplier,
      dragAssistEnabled: dragAssistEnabled ?? this.dragAssistEnabled,
      dragSnapToGrid: dragSnapToGrid ?? this.dragSnapToGrid,
      dragGridSize: dragGridSize ?? this.dragGridSize,
      dragAutoComplete: dragAutoComplete ?? this.dragAutoComplete,
      dragAutoCompleteThreshold:
          dragAutoCompleteThreshold ?? this.dragAutoCompleteThreshold,
      extendedResponseTime: extendedResponseTime ?? this.extendedResponseTime,
      responseTimeMultiplier:
          responseTimeMultiplier ?? this.responseTimeMultiplier,
      disableTimedElements: disableTimedElements ?? this.disableTimedElements,
      autoAdvanceDelay: autoAdvanceDelay ?? this.autoAdvanceDelay,
      voiceInputEnabled: voiceInputEnabled ?? this.voiceInputEnabled,
      voiceInputForText: voiceInputForText ?? this.voiceInputForText,
      voiceInputForNavigation:
          voiceInputForNavigation ?? this.voiceInputForNavigation,
      dwellSelectionEnabled:
          dwellSelectionEnabled ?? this.dwellSelectionEnabled,
      dwellTimeMs: dwellTimeMs ?? this.dwellTimeMs,
      dwellIndicatorStyle: dwellIndicatorStyle ?? this.dwellIndicatorStyle,
      switchAccessEnabled: switchAccessEnabled ?? this.switchAccessEnabled,
      switchAccessMode: switchAccessMode ?? this.switchAccessMode,
      switchScanSpeed: switchScanSpeed ?? this.switchScanSpeed,
      preferTyping: preferTyping ?? this.preferTyping,
      preferVoiceInput: preferVoiceInput ?? this.preferVoiceInput,
      preferMultipleChoice: preferMultipleChoice ?? this.preferMultipleChoice,
      showWordPrediction: showWordPrediction ?? this.showWordPrediction,
      enlargedKeyboard: enlargedKeyboard ?? this.enlargedKeyboard,
      keyboardType: keyboardType ?? this.keyboardType,
      enhancedTouchFeedback:
          enhancedTouchFeedback ?? this.enhancedTouchFeedback,
      hapticFeedbackIntensity:
          hapticFeedbackIntensity ?? this.hapticFeedbackIntensity,
      showTouchRipples: showTouchRipples ?? this.showTouchRipples,
      highlightFocusedElement:
          highlightFocusedElement ?? this.highlightFocusedElement,
      tremorFilterEnabled: tremorFilterEnabled ?? this.tremorFilterEnabled,
      tremorFilterStrength: tremorFilterStrength ?? this.tremorFilterStrength,
      tremorFilterAlgorithm:
          tremorFilterAlgorithm ?? this.tremorFilterAlgorithm,
      autoBreakReminders: autoBreakReminders ?? this.autoBreakReminders,
      breakReminderIntervalMinutes:
          breakReminderIntervalMinutes ?? this.breakReminderIntervalMinutes,
      reduceRequirementsOnFatigue:
          reduceRequirementsOnFatigue ?? this.reduceRequirementsOnFatigue,
      customGestures: customGestures ?? this.customGestures,
      assessedBy: assessedBy ?? this.assessedBy,
      assessedAt: assessedAt ?? this.assessedAt,
      accommodationNotes: accommodationNotes ?? this.accommodationNotes,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  /// Create a default motor profile for a learner
  factory MotorProfile.defaults({
    required String learnerId,
    String? tenantId,
  }) {
    return MotorProfile(
      learnerId: learnerId,
      tenantId: tenantId ?? 'default',
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MOTOR ACCOMMODATIONS (Runtime subset)
// ═══════════════════════════════════════════════════════════════════════════════

/// Active accommodations to apply at runtime
/// This is a subset of the full MotorProfile for efficient runtime access
class MotorAccommodations {
  const MotorAccommodations({
    // Touch
    this.touchTargetMultiplier = 1.0,
    this.touchHoldDuration = 0,
    this.accidentalTouchFilter = false,
    this.edgeIgnoreMargin = 0,
    // Gestures
    this.simplifiedGestures = false,
    this.allowSingleFingerGestures = true,
    this.swipeDistanceMultiplier = 1.0,
    this.disableMultiTouch = false,
    // Drag & drop
    this.dragAssistEnabled = false,
    this.dragSnapToGrid = false,
    this.dragGridSize = 20,
    this.dragAutoComplete = false,
    this.dragAutoCompleteThreshold = 30,
    // Timing
    this.responseTimeMultiplier = 1.0,
    this.disableTimedElements = false,
    // Input methods
    this.voiceInputEnabled = false,
    this.dwellSelectionEnabled = false,
    this.dwellTimeMs = 1000,
    this.dwellIndicatorStyle = 'circle',
    this.switchAccessEnabled = false,
    this.switchScanSpeed = 1000,
    // Keyboard
    this.preferTyping = false,
    this.enlargedKeyboard = false,
    this.keyboardType = 'standard',
    this.showWordPrediction = true,
    // Feedback
    this.enhancedTouchFeedback = false,
    this.hapticFeedbackIntensity = 'normal',
    this.showTouchRipples = true,
    this.highlightFocusedElement = false,
    // Tremor
    this.tremorFilterEnabled = false,
    this.tremorFilterStrength = 50,
    this.tremorSmoothingFactor = 0.7,
    this.tremorWindowSize = 5,
    this.tremorMovementThreshold = 3,
    // Fatigue
    this.autoBreakReminders = false,
    this.breakReminderIntervalMinutes = 20,
    this.reduceRequirementsOnFatigue = false,
    this.hasFatigue = false,
    this.fatigueThresholdMinutes,
  });

  // Touch
  final double touchTargetMultiplier;
  final int touchHoldDuration;
  final bool accidentalTouchFilter;
  final int edgeIgnoreMargin;

  // Gestures
  final bool simplifiedGestures;
  final bool allowSingleFingerGestures;
  final double swipeDistanceMultiplier;
  final bool disableMultiTouch;

  // Drag & drop
  final bool dragAssistEnabled;
  final bool dragSnapToGrid;
  final int dragGridSize;
  final bool dragAutoComplete;
  final int dragAutoCompleteThreshold;

  // Timing
  final double responseTimeMultiplier;
  final bool disableTimedElements;

  // Input methods
  final bool voiceInputEnabled;
  final bool dwellSelectionEnabled;
  final int dwellTimeMs;
  final String dwellIndicatorStyle;
  final bool switchAccessEnabled;
  final int switchScanSpeed;

  // Keyboard
  final bool preferTyping;
  final bool enlargedKeyboard;
  final String keyboardType;
  final bool showWordPrediction;

  // Feedback
  final bool enhancedTouchFeedback;
  final String hapticFeedbackIntensity;
  final bool showTouchRipples;
  final bool highlightFocusedElement;

  // Tremor
  final bool tremorFilterEnabled;
  final int tremorFilterStrength;
  final double tremorSmoothingFactor;
  final int tremorWindowSize;
  final int tremorMovementThreshold;

  // Fatigue
  final bool autoBreakReminders;
  final int breakReminderIntervalMinutes;
  final bool reduceRequirementsOnFatigue;
  final bool hasFatigue;
  final int? fatigueThresholdMinutes;

  /// Check if hold-to-activate is enabled
  bool get holdToActivateEnabled => touchHoldDuration > 0;

  /// Check if gestures should be converted to buttons
  bool get gesturesToButtons => simplifiedGestures;

  factory MotorAccommodations.defaults() => const MotorAccommodations();

  factory MotorAccommodations.fromJson(Map<String, dynamic> json) {
    return MotorAccommodations(
      touchTargetMultiplier:
          (json['touchTargetMultiplier'] as num?)?.toDouble() ?? 1.0,
      touchHoldDuration: json['touchHoldDuration'] as int? ?? 0,
      accidentalTouchFilter: json['accidentalTouchFilter'] as bool? ?? false,
      edgeIgnoreMargin: json['edgeIgnoreMargin'] as int? ?? 0,
      simplifiedGestures: json['simplifiedGestures'] as bool? ?? false,
      allowSingleFingerGestures:
          json['allowSingleFingerGestures'] as bool? ?? true,
      swipeDistanceMultiplier:
          (json['swipeDistanceMultiplier'] as num?)?.toDouble() ?? 1.0,
      disableMultiTouch: json['disableMultiTouch'] as bool? ?? false,
      dragAssistEnabled: json['dragAssistEnabled'] as bool? ?? false,
      dragSnapToGrid: json['dragSnapToGrid'] as bool? ?? false,
      dragGridSize: json['dragGridSize'] as int? ?? 20,
      dragAutoComplete: json['dragAutoComplete'] as bool? ?? false,
      dragAutoCompleteThreshold:
          json['dragAutoCompleteThreshold'] as int? ?? 30,
      responseTimeMultiplier:
          (json['responseTimeMultiplier'] as num?)?.toDouble() ?? 1.0,
      disableTimedElements: json['disableTimedElements'] as bool? ?? false,
      voiceInputEnabled: json['voiceInputEnabled'] as bool? ?? false,
      dwellSelectionEnabled: json['dwellSelectionEnabled'] as bool? ?? false,
      dwellTimeMs: json['dwellTimeMs'] as int? ?? 1000,
      dwellIndicatorStyle: json['dwellIndicatorStyle'] as String? ?? 'circle',
      switchAccessEnabled: json['switchAccessEnabled'] as bool? ?? false,
      switchScanSpeed: json['switchScanSpeed'] as int? ?? 1000,
      preferTyping: json['preferTyping'] as bool? ?? false,
      enlargedKeyboard: json['enlargedKeyboard'] as bool? ?? false,
      keyboardType: json['keyboardType'] as String? ?? 'standard',
      showWordPrediction: json['showWordPrediction'] as bool? ?? true,
      enhancedTouchFeedback: json['enhancedTouchFeedback'] as bool? ?? false,
      hapticFeedbackIntensity:
          json['hapticFeedbackIntensity'] as String? ?? 'normal',
      showTouchRipples: json['showTouchRipples'] as bool? ?? true,
      highlightFocusedElement:
          json['highlightFocusedElement'] as bool? ?? false,
      tremorFilterEnabled: json['tremorFilterEnabled'] as bool? ?? false,
      tremorFilterStrength: json['tremorFilterStrength'] as int? ?? 50,
      tremorSmoothingFactor:
          (json['tremorSmoothingFactor'] as num?)?.toDouble() ?? 0.7,
      tremorWindowSize: json['tremorWindowSize'] as int? ?? 5,
      tremorMovementThreshold: json['tremorMovementThreshold'] as int? ?? 3,
      autoBreakReminders: json['autoBreakReminders'] as bool? ?? false,
      breakReminderIntervalMinutes:
          json['breakReminderIntervalMinutes'] as int? ?? 20,
      reduceRequirementsOnFatigue:
          json['reduceRequirementsOnFatigue'] as bool? ?? false,
      hasFatigue: json['hasFatigue'] as bool? ?? false,
      fatigueThresholdMinutes: json['fatigueThresholdMinutes'] as int?,
    );
  }

  /// Create accommodations from a full MotorProfile
  factory MotorAccommodations.fromProfile(MotorProfile profile) {
    // Calculate smoothing factor based on filter strength
    // Higher strength = higher smoothing (more aggressive filtering)
    final smoothingFactor = 0.5 + (profile.tremorFilterStrength * 0.4);
    
    return MotorAccommodations(
      touchTargetMultiplier: profile.touchTargetMultiplier,
      touchHoldDuration: profile.touchHoldDuration,
      accidentalTouchFilter: profile.accidentalTouchFilter,
      edgeIgnoreMargin: profile.edgeIgnoreMargin,
      simplifiedGestures: profile.simplifiedGestures,
      allowSingleFingerGestures: profile.allowSingleFingerGestures,
      swipeDistanceMultiplier: profile.swipeDistanceMultiplier,
      disableMultiTouch: profile.disableMultiTouch,
      dragAssistEnabled: profile.dragAssistEnabled,
      dragSnapToGrid: profile.dragSnapToGrid,
      dragGridSize: profile.dragGridSize,
      dragAutoComplete: profile.dragAutoComplete,
      dragAutoCompleteThreshold: profile.dragAutoCompleteThreshold,
      responseTimeMultiplier: profile.responseTimeMultiplier,
      disableTimedElements: profile.disableTimedElements,
      voiceInputEnabled: profile.voiceInputEnabled,
      dwellSelectionEnabled: profile.dwellSelectionEnabled,
      dwellTimeMs: profile.dwellTimeMs,
      dwellIndicatorStyle: profile.dwellIndicatorStyle.name,
      switchAccessEnabled: profile.switchAccessEnabled,
      switchScanSpeed: profile.switchScanSpeed,
      preferTyping: profile.preferTyping,
      enlargedKeyboard: profile.enlargedKeyboard,
      keyboardType: profile.keyboardType.toApiString(),
      showWordPrediction: profile.showWordPrediction,
      enhancedTouchFeedback: profile.enhancedTouchFeedback,
      hapticFeedbackIntensity: profile.hapticFeedbackIntensity.name,
      showTouchRipples: profile.showTouchRipples,
      highlightFocusedElement: profile.highlightFocusedElement,
      tremorFilterEnabled: profile.tremorFilterEnabled,
      // Convert 0.0-1.0 to 0-100 percentage scale
      tremorFilterStrength: (profile.tremorFilterStrength * 100).round(),
      // Smoothing factor for the EMA algorithm (0.5-0.9 range)
      tremorSmoothingFactor: smoothingFactor,
      tremorWindowSize: 5, // Default window size for moving average
      tremorMovementThreshold: 3, // Minimum movement threshold in pixels
      autoBreakReminders: profile.autoBreakReminders,
      breakReminderIntervalMinutes: profile.breakReminderIntervalMinutes,
      reduceRequirementsOnFatigue: profile.reduceRequirementsOnFatigue,
      hasFatigue: profile.hasFatigue,
      fatigueThresholdMinutes: profile.fatigueThresholdMinutes,
    );
  }

  Map<String, dynamic> toJson() => {
        'touchTargetMultiplier': touchTargetMultiplier,
        'touchHoldDuration': touchHoldDuration,
        'accidentalTouchFilter': accidentalTouchFilter,
        'edgeIgnoreMargin': edgeIgnoreMargin,
        'simplifiedGestures': simplifiedGestures,
        'allowSingleFingerGestures': allowSingleFingerGestures,
        'swipeDistanceMultiplier': swipeDistanceMultiplier,
        'disableMultiTouch': disableMultiTouch,
        'dragAssistEnabled': dragAssistEnabled,
        'dragSnapToGrid': dragSnapToGrid,
        'dragGridSize': dragGridSize,
        'dragAutoComplete': dragAutoComplete,
        'dragAutoCompleteThreshold': dragAutoCompleteThreshold,
        'responseTimeMultiplier': responseTimeMultiplier,
        'disableTimedElements': disableTimedElements,
        'voiceInputEnabled': voiceInputEnabled,
        'dwellSelectionEnabled': dwellSelectionEnabled,
        'dwellTimeMs': dwellTimeMs,
        'dwellIndicatorStyle': dwellIndicatorStyle,
        'switchAccessEnabled': switchAccessEnabled,
        'switchScanSpeed': switchScanSpeed,
        'preferTyping': preferTyping,
        'enlargedKeyboard': enlargedKeyboard,
        'keyboardType': keyboardType,
        'showWordPrediction': showWordPrediction,
        'enhancedTouchFeedback': enhancedTouchFeedback,
        'hapticFeedbackIntensity': hapticFeedbackIntensity,
        'showTouchRipples': showTouchRipples,
        'highlightFocusedElement': highlightFocusedElement,
        'tremorFilterEnabled': tremorFilterEnabled,
        'tremorFilterStrength': tremorFilterStrength,
        'tremorSmoothingFactor': tremorSmoothingFactor,
        'tremorWindowSize': tremorWindowSize,
        'tremorMovementThreshold': tremorMovementThreshold,
        'autoBreakReminders': autoBreakReminders,
        'breakReminderIntervalMinutes': breakReminderIntervalMinutes,
        'reduceRequirementsOnFatigue': reduceRequirementsOnFatigue,
        'hasFatigue': hasFatigue,
        if (fatigueThresholdMinutes != null)
          'fatigueThresholdMinutes': fatigueThresholdMinutes,
      };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPORTING TYPES
// ═══════════════════════════════════════════════════════════════════════════════

/// Custom gesture configuration
class CustomGesture {
  const CustomGesture({
    required this.action,
    required this.gesture,
  });

  final String action;
  final String gesture;

  factory CustomGesture.fromJson(Map<String, dynamic> json) {
    return CustomGesture(
      action: json['action'] as String,
      gesture: json['gesture'] as String,
    );
  }

  Map<String, dynamic> toJson() => {
        'action': action,
        'gesture': gesture,
      };
}

/// Motor interaction log for analytics
class MotorInteractionLog {
  const MotorInteractionLog({
    required this.learnerId,
    required this.tenantId,
    required this.interactionType,
    required this.attemptCount,
    required this.successful,
    required this.usedAlternative,
    required this.accommodationsActive,
    this.id,
    this.sessionId,
    this.targetElement,
    this.successOnAttempt,
    this.totalTimeMs,
    this.targetHitAccuracy,
    this.dragPathSmoothness,
    this.alternativeMethod,
    this.timestamp,
  });

  final String? id;
  final String learnerId;
  final String tenantId;
  final String? sessionId;
  final InteractionType interactionType;
  final String? targetElement;
  final int attemptCount;
  final int? successOnAttempt;
  final int? totalTimeMs;
  final double? targetHitAccuracy;
  final double? dragPathSmoothness;
  final List<String> accommodationsActive;
  final bool successful;
  final bool usedAlternative;
  final String? alternativeMethod;
  final DateTime? timestamp;

  factory MotorInteractionLog.fromJson(Map<String, dynamic> json) {
    return MotorInteractionLog(
      id: json['id'] as String?,
      learnerId: json['learnerId'] as String,
      tenantId: json['tenantId'] as String,
      sessionId: json['sessionId'] as String?,
      interactionType: InteractionType.fromString(
        json['interactionType'] as String,
      ),
      targetElement: json['targetElement'] as String?,
      attemptCount: json['attemptCount'] as int,
      successOnAttempt: json['successOnAttempt'] as int?,
      totalTimeMs: json['totalTimeMs'] as int?,
      targetHitAccuracy: (json['targetHitAccuracy'] as num?)?.toDouble(),
      dragPathSmoothness: (json['dragPathSmoothness'] as num?)?.toDouble(),
      accommodationsActive:
          (json['accommodationsActive'] as List<dynamic>?)?.cast<String>() ??
              [],
      successful: json['successful'] as bool,
      usedAlternative: json['usedAlternative'] as bool,
      alternativeMethod: json['alternativeMethod'] as String?,
      timestamp: json['timestamp'] != null
          ? DateTime.parse(json['timestamp'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() => {
        if (id != null) 'id': id,
        'learnerId': learnerId,
        'tenantId': tenantId,
        if (sessionId != null) 'sessionId': sessionId,
        'interactionType': interactionType.toApiString(),
        if (targetElement != null) 'targetElement': targetElement,
        'attemptCount': attemptCount,
        if (successOnAttempt != null) 'successOnAttempt': successOnAttempt,
        if (totalTimeMs != null) 'totalTimeMs': totalTimeMs,
        if (targetHitAccuracy != null) 'targetHitAccuracy': targetHitAccuracy,
        if (dragPathSmoothness != null)
          'dragPathSmoothness': dragPathSmoothness,
        'accommodationsActive': accommodationsActive,
        'successful': successful,
        'usedAlternative': usedAlternative,
        if (alternativeMethod != null) 'alternativeMethod': alternativeMethod,
        if (timestamp != null) 'timestamp': timestamp!.toIso8601String(),
      };
}

/// Accommodation suggestion from analytics
class AccommodationSuggestion {
  const AccommodationSuggestion({
    required this.suggestions,
    required this.recommendedChanges,
  });

  final List<String> suggestions;
  final Map<String, dynamic> recommendedChanges;

  factory AccommodationSuggestion.fromJson(Map<String, dynamic> json) {
    return AccommodationSuggestion(
      suggestions:
          (json['suggestions'] as List<dynamic>?)?.cast<String>() ?? [],
      recommendedChanges: json['recommendedChanges'] as Map<String, dynamic>? ??
          {},
    );
  }

  Map<String, dynamic> toJson() => {
        'suggestions': suggestions,
        'recommendedChanges': recommendedChanges,
      };
}

/// Content adaptations based on motor profile
class MotorContentAdaptations {
  const MotorContentAdaptations({
    required this.preferredInputTypes,
    required this.avoidInputTypes,
    required this.activityModifications,
  });

  final List<String> preferredInputTypes;
  final List<String> avoidInputTypes;
  final Map<String, dynamic> activityModifications;

  factory MotorContentAdaptations.fromJson(Map<String, dynamic> json) {
    return MotorContentAdaptations(
      preferredInputTypes:
          (json['preferredInputTypes'] as List<dynamic>?)?.cast<String>() ?? [],
      avoidInputTypes:
          (json['avoidInputTypes'] as List<dynamic>?)?.cast<String>() ?? [],
      activityModifications:
          json['activityModifications'] as Map<String, dynamic>? ?? {},
    );
  }

  Map<String, dynamic> toJson() => {
        'preferredInputTypes': preferredInputTypes,
        'avoidInputTypes': avoidInputTypes,
        'activityModifications': activityModifications,
      };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/// Default motor profile settings
class MotorConstants {
  MotorConstants._();

  /// Minimum touch target size (Apple HIG recommendation)
  static const double minTouchTargetSize = 44.0;

  /// Touch target sizes by multiplier level
  static const Map<String, double> touchTargetSizes = {
    'small': 36.0,
    'normal': 44.0,
    'large': 56.0,
    'extraLarge': 72.0,
    'huge': 96.0,
  };

  /// Touch target multipliers by motor level
  static const Map<MotorAbilityLevel, double> levelMultipliers = {
    MotorAbilityLevel.ageAppropriate: 1.0,
    MotorAbilityLevel.mildDifficulty: 1.25,
    MotorAbilityLevel.moderateDifficulty: 1.5,
    MotorAbilityLevel.significantDifficulty: 1.75,
    MotorAbilityLevel.requiresFullSupport: 2.0,
  };

  /// Minimum dwell time for dwell selection
  static const int minDwellTimeMs = 500;

  /// Maximum dwell time for dwell selection
  static const int maxDwellTimeMs = 3000;

  /// Default tremor filter strength
  static const double defaultTremorFilterStrength = 0.5;

  /// Minimum samples for tremor filtering
  static const int tremorFilterMinSamples = 5;
}
