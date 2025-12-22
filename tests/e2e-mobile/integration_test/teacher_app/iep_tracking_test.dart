/// Teacher App - IEP Tracking E2E Test
///
/// Tests IEP goal management, progress tracking, and reporting.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';
import '../fixtures/test_data.dart';

void main() {
  patrolTest(
    'IEP tracking - view student goals',
    ($) async {
      final test = IepTrackingTest();
      await test.setUp($);

      try {
        await test.testViewStudentGoals();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'IEP tracking - log progress',
    ($) async {
      final test = IepTrackingTest();
      await test.setUp($);

      try {
        await test.testLogProgress();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'IEP tracking - generate report',
    ($) async {
      final test = IepTrackingTest();
      await test.setUp($);

      try {
        await test.testGenerateReport();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class IepTrackingTest extends TeacherAppTest {
  @override
  String get testName => 'IEP Tracking';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test viewing IEP goals for student
  Future<void> testViewStudentGoals() async {
    await step('Login as IEP teacher');
    await actions.auth.login(TestUsers.teacherWithIep);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to IEP section');
    await $(#iepTab).tap();
    await $.pumpAndSettle();

    await step('Verify IEP student list');
    await $('IEP Students').waitUntilVisible();
    await $(#iepStudentList).waitUntilVisible();
    await captureScreenshot('iep_students_list');

    await step('Select student');
    await $(#iepStudentCard).first.tap();
    await $.pumpAndSettle();

    await step('View goals');
    await $('IEP Goals').waitUntilVisible();
    await $(#goalsList).waitUntilVisible();
    await captureScreenshot('student_iep_goals');

    await step('Check goal progress');
    await $(#goalCard).first.tap();
    await $.pumpAndSettle();

    await step('View goal details');
    await $(#goalProgressChart).waitUntilVisible();
    await $('Target Date').waitUntilVisible();
    await $('Current Progress').waitUntilVisible();
    await captureScreenshot('goal_details');

    await step('View accommodations');
    await $(#accommodationsTab).tap();
    await $.pumpAndSettle();
    await $('Accommodations').waitUntilVisible();
    await captureScreenshot('accommodations');
  }

  /// Test logging progress on IEP goal
  Future<void> testLogProgress() async {
    await step('Login as IEP teacher');
    await actions.auth.login(TestUsers.teacherWithIep);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to IEP student');
    await $(#iepTab).tap();
    await $.pumpAndSettle();
    await $(#iepStudentCard).first.tap();
    await $.pumpAndSettle();

    await step('Select goal to update');
    await $(#goalCard).first.tap();
    await $.pumpAndSettle();

    await step('Log progress');
    await $(#logProgressButton).tap();
    await $.pumpAndSettle();

    await step('Fill progress entry');
    await $('Log Progress').waitUntilVisible();

    await $(#dateField).tap();
    await $.pumpAndSettle();
    await $('Today').tap();
    await $.pumpAndSettle();

    await $(#progressSlider).scrollBy(dx: 50);
    await $.pumpAndSettle();
    await captureScreenshot('progress_slider');

    await step('Add notes');
    await $(#notesField).enterText('Student showed improvement in reading comprehension');

    await step('Attach evidence');
    await $(#attachEvidenceButton).tap();
    await $.pumpAndSettle();
    await $('Take Photo').tap();
    await $.pumpAndSettle();
    // Handle camera permission
    await handleSystemDialogs();

    await step('Save progress');
    await $(#saveButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify saved');
    await $('Progress logged').waitUntilVisible();
    await captureScreenshot('progress_saved');
  }

  /// Test generating IEP progress report
  Future<void> testGenerateReport() async {
    await step('Login as IEP teacher');
    await actions.auth.login(TestUsers.teacherWithIep);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to IEP student');
    await $(#iepTab).tap();
    await $.pumpAndSettle();
    await $(#iepStudentCard).first.tap();
    await $.pumpAndSettle();

    await step('Generate report');
    await $(#generateReportButton).tap();
    await $.pumpAndSettle();

    await step('Configure report');
    await $('Generate IEP Report').waitUntilVisible();

    await $(#dateRangeField).tap();
    await $.pumpAndSettle();
    await $('Last 30 Days').tap();
    await $.pumpAndSettle();

    await $(#includeDataPointsCheckbox).tap();
    await $(#includeNotesCheckbox).tap();
    await $.pumpAndSettle();
    await captureScreenshot('report_options');

    await step('Generate');
    await $(#generateButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 3));

    await step('Preview report');
    await $('Report Preview').waitUntilVisible();
    await $(#reportPreview).waitUntilVisible();
    await captureScreenshot('report_preview');

    await step('Export report');
    await $(#exportButton).tap();
    await $.pumpAndSettle();
    await $('Export as PDF').tap();
    await $.pumpAndSettle();

    await step('Verify export');
    await $('Report exported').waitUntilVisible();
    await captureScreenshot('report_exported');
  }
}
