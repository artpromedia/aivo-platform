/// Cross-App - Notification Delivery E2E Test
///
/// Tests push notification delivery across all app types.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_config.dart';
import '../config/test_users.dart';
import '../../fixtures/api_mocks.dart';

void main() {
  patrolTest(
    'Notification delivery - parent receives session alerts',
    ($) async {
      final test = NotificationDeliveryTest();
      await test.setUp($);

      try {
        await test.testParentSessionAlerts();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Notification delivery - teacher receives attention alerts',
    ($) async {
      final test = NotificationDeliveryTest();
      await test.setUp($);

      try {
        await test.testTeacherAttentionAlerts();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Notification delivery - learner receives encouragement',
    ($) async {
      final test = NotificationDeliveryTest();
      await test.setUp($);

      try {
        await test.testLearnerEncouragement();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class NotificationDeliveryTest extends BaseE2ETest {
  @override
  String get testName => 'Notification Delivery';

  @override
  String get androidPackageName => AppIdentifiers.parentAndroid;

  @override
  String get iosBundleId => AppIdentifiers.parentIos;

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
    await grantAllPermissions();
  }

  /// Test parent receiving session completion alerts
  Future<void> testParentSessionAlerts() async {
    await step('Launch parent app and login');
    await $.pumpAndSettle();
    await actions.auth.login(TestUsers.linkedParent);
    await $('Dashboard').waitUntilVisible();

    await step('Go to background');
    await pressHome();

    await step('Trigger session complete notification');
    await TestApiClient.triggerPushNotification(
      userId: TestUsers.linkedParent.id,
      title: 'Session Complete! 🎉',
      body: '${TestUsers.linkedLearner.displayName} finished Math with 95%',
    );

    await step('Wait for notification');
    await $.pump(const Duration(seconds: 3));

    await step('Open notification shade');
    await $.native.openNotifications();
    await $.pump(const Duration(seconds: 1));

    await step('Verify notification');
    await $('Session Complete!').waitUntilVisible();
    await captureScreenshot('session_push_notification');

    await step('Tap notification');
    await $('Session Complete!').tap();
    await $.pumpAndSettle();

    await step('Verify deep link to session');
    await $('Session Details').waitUntilVisible();
    await $('95%').waitUntilVisible();
    await captureScreenshot('deep_linked_to_session');
  }

  /// Test teacher receiving student needs attention alerts
  Future<void> testTeacherAttentionAlerts() async {
    await step('Clear and setup for teacher app');
    await clearAppData();

    await step('Launch teacher app');
    await $.pumpAndSettle();

    await step('Login as teacher');
    await actions.auth.login(TestUsers.existingTeacher);
    await $('Dashboard').waitUntilVisible();

    await step('Go to background');
    await pressHome();

    await step('Trigger attention alert');
    await TestApiClient.triggerPushNotification(
      userId: TestUsers.existingTeacher.id,
      title: 'Student Needs Help',
      body: 'Alex is struggling with multiplication problems',
    );

    await step('Wait for notification');
    await $.pump(const Duration(seconds: 3));

    await step('Open notification shade');
    await $.native.openNotifications();
    await $.pump(const Duration(seconds: 1));

    await step('Verify alert');
    await $('Student Needs Help').waitUntilVisible();
    await captureScreenshot('teacher_attention_alert');

    await step('Tap notification');
    await $('Student Needs Help').tap();
    await $.pumpAndSettle();

    await step('Verify deep link to monitoring');
    await $('Live Sessions').waitUntilVisible();
    await captureScreenshot('deep_linked_to_monitoring');
  }

  /// Test learner receiving encouragement from teacher
  Future<void> testLearnerEncouragement() async {
    await step('Clear and setup for learner app');
    await clearAppData();

    await step('Launch learner app');
    await $.pumpAndSettle();

    await step('Login as learner');
    await actions.auth.loginWithAccessCode(TestUsers.learner.accessCode!);
    await $('Home').waitUntilVisible();

    await step('Start a session');
    await $('Mathematics').tap();
    await $.pumpAndSettle();
    await $(#startSessionButton).tap();
    await $.pumpAndSettle();

    await step('Trigger encouragement notification');
    await TestApiClient.sendNotification(
      userId: TestUsers.learner.id,
      title: 'Great job! 🌟',
      body: 'Your teacher says: Keep up the great work!',
      type: 'encouragement',
    );

    await step('Wait for in-app notification');
    await $.pump(const Duration(seconds: 2));

    await step('Verify in-app toast');
    await $(#encouragementToast).waitUntilVisible();
    await $('Great job!').waitUntilVisible();
    await captureScreenshot('encouragement_toast');

    await step('Verify non-disruptive');
    // Session should still be visible
    await $(#questionCard).waitUntilVisible();

    await step('Toast auto-dismisses');
    await $.pump(const Duration(seconds: 5));
    await waitForElementToDisappear(
      $(#encouragementToast),
      timeout: const Duration(seconds: 5),
    );
    await captureScreenshot('toast_dismissed');
  }
}
