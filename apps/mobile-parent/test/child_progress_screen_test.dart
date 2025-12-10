import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile_parent/analytics/analytics_controller.dart';
import 'package:mobile_parent/screens/child_progress_screen.dart';

void main() {
  group('ChildProgressScreen', () {
    late EngagementSummary mockEngagement;
    late LearningProgressSummary mockProgress;
    late HomeworkUsageSummary mockHomework;
    late FocusBreakSummary mockFocus;
    late LearnerSummary mockSummary;
    late StrengthsAndNeeds mockStrengthsAndNeeds;

    setUp(() {
      mockEngagement = const EngagementSummary(
        sessionsThisWeek: 5,
        sessionsLastWeek: 3,
        avgSessionDurationMinutes: 18.5,
        daysActiveInRange: 12,
        totalSessionsInRange: 20,
      );

      mockProgress = const LearningProgressSummary(
        bySubject: [
          SubjectProgress(
            subjectCode: 'MATH',
            subjectName: 'Mathematics',
            timeseries: [
              SubjectProgressPoint(
                date: '2025-11-15',
                avgMasteryScore: 0.45,
                masteredSkills: 8,
                totalSkills: 20,
              ),
              SubjectProgressPoint(
                date: '2025-12-01',
                avgMasteryScore: 0.58,
                masteredSkills: 12,
                totalSkills: 20,
              ),
            ],
            skillsMasteredDelta: 4,
            currentMastery: 0.58,
          ),
          SubjectProgress(
            subjectCode: 'ELA',
            subjectName: 'English Language Arts',
            timeseries: [
              SubjectProgressPoint(
                date: '2025-11-15',
                avgMasteryScore: 0.55,
                masteredSkills: 10,
                totalSkills: 25,
              ),
              SubjectProgressPoint(
                date: '2025-12-01',
                avgMasteryScore: 0.68,
                masteredSkills: 15,
                totalSkills: 25,
              ),
            ],
            skillsMasteredDelta: 5,
            currentMastery: 0.68,
          ),
        ],
        totalSkillsMasteredDelta: 9,
      );

      mockHomework = const HomeworkUsageSummary(
        totalHomeworkSessions: 8,
        avgStepsCompletedPerSession: 4.2,
        completionRate: 0.85,
      );

      mockFocus = const FocusBreakSummary(
        totalFocusBreaks: 10,
        totalSessions: 20,
        avgBreaksPerSession: 0.5,
        focusBreaksSummary: 'Maintaining strong focus during sessions.',
      );

      mockSummary = LearnerSummary(
        learnerId: 'learner-100',
        dateRange: (from: '2025-11-09', to: '2025-12-09'),
        engagement: mockEngagement,
        learningProgress: mockProgress,
        homeworkUsage: mockHomework,
        focusSummary: mockFocus,
      );

      mockStrengthsAndNeeds = const StrengthsAndNeeds(
        learnerId: 'learner-100',
        strengths: [
          StrengthOrNeedArea(
            subjectCode: 'ELA',
            subjectName: 'English Language Arts',
            skillName: 'Reading Comprehension',
            masteryScore: 0.85,
            description: 'Strong foundation in Reading Comprehension',
          ),
        ],
        needsSupport: [
          StrengthOrNeedArea(
            subjectCode: 'MATH',
            subjectName: 'Mathematics',
            skillName: 'Fractions',
            masteryScore: 0.35,
            description: 'Building foundation in Fractions',
          ),
        ],
        overallMessage: 'Showing strengths while continuing to grow in other areas.',
      );
    });

    testWidgets('renders loading state initially', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: ChildProgressScreen(
              learnerId: 'learner-100',
              learnerName: 'Test Learner',
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Loading progress data...'), findsOneWidget);
    });

    testWidgets('renders app bar with learner name', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: ChildProgressScreen(
              learnerId: 'learner-100',
              learnerName: 'Avery',
            ),
          ),
        ),
      );

      expect(find.text("Avery's Progress"), findsOneWidget);
    });

    testWidgets('renders refresh button in app bar', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: ChildProgressScreen(
              learnerId: 'learner-100',
              learnerName: 'Avery',
            ),
          ),
        ),
      );

      expect(find.byIcon(Icons.refresh), findsOneWidget);
    });

    group('EngagementSummary model', () {
      test('calculates session trend correctly for improvement', () {
        const engagement = EngagementSummary(
          sessionsThisWeek: 5,
          sessionsLastWeek: 3,
          avgSessionDurationMinutes: 15,
          daysActiveInRange: 10,
          totalSessionsInRange: 15,
        );

        expect(engagement.isImproving, isTrue);
        expect(engagement.sessionTrendText, equals('+2 from last week'));
      });

      test('calculates session trend correctly for decline', () {
        const engagement = EngagementSummary(
          sessionsThisWeek: 2,
          sessionsLastWeek: 5,
          avgSessionDurationMinutes: 15,
          daysActiveInRange: 8,
          totalSessionsInRange: 12,
        );

        expect(engagement.isImproving, isFalse);
        expect(engagement.sessionTrendText, equals('3 fewer than last week'));
      });

      test('calculates session trend correctly for no change', () {
        const engagement = EngagementSummary(
          sessionsThisWeek: 4,
          sessionsLastWeek: 4,
          avgSessionDurationMinutes: 15,
          daysActiveInRange: 10,
          totalSessionsInRange: 15,
        );

        expect(engagement.isImproving, isFalse);
        expect(engagement.sessionTrendText, equals('Same as last week'));
      });
    });

    group('SubjectProgress model', () {
      test('calculates mastery percent correctly', () {
        const progress = SubjectProgress(
          subjectCode: 'MATH',
          subjectName: 'Mathematics',
          timeseries: [],
          skillsMasteredDelta: 3,
          currentMastery: 0.65,
        );

        expect(progress.masteryPercent, equals(65));
      });

      test('generates positive progress text for skill gains', () {
        const progress = SubjectProgress(
          subjectCode: 'MATH',
          subjectName: 'Mathematics',
          timeseries: [],
          skillsMasteredDelta: 5,
          currentMastery: 0.65,
        );

        expect(progress.progressText, equals('+5 skills mastered'));
      });

      test('generates neutral progress text for no change', () {
        const progress = SubjectProgress(
          subjectCode: 'MATH',
          subjectName: 'Mathematics',
          timeseries: [],
          skillsMasteredDelta: 0,
          currentMastery: 0.65,
        );

        expect(progress.progressText, equals('Practicing current skills'));
      });
    });

    group('StrengthOrNeedArea model', () {
      test('calculates mastery percent correctly', () {
        const area = StrengthOrNeedArea(
          subjectCode: 'MATH',
          subjectName: 'Mathematics',
          skillName: 'Fractions',
          masteryScore: 0.42,
          description: 'Growing confidence with Fractions',
        );

        expect(area.masteryPercent, equals(42));
      });
    });

    group('HomeworkUsageSummary model', () {
      test('calculates completion percent correctly', () {
        const homework = HomeworkUsageSummary(
          totalHomeworkSessions: 10,
          avgStepsCompletedPerSession: 4.5,
          completionRate: 0.82,
        );

        expect(homework.completionPercent, equals(82));
      });
    });

    group('Growth-oriented language', () {
      test('strengths use positive descriptions', () {
        const strength = StrengthOrNeedArea(
          subjectCode: 'ELA',
          subjectName: 'English Language Arts',
          skillName: 'Reading',
          masteryScore: 0.85,
          description: 'Strong foundation in Reading',
        );

        expect(strength.description, isNot(contains('weak')));
        expect(strength.description, isNot(contains('struggling')));
        expect(strength.description, isNot(contains('behind')));
        expect(strength.description, contains('Strong'));
      });

      test('support areas use growth-oriented descriptions', () {
        const supportArea = StrengthOrNeedArea(
          subjectCode: 'MATH',
          subjectName: 'Mathematics',
          skillName: 'Fractions',
          masteryScore: 0.35,
          description: 'Building foundation in Fractions',
        );

        expect(supportArea.description, isNot(contains('failing')));
        expect(supportArea.description, isNot(contains('struggling')));
        expect(supportArea.description, isNot(contains('behind')));
        expect(supportArea.description, contains('Building'));
      });
    });
  });
}
