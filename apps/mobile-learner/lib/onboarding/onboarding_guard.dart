/// Onboarding Guard
///
/// Route guard that ensures new learners complete onboarding before
/// accessing the main app.
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import 'onboarding_controller.dart';
import 'onboarding_state.dart';

/// A widget that guards routes requiring onboarding completion.
///
/// Wraps child content and redirects to onboarding if the learner
/// has not completed the onboarding flow.
class OnboardingGuard extends ConsumerStatefulWidget {
  const OnboardingGuard({
    super.key,
    required this.learnerId,
    required this.child,
    this.onOnboardingRequired,
  });

  /// The learner ID to check onboarding status for.
  final String learnerId;

  /// The child widget to display when onboarding is complete.
  final Widget child;

  /// Optional callback when onboarding is required.
  final VoidCallback? onOnboardingRequired;

  @override
  ConsumerState<OnboardingGuard> createState() => _OnboardingGuardState();
}

class _OnboardingGuardState extends ConsumerState<OnboardingGuard> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    _initOnboarding();
  }

  @override
  void didUpdateWidget(OnboardingGuard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.learnerId != widget.learnerId) {
      _initialized = false;
      _initOnboarding();
    }
  }

  Future<void> _initOnboarding() async {
    if (_initialized) return;
    _initialized = true;

    await ref.read(onboardingControllerProvider.notifier).init(widget.learnerId);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(onboardingControllerProvider);

    // Still loading - show loading indicator
    if (state.isLoading) {
      return const _OnboardingLoadingScreen();
    }

    // Onboarding required - this would typically redirect via router
    // but we handle it here for safety
    if (!state.isCompleted) {
      widget.onOnboardingRequired?.call();
      // Return onboarding screen inline as fallback
      // The router should handle this, but just in case
      return const _OnboardingRequiredPlaceholder();
    }

    // Onboarding complete - show child
    return widget.child;
  }
}

/// Loading screen shown while checking onboarding status.
class _OnboardingLoadingScreen extends StatelessWidget {
  const _OnboardingLoadingScreen();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Scaffold(
      body: Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const CircularProgressIndicator(),
            const SizedBox(height: 16),
            Text(
              'Getting ready...',
              style: theme.textTheme.bodyLarge?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Placeholder shown briefly if router hasn't redirected yet.
class _OnboardingRequiredPlaceholder extends StatelessWidget {
  const _OnboardingRequiredPlaceholder();

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: CircularProgressIndicator(),
      ),
    );
  }
}

/// Creates redirect logic for the GoRouter.
///
/// Returns the path to redirect to, or null if no redirect needed.
String? onboardingRedirect({
  required OnboardingState onboardingState,
  required String currentPath,
  required bool isAuthenticated,
}) {
  // Skip redirect if not authenticated
  if (!isAuthenticated) return null;

  // Skip redirect if still loading
  if (onboardingState.isLoading) return null;

  // Paths that are exempt from onboarding guard
  const exemptPaths = {
    '/login',
    '/pin',
    '/onboarding',
  };

  // Check if current path is exempt
  for (final exempt in exemptPaths) {
    if (currentPath.startsWith(exempt)) return null;
  }

  // If onboarding not complete, redirect to onboarding
  if (!onboardingState.isCompleted) {
    return '/onboarding';
  }

  // If on onboarding but already complete, redirect to plan
  if (currentPath.startsWith('/onboarding') && onboardingState.isCompleted) {
    return '/baseline/intro';
  }

  return null;
}

/// Provider that determines if onboarding redirect is needed.
final onboardingRedirectProvider = Provider.family<String?, String>((ref, currentPath) {
  final onboardingState = ref.watch(onboardingControllerProvider);

  // We can't know auth state here, so just check onboarding
  if (onboardingState.isLoading) return null;

  // Don't redirect if already on onboarding
  if (currentPath.startsWith('/onboarding')) return null;

  // Don't redirect auth paths
  if (currentPath == '/login' || currentPath == '/pin') return null;

  // Redirect to onboarding if not complete
  if (!onboardingState.isCompleted) {
    return '/onboarding';
  }

  return null;
});

/// Extension to check if a route requires onboarding.
extension RouteOnboardingExtension on GoRouterState {
  /// Whether this route requires onboarding completion.
  bool get requiresOnboarding {
    const exemptPaths = {'/login', '/pin', '/onboarding'};
    return !exemptPaths.any((path) => matchedLocation.startsWith(path));
  }
}
