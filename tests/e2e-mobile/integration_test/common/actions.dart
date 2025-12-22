/// Reusable E2E Test Actions
///
/// Common user actions shared across E2E tests for all apps.
library;

import 'package:patrol/patrol.dart';

import '../config/test_users.dart';
import 'test_utils.dart';

/// Authentication actions
class AuthActions {
  AuthActions(this.$);
  final PatrolIntegrationTester $;

  /// Login with email and password
  Future<void> login(TestUser user) async {
    TestLogger.info('Logging in as ${user.email}');

    await $(#emailField).enterText(user.email);
    await $.pumpAndSettle();

    await $(#passwordField).enterText(user.password);
    await $.pumpAndSettle();

    await $(#loginButton).tap();
    await $.pumpAndSettle();

    // Wait for login to complete
    await $.pump(const Duration(seconds: 2));
  }

  /// Login with access code (learner)
  Future<void> loginWithAccessCode(String code) async {
    TestLogger.info('Logging in with access code');

    await $(#accessCodeField).enterText(code);
    await $.pumpAndSettle();

    await $(#submitCodeButton).tap();
    await $.pumpAndSettle();

    await $.pump(const Duration(seconds: 2));
  }

  /// Logout from current session
  Future<void> logout() async {
    TestLogger.info('Logging out');

    // Navigate to settings/profile
    await $(#profileTab).tap();
    await $.pumpAndSettle();

    // Scroll to logout button
    await $.scrollUntilVisible(finder: $(#logoutButton));

    await $(#logoutButton).tap();
    await $.pumpAndSettle();

    // Confirm logout
    await $('Logout').tap();
    await $.pumpAndSettle();
  }

  /// Register new account
  Future<void> register({
    required String email,
    required String password,
    required String name,
  }) async {
    TestLogger.info('Registering new account: $email');

    await $(#createAccountButton).tap();
    await $.pumpAndSettle();

    await $(#nameField).enterText(name);
    await $(#emailField).enterText(email);
    await $(#passwordField).enterText(password);
    await $(#confirmPasswordField).enterText(password);
    await $.pumpAndSettle();

    await $(#registerButton).tap();
    await $.pumpAndSettle();

    await $.pump(const Duration(seconds: 2));
  }

  /// Reset password
  Future<void> resetPassword(String email) async {
    TestLogger.info('Resetting password for: $email');

    await $(#forgotPasswordLink).tap();
    await $.pumpAndSettle();

    await $(#emailField).enterText(email);
    await $(#sendResetButton).tap();
    await $.pumpAndSettle();
  }
}

/// Navigation actions
class NavigationActions {
  NavigationActions(this.$);
  final PatrolIntegrationTester $;

  /// Navigate to tab by key
  Future<void> goToTab(Symbol tabKey) async {
    await $(tabKey).tap();
    await $.pumpAndSettle();
  }

  /// Navigate to home/dashboard
  Future<void> goHome() async => goToTab(#homeTab);

  /// Navigate to profile
  Future<void> goToProfile() async => goToTab(#profileTab);

  /// Navigate to settings
  Future<void> goToSettings() async {
    await goToProfile();
    await $(#settingsButton).tap();
    await $.pumpAndSettle();
  }

  /// Navigate back
  Future<void> goBack() async {
    await $(#backButton).tap();
    await $.pumpAndSettle();
  }

  /// Close modal/bottom sheet
  Future<void> closeModal() async {
    await $(#closeButton).tap();
    await $.pumpAndSettle();
  }

  /// Pull to refresh
  Future<void> pullToRefresh() async {
    await $.scrollBy(dy: 300);
    await $.pumpAndSettle();
  }
}

/// Form actions
class FormActions {
  FormActions(this.$);
  final PatrolIntegrationTester $;

  /// Fill text field
  Future<void> fillField(Symbol key, String value) async {
    await $(key).tap();
    await $(key).enterText(value);
    await $.pumpAndSettle();
  }

  /// Clear and fill text field
  Future<void> clearAndFill(Symbol key, String value) async {
    final finder = $(key);
    await finder.tap();
    // Clear existing text
    await finder.enterText('');
    await finder.enterText(value);
    await $.pumpAndSettle();
  }

  /// Toggle checkbox
  Future<void> toggleCheckbox(Symbol key) async {
    await $(key).tap();
    await $.pumpAndSettle();
  }

  /// Toggle switch
  Future<void> toggleSwitch(Symbol key) async {
    await $(key).tap();
    await $.pumpAndSettle();
  }

  /// Select dropdown value
  Future<void> selectDropdown(Symbol key, String value) async {
    await $(key).tap();
    await $.pumpAndSettle();
    await $(value).tap();
    await $.pumpAndSettle();
  }

  /// Submit form
  Future<void> submit([Symbol? buttonKey]) async {
    await $(buttonKey ?? #submitButton).tap();
    await $.pumpAndSettle();
  }

  /// Cancel form
  Future<void> cancel() async {
    await $(#cancelButton).tap();
    await $.pumpAndSettle();
  }
}

/// Dialog/Alert actions
class DialogActions {
  DialogActions(this.$);
  final PatrolIntegrationTester $;

  /// Confirm dialog
  Future<void> confirm() async {
    await $('Confirm').tap();
    await $.pumpAndSettle();
  }

  /// Cancel dialog
  Future<void> cancel() async {
    await $('Cancel').tap();
    await $.pumpAndSettle();
  }

  /// Dismiss dialog
  Future<void> dismiss() async {
    await $('OK').tap();
    await $.pumpAndSettle();
  }

  /// Accept dialog with custom button text
  Future<void> accept(String buttonText) async {
    await $(buttonText).tap();
    await $.pumpAndSettle();
  }
}

/// Scroll actions
class ScrollActions {
  ScrollActions(this.$);
  final PatrolIntegrationTester $;

  /// Scroll down
  Future<void> scrollDown({double delta = 300}) async {
    await $.scrollBy(dy: -delta);
    await $.pumpAndSettle();
  }

  /// Scroll up
  Future<void> scrollUp({double delta = 300}) async {
    await $.scrollBy(dy: delta);
    await $.pumpAndSettle();
  }

  /// Scroll to top
  Future<void> scrollToTop() async {
    for (int i = 0; i < 10; i++) {
      await scrollUp(delta: 500);
    }
  }

  /// Scroll to bottom
  Future<void> scrollToBottom() async {
    for (int i = 0; i < 10; i++) {
      await scrollDown(delta: 500);
    }
  }

  /// Scroll until widget is visible
  Future<void> scrollUntilVisible(
    PatrolFinder finder, {
    int maxScrolls = 10,
  }) async {
    for (int i = 0; i < maxScrolls; i++) {
      if (finder.exists) return;
      await scrollDown();
    }
    throw Exception('Widget not found after $maxScrolls scrolls');
  }
}

/// Gesture actions
class GestureActions {
  GestureActions(this.$);
  final PatrolIntegrationTester $;

  /// Long press
  Future<void> longPress(PatrolFinder finder) async {
    await finder.longPress();
    await $.pumpAndSettle();
  }

  /// Double tap
  Future<void> doubleTap(PatrolFinder finder) async {
    await finder.tap();
    await finder.tap();
    await $.pumpAndSettle();
  }

  /// Swipe left
  Future<void> swipeLeft(PatrolFinder finder) async {
    await finder.scrollBy(dx: -200);
    await $.pumpAndSettle();
  }

  /// Swipe right
  Future<void> swipeRight(PatrolFinder finder) async {
    await finder.scrollBy(dx: 200);
    await $.pumpAndSettle();
  }

  /// Swipe to dismiss
  Future<void> swipeToDismiss(PatrolFinder finder) async {
    await swipeLeft(finder);
    await $('Delete').tap();
    await $.pumpAndSettle();
  }
}

/// All actions bundled together
class TestActions {
  TestActions(PatrolIntegrationTester $)
      : auth = AuthActions($),
        nav = NavigationActions($),
        form = FormActions($),
        dialog = DialogActions($),
        scroll = ScrollActions($),
        gesture = GestureActions($);

  final AuthActions auth;
  final NavigationActions nav;
  final FormActions form;
  final DialogActions dialog;
  final ScrollActions scroll;
  final GestureActions gesture;
}
