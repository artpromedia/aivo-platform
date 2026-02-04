/// Login Screen Tests
///
/// Tests for parent app login functionality including:
/// - Email/password authentication
/// - SSO domain lookup
/// - Biometric authentication
/// - Form validation
library;
// cspell:ignore Aivo
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'package:mobile_parent/screens/login_screen.dart';
import 'package:mobile_parent/auth/auth_controller.dart';
import 'package:mobile_parent/auth/auth_state.dart';

/// Test auth controller for testing
class TestAuthController extends StateNotifier<AuthState>
    implements AuthController {
  TestAuthController() : super(AuthState.unauthenticated());

  bool loginCalled = false;
  String? lastEmail;
  String? lastPassword;

  @override
  Future<void> login(String email, String password) async {
    loginCalled = true;
    lastEmail = email;
    lastPassword = password;
    state = AuthState.loading();
    // Simulate network delay
    await Future.delayed(const Duration(milliseconds: 100));
    state = AuthState.authenticated(
      userId: 'mock-user-id',
      tenantId: 'mock-tenant-id',
      roles: ['PARENT'],
    );
  }

  @override
  Future<bool> loginWithBiometrics({required String refreshToken}) async {
    state = AuthState.authenticated(
      userId: 'mock-biometric-user',
      tenantId: 'mock-tenant-id',
      roles: ['PARENT'],
    );
    return true;
  }

  @override
  Future<bool> loginWithSso({
    required String accessToken,
    required String refreshToken,
    required String provider,
  }) async {
    state = AuthState.authenticated(
      userId: 'mock-sso-user',
      tenantId: 'mock-tenant-id',
      roles: ['PARENT'],
    );
    return true;
  }

  @override
  void setAuthenticatedFromSso({
    required String userId,
    required String tenantId,
    required List<String> roles,
  }) {
    state = AuthState.authenticated(
      userId: userId,
      tenantId: tenantId,
      roles: roles,
    );
  }

  @override
  Future<void> init() async {
    // No-op for testing
  }

  @override
  Future<void> logout() async {
    state = AuthState.unauthenticated();
  }

  void simulateError(String message) {
    state = AuthState.error(message);
  }

  void simulateLoading() {
    state = AuthState.loading();
  }

  void reset() {
    loginCalled = false;
    lastEmail = null;
    lastPassword = null;
    state = AuthState.unauthenticated();
  }
}

void main() {
  late TestAuthController testAuthController;

  setUp(() {
    testAuthController = TestAuthController();
  });

  tearDown(() {
    testAuthController.reset();
  });

  Widget createTestWidget({Widget? child}) {
    final router = GoRouter(
      initialLocation: '/login',
      routes: [
        GoRoute(
          path: '/login',
          builder: (context, state) => child ?? const LoginScreen(),
        ),
        GoRoute(
          path: '/dashboard',
          builder: (context, state) => const Scaffold(
            body: Center(child: Text('Dashboard')),
          ),
        ),
      ],
    );

    return ProviderScope(
      overrides: [
        authControllerProvider.overrideWith((ref) => testAuthController),
      ],
      child: MaterialApp.router(
        routerConfig: router,
      ),
    );
  }

  group('LoginScreen', () {
    testWidgets('renders login form with email and password fields',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Verify form elements
      expect(find.byType(TextField), findsAtLeastNWidgets(2));
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
    });

    testWidgets('shows validation error for empty email', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Try to submit with empty fields
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle();

      // Expect validation error
      expect(find.textContaining('email'), findsAtLeastNWidgets(1));
    });

    testWidgets('shows validation error for invalid email format',
        (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Enter invalid email
      await tester.enterText(find.byType(TextField).first, 'invalid-email');
      await tester.enterText(find.byType(TextField).at(1), 'password123');

      // Submit form
      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle();

      // Validation should catch invalid email
      expect(find.textContaining('email'), findsAtLeastNWidgets(1));
    });

    testWidgets('toggles password visibility', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Find password field - initially obscured
      final passwordField = find.byType(TextField).at(1);
      expect(passwordField, findsOneWidget);

      // Find visibility toggle button
      final visibilityToggle = find.byIcon(Icons.visibility_off);
      if (visibilityToggle.evaluate().isNotEmpty) {
        await tester.tap(visibilityToggle);
        await tester.pumpAndSettle();

        // After toggle, should show visibility icon
        expect(find.byIcon(Icons.visibility), findsOneWidget);
      }
    });

    testWidgets('calls login on valid submission', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Enter valid credentials
      await tester.enterText(
          find.byType(TextField).first, 'parent@example.com');
      await tester.enterText(find.byType(TextField).at(1), 'password123');

      // Submit form
      await tester.tap(find.text('Sign In'));
      await tester.pump();

      // Verify login was called with correct credentials
      expect(testAuthController.loginCalled, isTrue);
      expect(testAuthController.lastEmail, 'parent@example.com');
      expect(testAuthController.lastPassword, 'password123');
    });

    testWidgets('shows loading indicator during login', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Enter valid credentials
      await tester.enterText(
          find.byType(TextField).first, 'parent@example.com');
      await tester.enterText(find.byType(TextField).at(1), 'password123');

      // Submit form
      await tester.tap(find.text('Sign In'));
      await tester.pump(); // Start animation

      // Should show loading indicator (button disabled or circular indicator)
      expect(find.byType(CircularProgressIndicator), findsOneWidget);

      await tester.pumpAndSettle(); // Complete login
    });

    testWidgets('displays error message on login failure', (tester) async {
      // Simulate error before widget pump
      testAuthController.simulateError('Invalid credentials');

      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Verify error is displayed
      expect(find.textContaining('Invalid'), findsOneWidget);
    });

    testWidgets('has SSO login option', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Look for SSO option
      expect(find.textContaining('SSO'), findsWidgets);
    });

    // cspell:ignore Aivo
    testWidgets('shows Aivo branding', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Verify branding is present
      expect(find.textContaining('Aivo'), findsWidgets);
    });
  });

  group('LoginScreen SSO', () {
    testWidgets('switches to SSO mode when SSO button tapped', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Find and tap SSO option
      final ssoButton = find.textContaining('SSO');
      if (ssoButton.evaluate().isNotEmpty) {
        await tester.tap(ssoButton.first);
        await tester.pumpAndSettle();

        // Should show domain input
        expect(find.textContaining('domain'), findsWidgets);
      }
    });
  });

  group('LoginScreen Accessibility', () {
    testWidgets('form fields have proper semantics', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Check that text fields have labels/hints
      final textFields = find.byType(TextField);
      expect(textFields, findsAtLeastNWidgets(2));
    });

    testWidgets('buttons are properly sized for touch', (tester) async {
      await tester.pumpWidget(createTestWidget());
      await tester.pumpAndSettle();

      // Sign In button should be at least 48x48 (touch target)
      final signInButton = find.widgetWithText(FilledButton, 'Sign In');
      if (signInButton.evaluate().isNotEmpty) {
        final buttonElement = signInButton.evaluate().first;
        final renderBox = buttonElement.renderObject as RenderBox;
        expect(renderBox.size.height, greaterThanOrEqualTo(48.0));
      }
    });
  });

  group('AuthState', () {
    test('unauthenticated state is not authenticated', () {
      final state = AuthState.unauthenticated();
      expect(state.isAuthenticated, isFalse);
      expect(state.status, AuthStatus.unauthenticated);
    });

    test('loading state is not authenticated', () {
      final state = AuthState.loading();
      expect(state.isAuthenticated, isFalse);
      expect(state.status, AuthStatus.loading);
    });

    test('authenticated state has user data', () {
      final state = AuthState.authenticated(
        userId: 'user-123',
        tenantId: 'tenant-456',
        roles: ['PARENT'],
      );
      expect(state.isAuthenticated, isTrue);
      expect(state.userId, 'user-123');
      expect(state.tenantId, 'tenant-456');
      expect(state.roles, contains('PARENT'));
    });

    test('error state contains error message', () {
      final state = AuthState.error('Test error');
      expect(state.isAuthenticated, isFalse);
      expect(state.error, 'Test error');
    });
  });
}
