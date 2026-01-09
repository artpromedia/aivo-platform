/// SSO Provider Definitions for Flutter Mobile Apps
///
/// Provides provider-specific configuration for enterprise SSO:
/// - Google Workspace for Education
/// - Microsoft Entra ID (Azure AD)
/// - Clever
/// - ClassLink
///
/// Addresses RE-AUDIT-003: Mobile Apps Still Lack Enterprise SSO
library;

import 'package:flutter/material.dart';

/// Supported SSO providers for K-12 education.
enum SsoProvider {
  /// Clever SSO - Most common in US K-12 (70%+ market)
  clever,

  /// ClassLink SSO - Major player in education SSO (30%+ market)
  classlink,

  /// Google Workspace for Education
  google,

  /// Microsoft Entra ID (formerly Azure AD) for Education
  microsoft,

  /// Generic OIDC provider
  genericOidc,

  /// Generic SAML provider
  genericSaml,
}

/// Configuration for an SSO provider.
class SsoProviderConfig {
  final SsoProvider provider;
  final String displayName;
  final IconData icon;
  final Color brandColor;
  final Color? textColor;
  final String? logoAsset;
  final String protocol; // 'OIDC' or 'SAML'

  const SsoProviderConfig({
    required this.provider,
    required this.displayName,
    required this.icon,
    required this.brandColor,
    this.textColor,
    this.logoAsset,
    required this.protocol,
  });

  /// Get the text color (defaults to white if not specified).
  Color get foregroundColor => textColor ?? Colors.white;
}

/// Pre-configured SSO providers for common education IdPs.
class SsoProviders {
  SsoProviders._();

  /// Clever SSO configuration
  static const clever = SsoProviderConfig(
    provider: SsoProvider.clever,
    displayName: 'Clever',
    icon: Icons.school,
    brandColor: Color(0xFF4274F6), // Clever blue
    logoAsset: 'assets/sso/clever-logo.png',
    protocol: 'OIDC',
  );

  /// ClassLink SSO configuration
  static const classlink = SsoProviderConfig(
    provider: SsoProvider.classlink,
    displayName: 'ClassLink',
    icon: Icons.link,
    brandColor: Color(0xFF00A650), // ClassLink green
    logoAsset: 'assets/sso/classlink-logo.png',
    protocol: 'OIDC',
  );

  /// Google Workspace SSO configuration
  static const google = SsoProviderConfig(
    provider: SsoProvider.google,
    displayName: 'Google',
    icon: Icons.g_mobiledata,
    brandColor: Color(0xFFFFFFFF), // White background
    textColor: Color(0xFF757575), // Gray text
    logoAsset: 'assets/sso/google-logo.png',
    protocol: 'OIDC',
  );

  /// Microsoft Entra ID SSO configuration
  static const microsoft = SsoProviderConfig(
    provider: SsoProvider.microsoft,
    displayName: 'Microsoft',
    icon: Icons.window,
    brandColor: Color(0xFF2F2F2F), // Microsoft dark
    logoAsset: 'assets/sso/microsoft-logo.png',
    protocol: 'OIDC',
  );

  /// Get provider config by type.
  static SsoProviderConfig? getConfig(SsoProvider provider) {
    switch (provider) {
      case SsoProvider.clever:
        return clever;
      case SsoProvider.classlink:
        return classlink;
      case SsoProvider.google:
        return google;
      case SsoProvider.microsoft:
        return microsoft;
      default:
        return null;
    }
  }

  /// Get all standard K-12 providers.
  static List<SsoProviderConfig> get educationProviders => [
        clever,
        classlink,
        google,
        microsoft,
      ];

  /// Parse provider from string (from backend).
  static SsoProvider? fromString(String value) {
    switch (value.toUpperCase()) {
      case 'CLEVER':
        return SsoProvider.clever;
      case 'CLASSLINK':
        return SsoProvider.classlink;
      case 'GOOGLE':
        return SsoProvider.google;
      case 'MICROSOFT':
        return SsoProvider.microsoft;
      case 'OIDC':
      case 'GENERIC_OIDC':
        return SsoProvider.genericOidc;
      case 'SAML':
      case 'GENERIC_SAML':
        return SsoProvider.genericSaml;
      default:
        return null;
    }
  }
}

/// A button widget for SSO provider sign-in.
class SsoProviderButton extends StatelessWidget {
  final SsoProviderConfig config;
  final VoidCallback? onPressed;
  final bool isLoading;
  final bool isCompact;

  const SsoProviderButton({
    super.key,
    required this.config,
    this.onPressed,
    this.isLoading = false,
    this.isCompact = false,
  });

  @override
  Widget build(BuildContext context) {
    final isGoogle = config.provider == SsoProvider.google;

    return ElevatedButton(
      onPressed: isLoading ? null : onPressed,
      style: ElevatedButton.styleFrom(
        backgroundColor: config.brandColor,
        foregroundColor: config.foregroundColor,
        padding: EdgeInsets.symmetric(
          horizontal: isCompact ? 16 : 24,
          vertical: isCompact ? 12 : 16,
        ),
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(12),
          side: isGoogle
              ? const BorderSide(color: Color(0xFFDDDDDD))
              : BorderSide.none,
        ),
        elevation: isGoogle ? 1 : 2,
      ),
      child: Row(
        mainAxisSize: isCompact ? MainAxisSize.min : MainAxisSize.max,
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          if (isLoading)
            SizedBox(
              width: 20,
              height: 20,
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(
                  config.foregroundColor,
                ),
              ),
            )
          else
            Icon(config.icon, size: 24),
          const SizedBox(width: 12),
          Text(
            isCompact
                ? config.displayName
                : 'Sign in with ${config.displayName}',
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w500,
              color: config.foregroundColor,
            ),
          ),
        ],
      ),
    );
  }
}

/// A grid of SSO provider buttons.
class SsoProviderGrid extends StatelessWidget {
  final List<SsoProviderConfig> providers;
  final void Function(SsoProviderConfig provider)? onProviderSelected;
  final SsoProvider? loadingProvider;
  final int crossAxisCount;

  const SsoProviderGrid({
    super.key,
    required this.providers,
    this.onProviderSelected,
    this.loadingProvider,
    this.crossAxisCount = 2,
  });

  @override
  Widget build(BuildContext context) {
    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: crossAxisCount,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
        childAspectRatio: 2.5,
      ),
      itemCount: providers.length,
      itemBuilder: (context, index) {
        final provider = providers[index];
        return SsoProviderButton(
          config: provider,
          isLoading: loadingProvider == provider.provider,
          isCompact: true,
          onPressed: onProviderSelected != null
              ? () => onProviderSelected!(provider)
              : null,
        );
      },
    );
  }
}

/// A list of SSO provider buttons.
class SsoProviderList extends StatelessWidget {
  final List<SsoProviderConfig> providers;
  final void Function(SsoProviderConfig provider)? onProviderSelected;
  final SsoProvider? loadingProvider;
  final double spacing;

  const SsoProviderList({
    super.key,
    required this.providers,
    this.onProviderSelected,
    this.loadingProvider,
    this.spacing = 12,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        for (var i = 0; i < providers.length; i++) ...[
          SsoProviderButton(
            config: providers[i],
            isLoading: loadingProvider == providers[i].provider,
            onPressed: onProviderSelected != null
                ? () => onProviderSelected!(providers[i])
                : null,
          ),
          if (i < providers.length - 1) SizedBox(height: spacing),
        ],
      ],
    );
  }
}
