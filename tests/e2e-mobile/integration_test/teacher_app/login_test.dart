/// Teacher App - Login E2E Test
///
/// Tests teacher login flows including SSO and credential-based auth.
library;

import 'package:patrol/patrol.dart';

import '../common/base_test.dart';
import '../common/actions.dart';
import '../config/test_users.dart';

void main() {
  patrolTest(
    'Teacher login - email and password',
    ($) async {
      final test = TeacherLoginTest();
      await test.setUp($);

      try {
        await test.testEmailPasswordLogin();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Teacher login - remember me',
    ($) async {
      final test = TeacherLoginTest();
      await test.setUp($);

      try {
        await test.testRememberMe();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Teacher login - invalid credentials',
    ($) async {
      final test = TeacherLoginTest();
      await test.setUp($);

      try {
        await test.testInvalidCredentials();
      } finally {
        await test.tearDown();
      }
    },
  );

  patrolTest(
    'Teacher login - password reset',
    ($) async {
      final test = TeacherLoginTest();
      await test.setUp($);

      try {
        await test.testPasswordReset();
      } finally {
        await test.tearDown();
      }
    },
  );
}

class TeacherLoginTest extends TeacherAppTest {
  @override
  String get testName => 'Teacher Login';

  late TestActions actions;

  @override
  Future<void> setUp(PatrolIntegrationTester tester) async {
    await super.setUp(tester);
    actions = TestActions($);
  }

  /// Test standard email/password login
  Future<void> testEmailPasswordLogin() async {
    await step('Launch app');
    await $.pumpAndSettle();
    await $('Sign In').waitUntilVisible();
    await captureScreenshot('login_screen');

    await step('Enter credentials');
    await $(#emailField).enterText(TestUsers.existingTeacher.email);
    await $(#passwordField).enterText(TestUsers.existingTeacher.password);
    await captureScreenshot('credentials_entered');

    await step('Submit login');
    await $(#loginButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify dashboard loaded');
    await $('Dashboard').waitUntilVisible();
    await $('My Classes').waitUntilVisible();
    await captureScreenshot('teacher_dashboard');
  }

  /// Test remember me functionality
  Future<void> testRememberMe() async {
    await step('Login with remember me');
    await $.pumpAndSettle();

    await $(#emailField).enterText(TestUsers.existingTeacher.email);
    await $(#passwordField).enterText(TestUsers.existingTeacher.password);
    await $(#rememberMeCheckbox).tap();
    await captureScreenshot('remember_me_checked');

    await $(#loginButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify logged in');
    await $('Dashboard').waitUntilVisible();

    await step('Close and reopen app');
    await pressHome();
    await $.pump(const Duration(seconds: 2));
    await relaunchApp();

    await step('Verify still logged in');
    await $('Dashboard').waitUntilVisible();
    await captureScreenshot('persisted_login');
  }

  /// Test invalid credentials handling
  Future<void> testInvalidCredentials() async {
    await step('Launch app');
    await $.pumpAndSettle();

    await step('Enter wrong password');
    await $(#emailField).enterText(TestUsers.existingTeacher.email);
    await $(#passwordField).enterText('WrongPassword123!');
    await $(#loginButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify error message');
    await $('Invalid email or password').waitUntilVisible();
    await captureScreenshot('login_error');

    await step('Enter non-existent email');
    await $(#emailField).enterText('');
    await $(#emailField).enterText('nonexistent@test.com');
    await $(#loginButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify error');
    await $('Invalid email or password').waitUntilVisible();
  }

  /// Test password reset flow
  Future<void> testPasswordReset() async {
    await step('Launch app');
    await $.pumpAndSettle();

    await step('Tap forgot password');
    await $(#forgotPasswordLink).tap();
    await $.pumpAndSettle();

    await step('Enter email');
    await $('Reset Password').waitUntilVisible();
    await $(#emailField).enterText(TestUsers.existingTeacher.email);
    await captureScreenshot('reset_email_entered');

    await step('Submit reset request');
    await $(#sendResetButton).tap();
    await $.pumpAndSettle();
    await $.pump(const Duration(seconds: 2));

    await step('Verify confirmation');
    await $('Check your email').waitUntilVisible();
    await $('We sent a password reset link').waitUntilVisible();
    await captureScreenshot('reset_email_sent');

    await step('Return to login');
    await $(#backToLoginButton).tap();
    await $.pumpAndSettle();
    await $('Sign In').waitUntilVisible();
  }
}
