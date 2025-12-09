import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile_parent/reports/reports_service.dart';
import 'package:mobile_parent/screens/progress_report_screen.dart';

// Mock providers for testing
final mockReportProvider = FutureProvider.family<ParentLearnerReport, String>((ref, learnerId) async {
  return _createMockReport(learnerId);
});

ParentLearnerReport _createMockReport(String learnerId) {
  return ParentLearnerReport(
    learnerId: learnerId,
    learnerName: 'Test Learner',
    generatedAt: DateTime.now(),
    reportPeriodDays: 28,
    baseline: const BaselineSummary(
      status: 'COMPLETED',
      completedAt: null,
      domains: [
        DomainSummary(
          domain: 'Reading & Language Arts',
          assessed: true,
          summary: 'Strong foundation in reading comprehension.',
        ),
        DomainSummary(
          domain: 'Mathematics',
          assessed: true,
          summary: 'Building skills in math operations.',
        ),
      ],
      overallSummary: 'Baseline assessment completed.',
    ),
    virtualBrain: const VirtualBrainSummary(
      initialized: true,
      gradeBand: 'K5',
      strengths: [
        SkillDetail(
          domain: 'Reading',
          skill: 'Reading Comprehension',
          description: 'Excellent mastery.',
        ),
      ],
      focusAreas: [
        SkillDetail(
          domain: 'Math',
          skill: 'Addition',
          description: 'Building foundation.',
        ),
      ],
      overallSummary: 'Learning profile established.',
    ),
    goals: GoalsSummary(
      activeGoals: [
        GoalDetail(
          id: 'goal-1',
          title: 'Improve reading fluency',
          domain: 'Reading',
          status: 'ACTIVE',
          progressText: '2 of 4 milestones complete.',
          startDate: DateTime.now().subtract(const Duration(days: 30)),
          targetDate: DateTime.now().add(const Duration(days: 60)),
        ),
      ],
      completedCount: 1,
      overallSummary: '1 goal completed, 1 active.',
    ),
    homework: const HomeworkReportSummary(
      sessionsPerWeek: 2.5,
      avgStepsPerSession: 4.2,
      independenceScore: 0.65,
      independenceLabel: 'building_independence',
      independenceLabelText: 'Building independence',
      lastSessionDate: null,
      totalSessions: 10,
      summary: 'Good engagement with homework helper.',
    ),
    focus: const FocusReportSummary(
      avgBreaksPerSession: 1.2,
      avgSessionDurationMinutes: 18.5,
      totalSessions: 15,
      summary: 'Session lengths look healthy.',
    ),
  );
}

void main() {
  group('ProgressReportScreen', () {
    testWidgets('renders all sections when data loads successfully', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            parentLearnerReportProvider.overrideWith(
              (ref, learnerId) async => _createMockReport(learnerId),
            ),
          ],
          child: const MaterialApp(
            home: ProgressReportScreen(
              learnerId: 'test-learner-123',
              learnerName: 'Test Learner',
            ),
          ),
        ),
      );

      // Wait for async data to load
      await tester.pumpAndSettle();

      // Verify main sections are rendered
      expect(find.text('Progress Report'), findsOneWidget);
      expect(find.text('Baseline Assessment'), findsOneWidget);
      expect(find.text('Learning Profile'), findsOneWidget);
      expect(find.text('Goals'), findsOneWidget);
      expect(find.text('Homework Helper'), findsOneWidget);
      expect(find.text('Focus & Attention'), findsOneWidget);
    });

    testWidgets('shows loading indicator while fetching data', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            parentLearnerReportProvider.overrideWith(
              (ref, learnerId) async {
                await Future.delayed(const Duration(seconds: 2));
                return _createMockReport(learnerId);
              },
            ),
          ],
          child: const MaterialApp(
            home: ProgressReportScreen(
              learnerId: 'test-learner-123',
              learnerName: 'Test Learner',
            ),
          ),
        ),
      );

      // Should show loading indicator initially
      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('renders baseline section with domain summaries', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            parentLearnerReportProvider.overrideWith(
              (ref, learnerId) async => _createMockReport(learnerId),
            ),
          ],
          child: const MaterialApp(
            home: ProgressReportScreen(
              learnerId: 'test-learner-123',
              learnerName: 'Test Learner',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check baseline section content
      expect(find.text('Baseline Assessment'), findsOneWidget);
      expect(find.text('Reading & Language Arts'), findsOneWidget);
      expect(find.text('Mathematics'), findsOneWidget);
    });

    testWidgets('renders goals section with active goals', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            parentLearnerReportProvider.overrideWith(
              (ref, learnerId) async => _createMockReport(learnerId),
            ),
          ],
          child: const MaterialApp(
            home: ProgressReportScreen(
              learnerId: 'test-learner-123',
              learnerName: 'Test Learner',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Check goals section content
      expect(find.text('Goals'), findsOneWidget);
      expect(find.text('Improve reading fluency'), findsOneWidget);
      expect(find.text('2 of 4 milestones complete.'), findsOneWidget);
    });

    testWidgets('shows share button in app bar', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            parentLearnerReportProvider.overrideWith(
              (ref, learnerId) async => _createMockReport(learnerId),
            ),
          ],
          child: const MaterialApp(
            home: ProgressReportScreen(
              learnerId: 'test-learner-123',
              learnerName: 'Test Learner',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Should have share button
      expect(find.byIcon(Icons.share), findsOneWidget);
    });

    testWidgets('handles empty goals gracefully', (tester) async {
      final reportWithNoGoals = ParentLearnerReport(
        learnerId: 'test-learner',
        learnerName: 'Test Learner',
        generatedAt: DateTime.now(),
        reportPeriodDays: 28,
        baseline: const BaselineSummary(
          status: 'NOT_STARTED',
          completedAt: null,
          domains: [],
          overallSummary: 'Not started.',
        ),
        virtualBrain: const VirtualBrainSummary(
          initialized: false,
          gradeBand: null,
          strengths: [],
          focusAreas: [],
          overallSummary: 'Profile being established.',
        ),
        goals: const GoalsSummary(
          activeGoals: [],
          completedCount: 0,
          overallSummary: 'No goals set yet.',
        ),
        homework: const HomeworkReportSummary(
          sessionsPerWeek: 0,
          avgStepsPerSession: 0,
          independenceScore: 0,
          independenceLabel: '',
          independenceLabelText: 'No data',
          lastSessionDate: null,
          totalSessions: 0,
          summary: 'No sessions recorded.',
        ),
        focus: const FocusReportSummary(
          avgBreaksPerSession: 0,
          avgSessionDurationMinutes: 0,
          totalSessions: 0,
          summary: 'No sessions recorded.',
        ),
      );

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            parentLearnerReportProvider.overrideWith(
              (ref, learnerId) async => reportWithNoGoals,
            ),
          ],
          child: const MaterialApp(
            home: ProgressReportScreen(
              learnerId: 'test-learner-123',
              learnerName: 'Test Learner',
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Should still render all sections without crashing
      expect(find.text('Goals'), findsOneWidget);
      expect(find.text('No goals set yet.'), findsOneWidget);
    });
  });
}
