/// Learner App - Break Reminders E2E Test
///
/// Tests break reminder system and focus management features.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';

void main() {
  patrolTest(
    'Break reminders - scheduled reminder',
    ($) async {
      final test = BreakRemindersTest();
      await test.setUp($);

      try {
        await test.testScheduledReminder();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Break reminders - take break activity',
    ($) async {
      final test = BreakRemindersTest();
      await test.setUp($);

      try {
        await test.testBreakActivity();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Break reminders - customize settings',
    ($) async {
      final test = BreakRemindersTest();
      await test.setUp($);

      try {
        await test.testCustomizeSettings();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class BreakRemindersTest extends LearnerAppTest {
  @override
  String get testName => 'Break Reminders';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test scheduled break reminder during session
  Future<void> testScheduledReminder() async {
    await step('Login as learner with frequent breaks');
    await actions.auth.loginWithAccessCode(TestUsers.learnerWithIep.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Start session');
    await $('Mathematics').tap();
    await $.pumpAndSettle();
    await $(#startSessionButton).tap();
    await $.pumpAndSettle();

    await step('Answer some questions');
    for (int i = 0; i < 3; i++) {
      await $(#answerOption).first.tap();
      await $.pumpAndSettle();
    }

    await step('Simulate time passing (trigger break)');
    await simulateTimePassing(minutes: 15);
    await $.pumpAndSettle();

    await step('Verify break reminder appears');
    await $(#breakReminderModal).waitUntilVisible();
    await $('Time for a break!').waitUntilVisible();
    await captureScreenshot('break_reminder');

    await step('View break options');
    await $(#takeBreakButton).waitUntilVisible();
    await $(#skipBreakButton).waitUntilVisible();

    await step('Take break');
    await $(#takeBreakButton).tap();
    await $.pumpAndSettle();

    await step('Verify break screen');
    await $('Break Time').waitUntilVisible();
    await $(#breakTimer).waitUntilVisible();
    await captureScreenshot('break_screen');

    await step('End break early');
    await $(#endBreakButton).tap();
    await $.pumpAndSettle();

    await step('Verify returned to session');
    await $(#questionCard).waitUntilVisible();
    await captureScreenshot('returned_to_session');
  }

  /// Test break activity options
  Future<void> testBreakActivity() async {
    await step('Login as learner');
    await actions.auth.loginWithAccessCode(TestUsers.learner.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Start session');
    await $('Reading').tap();
    await $.pumpAndSettle();
    await $(#startSessionButton).tap();
    await $.pumpAndSettle();

    await step('Request manual break');
    await $(#breakButton).tap();
    await $.pumpAndSettle();

    await step('Confirm break');
    await $('Take a break?').waitUntilVisible();
    await $('Yes').tap();
    await $.pumpAndSettle();

    await step('View break activities');
    await $('Choose an activity').waitUntilVisible();
    await captureScreenshot('break_activities');

    await step('Select breathing exercise');
    await $('Breathing').tap();
    await $.pumpAndSettle();

    await step('Verify breathing exercise');
    await $(#breathingAnimation).waitUntilVisible();
    await $('Breathe in').waitUntilVisible();
    await captureScreenshot('breathing_exercise');

    await step('Complete exercise');
    await $.pump(const Duration(seconds: 10));
    await $(#doneButton).tap();
    await $.pumpAndSettle();

    await step('Try stretching activity');
    await $(#breakButton).tap();
    await $.pumpAndSettle();
    await $('Yes').tap();
    await $.pumpAndSettle();
    await $('Stretching').tap();
    await $.pumpAndSettle();

    await step('Verify stretching instructions');
    await $(#stretchingGuide).waitUntilVisible();
    await captureScreenshot('stretching_activity');
  }

  /// Test customizing break reminder settings
  Future<void> testCustomizeSettings() async {
    await step('Login as learner');
    await actions.auth.loginWithAccessCode(TestUsers.learner.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Go to settings');
    await $(#settingsTab).tap();
    await $.pumpAndSettle();

    await step('Open break settings');
    await $('Breaks & Focus').tap();
    await $.pumpAndSettle();

    await step('Verify break settings');
    await $('Break Reminders').waitUntilVisible();
    await captureScreenshot('break_settings');

    await step('Adjust reminder frequency');
    await $(#reminderFrequencyDropdown).tap();
    await $.pumpAndSettle();
    await $('Every 20 minutes').tap();
    await $.pumpAndSettle();

    await step('Adjust break duration');
    await $(#breakDurationDropdown).tap();
    await $.pumpAndSettle();
    await $('3 minutes').tap();
    await $.pumpAndSettle();
    await captureScreenshot('adjusted_settings');

    await step('Enable smart breaks');
    await $(#smartBreaksToggle).tap();
    await $.pumpAndSettle();

    await step('View smart breaks info');
    await $(#smartBreaksInfo).tap();
    await $.pumpAndSettle();
    await $('Smart breaks detect').waitUntilVisible();
    await captureScreenshot('smart_breaks_info');

    await step('Save settings');
    await actions.dialog.dismiss();
    await $(#saveButton).tap();
    await $.pumpAndSettle();

    await step('Verify saved');
    await $('Settings saved').waitUntilVisible();
    await captureScreenshot('settings_saved');
  }
}
