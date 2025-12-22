/// Cross-App - Teacher-Parent Communication E2E Test
///
/// Tests communication features between teacher and parent apps.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_config.dart';
import '../config/test_users.dart';
import '../fixtures/api_mocks.dart';

void main() {
  patrolTest(
    'Teacher-parent comm - send message from teacher',
    ($) async {
      final test = TeacherParentCommTest();
      await test.setUp($);

      try {
        await test.testSendMessageFromTeacher();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Teacher-parent comm - parent receives IEP update',
    ($) async {
      final test = TeacherParentCommTest();
      await test.setUp($);

      try {
        await test.testParentReceivesIepUpdate();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Teacher-parent comm - schedule conference',
    ($) async {
      final test = TeacherParentCommTest();
      await test.setUp($);

      try {
        await test.testScheduleConference();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class TeacherParentCommTest extends BaseE2ETest {
  @override
  String get testName => 'Teacher-Parent Communication';

  @override
  String get androidPackageName => AppIdentifiers.teacherAndroid;

  @override
  String get iosBundleId => AppIdentifiers.teacherIos;

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test sending message from teacher to parent
  Future<void> testSendMessageFromTeacher() async {
    await step('Launch teacher app');
    await $.pumpAndSettle();

    await step('Login as teacher');
    await actions.auth.login(TestUsers.trioTeacher);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to student');
    await $(#classesTab).tap();
    await $.pumpAndSettle();
    await $(#classCard).first.tap();
    await $.pumpAndSettle();
    await $(#studentCard).first.tap();
    await $.pumpAndSettle();

    await step('Open messages');
    await $(#messagesTab).tap();
    await $.pumpAndSettle();

    await step('Compose message to parent');
    await $(#newMessageButton).tap();
    await $.pumpAndSettle();

    await step('Fill message');
    await $('New Message').waitUntilVisible();
    await $(#recipientField).tap();
    await $.pumpAndSettle();
    await $('Parent').tap();
    await $.pumpAndSettle();

    await $(#subjectField).enterText('Weekly Progress Update');
    await $(#messageField).enterText(
      'Your child did great this week! They showed improvement in math.',
    );
    await captureScreenshot('compose_message');

    await step('Send message');
    await $(#sendButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify sent');
    await $('Message sent').waitUntilVisible();
    await captureScreenshot('message_sent');

    await step('Verify in sent folder');
    await $(#sentFolder).tap();
    await $.pumpAndSettle();
    await $('Weekly Progress Update').waitUntilVisible();
    await captureScreenshot('in_sent_folder');
  }

  /// Test parent receiving IEP progress update
  Future<void> testParentReceivesIepUpdate() async {
    await step('Update IEP goal via API (simulating teacher)');
    await TestApiClient.updateIepProgress(
      goalId: 'iep-reading-001',
      progress: 75,
    );

    await step('Send IEP notification to parent');
    await TestApiClient.sendNotification(
      userId: TestUsers.trioParent.id,
      title: 'IEP Progress Update',
      body: 'Reading goal is now at 75% progress',
      type: 'iepUpdate',
    );

    await step('Switch to parent app context');
    // In real test would switch apps, simulating via API
    await clearAppData();

    await step('Launch as parent');
    await $.pumpAndSettle();

    await step('Login as trio parent');
    final parentActions = TestActions($);
    await parentActions.auth.login(TestUsers.trioParent);
    await $('Dashboard').waitUntilVisible();

    await step('Check for notification');
    await $(#notificationBadge).waitUntilVisible();
    await captureScreenshot('parent_iep_notification');

    await step('View notification');
    await $(#notificationBell).tap();
    await $.pumpAndSettle();
    await $('IEP Progress Update').waitUntilVisible();
    await captureScreenshot('iep_update_notification');

    await step('Tap to view details');
    await $(#notificationCard).first.tap();
    await $.pumpAndSettle();

    await step('Verify IEP progress view');
    await $('IEP Goals').waitUntilVisible();
    await $('75%').waitUntilVisible();
    await captureScreenshot('iep_progress_detail');
  }

  /// Test scheduling parent-teacher conference
  Future<void> testScheduleConference() async {
    await step('Launch teacher app');
    await $.pumpAndSettle();

    await step('Login as teacher');
    await actions.auth.login(TestUsers.trioTeacher);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to student');
    await $(#classesTab).tap();
    await $.pumpAndSettle();
    await $(#classCard).first.tap();
    await $.pumpAndSettle();
    await $(#studentCard).first.tap();
    await $.pumpAndSettle();

    await step('Open schedule conference');
    await $(#scheduleConferenceButton).tap();
    await $.pumpAndSettle();

    await step('Fill conference details');
    await $('Schedule Conference').waitUntilVisible();

    await $(#conferenceTypeDropdown).tap();
    await $.pumpAndSettle();
    await $('IEP Review').tap();
    await $.pumpAndSettle();

    await step('Select date');
    await $(#dateField).tap();
    await $.pumpAndSettle();
    // Select next available date
    await $(#nextAvailableDate).tap();
    await $.pumpAndSettle();

    await step('Select time');
    await $(#timeField).tap();
    await $.pumpAndSettle();
    await $('3:00 PM').tap();
    await $.pumpAndSettle();

    await step('Add notes');
    await $(#notesField).enterText('Discuss reading progress and next steps.');
    await captureScreenshot('conference_form');

    await step('Send invite');
    await $(#sendInviteButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify invite sent');
    await $('Invite sent').waitUntilVisible();
    await captureScreenshot('invite_sent');

    await step('Verify on calendar');
    await $(#calendarTab).tap();
    await $.pumpAndSettle();
    await $('IEP Review').waitUntilVisible();
    await captureScreenshot('on_calendar');
  }
}
