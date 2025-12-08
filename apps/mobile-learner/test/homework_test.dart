import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';

import 'package:mobile_learner/screens/homework_helper_intro_screen.dart';
import 'package:mobile_learner/screens/homework_text_input_screen.dart';
import 'package:mobile_learner/screens/homework_steps_screen.dart';
import 'package:mobile_learner/homework/homework_controller.dart';
import 'package:mobile_learner/homework/homework_service.dart';

void main() {
  group('HomeworkHelperIntroScreen', () {
    testWidgets('displays intro content with grade-appropriate text', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            gradeThemeControllerProvider.overrideWith((ref) => GradeThemeController()),
          ],
          child: MaterialApp(
            home: const HomeworkHelperIntroScreen(learnerId: 'test-learner-1'),
          ),
        ),
      );

      expect(find.text('Homework Helper'), findsOneWidget);
      expect(find.text('Type or paste your question'), findsOneWidget);
      expect(find.text('Take a picture'), findsOneWidget);
    });

    testWidgets('shows K5 description for K5 grade band', (tester) async {
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
            home: const HomeworkHelperIntroScreen(learnerId: 'test-learner-1'),
          ),
        ),
      );

      expect(
        find.textContaining('Stuck on your homework?'),
        findsOneWidget,
      );
    });

    testWidgets('shows G9-12 description for high school grade band', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            gradeThemeControllerProvider.overrideWith((ref) {
              final controller = GradeThemeController();
              controller.setGradeBand(AivoGradeBand.g9_12);
              return controller;
            }),
          ],
          child: MaterialApp(
            home: const HomeworkHelperIntroScreen(learnerId: 'test-learner-1'),
          ),
        ),
      );

      expect(
        find.textContaining('scaffolded guidance'),
        findsOneWidget,
      );
    });
  });

  group('HomeworkTextInputScreen', () {
    testWidgets('displays subject selection chips', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp.router(
            routerConfig: GoRouter(
              initialLocation: '/input',
              routes: [
                GoRoute(
                  path: '/input',
                  builder: (context, state) => const HomeworkTextInputScreen(learnerId: 'test-learner-1'),
                ),
              ],
            ),
          ),
        ),
      );

      expect(find.text('English Language Arts'), findsOneWidget);
      expect(find.text('Mathematics'), findsOneWidget);
      expect(find.text('Science'), findsOneWidget);
      expect(find.text('Other Subject'), findsOneWidget);
    });

    testWidgets('shows validation error for empty input', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp.router(
            routerConfig: GoRouter(
              initialLocation: '/input',
              routes: [
                GoRoute(
                  path: '/input',
                  builder: (context, state) => const HomeworkTextInputScreen(learnerId: 'test-learner-1'),
                ),
              ],
            ),
          ),
        ),
      );

      // Tap Start Helper without entering text
      await tester.tap(find.text('Start Helper'));
      await tester.pumpAndSettle();

      expect(find.text('Please enter your homework question'), findsOneWidget);
    });

    testWidgets('shows validation error for short input', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp.router(
            routerConfig: GoRouter(
              initialLocation: '/input',
              routes: [
                GoRoute(
                  path: '/input',
                  builder: (context, state) => const HomeworkTextInputScreen(learnerId: 'test-learner-1'),
                ),
              ],
            ),
          ),
        ),
      );

      // Enter very short text
      await tester.enterText(find.byType(TextFormField), 'Hi');
      await tester.tap(find.text('Start Helper'));
      await tester.pumpAndSettle();

      expect(find.text('Please provide more detail about your question'), findsOneWidget);
    });
  });

  group('HomeworkStepsScreen', () {
    testWidgets('shows error state when no session is loaded', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          child: MaterialApp.router(
            routerConfig: GoRouter(
              initialLocation: '/steps',
              routes: [
                GoRoute(
                  path: '/steps',
                  builder: (context, state) => const HomeworkStepsScreen(learnerId: 'test-learner-1'),
                ),
                GoRoute(
                  path: '/homework/intro',
                  builder: (context, state) => const Scaffold(body: Text('Intro')),
                ),
              ],
            ),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Something went wrong'), findsOneWidget);
      expect(find.text('Start Over'), findsOneWidget);
    });
  });

  group('HomeworkService', () {
    test('mock service returns steps', () async {
      final service = HomeworkService();

      final session = await service.startHomework(
        problemText: 'If I have 5 apples and eat 2, how many do I have left?',
        subject: HomeworkSubject.math,
        gradeBand: 'K5',
      );

      expect(session.id, isNotEmpty);
      expect(session.steps, isNotEmpty);
      expect(session.steps.length, equals(5));
      expect(session.steps.first.prompt, isNotEmpty);
    });

    test('mock service answers step correctly', () async {
      final service = HomeworkService();

      final result = await service.answerStep(
        stepId: 'step-1',
        responseText: 'The problem is asking how many apples I have after eating some.',
      );

      expect(result.stepId, equals('step-1'));
      expect(result.isCorrect, isTrue); // >10 chars
      expect(result.feedback, isNotEmpty);
    });

    test('mock service answers step incorrectly for short response', () async {
      final service = HomeworkService();

      final result = await service.answerStep(
        stepId: 'step-1',
        responseText: 'Five',
      );

      expect(result.isCorrect, isFalse); // <=10 chars
      expect(result.hint, isNotNull);
    });
  });

  group('HomeworkController', () {
    test('starts homework session', () async {
      final service = HomeworkService();
      final controller = HomeworkController(service, 'test-learner-1');

      final success = await controller.startHomework(
        problemText: 'What is 5 + 3?',
        subject: HomeworkSubject.math,
      );

      expect(success, isTrue);
      expect(controller.state.session, isNotNull);
      expect(controller.state.currentStepIndex, equals(0));
    });

    test('tracks progress through steps', () async {
      final service = HomeworkService();
      final controller = HomeworkController(service, 'test-learner-1');

      await controller.startHomework(
        problemText: 'What is 5 + 3?',
        subject: HomeworkSubject.math,
      );

      expect(controller.state.progress, equals(0.0));
      expect(controller.state.totalSteps, equals(5));

      // Answer first step correctly
      await controller.submitAnswer('I need to add two numbers together to find the sum.');

      expect(controller.state.currentStepIndex, equals(1));
      expect(controller.state.progress, equals(0.2)); // 1/5
    });

    test('toggles hint visibility', () async {
      final service = HomeworkService();
      final controller = HomeworkController(service, 'test-learner-1');

      expect(controller.state.showHint, isFalse);

      controller.toggleHint();
      expect(controller.state.showHint, isTrue);

      controller.toggleHint();
      expect(controller.state.showHint, isFalse);
    });
  });
}
