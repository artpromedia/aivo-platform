/// Parent App - View Progress E2E Test
///
/// Tests viewing child learning progress, session history, and analytics.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';

void main() {
  patrolTest(
    'View progress - dashboard overview',
    ($) async {
      final test = ViewProgressTest();
      await test.setUp($);

      try {
        await test.testDashboardOverview();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'View progress - detailed session history',
    ($) async {
      final test = ViewProgressTest();
      await test.setUp($);

      try {
        await test.testSessionHistory();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'View progress - weekly report',
    ($) async {
      final test = ViewProgressTest();
      await test.setUp($);

      try {
        await test.testWeeklyReport();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class ViewProgressTest extends ParentAppTest {
  @override
  String get testName => 'View Progress';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test dashboard progress overview
  Future<void> testDashboardOverview() async {
    await step('Login as parent with children');
    await actions.auth.login(TestUsers.existingParentPro);
    await $('Dashboard').waitUntilVisible();

    await step('Verify child cards are shown');
    await $(#childProgressCard).waitUntilVisible();
    await captureScreenshot('dashboard_overview');

    await step('Check quick stats');
    await $('Sessions this week').waitUntilVisible();
    await $('Average score').waitUntilVisible();

    await step('Tap child card to expand');
    await $(#childProgressCard).first.tap();
    await $.pumpAndSettle();

    await step('View detailed stats');
    await $('Recent Activity').waitUntilVisible();
    await $('Subjects').waitUntilVisible();
    await captureScreenshot('expanded_child_stats');

    await step('Check subject breakdown');
    await $(#subjectProgressBar).waitUntilVisible();
  }

  /// Test session history view
  Future<void> testSessionHistory() async {
    await step('Login and go to dashboard');
    await actions.auth.login(TestUsers.existingParentPro);
    await $('Dashboard').waitUntilVisible();

    await step('Select child');
    await $(#childProgressCard).first.tap();
    await $.pumpAndSettle();

    await step('Navigate to session history');
    await $('View All Sessions').tap();
    await $.pumpAndSettle();

    await step('Verify session list');
    await $(#sessionsList).waitUntilVisible();
    await captureScreenshot('session_history');

    await step('Filter by date');
    await $(#dateFilterButton).tap();
    await $.pumpAndSettle();
    await $('This Week').tap();
    await $.pumpAndSettle();

    await step('Filter by subject');
    await $(#subjectFilterButton).tap();
    await $.pumpAndSettle();
    await $('Mathematics').tap();
    await $.pumpAndSettle();
    await captureScreenshot('filtered_sessions');

    await step('View session details');
    await $(#sessionCard).first.tap();
    await $.pumpAndSettle();

    await step('Verify session details');
    await $('Session Details').waitUntilVisible();
    await $('Questions Answered').waitUntilVisible();
    await $('Accuracy').waitUntilVisible();
    await $('Duration').waitUntilVisible();
    await captureScreenshot('session_details');
  }

  /// Test weekly progress report
  Future<void> testWeeklyReport() async {
    await step('Login as parent');
    await actions.auth.login(TestUsers.existingParentPro);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to reports');
    await $(#reportsTab).tap();
    await $.pumpAndSettle();

    await step('Select weekly report');
    await $('Weekly Report').tap();
    await $.pumpAndSettle();

    await step('Verify report content');
    await $('Weekly Summary').waitUntilVisible();
    await $(#progressChart).waitUntilVisible();
    await captureScreenshot('weekly_report');

    await step('Check learning time');
    await $('Total Learning Time').waitUntilVisible();

    await step('Check achievements');
    await actions.scroll.scrollDown();
    await $('Achievements').waitUntilVisible();
    await captureScreenshot('weekly_achievements');

    await step('Share report');
    await $(#shareButton).tap();
    await $.pumpAndSettle();
    await $('Share Report').waitUntilVisible();
    await captureScreenshot('share_options');
  }
}
