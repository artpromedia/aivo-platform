import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_common/flutter_common.dart';

import 'package:mobile_parent/analytics/analytics_service.dart';
import 'package:mobile_parent/widgets/homework_focus_card.dart';

void main() {
  // ══════════════════════════════════════════════════════════════════════════════
  // MODEL TESTS
  // ══════════════════════════════════════════════════════════════════════════════

  group('IndependenceLabel', () {
    test('fromCode returns correct enum value', () {
      expect(
        IndependenceLabel.fromCode('needs_support'),
        IndependenceLabel.needsSupport,
      );
      expect(
        IndependenceLabel.fromCode('building_independence'),
        IndependenceLabel.buildingIndependence,
      );
      expect(
        IndependenceLabel.fromCode('mostly_independent'),
        IndependenceLabel.mostlyIndependent,
      );
    });

    test('fromCode returns default for unknown code', () {
      expect(
        IndependenceLabel.fromCode('unknown'),
        IndependenceLabel.buildingIndependence,
      );
    });

    test('displayText returns readable text', () {
      expect(
        IndependenceLabel.needsSupport.displayText,
        'Needs a lot of support',
      );
      expect(
        IndependenceLabel.buildingIndependence.displayText,
        'Building independence',
      );
      expect(
        IndependenceLabel.mostlyIndependent.displayText,
        'Mostly independent',
      );
    });
  });

  group('HomeworkSummary', () {
    test('fromJson parses valid JSON', () {
      final json = {
        'learnerId': 'learner-1',
        'homeworkSessionsPerWeek': 3.5,
        'avgStepsPerHomework': 5.2,
        'independenceScore': 0.75,
        'independenceLabel': 'mostly_independent',
        'independenceLabelText': 'Mostly Independent',
        'lastHomeworkDate': '2024-01-15T10:30:00Z',
        'totalHomeworkSessions': 12,
      };

      final summary = HomeworkSummary.fromJson(json);

      expect(summary.learnerId, 'learner-1');
      expect(summary.homeworkSessionsPerWeek, 3.5);
      expect(summary.avgStepsPerHomework, 5.2);
      expect(summary.independenceScore, 0.75);
      expect(summary.independenceLabel, IndependenceLabel.mostlyIndependent);
      expect(summary.independenceLabelText, 'Mostly Independent');
      expect(summary.lastHomeworkDate, isNotNull);
      expect(summary.totalHomeworkSessions, 12);
    });

    test('fromJson handles missing optional fields', () {
      final json = {
        'learnerId': 'learner-1',
      };

      final summary = HomeworkSummary.fromJson(json);

      expect(summary.learnerId, 'learner-1');
      expect(summary.homeworkSessionsPerWeek, 0.0);
      expect(summary.lastHomeworkDate, isNull);
      expect(summary.totalHomeworkSessions, 0);
    });

    test('fromJson handles numeric coercion', () {
      final json = {
        'learnerId': 'learner-1',
        'homeworkSessionsPerWeek': 3, // int instead of double
        'independenceScore': 1, // int instead of double
      };

      final summary = HomeworkSummary.fromJson(json);

      expect(summary.homeworkSessionsPerWeek, 3.0);
      expect(summary.independenceScore, 1.0);
    });
  });

  group('FocusSummary', () {
    test('fromJson parses valid JSON', () {
      final json = {
        'learnerId': 'learner-1',
        'avgFocusBreaksPerSession': 1.5,
        'avgSessionDurationMinutes': 22.3,
        'totalSessions': 8,
        'summary': 'Session lengths look healthy.',
      };

      final summary = FocusSummary.fromJson(json);

      expect(summary.learnerId, 'learner-1');
      expect(summary.avgFocusBreaksPerSession, 1.5);
      expect(summary.avgSessionDurationMinutes, 22.3);
      expect(summary.totalSessions, 8);
      expect(summary.summary, 'Session lengths look healthy.');
    });

    test('fromJson handles missing fields with defaults', () {
      final json = <String, dynamic>{};

      final summary = FocusSummary.fromJson(json);

      expect(summary.learnerId, '');
      expect(summary.avgFocusBreaksPerSession, 0.0);
      expect(summary.summary, '');
    });
  });

  group('LearnerAnalytics', () {
    test('combines homework and focus summaries', () {
      const homework = HomeworkSummary(
        learnerId: 'learner-1',
        homeworkSessionsPerWeek: 3.0,
        avgStepsPerHomework: 5.0,
        independenceScore: 0.8,
        independenceLabel: IndependenceLabel.mostlyIndependent,
        independenceLabelText: 'Mostly Independent',
        totalHomeworkSessions: 10,
      );

      const focus = FocusSummary(
        learnerId: 'learner-1',
        avgFocusBreaksPerSession: 1.2,
        avgSessionDurationMinutes: 20.0,
        totalSessions: 10,
        summary: 'Good focus patterns.',
      );

      const analytics = LearnerAnalytics(
        learnerId: 'learner-1',
        homework: homework,
        focus: focus,
      );

      expect(analytics.learnerId, 'learner-1');
      expect(analytics.homework.independenceScore, 0.8);
      expect(analytics.focus.avgFocusBreaksPerSession, 1.2);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // SERVICE TESTS (Mock Mode)
  // ══════════════════════════════════════════════════════════════════════════════

  group('AnalyticsService', () {
    late AnalyticsService service;

    setUp(() {
      service = AnalyticsService();
    });

    test('getHomeworkSummary returns mock data', () async {
      final summary = await service.getHomeworkSummary(
        parentId: 'parent-1',
        learnerId: 'learner-1',
      );

      expect(summary.learnerId, 'learner-1');
      expect(summary.homeworkSessionsPerWeek, greaterThanOrEqualTo(0));
      expect(summary.independenceScore, inInclusiveRange(0, 1));
    });

    test('getFocusSummary returns mock data', () async {
      final summary = await service.getFocusSummary(
        parentId: 'parent-1',
        learnerId: 'learner-1',
      );

      expect(summary.learnerId, 'learner-1');
      expect(summary.avgFocusBreaksPerSession, greaterThanOrEqualTo(0));
      expect(summary.summary, isNotEmpty);
    });

    test('getLearnerAnalytics combines both summaries', () async {
      final analytics = await service.getLearnerAnalytics(
        parentId: 'parent-1',
        learnerId: 'learner-1',
      );

      expect(analytics.learnerId, 'learner-1');
      expect(analytics.homework.learnerId, 'learner-1');
      expect(analytics.focus.learnerId, 'learner-1');
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // WIDGET TESTS
  // ══════════════════════════════════════════════════════════════════════════════

  group('HomeworkFocusCard', () {
    testWidgets('displays loading state initially', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: HomeworkFocusCard(
                learner: const Learner(id: 'learner-1', tenantId: 'tenant-1', name: 'Alex', grade: 3),
                parentId: 'parent-1',
              ),
            ),
          ),
        ),
      );

      // Initially should show loading indicator
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('displays learner name in header', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: HomeworkFocusCard(
                learner: const Learner(id: 'learner-1', tenantId: 'tenant-1', name: 'Alex', grade: 3),
                parentId: 'parent-1',
              ),
            ),
          ),
        ),
      );

      // Pump to allow async operations
      await tester.pump(const Duration(milliseconds: 500));
      await tester.pump(const Duration(milliseconds: 500));

      // After loading, should show learner name context
      expect(find.text('Homework & Focus'), findsOneWidget);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════════
  // INDEPENDENCE SCORE INTERPRETATION
  // ══════════════════════════════════════════════════════════════════════════════

  group('Independence Score Interpretation', () {
    test('scores 0-0.3 map to needs_support', () {
      expect(_getLabel(0.0), IndependenceLabel.needsSupport);
      expect(_getLabel(0.15), IndependenceLabel.needsSupport);
      expect(_getLabel(0.29), IndependenceLabel.needsSupport);
    });

    test('scores 0.3-0.7 map to building_independence', () {
      expect(_getLabel(0.30), IndependenceLabel.buildingIndependence);
      expect(_getLabel(0.50), IndependenceLabel.buildingIndependence);
      expect(_getLabel(0.69), IndependenceLabel.buildingIndependence);
    });

    test('scores 0.7-1.0 map to mostly_independent', () {
      expect(_getLabel(0.70), IndependenceLabel.mostlyIndependent);
      expect(_getLabel(0.85), IndependenceLabel.mostlyIndependent);
      expect(_getLabel(1.0), IndependenceLabel.mostlyIndependent);
    });
  });
}

/// Helper to interpret independence score like backend does.
IndependenceLabel _getLabel(double score) {
  if (score < 0.3) return IndependenceLabel.needsSupport;
  if (score < 0.7) return IndependenceLabel.buildingIndependence;
  return IndependenceLabel.mostlyIndependent;
}
