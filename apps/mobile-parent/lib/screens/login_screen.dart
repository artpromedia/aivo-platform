/// Parent Login Screen
///
/// Authentication screen for parent app with enterprise SSO support.
/// Addresses RE-AUDIT-003: Mobile Apps Still Lack Enterprise SSO
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:flutter_common/flutter_common.dart' hide AuthStatus;

import '../auth/auth_controller.dart';
import '../auth/auth_state.dart';

/// SSO service provider for parent app.
final parentSsoServiceProvider = Provider<SsoService>((ref) {
  return SsoService(
    config: SsoConfig(
      apiBaseUrl: EnvConfig.apiBaseUrl,
      callbackScheme: 'aivo-parent',
      callbackHost: 'sso-callback',
    ),
  );
});

class LoginScreen extends ConsumerStatefulWidget {
  const LoginScreen({super.key});

  @override
  ConsumerState<LoginScreen> createState() => _LoginScreenState();
}

enum _LoginMode { credentials, ssoLookup, ssoProviders }

class _LoginScreenState extends ConsumerState<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _domainController = TextEditingController();
  bool _obscurePassword = true;
  _LoginMode _mode = _LoginMode.credentials;
  bool _isLookingUpDomain = false;
  TenantSsoInfo? _tenantSsoInfo;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _domainController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    await ref.read(authControllerProvider.notifier).login(
          _emailController.text.trim(),
          _passwordController.text,
        );

    final state = ref.read(authControllerProvider);
    if (state.isAuthenticated && mounted) {
      context.go('/dashboard');
    }
  }

  void _showSsoLogin() {
    setState(() {
      _mode = _LoginMode.ssoLookup;
      _tenantSsoInfo = null;
    });
  }

  void _backToCredentials() {
    setState(() {
      _mode = _LoginMode.credentials;
      _tenantSsoInfo = null;
      _domainController.clear();
    });
  }

  Future<void> _lookupDomain() async {
    final domain = _domainController.text.trim();
    if (domain.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please enter your school domain')),
      );
      return;
    }

    setState(() {
      _isLookingUpDomain = true;
    });

    try {
      final ssoService = ref.read(parentSsoServiceProvider);
      final info = await ssoService.getTenantSsoInfo(domain);

      if (!mounted) return;

      if (info == null || info.providers.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No SSO providers found for this domain. Please use email/password login.'),
          ),
        );
        setState(() {
          _isLookingUpDomain = false;
        });
        return;
      }

      setState(() {
        _tenantSsoInfo = info;
        _mode = _LoginMode.ssoProviders;
        _isLookingUpDomain = false;
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error looking up domain: $e')),
      );
      setState(() {
        _isLookingUpDomain = false;
      });
    }
  }

  Future<void> _signInWithProvider(SsoProviderInfo provider) async {
    final ssoService = ref.read(parentSsoServiceProvider);

    try {
      final result = await ssoService.authenticate(
        tenantId: _tenantSsoInfo!.tenantId,
        providerId: provider.id,
        providerType: provider.type,
      );

      if (!mounted) return;

      if (result != null) {
        final success = await ref.read(authControllerProvider.notifier).loginWithSso(
              accessToken: result.accessToken,
              refreshToken: result.refreshToken ?? '',
              provider: provider.type,
            );

        if (success && mounted) {
          context.go('/dashboard');
        }
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('SSO authentication failed: $e')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final colorScheme = theme.colorScheme;
    final authState = ref.watch(authControllerProvider);
    final isLoading = authState.status == AuthStatus.loading;

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
                  // Logo/Header
                  Icon(
                    Icons.family_restroom_rounded,
                    size: 64,
                    color: colorScheme.primary,
                    semanticLabel: 'Aivo Parent Logo',
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'Aivo Parent',
                    style: theme.textTheme.headlineMedium?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: colorScheme.primary,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Monitor your child\'s learning journey',
                    style: theme.textTheme.bodyLarge?.copyWith(
                      color: colorScheme.onSurfaceVariant,
                    ),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 48),

                  // Content based on mode
                  if (_mode == _LoginMode.credentials)
                    _buildCredentialsForm(theme, colorScheme, authState, isLoading)
                  else if (_mode == _LoginMode.ssoLookup)
                    _buildSsoLookup(theme, colorScheme)
                  else if (_mode == _LoginMode.ssoProviders)
                    _buildSsoProviders(theme, colorScheme),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCredentialsForm(
    ThemeData theme,
    ColorScheme colorScheme,
    AuthState authState,
    bool isLoading,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        // Login Form
        Form(
          key: _formKey,
          child: Column(
            children: [
              TextFormField(
                controller: _emailController,
                keyboardType: TextInputType.emailAddress,
                textInputAction: TextInputAction.next,
                autofillHints: const [AutofillHints.email],
                decoration: InputDecoration(
                  labelText: 'Email',
                  hintText: 'parent@email.com',
                  prefixIcon: const Icon(Icons.email_outlined),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your email';
                  }
                  if (!value.contains('@')) {
                    return 'Please enter a valid email';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                obscureText: _obscurePassword,
                textInputAction: TextInputAction.done,
                autofillHints: const [AutofillHints.password],
                onFieldSubmitted: (_) => _submit(),
                decoration: InputDecoration(
                  labelText: 'Password',
                  prefixIcon: const Icon(Icons.lock_outline),
                  suffixIcon: IconButton(
                    icon: Icon(
                      _obscurePassword
                          ? Icons.visibility_outlined
                          : Icons.visibility_off_outlined,
                    ),
                    onPressed: () {
                      setState(() {
                        _obscurePassword = !_obscurePassword;
                      });
                    },
                    tooltip: _obscurePassword ? 'Show password' : 'Hide password',
                  ),
                  border: OutlineInputBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                ),
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your password';
                  }
                  return null;
                },
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),

        // Forgot password
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Check your email for password reset instructions'),
                ),
              );
            },
            child: const Text('Forgot password?'),
          ),
        ),
        const SizedBox(height: 16),

        // Error message
        if (authState.error != null) ...[
          Semantics(
            liveRegion: true,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: colorScheme.errorContainer,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Row(
                children: [
                  Icon(
                    Icons.error_outline,
                    color: colorScheme.onErrorContainer,
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Text(
                      authState.error!,
                      style: TextStyle(
                        color: colorScheme.onErrorContainer,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Login button
        FilledButton(
          onPressed: isLoading ? null : _submit,
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: isLoading
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                  ),
                )
              : const Text('Sign In'),
        ),
        const SizedBox(height: 32),

        // SSO options
        Row(
          children: [
            const Expanded(child: Divider()),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Text(
                'Or continue with',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: colorScheme.onSurfaceVariant,
                ),
              ),
            ),
            const Expanded(child: Divider()),
          ],
        ),
        const SizedBox(height: 16),
        OutlinedButton.icon(
          onPressed: _showSsoLogin,
          icon: const Icon(Icons.business),
          label: const Text('School Single Sign-On'),
          style: OutlinedButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildSsoLookup(ThemeData theme, ColorScheme colorScheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'School Single Sign-On',
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Enter your child\'s school domain to sign in with your school account',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: colorScheme.onSurfaceVariant,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),
        TextFormField(
          controller: _domainController,
          keyboardType: TextInputType.url,
          textInputAction: TextInputAction.done,
          onFieldSubmitted: (_) => _lookupDomain(),
          decoration: InputDecoration(
            labelText: 'School Domain',
            hintText: 'yourschool.edu',
            prefixIcon: const Icon(Icons.domain),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        const SizedBox(height: 24),
        FilledButton(
          onPressed: _isLookingUpDomain ? null : _lookupDomain,
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(vertical: 16),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          child: _isLookingUpDomain
              ? const SizedBox(
                  width: 20,
                  height: 20,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Continue'),
        ),
        const SizedBox(height: 16),
        TextButton(
          onPressed: _backToCredentials,
          child: const Text('Back to email login'),
        ),
      ],
    );
  }

  Widget _buildSsoProviders(ThemeData theme, ColorScheme colorScheme) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          'Choose Sign-In Method',
          style: theme.textTheme.headlineSmall?.copyWith(
            fontWeight: FontWeight.bold,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          _tenantSsoInfo?.tenantName ?? 'Your School',
          style: theme.textTheme.titleMedium?.copyWith(
            color: colorScheme.primary,
          ),
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 32),

        // Enterprise SSO providers
        if (_tenantSsoInfo != null)
          for (final provider in _tenantSsoInfo!.providers) ...[
            _SsoProviderButton(
              provider: provider,
              onPressed: () => _signInWithProvider(provider),
            ),
            const SizedBox(height: 12),
          ],

        const SizedBox(height: 16),
        TextButton(
          onPressed: () {
            setState(() {
              _mode = _LoginMode.ssoLookup;
            });
          },
          child: const Text('Try a different domain'),
        ),
        const SizedBox(height: 8),
        TextButton(
          onPressed: _backToCredentials,
          child: const Text('Back to email login'),
        ),
      ],
    );
  }
}

/// Button widget for SSO provider selection.
class _SsoProviderButton extends StatelessWidget {
  const _SsoProviderButton({
    required this.provider,
    required this.onPressed,
  });

  final SsoProviderInfo provider;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    final config = _getProviderConfig(provider.type);

    return OutlinedButton(
      onPressed: onPressed,
      style: OutlinedButton.styleFrom(
        padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
        ),
        side: BorderSide(color: config.brandColor.withOpacity(0.5)),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(config.icon, color: config.brandColor),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              'Continue with ${provider.name}',
              style: TextStyle(color: config.brandColor),
              textAlign: TextAlign.center,
            ),
          ),
        ],
      ),
    );
  }

  _ProviderConfig _getProviderConfig(String type) {
    switch (type.toUpperCase()) {
      case 'CLEVER':
        return _ProviderConfig(
          icon: Icons.school,
          brandColor: const Color(0xFF4285F4),
        );
      case 'CLASSLINK':
        return _ProviderConfig(
          icon: Icons.link,
          brandColor: const Color(0xFF00A0E4),
        );
      case 'GOOGLE':
        return _ProviderConfig(
          icon: Icons.g_mobiledata,
          brandColor: const Color(0xFF4285F4),
        );
      case 'MICROSOFT':
        return _ProviderConfig(
          icon: Icons.window,
          brandColor: const Color(0xFF00A4EF),
        );
      default:
        return _ProviderConfig(
          icon: Icons.login,
          brandColor: Colors.grey,
        );
    }
  }
}

class _ProviderConfig {
  const _ProviderConfig({
    required this.icon,
    required this.brandColor,
  });

  final IconData icon;
  final Color brandColor;
}
