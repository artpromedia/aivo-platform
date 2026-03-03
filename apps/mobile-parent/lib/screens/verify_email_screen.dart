/// Verify Email Screen
///
/// Shown after login when the user's email address has not yet been
/// verified via the Firebase verification link. Provides a resend button
/// and a "check again" flow to re-query the backend.
library;

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../auth/auth_controller.dart';
import '../config/environment.dart';

class VerifyEmailScreen extends ConsumerStatefulWidget {
  const VerifyEmailScreen({super.key});

  @override
  ConsumerState<VerifyEmailScreen> createState() => _VerifyEmailScreenState();
}

class _VerifyEmailScreenState extends ConsumerState<VerifyEmailScreen> {
  bool _isResending = false;
  bool _isChecking = false;
  String? _message;
  bool _resendSuccess = false;

  Future<void> _resendVerification() async {
    final authState = ref.read(authControllerProvider);
    // userId holds the email address when in emailUnverified state
    final email = authState.userId;
    if (email == null || email.isEmpty) return;

    setState(() {
      _isResending = true;
      _message = null;
    });

    try {
      final dio = Dio(BaseOptions(baseUrl: EnvironmentConfig.authBaseUrl));
      await dio.post('/auth/resend-verification', data: {
        'email': email,
      });

      if (!mounted) return;
      setState(() {
        _isResending = false;
        _resendSuccess = true;
        _message = 'Verification email sent! Check your inbox.';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isResending = false;
        _resendSuccess = false;
        _message = 'Failed to resend. Please try again later.';
      });
    }
  }

  Future<void> _checkVerification() async {
    final authState = ref.read(authControllerProvider);
    final userId = authState.userId;
    if (userId == null) return;

    setState(() {
      _isChecking = true;
      _message = null;
    });

    try {
      // Re-init auth which will re-validate the session
      await ref.read(authControllerProvider.notifier).init();

      if (!mounted) return;

      final newState = ref.read(authControllerProvider);
      if (newState.isAuthenticated) {
        context.go('/dashboard');
        return;
      }

      setState(() {
        _isChecking = false;
        _resendSuccess = false;
        _message = 'Email not verified yet. Please check your inbox.';
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _isChecking = false;
        _resendSuccess = false;
        _message = 'Could not check verification status.';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;

    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Email icon
                  Icon(
                    Icons.mark_email_unread_rounded,
                    size: 80,
                    color: colorScheme.primary,
                  ),
                  const SizedBox(height: 24),

                  // Title
                  Text(
                    'Check Your Email',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.primary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),

                  // Description
                  Text(
                    'We sent a verification link to your email address. '
                    'Please click the link to verify your account.',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 32),

                  // Status message
                  if (_message != null) ...[
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: _resendSuccess
                            ? colorScheme.primaryContainer
                            : colorScheme.errorContainer,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            _resendSuccess
                                ? Icons.check_circle_outline
                                : Icons.info_outline,
                            color: _resendSuccess
                                ? colorScheme.onPrimaryContainer
                                : colorScheme.onErrorContainer,
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Text(
                              _message!,
                              style: TextStyle(
                                color: _resendSuccess
                                    ? colorScheme.onPrimaryContainer
                                    : colorScheme.onErrorContainer,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],

                  // "I've verified" button
                  FilledButton.icon(
                    onPressed: _isChecking ? null : _checkVerification,
                    icon: _isChecking
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.refresh),
                    label: const Text("I've Verified My Email"),
                    style: FilledButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Resend button
                  OutlinedButton.icon(
                    onPressed: _isResending ? null : _resendVerification,
                    icon: _isResending
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.email_outlined),
                    label: const Text('Resend Verification Email'),
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),

                  // Back to login
                  TextButton(
                    onPressed: () {
                      ref.read(authControllerProvider.notifier).logout();
                      context.go('/login');
                    },
                    child: const Text('Back to Sign In'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
