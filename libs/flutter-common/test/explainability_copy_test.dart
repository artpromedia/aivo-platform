import 'dart:convert';
import 'dart:io';

import 'package:flutter_test/flutter_test.dart';

/// Banned phrases that should never appear in user-facing copy.
/// These are phrases that are negative, diagnostic, fear-inducing,
/// or use absolutist negative language.
final List<String> bannedPhrases = [
  // Negative labels
  'lazy',
  'bad student',
  'stupid',
  'dumb',
  'slow learner',
  'not smart',
  'incapable',
  'hopeless',
  'worthless',

  // Comparative judgments
  'behind others',
  'behind grade level',
  'below average',
  'worse than',
  'failing compared',
  'not keeping up',
  'falling behind',
  'lagging',

  // Diagnostic language
  'has adhd',
  'has add',
  'is autistic',
  'is dyslexic',
  'learning disabled',
  'mentally',
  'disorder',
  'deficit',
  'syndrome',
  'diagnosis',
  'diagnosed with',
  'suffers from',

  // Fear-inducing
  'urgent action required',
  'critical failure',
  'emergency',
  'danger',
  'crisis',
  'severe',
  'alarming',

  // Absolutist negative
  "can't learn",
  "won't ever",
  'impossible for',
  'never able',
  'always fails',
  'always struggles',
];

/// Extracts all string values from ARB JSON, excluding metadata keys
/// (those starting with @ or @@)
List<MapEntry<String, String>> extractArbStrings(Map<String, dynamic> arb) {
  final List<MapEntry<String, String>> strings = [];

  for (final entry in arb.entries) {
    // Skip metadata keys
    if (entry.key.startsWith('@')) continue;

    if (entry.value is String) {
      strings.add(MapEntry(entry.key, entry.value as String));
    }
  }

  return strings;
}

/// Checks if a string contains any banned phrase (case-insensitive)
List<String> findBannedPhrases(String text) {
  final lowerText = text.toLowerCase();
  return bannedPhrases
      .where((phrase) => lowerText.contains(phrase.toLowerCase()))
      .toList();
}

void main() {
  group('Explainability Copy Lint Tests', () {
    late Map<String, dynamic> arbContent;

    setUpAll(() async {
      // Read the ARB file
      final arbFile = File('lib/l10n/app_en_explainability.arb');
      if (await arbFile.exists()) {
        final content = await arbFile.readAsString();
        arbContent = jsonDecode(content) as Map<String, dynamic>;
      } else {
        throw Exception('ARB file not found: ${arbFile.path}');
      }
    });

    test('ARB file should contain no banned phrases', () {
      final strings = extractArbStrings(arbContent);
      final violations = <String>[];

      for (final entry in strings) {
        final found = findBannedPhrases(entry.value);
        if (found.isNotEmpty) {
          violations.add(
            '  - ${entry.key}: contains [${found.join(', ')}]\n    "${entry.value}"',
          );
        }
      }

      if (violations.isNotEmpty) {
        fail('Found banned phrases in ARB file:\n${violations.join('\n')}');
      }
    });

    test('ARB file should have expected structure', () {
      expect(arbContent['@@locale'], equals('en'));
      expect(arbContent['@@context'], isNotNull);
    });

    test('ARB file should have required keys', () {
      // Core keys that must exist
      final requiredKeys = [
        'whyThisTitleActivity',
        'whyThisFallbackNoDetails',
        'disclaimerAiLimits',
        'disclaimerNotDiagnostic',
        'emptyStateNoActivity',
        'errorLoadFailed',
        'errorGeneric',
      ];

      for (final key in requiredKeys) {
        expect(
          arbContent.containsKey(key),
          isTrue,
          reason: 'Missing required key: $key',
        );
      }
    });

    test('Difficulty descriptions should use growth language', () {
      final difficultyKeys = arbContent.keys
          .where((key) =>
              key.toLowerCase().contains('difficulty') && !key.startsWith('@'))
          .toList();

      // These words should not appear in difficulty descriptions
      final negativeWords = [
        'struggle',
        'fail',
        'problem',
        'wrong',
        'mistake',
        'weak'
      ];

      for (final key in difficultyKeys) {
        final value = arbContent[key] as String;
        final lowerValue = value.toLowerCase();

        for (final negWord in negativeWords) {
          expect(
            lowerValue.contains(negWord),
            isFalse,
            reason:
                'Difficulty key "$key" contains negative word "$negWord": $value',
          );
        }
      }
    });

    test('Error messages should not blame the user', () {
      final errorKeys = arbContent.keys
          .where(
              (key) => key.toLowerCase().contains('error') && !key.startsWith('@'))
          .toList();

      final blamingWords = [
        'your fault',
        'you broke',
        'you caused',
        'user error'
      ];

      for (final key in errorKeys) {
        final value = arbContent[key] as String;
        final lowerValue = value.toLowerCase();

        for (final blameWord in blamingWords) {
          expect(
            lowerValue.contains(blameWord),
            isFalse,
            reason: 'Error key "$key" blames user with "$blameWord": $value',
          );
        }
      }
    });

    test('Disclaimers should mention AI limitations honestly', () {
      final disclaimerKeys = arbContent.keys
          .where((key) =>
              key.toLowerCase().contains('disclaimer') && !key.startsWith('@'))
          .toList();

      expect(disclaimerKeys, isNotEmpty, reason: 'No disclaimer keys found');

      // At least one disclaimer should mention limitations
      final limitationWords = ['not', 'limit', 'may', 'mistake', 'cannot'];
      bool hasLimitationLanguage = false;

      for (final key in disclaimerKeys) {
        final value = (arbContent[key] as String).toLowerCase();
        if (limitationWords.any((word) => value.contains(word))) {
          hasLimitationLanguage = true;
          break;
        }
      }

      expect(
        hasLimitationLanguage,
        isTrue,
        reason: 'Disclaimers should mention AI limitations',
      );
    });

    test('Disclaimers should not use fear-inducing language', () {
      final disclaimerKeys = arbContent.keys
          .where((key) =>
              key.toLowerCase().contains('disclaimer') && !key.startsWith('@'))
          .toList();

      final fearWords = [
        'dangerous',
        'harmful',
        'risky',
        'threat',
        'warning',
        'beware'
      ];

      for (final key in disclaimerKeys) {
        final value = arbContent[key] as String;
        final lowerValue = value.toLowerCase();

        for (final fearWord in fearWords) {
          expect(
            lowerValue.contains(fearWord),
            isFalse,
            reason:
                'Disclaimer key "$key" contains fear word "$fearWord": $value',
          );
        }
      }
    });

    test('Partnership language should be present', () {
      // Check for partnership indicators in disclaimers
      final disclaimerValues = arbContent.entries
          .where((e) =>
              e.key.toLowerCase().contains('disclaimer') &&
              !e.key.startsWith('@'))
          .map((e) => (e.value as String).toLowerCase())
          .toList();

      final partnershipIndicators = [
        'you know',
        'your',
        'combined with',
        'together'
      ];

      bool hasPartnership = false;
      for (final value in disclaimerValues) {
        if (partnershipIndicators.any((indicator) => value.contains(indicator))) {
          hasPartnership = true;
          break;
        }
      }

      expect(
        hasPartnership,
        isTrue,
        reason: 'Disclaimers should include partnership language',
      );
    });
  });

  group('ExplainabilityCopy Dart Class Tests', () {
    // Note: These tests would typically test the ExplainabilityCopy class
    // but since it requires a BuildContext with localization, we focus
    // on the static/structural aspects here.
    // Full widget tests are in why_this_test.dart

    test('Banned phrases list is comprehensive', () {
      // Ensure our banned phrases list covers all categories
      expect(bannedPhrases.where((p) => p.contains('lazy')).isNotEmpty, isTrue);
      expect(bannedPhrases.where((p) => p.contains('behind')).isNotEmpty, isTrue);
      expect(bannedPhrases.where((p) => p.contains('disorder')).isNotEmpty, isTrue);
      expect(bannedPhrases.where((p) => p.contains('danger')).isNotEmpty, isTrue);
      expect(bannedPhrases.where((p) => p.contains("can't")).isNotEmpty, isTrue);
    });
  });
}
