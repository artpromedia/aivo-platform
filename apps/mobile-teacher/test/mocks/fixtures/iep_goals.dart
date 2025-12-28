/// IEP Goals Test Fixtures
///
/// Test data for IEP goals.
library;

import 'package:mobile_teacher/models/models.dart';

/// Test IEP goals for testing.
class TestIepGoals {
  /// Multiplication mastery goal for Alex.
  static final multiplicationGoal = IepGoal(
    id: 'goal-mult-1',
    studentId: 'student-alex',
    category: GoalCategory.math,
    description: 'Master multiplication facts 1-12',
    targetCriteria: 'Complete multiplication assessment with 90% accuracy in under 5 minutes',
    targetValue: 90,
    currentValue: 72,
    baseline: 45,
    measurementUnit: 'percent',
    startDate: DateTime(2024, 9, 1),
    targetDate: DateTime(2025, 1, 15),
    status: GoalStatus.inProgress,
    progressHistory: [
      IepProgress(
        id: 'progress-1',
        goalId: 'goal-mult-1',
        value: 50,
        notes: 'Initial assessment after summer break',
        recordedAt: DateTime(2024, 9, 5),
        recordedBy: 'teacher-1',
      ),
      IepProgress(
        id: 'progress-2',
        goalId: 'goal-mult-1',
        value: 62,
        notes: 'Showing improvement with 6s and 7s',
        recordedAt: DateTime(2024, 10, 1),
        recordedBy: 'teacher-1',
      ),
      IepProgress(
        id: 'progress-3',
        goalId: 'goal-mult-1',
        value: 72,
        notes: 'Consistent progress, needs work on 8s and 9s',
        recordedAt: DateTime(2024, 11, 1),
        recordedBy: 'teacher-1',
      ),
    ],
    accommodations: ['extended_time', 'use_calculator_for_complex_problems'],
    createdAt: DateTime(2024, 8, 15),
    updatedAt: DateTime.now().subtract(const Duration(days: 5)),
  );

  /// Reading comprehension goal for Alex.
  static final readingComprehensionGoal = IepGoal(
    id: 'goal-reading-1',
    studentId: 'student-alex',
    category: GoalCategory.reading,
    description: 'Improve reading comprehension',
    targetCriteria: 'Score 80% on grade-level comprehension assessments',
    targetValue: 80,
    currentValue: 65,
    baseline: 50,
    measurementUnit: 'percent',
    startDate: DateTime(2024, 9, 1),
    targetDate: DateTime(2025, 3, 1),
    status: GoalStatus.inProgress,
    progressHistory: [
      IepProgress(
        id: 'progress-4',
        goalId: 'goal-reading-1',
        value: 55,
        notes: 'Baseline established',
        recordedAt: DateTime(2024, 9, 10),
        recordedBy: 'teacher-1',
      ),
      IepProgress(
        id: 'progress-5',
        goalId: 'goal-reading-1',
        value: 65,
        notes: 'Responding well to graphic organizers',
        recordedAt: DateTime(2024, 10, 15),
        recordedBy: 'teacher-1',
      ),
    ],
    accommodations: ['text_to_speech', 'graphic_organizers'],
    createdAt: DateTime(2024, 8, 15),
    updatedAt: DateTime.now().subtract(const Duration(days: 10)),
  );

  /// Writing goal for Sofia.
  static final writingGoal = IepGoal(
    id: 'goal-writing-1',
    studentId: 'student-sofia',
    category: GoalCategory.writing,
    description: 'Improve written expression',
    targetCriteria: 'Write 5-paragraph essays with proper structure',
    targetValue: 5,
    currentValue: 3,
    baseline: 1,
    measurementUnit: 'paragraphs',
    startDate: DateTime(2024, 9, 1),
    targetDate: DateTime(2025, 2, 1),
    status: GoalStatus.onTrack,
    progressHistory: [
      IepProgress(
        id: 'progress-6',
        goalId: 'goal-writing-1',
        value: 2,
        notes: 'Can write introduction and body paragraph',
        recordedAt: DateTime(2024, 9, 20),
        recordedBy: 'teacher-1',
      ),
      IepProgress(
        id: 'progress-7',
        goalId: 'goal-writing-1',
        value: 3,
        notes: 'Added conclusion, working on transitions',
        recordedAt: DateTime(2024, 10, 25),
        recordedBy: 'teacher-1',
      ),
    ],
    accommodations: ['speech_to_text', 'writing_templates'],
    createdAt: DateTime(2024, 8, 15),
    updatedAt: DateTime.now().subtract(const Duration(days: 7)),
  );

  /// Behavior goal for Alex.
  static final behaviorGoal = IepGoal(
    id: 'goal-behavior-1',
    studentId: 'student-alex',
    category: GoalCategory.behavior,
    description: 'Improve focus and attention during class',
    targetCriteria: 'Remain on task for 20-minute intervals without redirection',
    targetValue: 20,
    currentValue: 12,
    baseline: 5,
    measurementUnit: 'minutes',
    startDate: DateTime(2024, 9, 1),
    targetDate: DateTime(2025, 1, 1),
    status: GoalStatus.inProgress,
    progressHistory: [
      IepProgress(
        id: 'progress-8',
        goalId: 'goal-behavior-1',
        value: 8,
        notes: 'Using timer and break cards',
        recordedAt: DateTime(2024, 9, 15),
        recordedBy: 'teacher-1',
      ),
      IepProgress(
        id: 'progress-9',
        goalId: 'goal-behavior-1',
        value: 12,
        notes: 'Consistent improvement with movement breaks',
        recordedAt: DateTime(2024, 10, 20),
        recordedBy: 'teacher-1',
      ),
    ],
    accommodations: ['frequent_breaks', 'preferential_seating', 'fidget_tools'],
    createdAt: DateTime(2024, 8, 15),
    updatedAt: DateTime.now().subtract(const Duration(days: 3)),
  );

  /// Achieved goal for testing completed states.
  static final achievedGoal = IepGoal(
    id: 'goal-achieved-1',
    studentId: 'student-alex',
    category: GoalCategory.math,
    description: 'Master addition facts',
    targetCriteria: 'Complete addition assessment with 95% accuracy',
    targetValue: 95,
    currentValue: 97,
    baseline: 70,
    measurementUnit: 'percent',
    startDate: DateTime(2024, 4, 1),
    targetDate: DateTime(2024, 6, 1),
    status: GoalStatus.achieved,
    progressHistory: [],
    accommodations: [],
    createdAt: DateTime(2024, 3, 15),
    updatedAt: DateTime(2024, 5, 28),
  );

  /// At-risk goal for testing warning states.
  static final atRiskGoal = IepGoal(
    id: 'goal-atrisk-1',
    studentId: 'student-sofia',
    category: GoalCategory.reading,
    description: 'Improve reading fluency',
    targetCriteria: 'Read grade-level passages at 120 words per minute',
    targetValue: 120,
    currentValue: 85,
    baseline: 80,
    measurementUnit: 'wpm',
    startDate: DateTime(2024, 9, 1),
    targetDate: DateTime(2024, 12, 1),
    status: GoalStatus.atRisk,
    progressHistory: [],
    accommodations: ['audio_support'],
    createdAt: DateTime(2024, 8, 15),
    updatedAt: DateTime.now().subtract(const Duration(days: 14)),
  );

  /// All test goals.
  static final all = [
    multiplicationGoal,
    readingComprehensionGoal,
    writingGoal,
    behaviorGoal,
    achievedGoal,
    atRiskGoal,
  ];

  /// Goals for Alex.
  static final forAlex = all.where((g) => g.studentId == 'student-alex').toList();

  /// Goals for Sofia.
  static final forSofia = all.where((g) => g.studentId == 'student-sofia').toList();

  /// Active (in progress) goals.
  static final active = all.where((g) => g.status == GoalStatus.inProgress).toList();

  /// At-risk goals.
  static final atRisk = all.where((g) => g.status == GoalStatus.atRisk).toList();

  /// Create a custom goal.
  static IepGoal create({
    String? id,
    String studentId = 'student-1',
    GoalCategory category = GoalCategory.other,
    String description = 'Test Goal',
    String targetCriteria = 'Meet target',
    double targetValue = 100,
    double currentValue = 50,
    double? baseline,
    GoalStatus status = GoalStatus.inProgress,
  }) {
    return IepGoal(
      id: id ?? 'goal-${DateTime.now().millisecondsSinceEpoch}',
      studentId: studentId,
      category: category,
      description: description,
      targetCriteria: targetCriteria,
      targetValue: targetValue,
      currentValue: currentValue,
      baseline: baseline ?? 0,
      startDate: DateTime.now().subtract(const Duration(days: 30)),
      targetDate: DateTime.now().add(const Duration(days: 60)),
      status: status,
      progressHistory: [],
      accommodations: [],
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  /// Sample progress entry for testing.
  static final sampleProgress = IepProgress(
    id: 'progress-sample-1',
    goalId: 'goal-mult-1',
    value: 75,
    recordedAt: DateTime.now(),
    notes: 'Sample progress entry',
    recordedBy: 'teacher-1',
  );
}
