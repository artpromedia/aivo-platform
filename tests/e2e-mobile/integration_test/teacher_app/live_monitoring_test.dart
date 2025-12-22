/// Teacher App - Live Monitoring E2E Test
///
/// Tests real-time student session monitoring and intervention features.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';
import '../fixtures/api_mocks.dart';

void main() {
  patrolTest(
    'Live monitoring - view active sessions',
    ($) async {
      final test = LiveMonitoringTest();
      await test.setUp($);

      try {
        await test.testViewActiveSessions();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Live monitoring - student drill-down',
    ($) async {
      final test = LiveMonitoringTest();
      await test.setUp($);

      try {
        await test.testStudentDrillDown();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Live monitoring - send encouragement',
    ($) async {
      final test = LiveMonitoringTest();
      await test.setUp($);

      try {
        await test.testSendEncouragement();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class LiveMonitoringTest extends TeacherAppTest {
  @override
  String get testName => 'Live Monitoring';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test viewing active learning sessions
  Future<void> testViewActiveSessions() async {
    await step('Login as teacher');
    await actions.auth.login(TestUsers.existingTeacher);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to live monitoring');
    await $(#monitoringTab).tap();
    await $.pumpAndSettle();

    await step('Verify monitoring dashboard');
    await $('Live Sessions').waitUntilVisible();
    await $(#activeSessionsGrid).waitUntilVisible();
    await captureScreenshot('live_monitoring_dashboard');

    await step('Check session cards');
    await $(#sessionCard).waitUntilVisible();

    await step('Verify real-time updates');
    await $.pump(const Duration(seconds: 3));
    await captureScreenshot('sessions_updated');

    await step('Filter by class');
    await $(#classFilter).tap();
    await $.pumpAndSettle();
    await $('5th Grade Math').tap();
    await $.pumpAndSettle();
    await captureScreenshot('filtered_by_class');

    await step('Sort by status');
    await $(#sortButton).tap();
    await $.pumpAndSettle();
    await $('Needs Attention').tap();
    await $.pumpAndSettle();
    await captureScreenshot('sorted_by_attention');
  }

  /// Test drilling down into student session
  Future<void> testStudentDrillDown() async {
    await step('Login as teacher');
    await actions.auth.login(TestUsers.existingTeacher);
    await $('Dashboard').waitUntilVisible();

    await step('Go to monitoring');
    await $(#monitoringTab).tap();
    await $.pumpAndSettle();

    await step('Tap on student session');
    await $(#sessionCard).first.tap();
    await $.pumpAndSettle();

    await step('Verify session details');
    await $('Session Details').waitUntilVisible();
    await $(#progressIndicator).waitUntilVisible();
    await $(#currentQuestion).waitUntilVisible();
    await captureScreenshot('session_drilldown');

    await step('View question history');
    await $(#questionHistoryTab).tap();
    await $.pumpAndSettle();
    await $(#questionList).waitUntilVisible();
    await captureScreenshot('question_history');

    await step('View struggle areas');
    await $(#insightsTab).tap();
    await $.pumpAndSettle();
    await $('Struggle Areas').waitUntilVisible();
    await captureScreenshot('struggle_areas');
  }

  /// Test sending encouragement to student
  Future<void> testSendEncouragement() async {
    await step('Login as teacher');
    await actions.auth.login(TestUsers.existingTeacher);
    await $('Dashboard').waitUntilVisible();

    await step('Go to monitoring');
    await $(#monitoringTab).tap();
    await $.pumpAndSettle();

    await step('Select struggling student');
    await $(#needsAttentionCard).first.tap();
    await $.pumpAndSettle();

    await step('Open send message');
    await $(#sendMessageButton).tap();
    await $.pumpAndSettle();

    await step('Select quick message');
    await $('Send Encouragement').waitUntilVisible();
    await $('Keep going!').tap();
    await $.pumpAndSettle();
    await captureScreenshot('quick_message_selected');

    await step('Send message');
    await $(#sendButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 1));

    await step('Verify sent');
    await $('Message sent').waitUntilVisible();
    await captureScreenshot('encouragement_sent');

    await step('Send custom message');
    await $(#sendMessageButton).tap();
    await $.pumpAndSettle();
    await $(#customMessageField).enterText('Great job on that last question!');
    await $(#sendButton).tap();
    await $.pumpAndSettle();

    await step('Verify custom sent');
    await $('Message sent').waitUntilVisible();
  }
}
