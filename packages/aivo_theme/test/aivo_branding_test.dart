import 'package:aivo_theme/aivo_theme.dart';
import 'package:flutter/material.dart';
import 'package:flutter_common/theme/aivo_theme.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('AivoBranding', () {
    test('defaults() returns correct AIVO branding', () {
      final branding = AivoBranding.defaults();

      expect(branding.displayName, 'Aivo Learning');
      expect(branding.colorPrimary, const Color(0xFF6366F1));
      expect(branding.colorSecondary, const Color(0xFF8B5CF6));
      expect(branding.colorAccent, const Color(0xFFF59E0B));
      expect(branding.colorBackground, const Color(0xFFFFFFFF));
      expect(branding.colorSurface, const Color(0xFFF8FAFC));
      expect(branding.colorText, const Color(0xFF0F172A));
      expect(branding.colorTextOnPrimary, const Color(0xFFFFFFFF));
      expect(branding.colorMuted, const Color(0xFF64748B));
      expect(branding.colorBorder, const Color(0xFFE2E8F0));
      expect(branding.fontFamily, 'DM Sans');
      expect(branding.borderRadius, '0.5rem');
      expect(branding.logoUrl, isNull);
      expect(branding.loginMessage, isNull);
    });

    test('fromJson() parses API response correctly', () {
      final json = {
        'displayName': 'Acme Academy',
        'logoUrl': 'https://cdn.example.com/logo.png',
        'colorPrimary': '#FF5733',
        'colorSecondary': '#33FF57',
        'colorAccent': '#3357FF',
        'colorBackground': '#FAFAFA',
        'colorSurface': '#FFFFFF',
        'colorText': '#111111',
        'colorTextOnPrimary': '#FFFFFF',
        'colorMuted': '#888888',
        'colorBorder': '#DDDDDD',
        'fontFamily': 'Inter',
        'borderRadius': '12px',
        'loginMessage': 'Welcome to Acme!',
        'supportEmail': 'help@acme.com',
      };

      final branding = AivoBranding.fromJson(json);

      expect(branding.displayName, 'Acme Academy');
      expect(branding.logoUrl, 'https://cdn.example.com/logo.png');
      expect(branding.colorPrimary, const Color(0xFFFF5733));
      expect(branding.colorSecondary, const Color(0xFF33FF57));
      expect(branding.fontFamily, 'Inter');
      expect(branding.borderRadius, '12px');
      expect(branding.loginMessage, 'Welcome to Acme!');
      expect(branding.supportEmail, 'help@acme.com');
    });

    test('fromJson() uses defaults for missing fields', () {
      final branding = AivoBranding.fromJson({});

      expect(branding.displayName, 'Aivo Learning');
      expect(branding.colorPrimary, const Color(0xFF6366F1));
      expect(branding.fontFamily, 'DM Sans');
    });

    test('toJson() serializes correctly', () {
      final branding = AivoBranding.defaults();
      final json = branding.toJson();

      expect(json['displayName'], 'Aivo Learning');
      expect(json['colorPrimary'], '#6366F1');
      expect(json['fontFamily'], 'DM Sans');
      expect(json['borderRadius'], '0.5rem');
    });

    test('toJson() → fromJson() round-trips', () {
      final original = AivoBranding.defaults();
      final json = original.toJson();
      final restored = AivoBranding.fromJson(json);

      expect(restored.displayName, original.displayName);
      expect(restored.colorPrimary, original.colorPrimary);
      expect(restored.colorSecondary, original.colorSecondary);
      expect(restored.fontFamily, original.fontFamily);
    });

    test('copyWith() creates copy with overrides', () {
      final original = AivoBranding.defaults();
      final copy = original.copyWith(
        displayName: 'Custom School',
        colorPrimary: const Color(0xFFFF0000),
      );

      expect(copy.displayName, 'Custom School');
      expect(copy.colorPrimary, const Color(0xFFFF0000));
      // Unchanged fields
      expect(copy.colorSecondary, original.colorSecondary);
      expect(copy.fontFamily, original.fontFamily);
    });
  });

  group('AivoBranding → ThemeData', () {
    test('toThemeData() returns valid Material 3 theme', () {
      final branding = AivoBranding.defaults();
      final theme = branding.toThemeData();

      expect(theme.useMaterial3, isTrue);
      expect(theme.colorScheme.primary, const Color(0xFF6366F1));
      expect(theme.colorScheme.secondary, const Color(0xFF8B5CF6));
      expect(theme.colorScheme.tertiary, const Color(0xFFF59E0B));
      expect(theme.scaffoldBackgroundColor, const Color(0xFFFFFFFF));
    });

    test('toAivoColors() maps all colour slots', () {
      final branding = AivoBranding.defaults();
      final colors = branding.toAivoColors();

      expect(colors.primary, const Color(0xFF6366F1));
      expect(colors.secondary, const Color(0xFF8B5CF6));
      expect(colors.accent, const Color(0xFFF59E0B));
      expect(colors.background, const Color(0xFFFFFFFF));
      expect(colors.surface, const Color(0xFFF8FAFC));
      expect(colors.textPrimary, const Color(0xFF0F172A));
      expect(colors.textSecondary, const Color(0xFF64748B));
      expect(colors.outline, const Color(0xFFE2E8F0));
    });

    test('toThemeData() includes AivoColors extension', () {
      final branding = AivoBranding.defaults();
      final theme = branding.toThemeData();

      final aivoColors = theme.extension<AivoColors>();
      expect(aivoColors, isNotNull);
      expect(aivoColors!.primary, const Color(0xFF6366F1));
    });

    test('toThemeData() with baseTheme merges correctly', () {
      const branding = AivoBranding(
        displayName: 'Custom',
        colorPrimary: Color(0xFFFF0000),
        colorSecondary: Color(0xFF00FF00),
        colorAccent: Color(0xFF0000FF),
        colorBackground: Color(0xFFF0F0F0),
        colorSurface: Color(0xFFFFFFFF),
        colorText: Color(0xFF000000),
        colorTextOnPrimary: Color(0xFFFFFFFF),
        colorMuted: Color(0xFF888888),
        colorBorder: Color(0xFFCCCCCC),
        fontFamily: 'Roboto',
        borderRadius: '8px',
      );

      final baseTheme = ThemeData(
        useMaterial3: true,
        textTheme: const TextTheme(
          bodyLarge: TextStyle(fontSize: 18),
        ),
      );

      final merged = branding.toThemeData(baseTheme: baseTheme);

      // Branding colours applied
      expect(merged.colorScheme.primary, const Color(0xFFFF0000));
      expect(merged.scaffoldBackgroundColor, const Color(0xFFF0F0F0));

      // Base text theme preserved
      expect(merged.textTheme.bodyLarge?.fontSize, 18);

      // AivoColors extension present
      expect(merged.extension<AivoColors>(), isNotNull);
    });
  });

  group('AivoBrandingProvider', () {
    testWidgets('provides branding to descendants', (tester) async {
      final branding = AivoBranding.defaults().copyWith(
        displayName: 'Test Academy',
      );

      late AivoBranding resolved;

      await tester.pumpWidget(
        AivoBrandingProvider(
          branding: branding,
          child: Builder(
            builder: (context) {
              resolved = AivoBrandingProvider.of(context);
              return const SizedBox();
            },
          ),
        ),
      );

      expect(resolved.displayName, 'Test Academy');
    });

    testWidgets('context extension provides branding', (tester) async {
      final branding = AivoBranding.defaults().copyWith(
        displayName: 'Extension Test',
        logoUrl: 'https://example.com/logo.png',
      );

      late String name;
      late String? logo;

      await tester.pumpWidget(
        AivoBrandingProvider(
          branding: branding,
          child: Builder(
            builder: (context) {
              name = context.tenantName;
              logo = context.tenantLogoUrl;
              return const SizedBox();
            },
          ),
        ),
      );

      expect(name, 'Extension Test');
      expect(logo, 'https://example.com/logo.png');
    });

    testWidgets('of() returns defaults when no provider', (tester) async {
      late AivoBranding resolved;

      await tester.pumpWidget(
        Builder(
          builder: (context) {
            resolved = AivoBrandingProvider.of(context);
            return const SizedBox();
          },
        ),
      );

      expect(resolved.displayName, 'Aivo Learning');
    });
  });
}
