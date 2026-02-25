import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_common/theme/aivo_theme.dart';
import 'package:http/http.dart' as http;

// ══════════════════════════════════════════════════════════════════════════════
// AIVO BRANDING — White-label theme data
//
// Mirrors the web @aivo/theme-provider AivoTheme interface.
// Fetches branding from tenant-svc and converts to Material ThemeData.
// ══════════════════════════════════════════════════════════════════════════════

/// White-label branding data fetched from the AIVO branding API.
///
/// Provides:
/// * [fromJson] — parse API response
/// * [defaults] — AIVO default branding
/// * [fetchForDomain] — HTTP fetch for a custom/tenant domain
/// * [toThemeData] — convert to Material 3 [ThemeData]
/// * [toAivoColors] — convert to [AivoColors] theme extension
class AivoBranding {
  const AivoBranding({
    required this.displayName,
    this.logoUrl,
    this.logoSmallUrl,
    this.faviconUrl,
    required this.colorPrimary,
    required this.colorSecondary,
    required this.colorAccent,
    required this.colorBackground,
    required this.colorSurface,
    required this.colorText,
    required this.colorTextOnPrimary,
    required this.colorMuted,
    required this.colorBorder,
    required this.fontFamily,
    required this.borderRadius,
    this.loginBackgroundUrl,
    this.loginMessage,
    this.supportEmail,
    this.supportUrl,
    this.privacyPolicyUrl,
    this.termsOfServiceUrl,
  });

  // ── Identity ─────────────────────────────────────────────────────────────

  /// Tenant display name (tab title, nav header).
  final String displayName;

  /// Full-size logo URL (nav bar, login page).
  final String? logoUrl;

  /// Small/icon logo URL (collapsed sidebar, mobile).
  final String? logoSmallUrl;

  /// Favicon URL.
  final String? faviconUrl;

  // ── Colours ──────────────────────────────────────────────────────────────

  /// Primary brand colour (buttons, links, active states).
  final Color colorPrimary;

  /// Secondary/accent colour.
  final Color colorSecondary;

  /// Accent colour for highlights.
  final Color colorAccent;

  /// Page / app background colour.
  final Color colorBackground;

  /// Raised surface colour (cards, modals).
  final Color colorSurface;

  /// Primary text colour.
  final Color colorText;

  /// Text colour on primary-coloured backgrounds.
  final Color colorTextOnPrimary;

  /// Muted/secondary text colour.
  final Color colorMuted;

  /// Border / divider colour.
  final Color colorBorder;

  // ── Typography ───────────────────────────────────────────────────────────

  /// Primary font family name (e.g. "DM Sans").
  final String fontFamily;

  /// Border-radius token string (e.g. "0.5rem").
  final String borderRadius;

  // ── Login page ───────────────────────────────────────────────────────────

  /// Background image URL for login/signup page.
  final String? loginBackgroundUrl;

  /// Welcome message shown on login page.
  final String? loginMessage;

  // ── Support links ────────────────────────────────────────────────────────

  final String? supportEmail;
  final String? supportUrl;
  final String? privacyPolicyUrl;
  final String? termsOfServiceUrl;

  // ══════════════════════════════════════════════════════════════════════════
  //  FACTORIES
  // ══════════════════════════════════════════════════════════════════════════

  /// Default AIVO Learning branding.
  ///
  /// Matches the web DEFAULT_THEME in @aivo/theme-provider.
  factory AivoBranding.defaults() {
    return const AivoBranding(
      displayName: 'Aivo Learning',
      colorPrimary: Color(0xFF6366F1), // indigo-500
      colorSecondary: Color(0xFF8B5CF6), // violet-500
      colorAccent: Color(0xFFF59E0B), // amber-500
      colorBackground: Color(0xFFFFFFFF),
      colorSurface: Color(0xFFF8FAFC), // slate-50
      colorText: Color(0xFF0F172A), // slate-900
      colorTextOnPrimary: Color(0xFFFFFFFF),
      colorMuted: Color(0xFF64748B), // slate-500
      colorBorder: Color(0xFFE2E8F0), // slate-200
      fontFamily: 'DM Sans',
      borderRadius: '0.5rem',
    );
  }

  /// Parse branding from the tenant-svc API JSON response.
  factory AivoBranding.fromJson(Map<String, dynamic> json) {
    return AivoBranding(
      displayName: json['displayName'] as String? ?? 'Aivo Learning',
      logoUrl: json['logoUrl'] as String?,
      logoSmallUrl: json['logoSmallUrl'] as String?,
      faviconUrl: json['faviconUrl'] as String?,
      colorPrimary: _parseColor(json['colorPrimary'] as String?, '#6366F1'),
      colorSecondary:
          _parseColor(json['colorSecondary'] as String?, '#8B5CF6'),
      colorAccent: _parseColor(json['colorAccent'] as String?, '#F59E0B'),
      colorBackground:
          _parseColor(json['colorBackground'] as String?, '#FFFFFF'),
      colorSurface: _parseColor(json['colorSurface'] as String?, '#F8FAFC'),
      colorText: _parseColor(json['colorText'] as String?, '#0F172A'),
      colorTextOnPrimary:
          _parseColor(json['colorTextOnPrimary'] as String?, '#FFFFFF'),
      colorMuted: _parseColor(json['colorMuted'] as String?, '#64748B'),
      colorBorder: _parseColor(json['colorBorder'] as String?, '#E2E8F0'),
      fontFamily: json['fontFamily'] as String? ?? 'DM Sans',
      borderRadius: json['borderRadius'] as String? ?? '0.5rem',
      loginBackgroundUrl: json['loginBackgroundUrl'] as String?,
      loginMessage: json['loginMessage'] as String?,
      supportEmail: json['supportEmail'] as String?,
      supportUrl: json['supportUrl'] as String?,
      privacyPolicyUrl: json['privacyPolicyUrl'] as String?,
      termsOfServiceUrl: json['termsOfServiceUrl'] as String?,
    );
  }

  /// Serialize to JSON-compatible map.
  Map<String, dynamic> toJson() {
    return {
      'displayName': displayName,
      'logoUrl': logoUrl,
      'logoSmallUrl': logoSmallUrl,
      'faviconUrl': faviconUrl,
      'colorPrimary': _colorToHex(colorPrimary),
      'colorSecondary': _colorToHex(colorSecondary),
      'colorAccent': _colorToHex(colorAccent),
      'colorBackground': _colorToHex(colorBackground),
      'colorSurface': _colorToHex(colorSurface),
      'colorText': _colorToHex(colorText),
      'colorTextOnPrimary': _colorToHex(colorTextOnPrimary),
      'colorMuted': _colorToHex(colorMuted),
      'colorBorder': _colorToHex(colorBorder),
      'fontFamily': fontFamily,
      'borderRadius': borderRadius,
      'loginBackgroundUrl': loginBackgroundUrl,
      'loginMessage': loginMessage,
      'supportEmail': supportEmail,
      'supportUrl': supportUrl,
      'privacyPolicyUrl': privacyPolicyUrl,
      'termsOfServiceUrl': termsOfServiceUrl,
    };
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  HTTP FETCH
  // ══════════════════════════════════════════════════════════════════════════

  /// Fetch branding for a domain from the AIVO tenant-svc branding API.
  ///
  /// [domain] — the custom domain or tenant subdomain to look up.
  /// [apiBaseUrl] — override for tenant-svc URL (defaults to
  ///   `https://api.aivolearning.com`).
  /// [httpClient] — injectable HTTP client for testing.
  ///
  /// Returns [AivoBranding.defaults()] on any network/parse error.
  static Future<AivoBranding> fetchForDomain(
    String domain, {
    String apiBaseUrl = 'https://api.aivolearning.com',
    http.Client? httpClient,
  }) async {
    final client = httpClient ?? http.Client();
    final shouldClose = httpClient == null;

    try {
      final uri = Uri.parse(
        '$apiBaseUrl/tenant/public/branding?domain=${Uri.encodeComponent(domain)}',
      );

      final response = await client
          .get(uri, headers: {'Accept': 'application/json'}).timeout(
        const Duration(seconds: 10),
      );

      if (response.statusCode == 200) {
        final body = json.decode(response.body) as Map<String, dynamic>;
        return AivoBranding.fromJson(body);
      }

      // Non-200 → fall back to defaults
      return AivoBranding.defaults();
    } catch (_) {
      // Network error, timeout, JSON parse error → defaults
      return AivoBranding.defaults();
    } finally {
      if (shouldClose) client.close();
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  THEME CONVERSION
  // ══════════════════════════════════════════════════════════════════════════

  /// Convert this branding to a [AivoColors] theme extension.
  ///
  /// This integrates directly with the existing flutter_common AivoColors
  /// extension, so widgets using `context.aivoColors` work seamlessly.
  AivoColors toAivoColors() {
    return AivoColors(
      primary: colorPrimary,
      secondary: colorSecondary,
      accent: colorAccent,
      background: colorBackground,
      surface: colorSurface,
      surfaceVariant: colorSurface, // map to same as surface
      textPrimary: colorText,
      textSecondary: colorMuted,
      error: const Color(0xFFEF4444), // red-500 (consistent fallback)
      success: const Color(0xFF22C55E), // green-500
      warning: const Color(0xFFF59E0B), // amber-500
      info: const Color(0xFF3B82F6), // blue-500
      outline: colorBorder,
      coral: colorSecondary, // map secondary → coral slot
      mint: const Color(0xFF22C55E),
      sunshine: const Color(0xFFF59E0B),
      sky: const Color(0xFF3B82F6),
    );
  }

  /// Convert this branding to a complete Material 3 [ThemeData].
  ///
  /// Integrates the branding colours into Material's ColorScheme and
  /// attaches [AivoColors] as a theme extension for custom slot access.
  ///
  /// [baseTheme] — optional base theme to merge with (e.g. grade-band
  ///   theme from `themeForBand()`). If provided, only colours and
  ///   extensions are overridden; typography/component themes are kept.
  ThemeData toThemeData({ThemeData? baseTheme}) {
    final aivoColors = toAivoColors();

    final colorScheme = ColorScheme.light(
      primary: colorPrimary,
      onPrimary: colorTextOnPrimary,
      primaryContainer: colorPrimary.withOpacity(0.1),
      onPrimaryContainer: colorPrimary,
      secondary: colorSecondary,
      onSecondary: colorTextOnPrimary,
      secondaryContainer: colorSecondary.withOpacity(0.1),
      onSecondaryContainer: colorSecondary,
      tertiary: colorAccent,
      onTertiary: colorTextOnPrimary,
      error: const Color(0xFFEF4444),
      onError: Colors.white,
      surface: colorSurface,
      onSurface: colorText,
      onSurfaceVariant: colorMuted,
      outline: colorBorder,
    );

    if (baseTheme != null) {
      // Merge: keep base typography/component themes, override colours
      return baseTheme.copyWith(
        colorScheme: colorScheme,
        scaffoldBackgroundColor: colorBackground,
        extensions: [aivoColors],
        appBarTheme: baseTheme.appBarTheme.copyWith(
          backgroundColor: colorSurface,
          foregroundColor: colorText,
        ),
      );
    }

    // Standalone theme (no base)
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.light,
      colorScheme: colorScheme,
      scaffoldBackgroundColor: colorBackground,
      extensions: [aivoColors],
      appBarTheme: AppBarTheme(
        backgroundColor: colorSurface,
        foregroundColor: colorText,
        centerTitle: true,
        elevation: 0,
        surfaceTintColor: Colors.transparent,
      ),
      cardTheme: CardThemeData(
        color: colorSurface,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(_parseBorderRadius()),
          side: BorderSide(color: colorBorder),
        ),
        surfaceTintColor: Colors.transparent,
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: colorPrimary,
          foregroundColor: colorTextOnPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_parseBorderRadius()),
          ),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
          elevation: 0,
        ),
      ),
      outlinedButtonTheme: OutlinedButtonThemeData(
        style: OutlinedButton.styleFrom(
          foregroundColor: colorPrimary,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(_parseBorderRadius()),
          ),
          side: BorderSide(color: colorBorder, width: 1.5),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        ),
      ),
      inputDecorationTheme: InputDecorationTheme(
        filled: true,
        fillColor: colorSurface,
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_parseBorderRadius()),
          borderSide: BorderSide.none,
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_parseBorderRadius()),
          borderSide: BorderSide(color: colorBorder),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(_parseBorderRadius()),
          borderSide: BorderSide(color: colorPrimary, width: 2),
        ),
        contentPadding:
            const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
      ),
      dividerTheme: DividerThemeData(color: colorBorder, thickness: 1),
      progressIndicatorTheme: ProgressIndicatorThemeData(
        color: colorPrimary,
        linearTrackColor: colorPrimary.withOpacity(0.1),
      ),
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  COPY WITH
  // ══════════════════════════════════════════════════════════════════════════

  /// Create a copy with overridden fields.
  AivoBranding copyWith({
    String? displayName,
    String? logoUrl,
    String? logoSmallUrl,
    String? faviconUrl,
    Color? colorPrimary,
    Color? colorSecondary,
    Color? colorAccent,
    Color? colorBackground,
    Color? colorSurface,
    Color? colorText,
    Color? colorTextOnPrimary,
    Color? colorMuted,
    Color? colorBorder,
    String? fontFamily,
    String? borderRadius,
    String? loginBackgroundUrl,
    String? loginMessage,
    String? supportEmail,
    String? supportUrl,
    String? privacyPolicyUrl,
    String? termsOfServiceUrl,
  }) {
    return AivoBranding(
      displayName: displayName ?? this.displayName,
      logoUrl: logoUrl ?? this.logoUrl,
      logoSmallUrl: logoSmallUrl ?? this.logoSmallUrl,
      faviconUrl: faviconUrl ?? this.faviconUrl,
      colorPrimary: colorPrimary ?? this.colorPrimary,
      colorSecondary: colorSecondary ?? this.colorSecondary,
      colorAccent: colorAccent ?? this.colorAccent,
      colorBackground: colorBackground ?? this.colorBackground,
      colorSurface: colorSurface ?? this.colorSurface,
      colorText: colorText ?? this.colorText,
      colorTextOnPrimary: colorTextOnPrimary ?? this.colorTextOnPrimary,
      colorMuted: colorMuted ?? this.colorMuted,
      colorBorder: colorBorder ?? this.colorBorder,
      fontFamily: fontFamily ?? this.fontFamily,
      borderRadius: borderRadius ?? this.borderRadius,
      loginBackgroundUrl: loginBackgroundUrl ?? this.loginBackgroundUrl,
      loginMessage: loginMessage ?? this.loginMessage,
      supportEmail: supportEmail ?? this.supportEmail,
      supportUrl: supportUrl ?? this.supportUrl,
      privacyPolicyUrl: privacyPolicyUrl ?? this.privacyPolicyUrl,
      termsOfServiceUrl: termsOfServiceUrl ?? this.termsOfServiceUrl,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  /// Parse a CSS border-radius value (e.g. "0.5rem", "8px") to pixels.
  double _parseBorderRadius() {
    final clean = borderRadius.trim().toLowerCase();

    // rem → multiply by 16
    if (clean.endsWith('rem')) {
      return (double.tryParse(clean.replaceAll('rem', '')) ?? 0.5) * 16;
    }

    // px → direct
    if (clean.endsWith('px')) {
      return double.tryParse(clean.replaceAll('px', '')) ?? 8;
    }

    // bare number
    return double.tryParse(clean) ?? 8;
  }

  /// Parse a hex colour string to a [Color].
  static Color _parseColor(String? hex, String fallback) {
    final raw = hex ?? fallback;
    final clean = raw.replaceAll('#', '').trim();

    if (clean.length == 6) {
      final intValue = int.tryParse(clean, radix: 16);
      if (intValue != null) return Color(0xFF000000 | intValue);
    }

    if (clean.length == 8) {
      final intValue = int.tryParse(clean, radix: 16);
      if (intValue != null) return Color(intValue);
    }

    // Last resort → parse fallback
    final fb = fallback.replaceAll('#', '');
    return Color(0xFF000000 | (int.tryParse(fb, radix: 16) ?? 0x6366F1));
  }

  /// Convert a [Color] to a hex string (#RRGGBB).
  static String _colorToHex(Color color) {
    // ignore: deprecated_member_use
    final r = (color.red).toRadixString(16).padLeft(2, '0');
    // ignore: deprecated_member_use
    final g = (color.green).toRadixString(16).padLeft(2, '0');
    // ignore: deprecated_member_use
    final b = (color.blue).toRadixString(16).padLeft(2, '0');
    return '#$r$g$b'.toUpperCase();
  }
}
