/// Life Skills Data Models
/// 
/// Type-safe models for life skills data from the API.

import 'dart:ui' show Color;
import 'package:flutter/foundation.dart';

/// Skill category enum
enum SkillCategory {
  personalHygiene,
  eatingSkills,
  dressing,
  safetyAwareness,
  socialSkills,
  dailyRoutines,
  communitySkills,
  homeSkills,
  communication,
  moneySkills;

  String get displayName {
    switch (this) {
      case SkillCategory.personalHygiene:
        return 'Personal Hygiene';
      case SkillCategory.eatingSkills:
        return 'Eating Skills';
      case SkillCategory.dressing:
        return 'Dressing';
      case SkillCategory.safetyAwareness:
        return 'Safety Awareness';
      case SkillCategory.socialSkills:
        return 'Social Skills';
      case SkillCategory.dailyRoutines:
        return 'Daily Routines';
      case SkillCategory.communitySkills:
        return 'Community Skills';
      case SkillCategory.homeSkills:
        return 'Home Skills';
      case SkillCategory.communication:
        return 'Communication';
      case SkillCategory.moneySkills:
        return 'Money Skills';
    }
  }

  String get icon {
    switch (this) {
      case SkillCategory.personalHygiene:
        return '🪥';
      case SkillCategory.eatingSkills:
        return '🍴';
      case SkillCategory.dressing:
        return '👕';
      case SkillCategory.safetyAwareness:
        return '⚠️';
      case SkillCategory.socialSkills:
        return '👋';
      case SkillCategory.dailyRoutines:
        return '📅';
      case SkillCategory.communitySkills:
        return '🏪';
      case SkillCategory.homeSkills:
        return '🏠';
      case SkillCategory.communication:
        return '💬';
      case SkillCategory.moneySkills:
        return '💰';
    }
  }

  static SkillCategory fromString(String value) {
    final normalized = value.toUpperCase().replaceAll('_', '');
    return SkillCategory.values.firstWhere(
      (e) => e.name.toUpperCase() == normalized || 
             e.name.toUpperCase().replaceAll('_', '') == normalized,
      orElse: () => SkillCategory.dailyRoutines,
    );
  }
}

/// Difficulty level enum
enum DifficultyLevel {
  foundational,
  emerging,
  developing,
  proficient,
  independent;

  String get displayName {
    switch (this) {
      case DifficultyLevel.foundational:
        return 'Foundational';
      case DifficultyLevel.emerging:
        return 'Emerging';
      case DifficultyLevel.developing:
        return 'Developing';
      case DifficultyLevel.proficient:
        return 'Proficient';
      case DifficultyLevel.independent:
        return 'Independent';
    }
  }

  static DifficultyLevel fromString(String value) {
    return DifficultyLevel.values.firstWhere(
      (e) => e.name.toUpperCase() == value.toUpperCase(),
      orElse: () => DifficultyLevel.foundational,
    );
  }
}

/// Progress status enum
enum ProgressStatus {
  notIntroduced,
  introduced,
  prompted,
  partial,
  independent,
  generalized;

  String get displayName {
    switch (this) {
      case ProgressStatus.notIntroduced:
        return 'Not Started';
      case ProgressStatus.introduced:
        return 'Just Started';
      case ProgressStatus.prompted:
        return 'With Help';
      case ProgressStatus.partial:
        return 'Almost There';
      case ProgressStatus.independent:
        return 'Independent';
      case ProgressStatus.generalized:
        return 'Mastered';
    }
  }

  double get progressPercent {
    switch (this) {
      case ProgressStatus.notIntroduced:
        return 0.0;
      case ProgressStatus.introduced:
        return 0.2;
      case ProgressStatus.prompted:
        return 0.4;
      case ProgressStatus.partial:
        return 0.6;
      case ProgressStatus.independent:
        return 0.8;
      case ProgressStatus.generalized:
        return 1.0;
    }
  }

  static ProgressStatus fromString(String value) {
    final normalized = value.toUpperCase().replaceAll('_', '');
    return ProgressStatus.values.firstWhere(
      (e) => e.name.toUpperCase() == normalized ||
             e.name.toUpperCase().replaceAll('_', '') == normalized,
      orElse: () => ProgressStatus.notIntroduced,
    );
  }
}

/// Prompt level enum
enum PromptLevel {
  fullPhysical,
  partialPhysical,
  modeling,
  gestural,
  verbal,
  visual,
  independent;

  String get displayName {
    switch (this) {
      case PromptLevel.fullPhysical:
        return 'Hand-over-hand';
      case PromptLevel.partialPhysical:
        return 'Light touch';
      case PromptLevel.modeling:
        return 'Watch me';
      case PromptLevel.gestural:
        return 'Pointing';
      case PromptLevel.verbal:
        return 'Verbal cues';
      case PromptLevel.visual:
        return 'Visual cues';
      case PromptLevel.independent:
        return 'No help needed';
    }
  }

  String get apiValue {
    switch (this) {
      case PromptLevel.fullPhysical:
        return 'FULL_PHYSICAL';
      case PromptLevel.partialPhysical:
        return 'PARTIAL_PHYSICAL';
      case PromptLevel.modeling:
        return 'MODELING';
      case PromptLevel.gestural:
        return 'GESTURAL';
      case PromptLevel.verbal:
        return 'VERBAL';
      case PromptLevel.visual:
        return 'VISUAL';
      case PromptLevel.independent:
        return 'INDEPENDENT';
    }
  }

  static PromptLevel fromString(String value) {
    final normalized = value.toUpperCase().replaceAll('_', '');
    return PromptLevel.values.firstWhere(
      (e) => e.name.toUpperCase() == normalized ||
             e.apiValue == value.toUpperCase(),
      orElse: () => PromptLevel.verbal,
    );
  }
}

/// Life skill model
@immutable
class LifeSkill {
  final String id;
  final String code;
  final String name;
  final String description;
  final SkillCategory category;
  final DifficultyLevel difficultyLevel;
  final String? iconUrl;
  final String? coverImageUrl;
  final String? themeColor;
  final int? estimatedMinutes;
  final int? totalSteps;

  const LifeSkill({
    required this.id,
    required this.code,
    required this.name,
    required this.description,
    required this.category,
    required this.difficultyLevel,
    this.iconUrl,
    this.coverImageUrl,
    this.themeColor,
    this.estimatedMinutes,
    this.totalSteps,
  });

  factory LifeSkill.fromJson(Map<String, dynamic> json) {
    return LifeSkill(
      id: json['id'] as String,
      code: json['code'] as String,
      name: json['name'] as String,
      description: json['description'] as String,
      category: SkillCategory.fromString(json['category'] as String),
      difficultyLevel: DifficultyLevel.fromString(json['difficultyLevel'] as String),
      iconUrl: json['iconUrl'] as String?,
      coverImageUrl: json['coverImageUrl'] as String?,
      themeColor: json['themeColor'] as String?,
      estimatedMinutes: json['estimatedMinutes'] as int?,
      totalSteps: (json['taskAnalysis'] as Map<String, dynamic>?)?['totalSteps'] as int?,
    );
  }
}

/// Skill step model
@immutable
class SkillStep {
  final String id;
  final int stepNumber;
  final String instruction;
  final String? detailedPrompt;
  final String? imageUrl;
  final String? videoUrl;
  final String? symbolUrl;
  final String? audioUrl;
  final int? expectedSeconds;
  final bool isCritical;
  final bool allowSkip;
  final StepProgress? learnerProgress;

  const SkillStep({
    required this.id,
    required this.stepNumber,
    required this.instruction,
    this.detailedPrompt,
    this.imageUrl,
    this.videoUrl,
    this.symbolUrl,
    this.audioUrl,
    this.expectedSeconds,
    this.isCritical = false,
    this.allowSkip = false,
    this.learnerProgress,
  });

  factory SkillStep.fromJson(Map<String, dynamic> json) {
    final media = json['media'] as Map<String, dynamic>?;
    final flags = json['flags'] as Map<String, dynamic>?;
    final timing = json['timing'] as Map<String, dynamic>?;
    
    return SkillStep(
      id: json['id'] as String,
      stepNumber: json['stepNumber'] as int,
      instruction: json['instruction'] as String,
      detailedPrompt: json['detailedPrompt'] as String?,
      imageUrl: media?['imageUrl'] as String?,
      videoUrl: media?['videoUrl'] as String?,
      symbolUrl: media?['symbolUrl'] as String?,
      audioUrl: media?['audioUrl'] as String?,
      expectedSeconds: timing?['expectedSeconds'] as int?,
      isCritical: flags?['isCritical'] as bool? ?? false,
      allowSkip: flags?['allowSkip'] as bool? ?? false,
      learnerProgress: json['learnerProgress'] != null
          ? StepProgress.fromJson(json['learnerProgress'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Step progress model
@immutable
class StepProgress {
  final bool isAcquired;
  final PromptLevel lastPromptLevel;
  final int totalAttempts;
  final int successfulAttempts;

  const StepProgress({
    required this.isAcquired,
    required this.lastPromptLevel,
    required this.totalAttempts,
    required this.successfulAttempts,
  });

  factory StepProgress.fromJson(Map<String, dynamic> json) {
    return StepProgress(
      isAcquired: json['isAcquired'] as bool? ?? false,
      lastPromptLevel: PromptLevel.fromString(json['lastPromptLevel'] as String? ?? 'VERBAL'),
      totalAttempts: json['totalAttempts'] as int? ?? 0,
      successfulAttempts: json['successfulAttempts'] as int? ?? 0,
    );
  }
}

/// Skill guide model (full guide with steps)
@immutable
class SkillGuide {
  final LifeSkill skill;
  final List<SkillStep> steps;
  final List<String> materialsNeeded;
  final String? setupNotes;
  final String? teachingTips;
  final LearnerSkillProgress? learnerProgress;

  const SkillGuide({
    required this.skill,
    required this.steps,
    this.materialsNeeded = const [],
    this.setupNotes,
    this.teachingTips,
    this.learnerProgress,
  });

  factory SkillGuide.fromJson(Map<String, dynamic> json) {
    final skillData = json['skill'] as Map<String, dynamic>;
    final taskAnalysis = json['taskAnalysis'] as Map<String, dynamic>?;
    final stepsData = json['steps'] as List<dynamic>? ?? [];
    
    return SkillGuide(
      skill: LifeSkill(
        id: skillData['id'] as String,
        code: skillData['id'] as String, // Use ID as code since not returned
        name: skillData['name'] as String,
        description: skillData['description'] as String,
        category: SkillCategory.fromString(skillData['category'] as String),
        difficultyLevel: DifficultyLevel.foundational,
        iconUrl: skillData['iconUrl'] as String?,
        coverImageUrl: skillData['coverImageUrl'] as String?,
        themeColor: skillData['themeColor'] as String?,
        estimatedMinutes: skillData['estimatedMinutes'] as int?,
      ),
      steps: stepsData.map((s) => SkillStep.fromJson(s as Map<String, dynamic>)).toList(),
      materialsNeeded: (taskAnalysis?['materialsNeeded'] as List<dynamic>?)
          ?.map((e) => e as String)
          .toList() ?? [],
      setupNotes: taskAnalysis?['setupNotes'] as String?,
      teachingTips: taskAnalysis?['teachingTips'] as String?,
      learnerProgress: json['learnerProgress'] != null
          ? LearnerSkillProgress.fromJson(json['learnerProgress'] as Map<String, dynamic>)
          : null,
    );
  }
}

/// Learner skill progress model
@immutable
class LearnerSkillProgress {
  final ProgressStatus status;
  final double masteryPercent;
  final PromptLevel currentPromptLevel;
  final int stepsCompleted;
  final int totalSessions;
  final int currentStreak;

  const LearnerSkillProgress({
    required this.status,
    required this.masteryPercent,
    required this.currentPromptLevel,
    required this.stepsCompleted,
    required this.totalSessions,
    required this.currentStreak,
  });

  factory LearnerSkillProgress.fromJson(Map<String, dynamic> json) {
    return LearnerSkillProgress(
      status: ProgressStatus.fromString(json['status'] as String? ?? 'NOT_INTRODUCED'),
      masteryPercent: (json['masteryPercent'] as num?)?.toDouble() ?? 0.0,
      currentPromptLevel: PromptLevel.fromString(json['currentPromptLevel'] as String? ?? 'VERBAL'),
      stepsCompleted: json['stepsCompleted'] as int? ?? 0,
      totalSessions: json['totalSessions'] as int? ?? 0,
      currentStreak: json['currentStreak'] as int? ?? 0,
    );
  }
}

/// Safety scenario type enum
enum SafetyScenarioType {
  roadCrossing,
  strangerAwareness,
  emergencyResponse,
  fireSafety,
  waterSafety,
  onlineSafety,
  bodySafety,
  homeSafety;

  String get displayName {
    switch (this) {
      case SafetyScenarioType.roadCrossing:
        return 'Road Crossing';
      case SafetyScenarioType.strangerAwareness:
        return 'Stranger Awareness';
      case SafetyScenarioType.emergencyResponse:
        return 'Emergency Response';
      case SafetyScenarioType.fireSafety:
        return 'Fire Safety';
      case SafetyScenarioType.waterSafety:
        return 'Water Safety';
      case SafetyScenarioType.onlineSafety:
        return 'Online Safety';
      case SafetyScenarioType.bodySafety:
        return 'Body Safety';
      case SafetyScenarioType.homeSafety:
        return 'Home Safety';
    }
  }

  String get icon {
    switch (this) {
      case SafetyScenarioType.roadCrossing:
        return '🚦';
      case SafetyScenarioType.strangerAwareness:
        return '👤';
      case SafetyScenarioType.emergencyResponse:
        return '🚨';
      case SafetyScenarioType.fireSafety:
        return '🔥';
      case SafetyScenarioType.waterSafety:
        return '💧';
      case SafetyScenarioType.onlineSafety:
        return '💻';
      case SafetyScenarioType.bodySafety:
        return '🛡️';
      case SafetyScenarioType.homeSafety:
        return '🏠';
    }
  }

  /// Color associated with scenario type
  Color get color {
    switch (this) {
      case SafetyScenarioType.roadCrossing:
        return const Color(0xFF4CAF50); // Green
      case SafetyScenarioType.strangerAwareness:
        return const Color(0xFFFF9800); // Orange
      case SafetyScenarioType.emergencyResponse:
        return const Color(0xFFF44336); // Red
      case SafetyScenarioType.fireSafety:
        return const Color(0xFFFF5722); // Deep Orange
      case SafetyScenarioType.waterSafety:
        return const Color(0xFF2196F3); // Blue
      case SafetyScenarioType.onlineSafety:
        return const Color(0xFF9C27B0); // Purple
      case SafetyScenarioType.bodySafety:
        return const Color(0xFF795548); // Brown
      case SafetyScenarioType.homeSafety:
        return const Color(0xFF607D8B); // Blue Grey
    }
  }

  static SafetyScenarioType fromString(String value) {
    final normalized = value.toUpperCase().replaceAll('_', '');
    return SafetyScenarioType.values.firstWhere(
      (e) => e.name.toUpperCase() == normalized,
      orElse: () => SafetyScenarioType.roadCrossing,
    );
  }
}

/// Decision outcome enum
enum DecisionOutcome {
  safe,
  unsafe,
  partiallySafe;

  String get displayName {
    switch (this) {
      case DecisionOutcome.safe:
        return 'Safe Choice';
      case DecisionOutcome.unsafe:
        return 'Unsafe Choice';
      case DecisionOutcome.partiallySafe:
        return 'Partially Safe';
    }
  }

  static DecisionOutcome fromString(String value) {
    final normalized = value.toUpperCase().replaceAll('_', '');
    return DecisionOutcome.values.firstWhere(
      (e) => e.name.toUpperCase() == normalized,
      orElse: () => DecisionOutcome.unsafe,
    );
  }
}

/// Safety scenario model
@immutable
class SafetyScenario {
  final String id;
  final String code;
  final String title;
  final String description;
  final SafetyScenarioType scenarioType;
  final DifficultyLevel difficultyLevel;
  final String sceneDescription;
  final String decisionPrompt;
  final String? sceneImageUrl;
  final String? sceneVideoUrl;
  final List<SafetyChoice> choices;

  const SafetyScenario({
    required this.id,
    required this.code,
    required this.title,
    required this.description,
    required this.scenarioType,
    required this.difficultyLevel,
    required this.sceneDescription,
    required this.decisionPrompt,
    this.sceneImageUrl,
    this.sceneVideoUrl,
    this.choices = const [],
  });

  factory SafetyScenario.fromJson(Map<String, dynamic> json) {
    final choicesData = json['choices'] as List<dynamic>? ?? [];
    
    return SafetyScenario(
      id: json['id'] as String,
      code: json['code'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      scenarioType: SafetyScenarioType.fromString(json['scenarioType'] as String),
      difficultyLevel: DifficultyLevel.fromString(json['difficultyLevel'] as String),
      sceneDescription: json['sceneDescription'] as String,
      decisionPrompt: json['decisionPrompt'] as String,
      sceneImageUrl: json['sceneImageUrl'] as String?,
      sceneVideoUrl: json['sceneVideoUrl'] as String?,
      choices: choicesData.map((c) => SafetyChoice.fromJson(c as Map<String, dynamic>)).toList(),
    );
  }
}

/// Safety choice model
@immutable
class SafetyChoice {
  final String id;
  final String choiceText;
  final DecisionOutcome outcome;
  final String feedbackText;
  final String explanation;
  final String? choiceImageUrl;
  final String? choiceSymbolUrl;
  final String? feedbackVideoUrl;

  const SafetyChoice({
    required this.id,
    required this.choiceText,
    required this.outcome,
    required this.feedbackText,
    required this.explanation,
    this.choiceImageUrl,
    this.choiceSymbolUrl,
    this.feedbackVideoUrl,
  });

  factory SafetyChoice.fromJson(Map<String, dynamic> json) {
    return SafetyChoice(
      id: json['id'] as String,
      choiceText: json['choiceText'] as String,
      outcome: DecisionOutcome.fromString(json['outcome'] as String),
      feedbackText: json['feedbackText'] as String,
      explanation: json['explanation'] as String,
      choiceImageUrl: json['choiceImageUrl'] as String?,
      choiceSymbolUrl: json['choiceSymbolUrl'] as String?,
      feedbackVideoUrl: json['feedbackVideoUrl'] as String?,
    );
  }
}

/// AI guidance response
@immutable
class AIGuidance {
  final String guidance;
  final String? visualCue;
  final String? audioPrompt;

  const AIGuidance({
    required this.guidance,
    this.visualCue,
    this.audioPrompt,
  });

  factory AIGuidance.fromJson(Map<String, dynamic> json) {
    return AIGuidance(
      guidance: json['guidance'] as String,
      visualCue: json['visualCue'] as String?,
      audioPrompt: json['audioPrompt'] as String?,
    );
  }
}

/// Encouragement response
@immutable
class Encouragement {
  final String message;
  final String? celebration;

  const Encouragement({
    required this.message,
    this.celebration,
  });

  factory Encouragement.fromJson(Map<String, dynamic> json) {
    return Encouragement(
      message: json['message'] as String,
      celebration: json['celebration'] as String?,
    );
  }
}
