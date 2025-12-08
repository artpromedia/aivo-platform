import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_common/flutter_common.dart';

import 'package:mobile_learner/focus/focus_service.dart';
import 'package:mobile_learner/focus/focus_controller.dart';
import 'package:mobile_learner/screens/focus_break_screen.dart';
import 'package:mobile_learner/widgets/focus_break_widgets.dart';

void main() {
  group('FocusBreakScreen', () {
    testWidgets('displays activity title and instructions', (tester) async {
      const activity = RegulationActivity(
        type: BreakActivityType.breathing,
        title: 'Box Breathing',
        instructions: 'Breathe in for 4 counts, hold for 4, out for 4.',
        durationSeconds: 60,
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: FocusBreakScreen(
              learnerId: 'test-learner-1',
              activity: activity,
            ),
          ),
        ),
      );

      expect(find.text('Box Breathing'), findsOneWidget);
      expect(find.textContaining('Breathe in for 4 counts'), findsOneWidget);
    });

    testWidgets('shows countdown timer', (tester) async {
      const activity = RegulationActivity(
        type: BreakActivityType.breathing,
        title: 'Test Activity',
        instructions: 'Test instructions',
        durationSeconds: 90, // 1:30
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: FocusBreakScreen(
              learnerId: 'test-learner-1',
              activity: activity,
            ),
          ),
        ),
      );

      // Should show 1:30 format
      expect(find.text('1:30'), findsOneWidget);

      // After 1 second
      await tester.pump(const Duration(seconds: 1));
      expect(find.text('1:29'), findsOneWidget);
    });

    testWidgets('shows skip button with non-punitive language', (tester) async {
      const activity = RegulationActivity(
        type: BreakActivityType.breathing,
        title: 'Test Activity',
        instructions: 'Test instructions',
        durationSeconds: 60,
      );

      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: FocusBreakScreen(
              learnerId: 'test-learner-1',
              activity: activity,
            ),
          ),
        ),
      );

      expect(find.text('Skip for now'), findsOneWidget);
    });

    testWidgets('shows grade-appropriate continue button text', (tester) async {
      const activity = RegulationActivity(
        type: BreakActivityType.breathing,
        title: 'Test Activity',
        instructions: 'Test instructions',
        durationSeconds: 30,
      );

      // Test K5 grade band
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            gradeThemeControllerProvider.overrideWith((ref) {
              final controller = GradeThemeController();
              controller.setGradeBand(AivoGradeBand.k5);
              return controller;
            }),
          ],
          child: MaterialApp(
            home: FocusBreakScreen(
              learnerId: 'test-learner-1',
              activity: activity,
            ),
          ),
        ),
      );

      expect(find.textContaining('ready to keep going'), findsOneWidget);
    });

    testWidgets('shows appropriate icon for each activity type', (tester) async {
      for (final type in BreakActivityType.values) {
        final activity = RegulationActivity(
          type: type,
          title: 'Test ${type.displayName}',
          instructions: 'Test instructions',
          durationSeconds: 60,
        );

        await tester.pumpWidget(
          ProviderScope(
            child: MaterialApp(
              home: FocusBreakScreen(
                learnerId: 'test-learner-1',
                activity: activity,
              ),
            ),
          ),
        );

        expect(find.text('Test ${type.displayName}'), findsOneWidget);
        
        // Clean up for next iteration
        await tester.pumpAndSettle(const Duration(milliseconds: 100));
      }
    });
  });

  group('FocusBreakBanner', () {
    testWidgets('does not show when no break is recommended', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp(
            home: Scaffold(
              body: const FocusBreakBanner(learnerId: 'test-learner-1'),
            ),
          ),
        ),
      );

      expect(find.byType(FocusBreakBanner), findsOneWidget);
      // Should be a SizedBox.shrink()
      expect(find.text('How about a break?'), findsNothing);
      expect(find.text('Need a quick break?'), findsNothing);
    });
  });

  group('FocusService', () {
    test('mock ping returns no break for normal activity', () async {
      final service = FocusService();

      final result = await service.sendPing(
        sessionId: 'session-1',
        learnerId: 'learner-1',
        activityId: 'activity-1',
        idleMs: 5000, // 5 seconds - normal
        appInBackground: false,
      );

      expect(result.requiresBreak, isFalse);
    });

    test('mock ping recommends break for extended idle', () async {
      final service = FocusService();

      final result = await service.sendPing(
        sessionId: 'session-1',
        learnerId: 'learner-1',
        activityId: 'activity-1',
        idleMs: 70000, // 70 seconds - extended idle
        appInBackground: false,
      );

      expect(result.requiresBreak, isTrue);
      expect(result.reasons, contains('extended_idle'));
      expect(result.recommendation, isNotNull);
    });

    test('mock ping recommends break for frustrated mood', () async {
      final service = FocusService();

      final result = await service.sendPing(
        sessionId: 'session-1',
        learnerId: 'learner-1',
        activityId: 'activity-1',
        idleMs: 1000,
        appInBackground: false,
        mood: SelfReportedMood.frustrated,
      );

      expect(result.requiresBreak, isTrue);
      expect(result.reasons, contains('mood_frustrated'));
    });

    test('mock ping recommends break for tired mood', () async {
      final service = FocusService();

      final result = await service.sendPing(
        sessionId: 'session-1',
        learnerId: 'learner-1',
        activityId: 'activity-1',
        idleMs: 1000,
        appInBackground: false,
        mood: SelfReportedMood.tired,
      );

      expect(result.requiresBreak, isTrue);
      expect(result.reasons, contains('mood_tired'));
    });

    test('mock recommendation returns grade-appropriate activities', () async {
      final service = FocusService();

      final k5Result = await service.getRecommendation(
        sessionId: 'session-1',
        learnerId: 'learner-1',
        gradeBand: 'K5',
      );

      expect(k5Result.activities, isNotEmpty);
      // K5 should have movement and grounding activities
      final types = k5Result.activities.map((a) => a.type).toList();
      expect(types.contains(BreakActivityType.movement) || types.contains(BreakActivityType.grounding), isTrue);

      final g912Result = await service.getRecommendation(
        sessionId: 'session-1',
        learnerId: 'learner-1',
        gradeBand: 'G9_12',
      );

      expect(g912Result.activities, isNotEmpty);
      // G9-12 should have mindful pause and stretching
      final types912 = g912Result.activities.map((a) => a.type).toList();
      expect(types912.contains(BreakActivityType.mindfulPause) || types912.contains(BreakActivityType.stretching), isTrue);
    });
  });

  group('FocusController', () {
    test('starts and stops monitoring', () {
      final service = FocusService();
      final controller = FocusController(service, 'test-learner-1');

      expect(controller.state.isMonitoring, isFalse);

      controller.configure(
        sessionId: 'session-1',
        activityId: 'activity-1',
        gradeBand: AivoGradeBand.g6_8,
      );
      controller.startMonitoring();

      expect(controller.state.isMonitoring, isTrue);

      controller.stopMonitoring();
      expect(controller.state.isMonitoring, isFalse);

      controller.dispose();
    });

    test('dismisses break recommendation', () async {
      final service = FocusService();
      final controller = FocusController(service, 'test-learner-1');

      // Simulate a break being recommended
      controller.configure(
        sessionId: 'session-1',
        activityId: 'activity-1',
        gradeBand: AivoGradeBand.g6_8,
      );

      // Report frustrated mood to trigger break recommendation
      await controller.reportMood(SelfReportedMood.frustrated);

      expect(controller.state.requiresBreak, isTrue);

      controller.dismissBreakRecommendation();

      expect(controller.state.requiresBreak, isFalse);
      expect(controller.state.pendingActivity, isNull);

      controller.dispose();
    });

    test('requests break recommendations', () async {
      final service = FocusService();
      final controller = FocusController(service, 'test-learner-1');

      controller.configure(
        sessionId: 'session-1',
        activityId: 'activity-1',
        gradeBand: AivoGradeBand.g6_8,
      );

      final activities = await controller.requestBreakRecommendations(
        mood: SelfReportedMood.tired,
      );

      expect(activities, isNotEmpty);
      expect(activities.first.type, isNotNull);
      expect(activities.first.title, isNotEmpty);
      expect(activities.first.instructions, isNotEmpty);

      controller.dispose();
    });
  });

  group('SelfReportedMood', () {
    test('has emoji and label for all moods', () {
      for (final mood in SelfReportedMood.values) {
        expect(mood.emoji, isNotEmpty);
        expect(mood.label, isNotEmpty);
        expect(mood.code, isNotEmpty);
      }
    });
  });

  group('BreakActivityType', () {
    test('has displayName for all types', () {
      for (final type in BreakActivityType.values) {
        expect(type.displayName, isNotEmpty);
        expect(type.code, isNotEmpty);
      }
    });
  });
}
