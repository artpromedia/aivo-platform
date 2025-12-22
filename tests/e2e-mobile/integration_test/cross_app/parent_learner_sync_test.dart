/// Cross-App - Parent-Learner Sync E2E Test
///
/// Tests data synchronization between parent and learner apps.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../common/test_utils.dart';
import '../config/test_config.dart';
import '../config/test_users.dart';
import '../fixtures/api_mocks.dart';

void main() {
  patrolTest(
    'Parent-learner sync - session completion syncs to parent',
    ($) async {
      final test = ParentLearnerSyncTest();
      await test.setUp($);

      try {
        await test.testSessionCompletionSync();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Parent-learner sync - achievement notification',
    ($) async {
      final test = ParentLearnerSyncTest();
      await test.setUp($);

      try {
        await test.testAchievementNotification();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Parent-learner sync - real-time progress updates',
    ($) async {
      final test = ParentLearnerSyncTest();
      await test.setUp($);

      try {
        await test.testRealTimeProgressUpdates();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class ParentLearnerSyncTest extends BaseE2ETest {
  @override
  String get testName => 'Parent-Learner Sync';

  @override
  String get androidPackageName => AppIdentifiers.parentAndroid;

  @override
  String get iosBundleId => AppIdentifiers.parentIos;

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test that completed learner session syncs to parent app
  Future<void> testSessionCompletionSync() async {
    await step('Setup: Create session for linked learner');
    final sessionId = await TestApiClient.createSession(
      learnerId: TestUsers.linkedLearner.id,
      subject: 'Mathematics',
      durationMinutes: 30,
    );

    await step('Complete session via API (simulating learner)');
    await TestApiClient.completeSession(
      sessionId: sessionId,
      score: 85,
      questionsAnswered: 20,
    );

    await step('Launch parent app');
    await $.pumpAndSettle();

    await step('Login as linked parent');
    await actions.auth.login(TestUsers.linkedParent);
    await $('Dashboard').waitUntilVisible();

    await step('Check for new activity notification');
    await $(#activityBadge).waitUntilVisible();
    await captureScreenshot('activity_notification');

    await step('View child progress');
    await $(#childProgressCard).tap();
    await $.pumpAndSettle();

    await step('Verify session appears');
    await $('Recent Activity').waitUntilVisible();
    await $('Mathematics').waitUntilVisible();
    await $('85%').waitUntilVisible();
    await captureScreenshot('session_synced');

    await step('View session details');
    await $(#recentSessionCard).first.tap();
    await $.pumpAndSettle();

    await step('Verify details match');
    await $('20 questions').waitUntilVisible();
    await captureScreenshot('session_details_synced');
  }

  /// Test achievement notification flows to parent
  Future<void> testAchievementNotification() async {
    await step('Trigger achievement for learner via API');
    await TestApiClient.sendNotification(
      userId: TestUsers.linkedParent.id,
      title: 'Achievement Unlocked!',
      body: '${TestUsers.linkedLearner.displayName} earned "Math Master"',
      type: 'achievement',
    );

    await step('Launch parent app');
    await $.pumpAndSettle();

    await step('Login as linked parent');
    await actions.auth.login(TestUsers.linkedParent);
    await $('Dashboard').waitUntilVisible();

    await step('Check notification indicator');
    await $(#notificationBadge).waitUntilVisible();
    await captureScreenshot('notification_badge');

    await step('Open notifications');
    await $(#notificationBell).tap();
    await $.pumpAndSettle();

    await step('Verify achievement notification');
    await $('Achievement Unlocked!').waitUntilVisible();
    await $('Math Master').waitUntilVisible();
    await captureScreenshot('achievement_notification');

    await step('Tap notification');
    await $(#notificationCard).first.tap();
    await $.pumpAndSettle();

    await step('Verify navigates to achievements');
    await $('Achievements').waitUntilVisible();
    await $('Math Master').waitUntilVisible();
    await captureScreenshot('achievement_detail');
  }

  /// Test real-time progress updates during session
  Future<void> testRealTimeProgressUpdates() async {
    await step('Launch parent app and login');
    await $.pumpAndSettle();
    await actions.auth.login(TestUsers.linkedParent);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to live view');
    await $(#childProgressCard).tap();
    await $.pumpAndSettle();
    await $(#liveViewButton).tap();
    await $.pumpAndSettle();

    await step('Verify live view screen');
    await $('Live Activity').waitUntilVisible();
    await captureScreenshot('live_view_initial');

    await step('Simulate learner starting session');
    final sessionId = await TestApiClient.createSession(
      learnerId: TestUsers.linkedLearner.id,
      subject: 'Reading',
      durationMinutes: 20,
    );

    await step('Wait for update');
    await $.pump(const Duration(seconds: 3));
    await actions.nav.pullToRefresh();

    await step('Verify session shows live');
    await $('In Progress').waitUntilVisible();
    await $('Reading').waitUntilVisible();
    await captureScreenshot('live_session');

    await step('Simulate progress updates');
    await TestApiClient.completeSession(
      sessionId: sessionId,
      score: 90,
      questionsAnswered: 15,
    );

    await step('Wait for completion update');
    await $.pump(const Duration(seconds: 3));
    await actions.nav.pullToRefresh();

    await step('Verify session completed');
    await $('Completed').waitUntilVisible();
    await $('90%').waitUntilVisible();
    await captureScreenshot('session_completed_live');
  }
}
