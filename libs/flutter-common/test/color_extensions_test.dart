import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_common/theme/color_extensions.dart';

void main() {
  group('ColorShades Extension', () {
    group('shade generation', () {
      test('shade500 returns the original color', () {
        const color = Color(0xFF10B981); // mint green
        expect(color.shade500, equals(color));
      });

      test('shade50 is lighter than the original', () {
        const color = Color(0xFF10B981);
        final shade50 = color.shade50;

        final originalLuminance = color.computeLuminance();
        final shade50Luminance = shade50.computeLuminance();

        expect(shade50Luminance, greaterThan(originalLuminance));
      });

      test('shade900 is darker than the original', () {
        const color = Color(0xFF10B981);
        final shade900 = color.shade900;

        final originalLuminance = color.computeLuminance();
        final shade900Luminance = shade900.computeLuminance();

        expect(shade900Luminance, lessThan(originalLuminance));
      });

      test('shades are in correct luminance order (light to dark)', () {
        const color = Color(0xFF7C3AED); // purple

        final shades = [
          color.shade50,
          color.shade100,
          color.shade200,
          color.shade300,
          color.shade400,
          color.shade500,
          color.shade600,
          color.shade700,
          color.shade800,
          color.shade900,
        ];

        for (int i = 0; i < shades.length - 1; i++) {
          final currentLuminance = shades[i].computeLuminance();
          final nextLuminance = shades[i + 1].computeLuminance();

          expect(
            currentLuminance,
            greaterThanOrEqualTo(nextLuminance),
            reason:
                'shade${[50, 100, 200, 300, 400, 500, 600, 700, 800, 900][i]} '
                'should be lighter than or equal to '
                'shade${[50, 100, 200, 300, 400, 500, 600, 700, 800, 900][i + 1]}',
          );
        }
      });

      test('shade100 is suitable for light backgrounds', () {
        const color = Color(0xFFEF4444); // red
        final shade100 = color.shade100;

        // shade100 should be light enough to be a background color
        expect(shade100.computeLuminance(), greaterThan(0.7));
      });

      test('shade700-900 have readable contrast against white text', () {
        const color = Color(0xFF0EA5E9); // sky blue

        final shade700 = color.shade700;
        final shade800 = color.shade800;
        final shade900 = color.shade900;

        // These should be dark enough for white text
        expect(shade700.computeLuminance(), lessThan(0.4));
        expect(shade800.computeLuminance(), lessThan(0.3));
        expect(shade900.computeLuminance(), lessThan(0.2));
      });
    });

    group('shade() method', () {
      test('returns correct shade for valid values', () {
        const color = Color(0xFF10B981);

        expect(color.shade(50), equals(color.shade50));
        expect(color.shade(100), equals(color.shade100));
        expect(color.shade(200), equals(color.shade200));
        expect(color.shade(300), equals(color.shade300));
        expect(color.shade(400), equals(color.shade400));
        expect(color.shade(500), equals(color.shade500));
        expect(color.shade(600), equals(color.shade600));
        expect(color.shade(700), equals(color.shade700));
        expect(color.shade(800), equals(color.shade800));
        expect(color.shade(900), equals(color.shade900));
      });

      test('throws ArgumentError for invalid shade values', () {
        const color = Color(0xFF10B981);

        expect(() => color.shade(0), throwsArgumentError);
        expect(() => color.shade(150), throwsArgumentError);
        expect(() => color.shade(1000), throwsArgumentError);
        expect(() => color.shade(-100), throwsArgumentError);
      });
    });

    group('toMaterialColor()', () {
      test('creates a valid MaterialColor', () {
        const color = Color(0xFF7C3AED);
        final materialColor = color.toMaterialColor();

        expect(materialColor, isA<MaterialColor>());
        expect(materialColor.value, equals(color.value));
      });

      test('MaterialColor contains all shades', () {
        const color = Color(0xFF7C3AED);
        final materialColor = color.toMaterialColor();

        expect(materialColor[50], isNotNull);
        expect(materialColor[100], isNotNull);
        expect(materialColor[200], isNotNull);
        expect(materialColor[300], isNotNull);
        expect(materialColor[400], isNotNull);
        expect(materialColor[500], equals(color));
        expect(materialColor[600], isNotNull);
        expect(materialColor[700], isNotNull);
        expect(materialColor[800], isNotNull);
        expect(materialColor[900], isNotNull);
      });
    });

    group('contrastColor', () {
      test('returns white for dark colors', () {
        const darkColor = Color(0xFF1A1A2E); // navy
        expect(darkColor.contrastColor, equals(Colors.white));
      });

      test('returns dark color for light colors', () {
        const lightColor = Color(0xFFF5F3FF); // light purple
        expect(lightColor.contrastColor, equals(const Color(0xFF18181B)));
      });

      test('returns appropriate contrast for mid-tone colors', () {
        const midColor = Color(0xFF7C3AED); // purple 600
        // Purple 600 is dark enough that white text should be used
        expect(midColor.contrastColor, equals(Colors.white));
      });
    });

    group('color consistency', () {
      test('shade generation preserves hue approximately', () {
        const color = Color(0xFF10B981); // mint (hue ~160)
        final originalHsl = HSLColor.fromColor(color);

        final shade100Hsl = HSLColor.fromColor(color.shade100);
        final shade700Hsl = HSLColor.fromColor(color.shade700);

        // Hue should be preserved (within small tolerance for rounding)
        expect(
          (shade100Hsl.hue - originalHsl.hue).abs(),
          lessThan(5),
          reason: 'shade100 hue should be close to original',
        );
        expect(
          (shade700Hsl.hue - originalHsl.hue).abs(),
          lessThan(5),
          reason: 'shade700 hue should be close to original',
        );
      });

      test('works with grayscale colors', () {
        const gray = Color(0xFF71717A);

        // Should not throw and should produce valid shades
        expect(() => gray.shade100, returnsNormally);
        expect(() => gray.shade900, returnsNormally);

        expect(gray.shade100.computeLuminance(), greaterThan(gray.computeLuminance()));
        expect(gray.shade900.computeLuminance(), lessThan(gray.computeLuminance()));
      });

      test('works with pure white', () {
        const white = Color(0xFFFFFFFF);

        // shade500 should still be white
        expect(white.shade500, equals(white));

        // Darker shades should be progressively darker
        expect(white.shade700.computeLuminance(), lessThan(white.computeLuminance()));
        expect(white.shade900.computeLuminance(), lessThan(white.shade700.computeLuminance()));
      });

      test('works with pure black', () {
        const black = Color(0xFF000000);

        // shade500 should still be black
        expect(black.shade500, equals(black));

        // Lighter shades should be progressively lighter
        expect(black.shade100.computeLuminance(), greaterThan(black.computeLuminance()));
        expect(black.shade50.computeLuminance(), greaterThan(black.shade100.computeLuminance()));
      });
    });

    group('AivoBrand colors integration', () {
      test('success color shades work correctly', () {
        const success = Color(0xFF10B981); // AivoBrand.success

        expect(success.shade100.computeLuminance(), greaterThan(0.7));
        expect(success.shade700.computeLuminance(), lessThan(0.3));
      });

      test('warning color shades work correctly', () {
        const warning = Color(0xFFFBBF24); // AivoBrand.warning

        expect(warning.shade100.computeLuminance(), greaterThan(0.7));
        expect(warning.shade700.computeLuminance(), lessThan(0.5));
      });

      test('error color shades work correctly', () {
        const error = Color(0xFFEF4444); // AivoBrand.danger

        expect(error.shade100.computeLuminance(), greaterThan(0.7));
        expect(error.shade900.computeLuminance(), lessThan(0.2));
      });
    });
  });
}
