/// Teacher App - Class Management E2E Test
///
/// Tests creating, editing, and managing classes and rosters.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';

void main() {
  patrolTest(
    'Class management - view classes',
    ($) async {
      final test = ClassManagementTest();
      await test.setUp($);

      try {
        await test.testViewClasses();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Class management - create new class',
    ($) async {
      final test = ClassManagementTest();
      await test.setUp($);

      try {
        await test.testCreateClass();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Class management - add students',
    ($) async {
      final test = ClassManagementTest();
      await test.setUp($);

      try {
        await test.testAddStudents();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class ClassManagementTest extends TeacherAppTest {
  @override
  String get testName => 'Class Management';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test viewing class list
  Future<void> testViewClasses() async {
    await step('Login as teacher');
    await actions.auth.login(TestUsers.existingTeacher);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to classes');
    await $(#classesTab).tap();
    await $.pumpAndSettle();

    await step('Verify class list');
    await $('My Classes').waitUntilVisible();
    await $(#classList).waitUntilVisible();
    await captureScreenshot('class_list');

    await step('Open class details');
    await $(#classCard).first.tap();
    await $.pumpAndSettle();

    await step('Verify class details');
    await $(#classDetailScreen).waitUntilVisible();
    await $('Students').waitUntilVisible();
    await $(#studentRoster).waitUntilVisible();
    await captureScreenshot('class_detail');

    await step('View class stats');
    await $(#classStatsTab).tap();
    await $.pumpAndSettle();
    await $('Class Performance').waitUntilVisible();
    await captureScreenshot('class_stats');
  }

  /// Test creating a new class
  Future<void> testCreateClass() async {
    await step('Login as teacher');
    await actions.auth.login(TestUsers.existingTeacher);
    await $('Dashboard').waitUntilVisible();

    await step('Go to classes');
    await $(#classesTab).tap();
    await $.pumpAndSettle();

    await step('Tap add class');
    await $(#addClassButton).tap();
    await $.pumpAndSettle();

    await step('Fill class details');
    await $('Create Class').waitUntilVisible();
    await $(#classNameField).enterText('Test Math Class');

    await step('Select subject');
    await $(#subjectDropdown).tap();
    await $.pumpAndSettle();
    await $('Mathematics').tap();
    await $.pumpAndSettle();

    await step('Select grade level');
    await $(#gradeLevelDropdown).tap();
    await $.pumpAndSettle();
    await $('5th Grade').tap();
    await $.pumpAndSettle();
    await captureScreenshot('class_form_filled');

    await step('Set schedule');
    await $(#scheduleSection).tap();
    await $.pumpAndSettle();

    await $(#mondayCheckbox).tap();
    await $(#wednesdayCheckbox).tap();
    await $(#fridayCheckbox).tap();
    await $.pumpAndSettle();

    await $(#startTimeField).tap();
    await $('9:00 AM').tap();
    await $.pumpAndSettle();
    await captureScreenshot('schedule_set');

    await step('Create class');
    await $(#createButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify class created');
    await $('Class created').waitUntilVisible();
    await $('Test Math Class').waitUntilVisible();
    await captureScreenshot('class_created');
  }

  /// Test adding students to class
  Future<void> testAddStudents() async {
    await step('Login as teacher');
    await actions.auth.login(TestUsers.existingTeacher);
    await $('Dashboard').waitUntilVisible();

    await step('Open class');
    await $(#classesTab).tap();
    await $.pumpAndSettle();
    await $(#classCard).first.tap();
    await $.pumpAndSettle();

    await step('Go to roster');
    await $(#rosterTab).tap();
    await $.pumpAndSettle();

    await step('Add student');
    await $(#addStudentButton).tap();
    await $.pumpAndSettle();

    await step('Search for student');
    await $('Add Student').waitUntilVisible();
    await $(#studentSearchField).enterText('Alex');
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 1));

    await step('Select student from results');
    await $(#searchResult).first.tap();
    await $.pumpAndSettle();
    await captureScreenshot('student_selected');

    await step('Add to class');
    await $(#addToClassButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 1));

    await step('Verify student added');
    await $('Student added').waitUntilVisible();
    await captureScreenshot('student_added');

    await step('Add multiple students via import');
    await $(#importStudentsButton).tap();
    await $.pumpAndSettle();

    await step('Select import method');
    await $('Import from CSV').tap();
    await $.pumpAndSettle();
    await captureScreenshot('import_options');
  }
}
