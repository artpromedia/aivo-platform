/// Parent App - Onboarding E2E Test
///
/// Tests the complete parent onboarding flow including registration,
/// profile setup, and initial child linking.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../common/test_utils.dart';
import '../config/test_users.dart';

void main() {
  patrolTest(
    'Parent onboarding - complete registration flow',
    ($) async {
      final test = ParentOnboardingTest();
      await test.setUp($);

      try {
        await test.testCompleteRegistration();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Parent onboarding - skip optional steps',
    ($) async {
      final test = ParentOnboardingTest();
      await test.setUp($);

      try {
        await test.testSkipOptionalSteps();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Parent onboarding - validation errors',
    ($) async {
      final test = ParentOnboardingTest();
      await test.setUp($);

      try {
        await test.testValidationErrors();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Parent onboarding - existing email error',
    ($) async {
      final test = ParentOnboardingTest();
      await test.setUp($);

      try {
        await test.testExistingEmailError();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class ParentOnboardingTest extends ParentAppTest {
  @override
  String get testName => 'Parent Onboarding';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test complete registration with all steps
  Future<void> testCompleteRegistration() async {
    await step('Launch app and view welcome screen');
    await $.pumpAndSettle();

    // Verify welcome screen
    await $('Welcome to AIVO').waitUntilVisible();
    await captureScreenshot('welcome_screen');

    await step('Tap Create Account');
    await $('Create Account').tap();
    await $.pumpAndSettle();

    await step('Fill registration form');
    final email = TestDataGenerator.randomEmail();
    await $(#nameField).enterText('Test Parent');
    await $(#emailField).enterText(email);
    await $(#passwordField).enterText('SecurePass123!');
    await $(#confirmPasswordField).enterText('SecurePass123!');
    await captureScreenshot('registration_form');

    await step('Accept terms and conditions');
    await $(#termsCheckbox).tap();
    await $.pumpAndSettle();

    await step('Submit registration');
    await $(#registerButton).tap();
    await $.pumpAndSettle();

    await step('Wait for account creation');
    await $.pump(const Duration(seconds: 3));

    await step('Complete profile setup');
    await $('Profile Setup').waitUntilVisible();

    // Add phone number (optional)
    await $(#phoneField).enterText('555-123-4567');

    // Select timezone
    await $(#timezoneDropdown).tap();
    await $('Eastern Time').tap();
    await $.pumpAndSettle();

    await step('Continue to child setup');
    await $(#continueButton).tap();
    await $.pumpAndSettle();

    await step('Add first child');
    await $('Add Your Child').waitUntilVisible();
    await $(#childNameField).enterText('Alex');
    await $(#gradeDropdown).tap();
    await $('5th Grade').tap();
    await $.pumpAndSettle();
    await captureScreenshot('add_child_screen');

    await step('Complete onboarding');
    await $(#completeSetupButton).tap();
    await $.pumpAndSettle();

    await step('Verify dashboard is shown');
    await $('Dashboard').waitUntilVisible();
    await captureScreenshot('onboarding_complete');

    TestLogger.info('Onboarding completed successfully');
  }

  /// Test skipping optional steps
  Future<void> testSkipOptionalSteps() async {
    await step('Launch and create account');
    await $.pumpAndSettle();
    await $('Create Account').tap();
    await $.pumpAndSettle();

    final email = TestDataGenerator.randomEmail();
    await $(#nameField).enterText('Skip Parent');
    await $(#emailField).enterText(email);
    await $(#passwordField).enterText('SecurePass123!');
    await $(#confirmPasswordField).enterText('SecurePass123!');
    await $(#termsCheckbox).tap();
    await $(#registerButton).tap();
    await $.pumpAndSettle();

    await step('Skip profile details');
    await $.pump(const Duration(seconds: 2));
    await $(#skipButton).tap();
    await $.pumpAndSettle();

    await step('Skip adding child');
    await $(#skipButton).tap();
    await $.pumpAndSettle();

    await step('Verify dashboard with prompts');
    await $('Dashboard').waitUntilVisible();
    await $('Add a child').waitUntilVisible();
    await captureScreenshot('dashboard_with_prompts');
  }

  /// Test form validation errors
  Future<void> testValidationErrors() async {
    await step('Go to registration');
    await $.pumpAndSettle();
    await $('Create Account').tap();
    await $.pumpAndSettle();

    await step('Submit empty form');
    await $(#registerButton).tap();
    await $.pumpAndSettle();

    await step('Verify validation errors');
    await $('Name is required').waitUntilVisible();
    await $('Email is required').waitUntilVisible();
    await $('Password is required').waitUntilVisible();
    await captureScreenshot('validation_errors');

    await step('Enter invalid email');
    await $(#emailField).enterText('not-an-email');
    await $(#registerButton).tap();
    await $.pumpAndSettle();
    await $('Invalid email format').waitUntilVisible();

    await step('Enter weak password');
    await $(#emailField).enterText('valid@email.com');
    await $(#passwordField).enterText('weak');
    await $(#registerButton).tap();
    await $.pumpAndSettle();
    await $('Password must be at least 8 characters').waitUntilVisible();

    await step('Enter mismatched passwords');
    await $(#passwordField).enterText('SecurePass123!');
    await $(#confirmPasswordField).enterText('DifferentPass123!');
    await $(#registerButton).tap();
    await $.pumpAndSettle();
    await $('Passwords do not match').waitUntilVisible();
    await captureScreenshot('password_mismatch');
  }

  /// Test existing email error
  Future<void> testExistingEmailError() async {
    await step('Go to registration');
    await $.pumpAndSettle();
    await $('Create Account').tap();
    await $.pumpAndSettle();

    await step('Enter existing email');
    await $(#nameField).enterText('Duplicate User');
    await $(#emailField).enterText(TestUsers.existingParentFree.email);
    await $(#passwordField).enterText('SecurePass123!');
    await $(#confirmPasswordField).enterText('SecurePass123!');
    await $(#termsCheckbox).tap();

    await step('Submit and verify error');
    await $(#registerButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await $('Email already in use').waitUntilVisible();
    await captureScreenshot('email_exists_error');
  }
}
