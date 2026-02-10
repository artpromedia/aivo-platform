/// Learner Login Screen with SSO and PIN Support
///
/// Provides multiple authentication options for learners:
/// - Enterprise SSO (Clever, ClassLink, Google, Microsoft)
/// - PIN-based authentication for shared/classroom devices
///
/// Addresses RE-AUDIT-003: Mobile Apps Still Lack Enterprise SSO
library;

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart';
import 'package:flutter_svg/flutter_svg.dart';

import '../pin/pin_controller.dart';
import '../pin/pin_state.dart';
import '../learner/theme_loader.dart';
import '../accessibility/accessibility.dart';

/// Provider for SSO service
final ssoServiceProvider = Provider<SsoService>((ref) {
  return SsoService(
    config: SsoConfig(
      authServiceUrl: EnvConfig.authServiceUrl,
      deepLinkScheme: 'aivo-learner',
      deepLinkHost: 'auth',
      deepLinkPath: '/callback',
    ),
  );
});

/// Learner login screen with SSO and PIN options.
class LearnerLoginScreen extends ConsumerStatefulWidget {
  const LearnerLoginScreen({super.key});

  @override
  ConsumerState<LearnerLoginScreen> createState() => _LearnerLoginScreenState();
}

enum _LoginMode { selection, sso, pin }

class _LearnerLoginScreenState extends ConsumerState<LearnerLoginScreen> {
  _LoginMode _mode = _LoginMode.selection;
  final _pinController = TextEditingController();
  final _districtController = TextEditingController();
  String? _error;
  bool _isLoading = false;
  SsoProvider? _loadingProvider;
  List<SsoProviderConfig> _availableProviders = [];

  @override
  void dispose() {
    _pinController.dispose();
    _districtController.dispose();
    super.dispose();
  }

  void _showPinEntry() {
    setState(() {
      _mode = _LoginMode.pin;
      _error = null;
    });
  }

  void _showSsoEntry() {
    setState(() {
      _mode = _LoginMode.sso;
      _error = null;
    });
  }

  void _goBack() {
    setState(() {
      _mode = _LoginMode.selection;
      _error = null;
    });
  }

  Future<void> _checkDistrict() async {
    final district = _districtController.text.trim();
    if (district.isEmpty) {
      setState(() => _availableProviders = []);
      return;
    }

    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final ssoService = ref.read(ssoServiceProvider);
      final info = await ssoService.getTenantSsoInfo(district);

      List<SsoProviderConfig> providers = [];
      if (info != null && info.ssoEnabled) {
        // Map IdP name to providers - in production, backend would provide this
        final idpName = info.idpName?.toLowerCase() ?? '';
        if (idpName.contains('clever')) {
          providers = [SsoProviders.clever];
        } else if (idpName.contains('classlink')) {
          providers = [SsoProviders.classlink];
        } else if (idpName.contains('google')) {
          providers = [SsoProviders.google];
        } else if (idpName.contains('microsoft')) {
          providers = [SsoProviders.microsoft];
        } else {
          // Show all common providers
          providers = SsoProviders.educationProviders;
        }
      }

      setState(() {
        _availableProviders = providers;
        _isLoading = false;
        if (info == null) {
          _error = 'District not found';
        } else if (!info.ssoEnabled) {
          _error = 'SSO not enabled for this district';
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _error = 'Unable to check district';
      });
    }
  }

  Future<void> _signInWithSso(SsoProviderConfig provider) async {
    final district = _districtController.text.trim();
    if (district.isEmpty) return;

    setState(() {
      _isLoading = true;
      _loadingProvider = provider.provider;
      _error = null;
    });

    // Announce to screen readers
    A11yAnnouncer.announce(
      'Signing in with ${provider.displayName}...',
    );

    try {
      final ssoService = ref.read(ssoServiceProvider);
      final result = await ssoService.signInWithSso(
        tenantSlug: district,
        protocol: provider.protocol,
      );

      switch (result) {
        case SsoSuccess():
          // SSO successful - store tokens and navigate
          await ssoService.storeTokens(
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          );

          // Update PIN controller state with SSO user
          ref.read(pinControllerProvider.notifier).setAuthenticatedFromSso(
                userId: result.user.id,
                tenantId: result.user.tenantId,
              );

          // Load theme and navigate
          await loadAndApplyLearnerTheme(ref, result.user.id);

          if (mounted) {
            A11yAnnouncer.announce('Successfully signed in');
            context.go('/plan');
          }

        case SsoError():
          setState(() {
            _error = _getUserFriendlyError(result);
            _isLoading = false;
            _loadingProvider = null;
          });

        case SsoCancelled():
          setState(() {
            _error = 'Sign-in was cancelled';
            _isLoading = false;
            _loadingProvider = null;
          });
      }
    } catch (e) {
      setState(() {
        _error = 'An error occurred. Please try again.';
        _isLoading = false;
        _loadingProvider = null;
      });
    }
  }

  String _getUserFriendlyError(SsoError error) {
    switch (error.code) {
      case 'SSO_TIMEOUT':
        return 'Sign-in timed out. Please try again.';
      case 'USER_NOT_ALLOWED':
        return 'Your account is not set up for learning. Ask your teacher for help.';
      case 'BROWSER_UNAVAILABLE':
        return 'Cannot open browser. Please try PIN instead.';
      default:
        return 'Something went wrong. Please try again.';
    }
  }

  Future<void> _submitPin() async {
    final pin = _pinController.text.trim();
    if (pin.length < 4 || pin.length > 6) {
      setState(() => _error = 'Enter a 4–6 digit PIN');
      return;
    }

    setState(() {
      _error = null;
      _isLoading = true;
    });

    await ref.read(pinControllerProvider.notifier).validatePin(pin);
    final state = ref.read(pinControllerProvider);

    if (state.status == PinStatus.unauthenticated && state.error != null) {
      setState(() {
        _error = state.error;
        _isLoading = false;
      });
    }

    if (state.isAuthenticated) {
      final learnerId = state.learnerId!;
      await loadAndApplyLearnerTheme(ref, learnerId);
      if (mounted) context.go('/plan');
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    // Use AIVO brand colors for login screen (not grade-based theme)
    const errorRed = Color(0xFFEF4444);
    const errorBg = Color(0xFFFEF2F2);

    return Scaffold(
      backgroundColor: Colors.white,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  // Header - always shown
                  _buildHeader(context),
                  const SizedBox(height: 48),

                  // Error message
                  if (_error != null) ...[
                    Semantics(
                      label: 'Error: $_error',
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: errorBg,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Row(
                          children: [
                            const Icon(
                              Icons.error_outline,
                              color: errorRed,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                _error!,
                                style: const TextStyle(color: errorRed),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(height: 16),
                  ],

                  // Content based on mode
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: _buildContent(context),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildHeader(BuildContext context) {
    // Use AIVO brand colors for login screen (not grade-based theme)
    const brandPurple = Color(0xFF7C3AED);
    const brandPurpleLight = Color(0xFFF5F3FF);

    return Column(
      children: [
        // AIVO Logo
        Semantics(
          label: 'Aivo Learning logo',
          image: true,
          child: Container(
            width: 88,
            height: 88,
            decoration: BoxDecoration(
              color: brandPurpleLight,
              borderRadius: BorderRadius.circular(22),
            ),
            padding: const EdgeInsets.all(16),
            child: SvgPicture.asset(
              'packages/flutter_common/assets/images/aivo-icon-purple.svg',
              width: 56,
              height: 56,
              colorFilter: const ColorFilter.mode(brandPurple, BlendMode.srcIn),
            ),
          ),
        ),
        const SizedBox(height: 24),
        Text(
          'Ready to Learn?',
          style: Theme.of(context).textTheme.headlineMedium?.copyWith(
                fontWeight: FontWeight.bold,
                color: const Color(0xFF18181B),
              ),
        ),
        const SizedBox(height: 8),
        const Text(
          'Sign in to start your learning adventure!',
          style: TextStyle(
            fontSize: 16,
            color: Color(0xFF52525B),
          ),
        ),
      ],
    );
  }

  Widget _buildContent(BuildContext context) {
    switch (_mode) {
      case _LoginMode.selection:
        return _buildSelectionMode(context);
      case _LoginMode.sso:
        return _buildSsoMode(context);
      case _LoginMode.pin:
        return _buildPinMode(context);
    }
  }

  Widget _buildSelectionMode(BuildContext context) {
    // Use AIVO brand colors for login screen (not grade-based theme)
    const brandPurple = Color(0xFF7C3AED);

    return Column(
      key: const ValueKey('selection'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // SSO button
        ElevatedButton.icon(
          onPressed: _showSsoEntry,
          icon: const Icon(Icons.school_outlined),
          label: const Text('Sign in with School'),
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.all(16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            backgroundColor: brandPurple,
            foregroundColor: Colors.white,
          ),
        ),
        const SizedBox(height: 16),

        // Divider
        Row(
          children: [
            const Expanded(child: Divider()),
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'or',
                style: TextStyle(color: Color(0xFF71717A)),
              ),
            ),
            const Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: 16),

        // PIN button
        OutlinedButton.icon(
          onPressed: _showPinEntry,
          icon: const Icon(Icons.pin_outlined),
          label: const Text('Use my PIN'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.all(16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            foregroundColor: brandPurple,
            side: const BorderSide(color: brandPurple, width: 1.5),
          ),
        ),
        const SizedBox(height: 16),

        // Biometric login button
        BiometricLoginButton(
          size: BiometricButtonSize.large,
          reason: 'Sign in to Aivo Learning',
          onSuccess: (userId, refreshToken) async {
            final success = await ref.read(pinControllerProvider.notifier).loginWithBiometrics(
              refreshToken: refreshToken,
            );
            if (success && mounted) {
              await loadAndApplyLearnerTheme(ref, userId);
              context.go('/plan');
            }
          },
          onError: (message) {
            setState(() => _error = message);
          },
        ),
      ],
    );
  }

  Widget _buildSsoMode(BuildContext context) {
    // Use AIVO brand colors for login screen
    const brandPurple = Color(0xFF7C3AED);

    return Column(
      key: const ValueKey('sso'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Back button
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: _goBack,
            icon: const Icon(Icons.arrow_back),
            label: const Text('Back'),
            style: TextButton.styleFrom(foregroundColor: brandPurple),
          ),
        ),
        const SizedBox(height: 16),

        // District input
        Semantics(
          label: 'District ID input',
          hint: 'Ask your teacher for your district ID',
          child: TextField(
            controller: _districtController,
            decoration: InputDecoration(
              labelText: 'District ID',
              hintText: 'Ask your teacher',
              prefixIcon: const Icon(Icons.location_city_outlined),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: brandPurple, width: 2),
              ),
              floatingLabelStyle: const TextStyle(color: brandPurple),
            ),
            cursorColor: brandPurple,
            enabled: !_isLoading,
            onChanged: (_) => _checkDistrict(),
            onSubmitted: (_) => _checkDistrict(),
          ),
        ),
        const SizedBox(height: 24),

        // Provider buttons
        if (_availableProviders.isNotEmpty) ...[
          const Text(
            'Sign in with:',
            style: TextStyle(color: Color(0xFF71717A)),
          ),
          const SizedBox(height: 12),
          for (final provider in _availableProviders) ...[
            SsoProviderButton(
              config: provider,
              isLoading: _loadingProvider == provider.provider,
              onPressed: _isLoading ? null : () => _signInWithSso(provider),
            ),
            const SizedBox(height: 8),
          ],
        ] else if (_isLoading) ...[
          const Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF7C3AED)),
            ),
          ),
        ],
      ],
    );
  }

  Widget _buildPinMode(BuildContext context) {
    // Use AIVO brand colors for login screen
    const brandPurple = Color(0xFF7C3AED);
    final pinState = ref.watch(pinControllerProvider);
    final isLoading = pinState.status == PinStatus.loading || _isLoading;

    return Column(
      key: const ValueKey('pin'),
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Back button
        Align(
          alignment: Alignment.centerLeft,
          child: TextButton.icon(
            onPressed: _goBack,
            icon: const Icon(Icons.arrow_back),
            label: const Text('Back'),
            style: TextButton.styleFrom(foregroundColor: brandPurple),
          ),
        ),
        const SizedBox(height: 16),

        // PIN input
        Semantics(
          label: 'PIN input',
          hint: 'Enter your 4 to 6 digit PIN',
          child: TextField(
            controller: _pinController,
            decoration: InputDecoration(
              labelText: 'Your PIN',
              hintText: '4–6 digits',
              prefixIcon: const Icon(Icons.lock_outline),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: brandPurple, width: 2),
              ),
              floatingLabelStyle: const TextStyle(color: brandPurple),
            ),
            cursorColor: brandPurple,
            keyboardType: TextInputType.number,
            maxLength: 6,
            obscureText: true,
            enabled: !isLoading,
            onSubmitted: (_) => _submitPin(),
          ),
        ),
        const SizedBox(height: 24),

        // Submit button
        ElevatedButton(
          onPressed: isLoading ? null : _submitPin,
          style: ElevatedButton.styleFrom(
            padding: const EdgeInsets.all(16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            backgroundColor: brandPurple,
            foregroundColor: Colors.white,
          ),
          child: isLoading
              ? const SizedBox(
                  height: 20,
                  width: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Text('Unlock'),
        ),
      ],
    );
  }
}
