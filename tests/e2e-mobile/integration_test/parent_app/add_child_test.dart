/// Parent App - Add Child E2E Test
///
/// Tests adding children to parent account, linking codes, and child management.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../common/test_utils.dart';
import '../config/test_users.dart';

void main() {
  patrolTest(
    'Add child - via access code',
    ($) async {
      final test = AddChildTest();
      await test.setUp($);

      try {
        await test.testAddChildWithAccessCode();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Add child - create new profile',
    ($) async {
      final test = AddChildTest();
      await test.setUp($);

      try {
        await test.testCreateNewChildProfile();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Add child - invalid code error',
    ($) async {
      final test = AddChildTest();
      await test.setUp($);

      try {
        await test.testInvalidAccessCode();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Manage children - edit and remove',
    ($) async {
      final test = AddChildTest();
      await test.setUp($);

      try {
        await test.testManageChildren();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class AddChildTest extends ParentAppTest {
  @override
  String get testName => 'Add Child';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test adding child with access code
  Future<void> testAddChildWithAccessCode() async {
    await step('Login as existing parent');
    await actions.auth.login(TestUsers.existingParentFree);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to add child');
    await $(#addChildButton).tap();
    await $.pumpAndSettle();

    await step('Select link with code option');
    await $('Link Existing Account').waitUntilVisible();
    await $('Link Existing Account').tap();
    await $.pumpAndSettle();

    await step('Enter access code');
    await $(#accessCodeField).enterText('TESTCODE123');
    await captureScreenshot('access_code_entry');

    await step('Submit code');
    await $(#submitCodeButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify child linked');
    await $('Child linked successfully').waitUntilVisible();
    await $(#doneButton).tap();
    await $.pumpAndSettle();

    await step('Verify child appears on dashboard');
    await $(#childrenList).waitUntilVisible();
    await captureScreenshot('child_added');
  }

  /// Test creating new child profile
  Future<void> testCreateNewChildProfile() async {
    await step('Login as parent');
    await actions.auth.login(TestUsers.existingParentFree);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to add child');
    await $(#addChildButton).tap();
    await $.pumpAndSettle();

    await step('Select create new option');
    await $('Create New Profile').tap();
    await $.pumpAndSettle();

    await step('Fill child details');
    await $(#childFirstNameField).enterText('Jordan');
    await $(#childLastNameField).enterText('Smith');
    await captureScreenshot('child_details_form');

    await step('Select grade level');
    await $(#gradeDropdown).tap();
    await $.pumpAndSettle();
    await $('3rd Grade').tap();
    await $.pumpAndSettle();

    await step('Set birth year');
    await $(#birthYearDropdown).tap();
    await $.pumpAndSettle();
    await $('2016').tap();
    await $.pumpAndSettle();

    await step('Add accommodations (optional)');
    await $(#has504Checkbox).tap();
    await $.pumpAndSettle();
    await captureScreenshot('accommodations_selected');

    await step('Create profile');
    await $(#createProfileButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify child created');
    await $('Profile created').waitUntilVisible();
    await $('Jordan').waitUntilVisible();
    await captureScreenshot('child_created');
  }

  /// Test invalid access code
  Future<void> testInvalidAccessCode() async {
    await step('Login as parent');
    await actions.auth.login(TestUsers.existingParentFree);
    await $('Dashboard').waitUntilVisible();

    await step('Navigate to add child');
    await $(#addChildButton).tap();
    await $.pumpAndSettle();

    await step('Select link with code');
    await $('Link Existing Account').tap();
    await $.pumpAndSettle();

    await step('Enter invalid code');
    await $(#accessCodeField).enterText('INVALIDCODE');
    await $(#submitCodeButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify error message');
    await $('Invalid access code').waitUntilVisible();
    await captureScreenshot('invalid_code_error');

    await step('Retry with correct format');
    await $(#accessCodeField).enterText('');
    await $(#accessCodeField).enterText('TESTCODE123');
    await captureScreenshot('corrected_code');
  }

  /// Test managing children (edit/remove)
  Future<void> testManageChildren() async {
    await step('Login as parent with multiple children');
    await actions.auth.login(TestUsers.existingParentPro);
    await $('Dashboard').waitUntilVisible();

    await step('Go to children management');
    await actions.nav.goToProfile();
    await $(#manageChildrenButton).tap();
    await $.pumpAndSettle();

    await step('Verify children list');
    await $(#childrenList).waitUntilVisible();
    await captureScreenshot('children_list');

    await step('Edit first child');
    final firstChild = $(#childCard).first;
    await firstChild.tap();
    await $.pumpAndSettle();

    await $(#editButton).tap();
    await $.pumpAndSettle();

    await step('Update child name');
    await $(#childFirstNameField).enterText('');
    await $(#childFirstNameField).enterText('Updated Name');
    await $(#saveButton).tap();
    await $.pumpAndSettle();

    await step('Verify update');
    await $('Changes saved').waitUntilVisible();
    await $('Updated Name').waitUntilVisible();
    await captureScreenshot('child_updated');

    await step('Remove child');
    await $(#removeChildButton).tap();
    await $.pumpAndSettle();

    await step('Confirm removal');
    await $('Remove Child').waitUntilVisible();
    await $('This will unlink the child from your account').waitUntilVisible();
    await $('Remove').tap();
    await $.pumpAndSettle();

    await step('Verify removal');
    await $('Child removed').waitUntilVisible();
    await captureScreenshot('child_removed');
  }
}
