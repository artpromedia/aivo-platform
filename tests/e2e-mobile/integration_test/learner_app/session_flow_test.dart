/// Learner App - Session Flow E2E Test
///
/// Tests the complete learning session flow from start to completion.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';

void main() {
  patrolTest(
    'Session flow - start and complete session',
    ($) async {
      final test = SessionFlowTest();
      await test.setUp($);

      try {
        await test.testCompleteSession();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Session flow - pause and resume',
    ($) async {
      final test = SessionFlowTest();
      await test.setUp($);

      try {
        await test.testPauseAndResume();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Session flow - answer questions',
    ($) async {
      final test = SessionFlowTest();
      await test.setUp($);

      try {
        await test.testAnswerQuestions();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class SessionFlowTest extends LearnerAppTest {
  @override
  String get testName => 'Session Flow';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test completing a full learning session
  Future<void> testCompleteSession() async {
    await step('Login as learner');
    await actions.auth.loginWithAccessCode(TestUsers.learner.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Select subject');
    await $('Mathematics').tap();
    await $.pumpAndSettle();

    await step('Start new session');
    await $(#startSessionButton).tap();
    await $.pumpAndSettle();
    await captureScreenshot('session_started');

    await step('Verify session UI');
    await $(#progressBar).waitUntilVisible();
    await $(#timerDisplay).waitUntilVisible();
    await $(#questionCard).waitUntilVisible();

    await step('Answer questions');
    for (int i = 0; i < 5; i++) {
      await $(#answerOption).first.tap();
      await $.pumpAndSettle();
      await $.pump(const Duration(milliseconds: 500));
    }
    await captureScreenshot('questions_answered');

    await step('Complete session');
    await $(#finishButton).tap();
    await $.pumpAndSettle();

    await step('View results');
    await $('Session Complete!').waitUntilVisible();
    await $(#scoreDisplay).waitUntilVisible();
    await $(#accuracyDisplay).waitUntilVisible();
    await captureScreenshot('session_results');

    await step('Return home');
    await $(#doneButton).tap();
    await $.pumpAndSettle();
    await $('Home').waitUntilVisible();
  }

  /// Test pausing and resuming a session
  Future<void> testPauseAndResume() async {
    await step('Login as learner');
    await actions.auth.loginWithAccessCode(TestUsers.learner.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Start session');
    await $('Mathematics').tap();
    await $.pumpAndSettle();
    await $(#startSessionButton).tap();
    await $.pumpAndSettle();

    await step('Answer a few questions');
    await $(#answerOption).first.tap();
    await $.pumpAndSettle();
    await $(#answerOption).at(1).tap();
    await $.pumpAndSettle();

    await step('Pause session');
    await $(#pauseButton).tap();
    await $.pumpAndSettle();

    await step('Verify paused state');
    await $('Session Paused').waitUntilVisible();
    await captureScreenshot('session_paused');

    await step('Resume session');
    await $(#resumeButton).tap();
    await $.pumpAndSettle();

    await step('Verify resumed');
    await $(#questionCard).waitUntilVisible();
    verifyNotExists($('Session Paused'), 'Paused message');
    await captureScreenshot('session_resumed');

    await step('Complete session');
    for (int i = 0; i < 3; i++) {
      await $(#answerOption).first.tap();
      await $.pumpAndSettle();
    }
    await $(#finishButton).tap();
    await $.pumpAndSettle();
    await $('Session Complete!').waitUntilVisible();
  }

  /// Test answering different question types
  Future<void> testAnswerQuestions() async {
    await step('Login as learner');
    await actions.auth.loginWithAccessCode(TestUsers.learner.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Start mixed session');
    await $('All Subjects').tap();
    await $.pumpAndSettle();
    await $(#startSessionButton).tap();
    await $.pumpAndSettle();

    await step('Answer multiple choice');
    await $(#multipleChoiceQuestion).waitUntilVisible();
    await $(#answerOption).at(1).tap();
    await $.pumpAndSettle();
    await captureScreenshot('multiple_choice');

    await step('Answer true/false');
    await $(#trueFalseQuestion).waitUntilVisible();
    await $('True').tap();
    await $.pumpAndSettle();
    await captureScreenshot('true_false');

    await step('Answer fill in blank');
    await $(#fillBlankQuestion).waitUntilVisible();
    await $(#answerField).enterText('42');
    await $(#submitAnswerButton).tap();
    await $.pumpAndSettle();
    await captureScreenshot('fill_in_blank');

    await step('Use hint');
    await $(#hintButton).tap();
    await $.pumpAndSettle();
    await $(#hintCard).waitUntilVisible();
    await captureScreenshot('hint_shown');

    await step('Complete session');
    await $(#answerOption).first.tap();
    await $.pumpAndSettle();
    await $(#finishButton).tap();
    await $.pumpAndSettle();
  }
}
