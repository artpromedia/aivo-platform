/// SSO Login Screen Widget
///
/// Provides a tenant-based SSO login flow for Flutter apps.
/// Supports both SAML and OIDC protocols.
library;

import 'package:flutter/material.dart';

import 'sso_service.dart';

/// SSO login screen that handles tenant-based authentication.
class SsoLoginScreen extends StatefulWidget {
  /// SSO service instance.
  final SsoService ssoService;

  /// Callback when SSO succeeds.
  final void Function(SsoSuccess result)? onSuccess;

  /// Callback when SSO fails.
  final void Function(SsoError error)? onError;

  /// Custom header widget.
  final Widget? header;

  /// Whether to show tenant input field.
  final bool showTenantInput;

  /// Pre-filled tenant slug.
  final String? tenantSlug;

  /// Custom theme.
  final SsoLoginTheme? theme;

  const SsoLoginScreen({
    super.key,
    required this.ssoService,
    this.onSuccess,
    this.onError,
    this.header,
    this.showTenantInput = true,
    this.tenantSlug,
    this.theme,
  });

  @override
  State<SsoLoginScreen> createState() => _SsoLoginScreenState();
}

class _SsoLoginScreenState extends State<SsoLoginScreen> {
  final _tenantController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  bool _isLoading = false;
  String? _errorMessage;
  TenantSsoInfo? _tenantInfo;

  @override
  void initState() {
    super.initState();
    if (widget.tenantSlug != null) {
      _tenantController.text = widget.tenantSlug!;
      _checkTenant();
    }
  }

  @override
  void dispose() {
    _tenantController.dispose();
    super.dispose();
  }

  Future<void> _checkTenant() async {
    final tenant = _tenantController.text.trim();
    if (tenant.isEmpty) {
      setState(() {
        _tenantInfo = null;
        _errorMessage = null;
      });
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final info = await widget.ssoService.getTenantSsoInfo(tenant);
      setState(() {
        _tenantInfo = info;
        _isLoading = false;
        if (info == null) {
          _errorMessage = 'District not found';
        } else if (!info.ssoEnabled) {
          _errorMessage = 'SSO is not enabled for this district';
        }
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'Unable to check district';
      });
    }
  }

  Future<void> _startSso([String? protocol]) async {
    if (!_formKey.currentState!.validate()) return;

    final tenant = _tenantController.text.trim();

    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final result = await widget.ssoService.signInWithSso(
        tenantSlug: tenant,
        protocol: protocol,
      );

      setState(() => _isLoading = false);

      switch (result) {
        case SsoSuccess():
          widget.onSuccess?.call(result);
        case SsoError():
          setState(() => _errorMessage = result.message);
          widget.onError?.call(result);
        case SsoCancelled():
          setState(() => _errorMessage = 'Sign-in cancelled');
      }
    } catch (e) {
      setState(() {
        _isLoading = false;
        _errorMessage = 'An error occurred';
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = widget.theme ?? SsoLoginTheme.fromContext(context);

    return Scaffold(
      backgroundColor: theme.backgroundColor,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
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
                      TextFormField(
                        controller: _tenantController,
                        decoration: InputDecoration(
                          labelText: 'District ID',
                          hintText: 'e.g., springfield-usd',
                          prefixIcon: const Icon(Icons.school_outlined),
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
                      const SizedBox(height: 24),
                    ],

                    // Error message
                    if (_errorMessage != null) ...[
                      Container(
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
                      const SizedBox(height: 16),
                    ],

                    // SSO buttons
                    if (_tenantInfo?.ssoEnabled == true) ...[
                      _buildSsoButton(theme),
                      const SizedBox(height: 16),
                    ] else ...[
                      // Show disabled button when tenant not verified
                      ElevatedButton.icon(
                        onPressed: _isLoading
                            ? null
                            : () {
                                if (_tenantController.text.isEmpty) {
                                  _formKey.currentState!.validate();
                                } else {
                                  _checkTenant();
                                }
                              },
                        icon: _isLoading
                            ? const SizedBox(
                                width: 20,
                                height: 20,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                ),
                              )
                            : const Icon(Icons.login),
                        label: Text(
                          _isLoading ? 'Checking...' : 'Continue with SSO',
                        ),
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.all(16),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                          backgroundColor: theme.primaryColor,
                          foregroundColor: theme.onPrimaryColor,
                        ),
                      ),
                    ],

                    // Help text
                    const SizedBox(height: 32),
                    Text(
                      'Sign in with your district account',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        color: theme.secondaryTextColor,
                        fontSize: 14,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildDefaultHeader(SsoLoginTheme theme) {
    return Column(
      children: [
        // Logo placeholder
        Container(
          width: 80,
          height: 80,
          decoration: BoxDecoration(
            color: theme.primaryColor.withOpacity(0.1),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Icon(
            Icons.school,
            size: 48,
            color: theme.primaryColor,
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
          'Sign in to continue',
          style: TextStyle(
            fontSize: 16,
            color: theme.secondaryTextColor,
          ),
        ),
      ],
    );
  }

  Widget _buildSsoButton(SsoLoginTheme theme) {
    final protocols = _tenantInfo?.availableProtocols ?? [];
    final idpName = _tenantInfo?.idpName ?? 'Your District';

    // Single SSO option
    if (protocols.length <= 1) {
      return ElevatedButton.icon(
        onPressed: _isLoading ? null : () => _startSso(protocols.firstOrNull),
        icon: _isLoading
            ? const SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.login),
        label: Text('Sign in with $idpName'),
        style: ElevatedButton.styleFrom(
          padding: const EdgeInsets.all(16),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          backgroundColor: theme.primaryColor,
          foregroundColor: theme.onPrimaryColor,
        ),
      );
    }

    // Multiple SSO options
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (final protocol in protocols) ...[
          OutlinedButton.icon(
            onPressed: _isLoading ? null : () => _startSso(protocol),
            icon: Icon(_getProtocolIcon(protocol)),
            label: Text('Sign in with ${_getProtocolLabel(protocol)}'),
            style: OutlinedButton.styleFrom(
              padding: const EdgeInsets.all(16),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          const SizedBox(height: 8),
        ],
      ],
    );
  }

  IconData _getProtocolIcon(String protocol) {
    switch (protocol.toUpperCase()) {
      case 'OIDC':
        return Icons.key;
      case 'SAML':
        return Icons.security;
      default:
        return Icons.login;
    }
  }

  String _getProtocolLabel(String protocol) {
    switch (protocol.toUpperCase()) {
      case 'OIDC':
        return 'OpenID Connect';
      case 'SAML':
        return 'SAML';
      default:
        return protocol;
    }
  }
}

/// Theme configuration for SSO login screen.
class SsoLoginTheme {
  final Color backgroundColor;
  final Color primaryColor;
  final Color onPrimaryColor;
  final Color primaryTextColor;
  final Color secondaryTextColor;
  final Color errorColor;
  final Color errorBackgroundColor;

  const SsoLoginTheme({
    required this.backgroundColor,
    required this.primaryColor,
    required this.onPrimaryColor,
    required this.primaryTextColor,
    required this.secondaryTextColor,
    required this.errorColor,
    required this.errorBackgroundColor,
  });

  factory SsoLoginTheme.fromContext(BuildContext context) {
    final colorScheme = Theme.of(context).colorScheme;
    return SsoLoginTheme(
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
