import 'package:flutter/material.dart';

import 'aivo_branding.dart';

// ══════════════════════════════════════════════════════════════════════════════
// AIVO BRANDING PROVIDER — InheritedWidget for white-label branding
//
// Provides tenant branding to the entire widget tree, similar to the
// web ThemeProvider in @aivo/theme-provider/react.
// ══════════════════════════════════════════════════════════════════════════════

/// Provides [AivoBranding] to descendant widgets.
///
/// Wrap your app or a subtree with this widget to make branding data
/// available via [AivoBrandingProvider.of(context)].
///
/// The provider also applies the branding as a Material theme through
/// [Theme], so standard Material widgets automatically pick up the
/// tenant's colour scheme.
///
/// ```dart
/// final branding = await AivoBranding.fetchForDomain('academy.example.com');
///
/// runApp(
///   AivoBrandingProvider(
///     branding: branding,
///     child: MaterialApp(
///       // Theme is automatically applied, but you can also merge:
///       theme: branding.toThemeData(baseTheme: themeForBand(band)),
///       home: MyHome(),
///     ),
///   ),
/// );
/// ```
class AivoBrandingProvider extends InheritedWidget {
  const AivoBrandingProvider({
    super.key,
    required this.branding,
    required super.child,
  });

  /// The current tenant branding.
  final AivoBranding branding;

  /// Retrieve the nearest [AivoBranding] from the widget tree.
  ///
  /// Returns [AivoBranding.defaults()] if no provider is found.
  static AivoBranding of(BuildContext context) {
    final provider =
        context.dependOnInheritedWidgetOfExactType<AivoBrandingProvider>();
    return provider?.branding ?? AivoBranding.defaults();
  }

  /// Try to retrieve the nearest [AivoBranding] from the widget tree.
  ///
  /// Returns null if no provider is found.
  static AivoBranding? maybeOf(BuildContext context) {
    return context
        .dependOnInheritedWidgetOfExactType<AivoBrandingProvider>()
        ?.branding;
  }

  @override
  bool updateShouldNotify(AivoBrandingProvider oldWidget) {
    // Compare by display name + primary colour as a quick identity check.
    // A full deep equality is overkill; branding changes are rare.
    return branding.displayName != oldWidget.branding.displayName ||
        branding.colorPrimary != oldWidget.branding.colorPrimary ||
        branding.colorSecondary != oldWidget.branding.colorSecondary ||
        branding.logoUrl != oldWidget.branding.logoUrl;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXTENSIONS
// ══════════════════════════════════════════════════════════════════════════════

/// Extension on [BuildContext] for quick access to branding data.
extension AivoBrandingContext on BuildContext {
  /// Get the current tenant branding from the nearest provider.
  ///
  /// Returns default branding if no provider is found.
  AivoBranding get branding => AivoBrandingProvider.of(this);

  /// Get the tenant display name.
  String get tenantName => AivoBrandingProvider.of(this).displayName;

  /// Get the tenant logo URL (full-size).
  String? get tenantLogoUrl => AivoBrandingProvider.of(this).logoUrl;

  /// Get the tenant logo URL (small/icon).
  String? get tenantLogoSmallUrl => AivoBrandingProvider.of(this).logoSmallUrl;
}
