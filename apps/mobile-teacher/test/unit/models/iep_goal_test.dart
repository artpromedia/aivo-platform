/// IEP Goal Model Unit Tests
///
/// Tests for the IepGoal model.
library;

import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_teacher/models/iep_goal.dart';

void main() {
  group('IepGoal', () {
    group('progressPercent', () {
      test('should calculate progress from baseline to target', () {
        final goal = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 90%',
          targetValue: 90,
          currentValue: 70,
          baseline: 50,
          startDate: DateTime.now().subtract(const Duration(days: 30)),
          targetDate: DateTime.now().add(const Duration(days: 30)),
          status: GoalStatus.inProgress,
        );

        // Progress = (70 - 50) / (90 - 50) = 20/40 = 0.5
        expect(goal.progressPercent, closeTo(0.5, 0.01));
      });

      test('should return 0 for no progress', () {
        final goal = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 100%',
          targetValue: 100,
          currentValue: 50,
          baseline: 50,
          startDate: DateTime.now().subtract(const Duration(days: 30)),
          targetDate: DateTime.now().add(const Duration(days: 30)),
          status: GoalStatus.inProgress,
        );

        expect(goal.progressPercent, equals(0.0));
      });

      test('should return 1.0 for completed goal', () {
        final goal = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 90%',
          targetValue: 90,
          currentValue: 95,
          baseline: 50,
          startDate: DateTime.now().subtract(const Duration(days: 30)),
          targetDate: DateTime.now().add(const Duration(days: 30)),
          status: GoalStatus.achieved,
        );

        expect(goal.progressPercent, equals(1.0));
      });

      test('should clamp progress between 0 and 1', () {
        final overachievedGoal = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 90%',
          targetValue: 90,
          currentValue: 100,
          baseline: 50,
          startDate: DateTime.now(),
          targetDate: DateTime.now().add(const Duration(days: 30)),
          status: GoalStatus.achieved,
        );

        expect(overachievedGoal.progressPercent, equals(1.0));

        final regressionGoal = IepGoal(
          id: 'goal-2',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 90%',
          targetValue: 90,
          currentValue: 40,
          baseline: 50,
          startDate: DateTime.now(),
          targetDate: DateTime.now().add(const Duration(days: 30)),
          status: GoalStatus.atRisk,
        );

        expect(regressionGoal.progressPercent, equals(0.0));
      });

      test('should handle null baseline', () {
        final goal = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 90%',
          targetValue: 90,
          currentValue: 45,
          baseline: null,
          startDate: DateTime.now(),
          targetDate: DateTime.now().add(const Duration(days: 30)),
          status: GoalStatus.inProgress,
        );

        // With null baseline, treat as 0: 45/90 = 0.5
        expect(goal.progressPercent, closeTo(0.5, 0.01));
      });

      test('should handle zero target value', () {
        final goal = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.behavior,
          description: 'Reduce disruptions to zero',
          targetCriteria: 'Zero disruptions',
          targetValue: 0,
          currentValue: 5,
          baseline: 10,
          startDate: DateTime.now(),
          targetDate: DateTime.now().add(const Duration(days: 30)),
          status: GoalStatus.inProgress,
        );

        expect(goal.progressPercent, equals(0.0));
      });
    });

    group('isOnTrack', () {
      test('should return true when progress matches timeline', () {
        final startDate = DateTime.now().subtract(const Duration(days: 50));
        final targetDate = DateTime.now().add(const Duration(days: 50));

        final goal = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 100%',
          targetValue: 100,
          currentValue: 50,
          baseline: 0,
          startDate: startDate,
          targetDate: targetDate,
          status: GoalStatus.onTrack,
        );

        // 50% of time elapsed, 50% progress, should be on track
        expect(goal.isOnTrack, isTrue);
      });

      test('should return false when behind timeline', () {
        final startDate = DateTime.now().subtract(const Duration(days: 80));
        final targetDate = DateTime.now().add(const Duration(days: 20));

        final goal = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 100%',
          targetValue: 100,
          currentValue: 20,
          baseline: 0,
          startDate: startDate,
          targetDate: targetDate,
          status: GoalStatus.atRisk,
        );

        // 80% of time elapsed, 20% progress, should not be on track
        expect(goal.isOnTrack, isFalse);
      });
    });

    group('daysRemaining', () {
      test('should calculate days until target date', () {
        final targetDate = DateTime.now().add(const Duration(days: 30));

        final goal = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 100%',
          targetValue: 100,
          currentValue: 50,
          startDate: DateTime.now().subtract(const Duration(days: 30)),
          targetDate: targetDate,
          status: GoalStatus.inProgress,
        );

        expect(goal.daysRemaining, closeTo(30, 1));
      });

      test('should return negative for past target date', () {
        final targetDate = DateTime.now().subtract(const Duration(days: 10));

        final goal = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 100%',
          targetValue: 100,
          currentValue: 50,
          startDate: DateTime.now().subtract(const Duration(days: 100)),
          targetDate: targetDate,
          status: GoalStatus.atRisk,
        );

        expect(goal.daysRemaining, lessThan(0));
      });
    });

    group('fromJson / toJson', () {
      test('should round-trip through JSON', () {
        final original = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Master multiplication facts 1-12',
          targetCriteria: '90% accuracy in 5 minutes',
          targetValue: 90,
          currentValue: 72,
          baseline: 45,
          measurementUnit: 'percent',
          startDate: DateTime(2024, 9, 1),
          targetDate: DateTime(2025, 1, 15),
          status: GoalStatus.inProgress,
          progressHistory: [],
          accommodations: ['extended_time'],
          createdAt: DateTime(2024, 8, 15),
          updatedAt: DateTime(2024, 11, 1),
        );

        final json = original.toJson();
        final restored = IepGoal.fromJson(json);

        expect(restored.id, equals(original.id));
        expect(restored.studentId, equals(original.studentId));
        expect(restored.category, equals(original.category));
        expect(restored.description, equals(original.description));
        expect(restored.targetCriteria, equals(original.targetCriteria));
        expect(restored.targetValue, equals(original.targetValue));
        expect(restored.currentValue, equals(original.currentValue));
        expect(restored.baseline, equals(original.baseline));
        expect(restored.measurementUnit, equals(original.measurementUnit));
        expect(restored.status, equals(original.status));
        expect(restored.accommodations, equals(original.accommodations));
      });

      test('should parse all category values', () {
        for (final category in GoalCategory.values) {
          final json = {
            'id': 'goal-1',
            'studentId': 'student-1',
            'category': category.name,
            'description': 'Test',
            'targetCriteria': 'Test',
            'targetValue': 100.0,
            'currentValue': 50.0,
            'startDate': DateTime.now().toIso8601String(),
            'targetDate': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
            'status': 'inProgress',
          };

          final goal = IepGoal.fromJson(json);
          expect(goal.category, equals(category));
        }
      });

      test('should parse all status values', () {
        for (final status in GoalStatus.values) {
          final json = {
            'id': 'goal-1',
            'studentId': 'student-1',
            'category': 'math',
            'description': 'Test',
            'targetCriteria': 'Test',
            'targetValue': 100.0,
            'currentValue': 50.0,
            'startDate': DateTime.now().toIso8601String(),
            'targetDate': DateTime.now().add(const Duration(days: 30)).toIso8601String(),
            'status': status.name,
          };

          final goal = IepGoal.fromJson(json);
          expect(goal.status, equals(status));
        }
      });
    });

    group('copyWith', () {
      test('should update currentValue and preserve other fields', () {
        final original = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 90%',
          targetValue: 90,
          currentValue: 50,
          baseline: 30,
          startDate: DateTime.now(),
          targetDate: DateTime.now().add(const Duration(days: 30)),
          status: GoalStatus.inProgress,
        );

        final updated = original.copyWith(currentValue: 75);

        expect(updated.id, equals(original.id));
        expect(updated.description, equals(original.description));
        expect(updated.currentValue, equals(75));
        expect(updated.baseline, equals(original.baseline));
      });

      test('should update status', () {
        final original = IepGoal(
          id: 'goal-1',
          studentId: 'student-1',
          category: GoalCategory.math,
          description: 'Test goal',
          targetCriteria: 'Reach 90%',
          targetValue: 90,
          currentValue: 92,
          startDate: DateTime.now(),
          targetDate: DateTime.now().add(const Duration(days: 30)),
          status: GoalStatus.inProgress,
        );

        final updated = original.copyWith(status: GoalStatus.achieved);

        expect(updated.status, equals(GoalStatus.achieved));
      });
    });
  });

  group('IepProgress', () {
    test('should create progress entry', () {
      final progress = IepProgress(
        id: 'progress-1',
        goalId: 'goal-1',
        value: 75,
        note: 'Improved this week',
        recordedAt: DateTime.now(),
        recordedBy: 'teacher-1',
      );

      expect(progress.id, equals('progress-1'));
      expect(progress.value, equals(75));
      expect(progress.note, equals('Improved this week'));
    });

    test('should serialize to JSON', () {
      final progress = IepProgress(
        id: 'progress-1',
        goalId: 'goal-1',
        value: 75,
        note: 'Test note',
        recordedAt: DateTime(2024, 11, 1),
        recordedBy: 'teacher-1',
      );

      final json = progress.toJson();

      expect(json['id'], equals('progress-1'));
      expect(json['goalId'], equals('goal-1'));
      expect(json['value'], equals(75));
      expect(json['note'], equals('Test note'));
    });

    test('should deserialize from JSON', () {
      final json = {
        'id': 'progress-1',
        'goalId': 'goal-1',
        'value': 75.0,
        'note': 'Test note',
        'recordedAt': '2024-11-01T00:00:00.000Z',
        'recordedBy': 'teacher-1',
      };

      final progress = IepProgress.fromJson(json);

      expect(progress.id, equals('progress-1'));
      expect(progress.value, equals(75));
      expect(progress.note, equals('Test note'));
    });
  });
}
