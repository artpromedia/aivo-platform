/// Parent App - Notifications E2E Test
///
/// Tests push notifications, in-app notifications, and notification settings.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';
import '../fixtures/api_mocks.dart';

void main() {
  patrolTest(
    'Notifications - view notification center',
    ($) async {
      final test = NotificationsTest();
      await test.setUp($);

      try {
        await test.testViewNotifications();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Notifications - receive push notification',
    ($) async {
      final test = NotificationsTest();
      await test.setUp($);

      try {
        await test.testReceivePushNotification();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Notifications - configure preferences',
    ($) async {
      final test = NotificationsTest();
      await test.setUp($);

      try {
        await test.testConfigurePreferences();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class NotificationsTest extends ParentAppTest {
  @override
  String get testName => 'Notifications';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test viewing notification center
  Future<void> testViewNotifications() async {
    await step('Login as parent');
    await actions.auth.login(TestUsers.existingParentPro);
    await $('Dashboard').waitUntilVisible();

    await step('Check notification badge');
    await $(#notificationBadge).waitUntilVisible();

    await step('Open notification center');
    await $(#notificationBell).tap();
    await $.pumpAndSettle();

    await step('Verify notifications list');
    await $('Notifications').waitUntilVisible();
    await $(#notificationsList).waitUntilVisible();
    await captureScreenshot('notification_center');

    await step('View session complete notification');
    await $('Session Complete').waitUntilVisible();
    await $(#notificationCard).first.tap();
    await $.pumpAndSettle();

    await step('Verify notification details');
    await captureScreenshot('notification_detail');

    await step('Mark all as read');
    await actions.nav.goBack();
    await $(#markAllReadButton).tap();
    await $.pumpAndSettle();

    await step('Verify badge cleared');
    verifyNotExists($(#notificationBadge), 'Notification badge');
    await captureScreenshot('notifications_cleared');
  }

  /// Test receiving push notification
  Future<void> testReceivePushNotification() async {
    await step('Login as parent');
    await actions.auth.login(TestUsers.linkedParent);
    await $('Dashboard').waitUntilVisible();

    await step('Trigger push notification from backend');
    await TestApiClient.triggerPushNotification(
      userId: TestUsers.linkedParent.id,
      title: 'Session Complete!',
      body: 'Alex finished their math session with 90% accuracy',
    );

    await step('Wait for notification');
    await $.pump(const Duration(seconds: 3));

    await step('Check notification appeared');
    await $.native.openNotifications();
    await $.pump(const Duration(seconds: 1));
    await captureScreenshot('push_notification');

    await step('Tap notification');
    await $('Session Complete!').tap();
    await $.pumpAndSettle();

    await step('Verify navigated to session details');
    await $('Session Details').waitUntilVisible();
    await captureScreenshot('navigated_from_push');
  }

  /// Test configuring notification preferences
  Future<void> testConfigurePreferences() async {
    await step('Login as parent');
    await actions.auth.login(TestUsers.existingParentPro);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to settings');
    await actions.nav.goToSettings();

    await step('Open notification settings');
    await $('Notifications').tap();
    await $.pumpAndSettle();

    await step('Verify notification options');
    await $('Notification Settings').waitUntilVisible();
    await $(#sessionCompletedToggle).waitUntilVisible();
    await $(#achievementToggle).waitUntilVisible();
    await $(#dailyReportToggle).waitUntilVisible();
    await captureScreenshot('notification_settings');

    await step('Toggle session notifications off');
    await $(#sessionCompletedToggle).tap();
    await $.pumpAndSettle();

    await step('Toggle daily report on');
    await $(#dailyReportToggle).tap();
    await $.pumpAndSettle();

    await step('Set quiet hours');
    await $(#quietHoursSwitch).tap();
    await $.pumpAndSettle();

    await $(#startTimeField).tap();
    await $.pumpAndSettle();
    await $('10:00 PM').tap();
    await $.pumpAndSettle();

    await $(#endTimeField).tap();
    await $.pumpAndSettle();
    await $('7:00 AM').tap();
    await $.pumpAndSettle();
    await captureScreenshot('quiet_hours_set');

    await step('Save preferences');
    await $(#saveButton).tap();
    await $.pumpAndSettle();

    await step('Verify saved');
    await $('Preferences saved').waitUntilVisible();
    await captureScreenshot('preferences_saved');
  }
}
