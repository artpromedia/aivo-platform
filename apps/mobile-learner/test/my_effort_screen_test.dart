import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile_learner/learner/effort_controller.dart';
import 'package:mobile_learner/screens/my_effort_screen.dart';

void main() {
  group('MyEffortScreen', () {
    testWidgets('renders loading state initially', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: MyEffortScreen(learnerId: 'learner-100'),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
      expect(find.text('Loading your progress...'), findsOneWidget);
    });

    testWidgets('renders app bar with title', (tester) async {
      await tester.pumpWidget(
        const ProviderScope(
          child: MaterialApp(
            home: MyEffortScreen(learnerId: 'learner-100'),
          ),
        ),
      );

      expect(find.text('My Effort'), findsOneWidget);
    });
  });

  group('EffortSummary model', () {
    test('parses from JSON correctly', () {
      final json = {
        'learnerId': 'learner-100',
        'currentStreakDays': 5,
        'longestStreakDays': 12,
        'skillsMasteredThisMonth': 7,
        'sessionsCountThisWeek': 4,
        'milestones': [
          {
            'id': 'streak-3',
            'type': 'streak',
            'title': '3-Day Streak',
            'description': 'Practice 3 days in a row',
            'achieved': true,
            'progress': 3,
            'target': 3,
          },
          {
            'id': 'streak-7',
            'type': 'streak',
            'title': 'Week Warrior',
            'description': 'Practice 7 days in a row',
            'achieved': false,
            'progress': 5,
            'target': 7,
          },
        ],
        'encouragementMessage': 'Great work! 5 days in a row!',
      };

      final summary = EffortSummary.fromJson(json);

      expect(summary.learnerId, equals('learner-100'));
      expect(summary.currentStreakDays, equals(5));
      expect(summary.longestStreakDays, equals(12));
      expect(summary.skillsMasteredThisMonth, equals(7));
      expect(summary.sessionsCountThisWeek, equals(4));
      expect(summary.milestones.length, equals(2));
      expect(summary.encouragementMessage, equals('Great work! 5 days in a row!'));
    });

    test('filters achieved milestones correctly', () {
      final summary = EffortSummary(
        learnerId: 'learner-100',
        currentStreakDays: 5,
        longestStreakDays: 10,
        skillsMasteredThisMonth: 6,
        sessionsCountThisWeek: 3,
        milestones: [
          const Milestone(
            id: 'streak-3',
            type: MilestoneType.streak,
            title: '3-Day Streak',
            description: 'Practice 3 days in a row',
            achieved: true,
            progress: 3,
            target: 3,
          ),
          const Milestone(
            id: 'streak-7',
            type: MilestoneType.streak,
            title: 'Week Warrior',
            description: 'Practice 7 days in a row',
            achieved: false,
            progress: 5,
            target: 7,
          ),
          const Milestone(
            id: 'skills-5',
            type: MilestoneType.skills,
            title: 'Skill Builder',
            description: 'Master 5 skills',
            achieved: true,
            progress: 5,
            target: 5,
          ),
        ],
        encouragementMessage: 'Keep going!',
      );

      expect(summary.achievedMilestones.length, equals(2));
      expect(summary.inProgressMilestones.length, equals(1));
    });
  });

  group('Milestone model', () {
    test('parses from JSON correctly', () {
      final json = {
        'id': 'streak-7',
        'type': 'streak',
        'title': 'Week Warrior',
        'description': 'Practice 7 days in a row',
        'achieved': false,
        'progress': 5,
        'target': 7,
      };

      final milestone = Milestone.fromJson(json);

      expect(milestone.id, equals('streak-7'));
      expect(milestone.type, equals(MilestoneType.streak));
      expect(milestone.title, equals('Week Warrior'));
      expect(milestone.description, equals('Practice 7 days in a row'));
      expect(milestone.achieved, isFalse);
      expect(milestone.progress, equals(5));
      expect(milestone.target, equals(7));
    });

    test('calculates progress percent correctly', () {
      const milestone = Milestone(
        id: 'streak-7',
        type: MilestoneType.streak,
        title: 'Week Warrior',
        description: 'Practice 7 days in a row',
        achieved: false,
        progress: 5,
        target: 7,
      );

      // 5/7 = ~0.714
      expect(milestone.progressPercent, closeTo(0.714, 0.01));
    });

    test('returns 1.0 for achieved milestone', () {
      const milestone = Milestone(
        id: 'streak-3',
        type: MilestoneType.streak,
        title: '3-Day Streak',
        description: 'Practice 3 days in a row',
        achieved: true,
        progress: 3,
        target: 3,
      );

      expect(milestone.progressPercent, equals(1.0));
    });

    test('returns correct emoji for each type', () {
      const streakMilestone = Milestone(
        id: 'streak-3',
        type: MilestoneType.streak,
        title: 'Streak',
        description: '',
        achieved: false,
      );
      expect(streakMilestone.emoji, equals('🔥'));

      const skillsMilestone = Milestone(
        id: 'skills-5',
        type: MilestoneType.skills,
        title: 'Skills',
        description: '',
        achieved: false,
      );
      expect(skillsMilestone.emoji, equals('⭐'));

      const sessionsMilestone = Milestone(
        id: 'sessions-5',
        type: MilestoneType.sessions,
        title: 'Sessions',
        description: '',
        achieved: false,
      );
      expect(sessionsMilestone.emoji, equals('📚'));
    });
  });

  group('MilestoneType', () {
    test('parses from string correctly', () {
      expect(MilestoneType.fromString('streak'), equals(MilestoneType.streak));
      expect(MilestoneType.fromString('skills'), equals(MilestoneType.skills));
      expect(MilestoneType.fromString('sessions'), equals(MilestoneType.sessions));
    });

    test('defaults to streak for unknown type', () {
      expect(MilestoneType.fromString('unknown'), equals(MilestoneType.streak));
      expect(MilestoneType.fromString(''), equals(MilestoneType.streak));
    });
  });

  group('Growth-oriented messaging', () {
    test('encouragement messages use positive language', () {
      final positiveMessages = [
        'Amazing! You\'re on a 7-day streak. Keep it up! 🌟',
        'Great work! 5 days in a row. You\'re building a habit! 💪',
        'Nice start! Every day counts. Keep going! 🎯',
        'Ready to start your learning adventure today? 🚀',
      ];

      for (final message in positiveMessages) {
        expect(message.toLowerCase(), isNot(contains('behind')));
        expect(message.toLowerCase(), isNot(contains('slow')));
        expect(message.toLowerCase(), isNot(contains('bad')));
        expect(message.toLowerCase(), isNot(contains('failing')));
      }
    });

    test('milestone descriptions emphasize effort', () {
      final descriptions = [
        'Practice 3 days in a row',
        'Practice 7 days in a row',
        'Master 5 skills this month',
        'Complete 5 sessions this week',
      ];

      for (final desc in descriptions) {
        expect(desc.toLowerCase(), isNot(contains('must')));
        expect(desc.toLowerCase(), isNot(contains('required')));
        expect(desc.toLowerCase(), isNot(contains('need to')));
      }
    });
  });
}
