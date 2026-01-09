/// Enterprise SSO Login Screen
///
/// Full-featured SSO login screen for K-12 education apps supporting:
/// - Clever, ClassLink, Google Workspace, Microsoft Entra ID
/// - Tenant-based discovery
/// - Provider-specific branding
/// - Accessibility support
///
/// Addresses RE-AUDIT-003: Mobile Apps Still Lack Enterprise SSO
library;

import 'package:flutter/material.dart';
import 'package:flutter/semantics.dart';

import 'sso_providers.dart';
import 'sso_service.dart';

/// Enterprise SSO login screen with multi-provider support.
class EnterpriseSsoScreen extends StatefulWidget {
  /// SSO service instance.
  final SsoService ssoService;

  /// Callback when SSO succeeds.
  final void Function(SsoSuccess result, SsoProvider provider)? onSuccess;

  /// Callback when SSO fails.
  final void Function(SsoError error, SsoProvider? provider)? onError;

  /// Custom header widget (logo, title, etc.).
  final Widget? header;

  /// Whether to show the tenant/district input.
  final bool showTenantInput;

  /// Pre-filled tenant slug.
  final String? tenantSlug;

  /// Available providers (if known). If null, will be discovered from tenant.
  final List<SsoProvider>? availableProviders;

  /// App type for customized messaging.
  final SsoAppType appType;

  /// Custom theme.
  final EnterpriseSsoTheme? theme;

  /// Help URL for SSO troubleshooting.
  final String? helpUrl;

  /// Callback for "use PIN instead" (for learner apps).
  final VoidCallback? onUsePinInstead;

  const EnterpriseSsoScreen({
    super.key,
    required this.ssoService,
    this.onSuccess,
    this.onError,
    this.header,
    this.showTenantInput = true,
    this.tenantSlug,
    this.availableProviders,
    this.appType = SsoAppType.learner,
    this.theme,
    this.helpUrl,
    this.onUsePinInstead,
  });

  @override
  State<EnterpriseSsoScreen> createState() => _EnterpriseSsoScreenState();
}

/// App type for customized SSO messaging.
enum SsoAppType { learner, teacher, parent }

class _EnterpriseSsoScreenState extends State<EnterpriseSsoScreen> {
  final _tenantController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  bool _isCheckingTenant = false;
  String? _errorMessage;
  TenantSsoInfo? _tenantInfo;
  List<SsoProviderConfig> _discoveredProviders = [];
  SsoProvider? _loadingProvider;

  @override
  void initState() {
    super.initState();
    if (widget.tenantSlug != null) {
      _tenantController.text = widget.tenantSlug!;
      _checkTenant();
    }

    // If providers are pre-configured, use them
    if (widget.availableProviders != null) {
      _discoveredProviders = widget.availableProviders!
          .map((p) => SsoProviders.getConfig(p))
          .whereType<SsoProviderConfig>()
          .toList();
    }
  }

  @override
  void dispose() {
    _tenantController.dispose();
    super.dispose();
  }

  String get _appTypeLabel {
    switch (widget.appType) {
      case SsoAppType.learner:
        return 'Student';
      case SsoAppType.teacher:
        return 'Teacher';
      case SsoAppType.parent:
        return 'Parent';
    }
  }

  Future<void> _checkTenant() async {
    final tenant = _tenantController.text.trim();
    if (tenant.isEmpty) {
      setState(() {
        _tenantInfo = null;
        _errorMessage = null;
        _discoveredProviders = [];
      });
      return;
    }

    setState(() {
      _isCheckingTenant = true;
      _errorMessage = null;
    });

    try {
      final info = await widget.ssoService.getTenantSsoInfo(tenant);

      // Map protocols to providers (simulated - in real implementation,
      // the backend would return specific provider info)
      List<SsoProviderConfig> providers = [];
      if (info != null && info.ssoEnabled) {
        // Default to showing common education providers
        // In a real implementation, the tenant info would specify which providers
        if (info.idpName?.toLowerCase().contains('clever') == true) {
          providers = [SsoProviders.clever];
        } else if (info.idpName?.toLowerCase().contains('classlink') == true) {
          providers = [SsoProviders.classlink];
        } else if (info.idpName?.toLowerCase().contains('google') == true) {
          providers = [SsoProviders.google];
        } else if (info.idpName?.toLowerCase().contains('microsoft') == true) {
          providers = [SsoProviders.microsoft];
        } else {
          // Show all common education providers
          providers = SsoProviders.educationProviders;
        }
      }

      setState(() {
        _tenantInfo = info;
        _discoveredProviders = providers;
        _isCheckingTenant = false;
        if (info == null) {
          _errorMessage = 'District not found. Please check your district ID.';
        } else if (!info.ssoEnabled) {
          _errorMessage = 'SSO is not enabled for this district.';
        }
      });
    } catch (e) {
      setState(() {
        _isCheckingTenant = false;
        _errorMessage = 'Unable to connect. Please check your internet connection.';
      });
    }
  }

  Future<void> _startSso(SsoProviderConfig providerConfig) async {
    if (!_formKey.currentState!.validate()) return;

    final tenant = _tenantController.text.trim();

    setState(() {
      _isLoading = true;
      _loadingProvider = providerConfig.provider;
      _errorMessage = null;
    });

    // Announce to screen readers
    SemanticsService.announce(
      'Signing in with ${providerConfig.displayName}...',
      TextDirection.ltr,
    );

    try {
      final result = await widget.ssoService.signInWithSso(
        tenantSlug: tenant,
        protocol: providerConfig.protocol,
      );

      setState(() {
        _isLoading = false;
        _loadingProvider = null;
      });

      switch (result) {
        case SsoSuccess():
          SemanticsService.announce(
            'Successfully signed in',
            TextDirection.ltr,
          );
          widget.onSuccess?.call(result, providerConfig.provider);
        case SsoError():
          setState(() => _errorMessage = _getUserFriendlyError(result));
          widget.onError?.call(result, providerConfig.provider);
        case SsoCancelled():
          setState(() => _errorMessage = 'Sign-in was cancelled');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _loadingProvider = null;
        _errorMessage = 'An error occurred. Please try again.';
      });
    }
  }

  String _getUserFriendlyError(SsoError error) {
    switch (error.code) {
      case 'SSO_TIMEOUT':
        return 'Sign-in timed out. Please try again.';
      case 'SSO_IN_PROGRESS':
        return 'A sign-in is already in progress.';
      case 'BROWSER_UNAVAILABLE':
        return 'Unable to open browser. Please check your device settings.';
      case 'INVALID_STATE':
        return 'Session expired. Please try again.';
      case 'USER_NOT_ALLOWED':
        return 'Your account is not authorized for this app.';
      default:
        return error.message;
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = widget.theme ?? EnterpriseSsoTheme.fromContext(context);

    return Scaffold(
      backgroundColor: theme.backgroundColor,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Semantics(
              label: '${_appTypeLabel} sign-in screen',
              child: ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 400),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // Header
                      widget.header ?? _buildDefaultHeader(theme),
                      const SizedBox(height: 48),

                      // Tenant input
                      if (widget.showTenantInput) ...[
                        Semantics(
                          textField: true,
                          label: 'District ID input',
                          hint: 'Enter your district ID, for example springfield-usd',
                          child: TextFormField(
                            controller: _tenantController,
                            decoration: InputDecoration(
                              labelText: 'District ID',
                              hintText: 'e.g., springfield-usd',
                              prefixIcon: const Icon(Icons.school_outlined),
                              suffixIcon: _isCheckingTenant
                                  ? const Padding(
                                      padding: EdgeInsets.all(12),
                                      child: SizedBox(
                                        width: 20,
                                        height: 20,
                                        child: CircularProgressIndicator(
                                          strokeWidth: 2,
                                        ),
                                      ),
                                    )
                                  : null,
                              border: OutlineInputBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                            ),
                            textInputAction: TextInputAction.done,
                            autocorrect: false,
                            enabled: !_isLoading,
                            validator: (value) {
                              if (value == null || value.trim().isEmpty) {
                                return 'Please enter your district ID';
                              }
                              return null;
                            },
                            onFieldSubmitted: (_) => _checkTenant(),
                            onChanged: (_) {
                              // Debounce tenant check
                              Future.delayed(const Duration(milliseconds: 500), () {
                                if (mounted) _checkTenant();
                              });
                            },
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Error message
                      if (_errorMessage != null) ...[
                        Semantics(
                          liveRegion: true,
                          child: Container(
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: theme.errorBackgroundColor,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  Icons.error_outline,
                                  color: theme.errorColor,
                                  size: 20,
                                  semanticLabel: 'Error',
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    _errorMessage!,
                                    style: TextStyle(color: theme.errorColor),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                        const SizedBox(height: 16),
                      ],

                      // Provider buttons
                      if (_discoveredProviders.isNotEmpty) ...[
                        Text(
                          'Sign in with your school account',
                          style: TextStyle(
                            color: theme.secondaryTextColor,
                            fontSize: 14,
                          ),
                          textAlign: TextAlign.center,
                        ),
                        const SizedBox(height: 16),
                        SsoProviderList(
                          providers: _discoveredProviders,
                          loadingProvider: _loadingProvider,
                          onProviderSelected: _isLoading ? null : _startSso,
                        ),
                      ] else if (_tenantInfo == null && !_isCheckingTenant) ...[
                        // No tenant entered yet - show generic button
                        Semantics(
                          button: true,
                          label: 'Continue with SSO after entering district ID',
                          child: ElevatedButton.icon(
                            onPressed: _isLoading
                                ? null
                                : () {
                                    if (_tenantController.text.isEmpty) {
                                      _formKey.currentState!.validate();
                                    } else {
                                      _checkTenant();
                                    }
                                  },
                            icon: const Icon(Icons.login),
                            label: const Text('Continue'),
                            style: ElevatedButton.styleFrom(
                              padding: const EdgeInsets.all(16),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                              ),
                              backgroundColor: theme.primaryColor,
                              foregroundColor: theme.onPrimaryColor,
                            ),
                          ),
                        ),
                      ],

                      // PIN alternative for learners
                      if (widget.onUsePinInstead != null) ...[
                        const SizedBox(height: 24),
                        const Row(
                          children: [
                            Expanded(child: Divider()),
                            Padding(
                              padding: EdgeInsets.symmetric(horizontal: 16),
                              child: Text('or'),
                            ),
                            Expanded(child: Divider()),
                          ],
                        ),
                        const SizedBox(height: 24),
                        OutlinedButton.icon(
                          onPressed: _isLoading ? null : widget.onUsePinInstead,
                          icon: const Icon(Icons.pin_outlined),
                          label: const Text('Sign in with PIN'),
                          style: OutlinedButton.styleFrom(
                            padding: const EdgeInsets.all(16),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(12),
                            ),
                          ),
                        ),
                      ],

                      // Help link
                      if (widget.helpUrl != null) ...[
                        const SizedBox(height: 32),
                        TextButton(
                          onPressed: () {
                            // Open help URL
                          },
                          child: Text(
                            'Need help signing in?',
                            style: TextStyle(color: theme.secondaryTextColor),
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDefaultHeader(EnterpriseSsoTheme theme) {
    return Semantics(
      header: true,
      child: Column(
        children: [
          // Logo
          Container(
            width: 80,
            height: 80,
            decoration: BoxDecoration(
              color: theme.primaryColor.withOpacity(0.1),
              borderRadius: BorderRadius.circular(20),
            ),
            child: Icon(
              _getAppIcon(),
              size: 48,
              color: theme.primaryColor,
              semanticLabel: 'Aivo logo',
            ),
          ),
          const SizedBox(height: 24),
          Text(
            'Welcome to Aivo',
            style: TextStyle(
              fontSize: 28,
              fontWeight: FontWeight.bold,
              color: theme.primaryTextColor,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            _getWelcomeMessage(),
            style: TextStyle(
              fontSize: 16,
              color: theme.secondaryTextColor,
            ),
          ),
        ],
      ),
    );
  }

  IconData _getAppIcon() {
    switch (widget.appType) {
      case SsoAppType.learner:
        return Icons.school;
      case SsoAppType.teacher:
        return Icons.person;
      case SsoAppType.parent:
        return Icons.family_restroom;
    }
  }

  String _getWelcomeMessage() {
    switch (widget.appType) {
      case SsoAppType.learner:
        return 'Sign in to start learning';
      case SsoAppType.teacher:
        return 'Sign in to manage your classroom';
      case SsoAppType.parent:
        return 'Sign in to track your child\'s progress';
    }
  }
}

/// Theme for the Enterprise SSO screen.
class EnterpriseSsoTheme {
  final Color backgroundColor;
  final Color primaryColor;
  final Color onPrimaryColor;
  final Color primaryTextColor;
  final Color secondaryTextColor;
  final Color errorColor;
  final Color errorBackgroundColor;

  const EnterpriseSsoTheme({
    required this.backgroundColor,
    required this.primaryColor,
    required this.onPrimaryColor,
    required this.primaryTextColor,
    required this.secondaryTextColor,
    required this.errorColor,
    required this.errorBackgroundColor,
  });

  factory EnterpriseSsoTheme.fromContext(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return EnterpriseSsoTheme(
      backgroundColor: colorScheme.surface,
      primaryColor: colorScheme.primary,
      onPrimaryColor: colorScheme.onPrimary,
      primaryTextColor: colorScheme.onSurface,
      secondaryTextColor: colorScheme.onSurfaceVariant,
      errorColor: colorScheme.error,
      errorBackgroundColor: colorScheme.errorContainer,
    );
  }
}
