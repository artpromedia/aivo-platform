/// AI Brain State Models
///
/// Models for AI transparency and learning state.
library;

import 'package:freezed_annotation/freezed_annotation.dart';

part 'ai_brain_state.freezed.dart';
part 'ai_brain_state.g.dart';

/// Current state of the AI tutor's decision-making.
@freezed
class AIBrainState with _$AIBrainState {
  const factory AIBrainState({
    required String childId,
    required String childName,
    required AIFocus currentFocus,
    required List<LearningAdaptation> recentAdaptations,
    required LearningPath learningPath,
    required double confidenceLevel,
    DateTime? lastUpdated,
    @Default([]) List<String> activeStrategies,
    AIPersonality? personality,
  }) = _AIBrainState;

  factory AIBrainState.fromJson(Map<String, dynamic> json) =>
      _$AIBrainStateFromJson(json);
}

/// Current focus area of the AI tutor.
@freezed
class AIFocus with _$AIFocus {
  const factory AIFocus({
    required String subject,
    required String topic,
    required String skill,
    required FocusReason reason,
    DateTime? startedAt,
    double? progress,
  }) = _AIFocus;

  factory AIFocus.fromJson(Map<String, dynamic> json) =>
      _$AIFocusFromJson(json);
}

/// Reason for current focus.
@JsonEnum()
enum FocusReason {
  scheduledLesson,
  remediationNeeded,
  parentRequest,
  teacherAssigned,
  adaptiveRecommendation,
  studentChoice,
}

/// A learning adaptation made by the AI.
@freezed
class LearningAdaptation with _$LearningAdaptation {
  const factory LearningAdaptation({
    required String id,
    required AdaptationType adaptationType,
    required String reason,
    required DateTime timestamp,
    String? impact,
    String? previousValue,
    String? newValue,
    @Default(false) bool wasSuccessful,
  }) = _LearningAdaptation;

  factory LearningAdaptation.fromJson(Map<String, dynamic> json) =>
      _$LearningAdaptationFromJson(json);
}

/// Type of adaptation made by the AI.
@JsonEnum()
enum AdaptationType {
  difficultyAdjustment,
  contentChange,
  paceChange,
  approachChange,
  scaffoldingAdded,
  scaffoldingRemoved,
  topicSwitch,
  breakSuggested,
  encouragementStyle,
  explanationStyle,
}

/// A decision made by the AI tutor.
@freezed
class AIDecision with _$AIDecision {
  const factory AIDecision({
    required String id,
    required DecisionType decisionType,
    required String context,
    required String rationale,
    required DateTime timestamp,
    DecisionOutcome? outcome,
    double? confidenceScore,
    @Default([]) List<String> alternatives,
  }) = _AIDecision;

  factory AIDecision.fromJson(Map<String, dynamic> json) =>
      _$AIDecisionFromJson(json);
}

/// Type of decision made.
@JsonEnum()
enum DecisionType {
  contentSelection,
  difficultyLevel,
  feedbackType,
  hintProvision,
  topicTransition,
  assessmentTiming,
  breakRecommendation,
  parentAlert,
  teacherNotification,
}

/// Outcome of a decision.
@freezed
class DecisionOutcome with _$DecisionOutcome {
  const factory DecisionOutcome({
    required bool successful,
    String? feedback,
    double? engagementChange,
    double? performanceChange,
  }) = _DecisionOutcome;

  factory DecisionOutcome.fromJson(Map<String, dynamic> json) =>
      _$DecisionOutcomeFromJson(json);
}

/// Learning path for a subject.
@freezed
class LearningPath with _$LearningPath {
  const factory LearningPath({
    required String subject,
    required List<LearningPathNode> nodes,
    required int currentNodeIndex,
    double? overallProgress,
    DateTime? estimatedCompletion,
  }) = _LearningPath;

  factory LearningPath.fromJson(Map<String, dynamic> json) =>
      _$LearningPathFromJson(json);
}

/// A node in the learning path.
@freezed
class LearningPathNode with _$LearningPathNode {
  const factory LearningPathNode({
    required String id,
    required String topic,
    required NodeStatus status,
    required List<String> prerequisites,
    required List<String> nextSteps,
    double? masteryLevel,
    int? estimatedMinutes,
    @Default([]) List<String> skills,
  }) = _LearningPathNode;

  factory LearningPathNode.fromJson(Map<String, dynamic> json) =>
      _$LearningPathNodeFromJson(json);
}

/// Status of a learning path node.
@JsonEnum()
enum NodeStatus {
  locked,
  available,
  inProgress,
  completed,
  mastered,
  needsReview,
}

/// AI personality settings.
@freezed
class AIPersonality with _$AIPersonality {
  const factory AIPersonality({
    required String name,
    required String tone,
    required String encouragementStyle,
    required String explanationStyle,
    String? avatarUrl,
    @Default({}) Map<String, dynamic> customSettings,
  }) = _AIPersonality;

  factory AIPersonality.fromJson(Map<String, dynamic> json) =>
      _$AIPersonalityFromJson(json);
}

/// Subject information for AI brain display.
@freezed
class SubjectInfo with _$SubjectInfo {
  const factory SubjectInfo({
    required String id,
    required String name,
    required String iconName,
    required double progress,
    required int lessonsCompleted,
    required int totalLessons,
  }) = _SubjectInfo;

  factory SubjectInfo.fromJson(Map<String, dynamic> json) =>
      _$SubjectInfoFromJson(json);
}
