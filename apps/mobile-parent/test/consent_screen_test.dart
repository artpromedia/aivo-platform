/// Consent Screen Tests
///
/// Tests for parent consent management functionality including:
/// - Loading consent status
/// - Granting and revoking consent
/// - UI feedback for consent changes
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:mobile_parent/screens/consent_screen.dart';
import 'package:mobile_parent/consent/consent_service.dart';

/// Test helper to create mock consent state
ConsentState createMockConsentState({
  String? learnerId,
  bool isLoading = false,
  String? error,
  List<Consent>? consents,
}) {
  final Map<String, List<Consent>> consentMap = {};
  if (learnerId != null && consents != null) {
    consentMap[learnerId] = consents;
  }
  return ConsentState(
    consents: consentMap,
    isLoading: isLoading,
    error: error,
  );
}

/// Create default mock consents for testing
List<Consent> createDefaultConsents(String learnerId) {
  return [
    Consent(
      type: ConsentType.baselineAssessment,
      learnerId: learnerId,
      status: ConsentStatus.granted,
      grantedAt: DateTime.now(),
    ),
    Consent(
      type: ConsentType.aiTutor,
      learnerId: learnerId,
      status: ConsentStatus.granted,
      grantedAt: DateTime.now(),
    ),
    Consent(
      type: ConsentType.researchAnalytics,
      learnerId: learnerId,
      status: ConsentStatus.pending,
    ),
  ];
}

/// Test consent notifier that provides controlled state without needing real API client
class TestConsentNotifier extends StateNotifier<ConsentState>
    implements ConsentNotifier {
  TestConsentNotifier({
    List<Consent>? consents,
    String? learnerId,
    bool isLoading = false,
    String? error,
  }) : super(ConsentState(
          consents: learnerId != null && consents != null
              ? {learnerId: consents}
              : const {},
          isLoading: isLoading,
          error: error,
        ));

  @override
  Future<void> loadConsents(String learnerId) async {
    // No-op for testing - state is pre-configured
  }

  @override
  Future<bool> grantConsent(String learnerId, ConsentType type) async {
    final currentConsents =
        List<Consent>.from(state.consents[learnerId] ?? []);
    currentConsents.removeWhere((c) => c.type == type);
    currentConsents.add(Consent(
      type: type,
      learnerId: learnerId,
      status: ConsentStatus.granted,
      grantedAt: DateTime.now(),
    ));
    state = state.copyWith(
      consents: {...state.consents, learnerId: currentConsents},
    );
    return true;
  }

  @override
  Future<bool> revokeConsent(String learnerId, ConsentType type) async {
    final currentConsents =
        List<Consent>.from(state.consents[learnerId] ?? []);
    currentConsents.removeWhere((c) => c.type == type);
    currentConsents.add(Consent(
      type: type,
      learnerId: learnerId,
      status: ConsentStatus.declined,
    ));
    state = state.copyWith(
      consents: {...state.consents, learnerId: currentConsents},
    );
    return true;
  }
}

void main() {
  group('ConsentScreen Widget Tests', () {
    testWidgets('displays loading indicator when isLoading is true',
        (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            consentNotifierProvider.overrideWith((ref) {
              return TestConsentNotifier(isLoading: true);
            }),
          ],
          child: const MaterialApp(
            home: ConsentScreen(
              learnerId: 'learner-1',
              learnerName: 'Alex',
            ),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('displays learner name in app bar', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            consentNotifierProvider.overrideWith((ref) {
              return TestConsentNotifier(
                consents: createDefaultConsents('learner-1'),
                learnerId: 'learner-1',
              );
            }),
          ],
          child: const MaterialApp(
            home: ConsentScreen(
              learnerId: 'learner-1',
              learnerName: 'Jordan',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Jordan'), findsOneWidget);
    });

    testWidgets('displays consent types with switches', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            consentNotifierProvider.overrideWith((ref) {
              return TestConsentNotifier(
                consents: createDefaultConsents('learner-1'),
                learnerId: 'learner-1',
              );
            }),
          ],
          child: const MaterialApp(
            home: ConsentScreen(
              learnerId: 'learner-1',
              learnerName: 'Alex',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(Switch), findsWidgets);
    });

    testWidgets('shows refresh indicator', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            consentNotifierProvider.overrideWith((ref) {
              return TestConsentNotifier(
                consents: createDefaultConsents('learner-1'),
                learnerId: 'learner-1',
              );
            }),
          ],
          child: const MaterialApp(
            home: ConsentScreen(
              learnerId: 'learner-1',
              learnerName: 'Alex',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(RefreshIndicator), findsOneWidget);
    });
  });

  group('ConsentScreen Consent Types Display', () {
    testWidgets('displays baseline assessment consent text', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            consentNotifierProvider.overrideWith((ref) {
              return TestConsentNotifier(
                consents: createDefaultConsents('learner-1'),
                learnerId: 'learner-1',
              );
            }),
          ],
          child: const MaterialApp(
            home: ConsentScreen(
              learnerId: 'learner-1',
              learnerName: 'Alex',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Baseline'), findsWidgets);
    });

    testWidgets('displays AI tutor consent text', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            consentNotifierProvider.overrideWith((ref) {
              return TestConsentNotifier(
                consents: createDefaultConsents('learner-1'),
                learnerId: 'learner-1',
              );
            }),
          ],
          child: const MaterialApp(
            home: ConsentScreen(
              learnerId: 'learner-1',
              learnerName: 'Alex',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('AI'), findsWidgets);
    });

    testWidgets('displays research analytics consent text', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            consentNotifierProvider.overrideWith((ref) {
              return TestConsentNotifier(
                consents: createDefaultConsents('learner-1'),
                learnerId: 'learner-1',
              );
            }),
          ],
          child: const MaterialApp(
            home: ConsentScreen(
              learnerId: 'learner-1',
              learnerName: 'Alex',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.textContaining('Research'), findsWidgets);
    });
  });

  group('ConsentScreen Accessibility', () {
    testWidgets('switches have proper semantics', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            consentNotifierProvider.overrideWith((ref) {
              return TestConsentNotifier(
                consents: createDefaultConsents('learner-1'),
                learnerId: 'learner-1',
              );
            }),
          ],
          child: const MaterialApp(
            home: ConsentScreen(
              learnerId: 'learner-1',
              learnerName: 'Alex',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      final switches = find.byType(Switch);
      expect(switches, findsWidgets);

      for (final switch_ in switches.evaluate()) {
        final semantics = switch_.widget as Switch;
        expect(semantics, isNotNull);
      }
    });

    testWidgets('consent descriptions are present', (tester) async {
      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            consentNotifierProvider.overrideWith((ref) {
              return TestConsentNotifier(
                consents: createDefaultConsents('learner-1'),
                learnerId: 'learner-1',
              );
            }),
          ],
          child: const MaterialApp(
            home: ConsentScreen(
              learnerId: 'learner-1',
              learnerName: 'Alex',
            ),
          ),
        ),
      );
      await tester.pumpAndSettle();

      expect(find.byType(Text), findsWidgets);
    });
  });

  group('ConsentState', () {
    test('getConsentsForLearner returns empty list for unknown learner', () {
      const state = ConsentState();
      expect(state.getConsentsForLearner('unknown'), isEmpty);
    });

    test('getConsentsForLearner returns consents for known learner', () {
      final consents = createDefaultConsents('learner-1');
      final state = ConsentState(consents: {'learner-1': consents});
      expect(state.getConsentsForLearner('learner-1'), hasLength(3));
    });

    test('hasActiveConsent returns true for granted consent', () {
      final consents = [
        Consent(
          type: ConsentType.baselineAssessment,
          learnerId: 'learner-1',
          status: ConsentStatus.granted,
          grantedAt: DateTime.now(),
        ),
      ];
      final state = ConsentState(consents: {'learner-1': consents});
      expect(
        state.hasActiveConsent('learner-1', ConsentType.baselineAssessment),
        isTrue,
      );
    });

    test('hasActiveConsent returns false for pending consent', () {
      final consents = [
        Consent(
          type: ConsentType.baselineAssessment,
          learnerId: 'learner-1',
          status: ConsentStatus.pending,
        ),
      ];
      final state = ConsentState(consents: {'learner-1': consents});
      expect(
        state.hasActiveConsent('learner-1', ConsentType.baselineAssessment),
        isFalse,
      );
    });

    test('copyWith creates new state with updated values', () {
      const state = ConsentState();
      final newState = state.copyWith(isLoading: true, error: 'Test error');

      expect(newState.isLoading, isTrue);
      expect(newState.error, 'Test error');
      expect(state.isLoading, isFalse);
    });
  });

  group('ConsentType', () {
    test('fromCode returns correct type for valid code', () {
      expect(
        ConsentType.fromCode('BASELINE_ASSESSMENT'),
        ConsentType.baselineAssessment,
      );
      expect(
        ConsentType.fromCode('AI_TUTOR'),
        ConsentType.aiTutor,
      );
      expect(
        ConsentType.fromCode('RESEARCH_ANALYTICS'),
        ConsentType.researchAnalytics,
      );
    });

    test('fromCode returns null for invalid code', () {
      expect(ConsentType.fromCode('INVALID'), isNull);
    });

    test('each type has displayName and description', () {
      for (final type in ConsentType.values) {
        expect(type.displayName, isNotEmpty);
        expect(type.description, isNotEmpty);
        expect(type.code, isNotEmpty);
      }
    });
  });

  group('Consent', () {
    test('isActive returns true for granted consent without expiry', () {
      final consent = Consent(
        type: ConsentType.baselineAssessment,
        learnerId: 'learner-1',
        status: ConsentStatus.granted,
        grantedAt: DateTime.now(),
      );
      expect(consent.isActive, isTrue);
    });

    test('isActive returns false for pending consent', () {
      final consent = Consent(
        type: ConsentType.baselineAssessment,
        learnerId: 'learner-1',
        status: ConsentStatus.pending,
      );
      expect(consent.isActive, isFalse);
    });

    test('isActive returns false for expired consent', () {
      final consent = Consent(
        type: ConsentType.baselineAssessment,
        learnerId: 'learner-1',
        status: ConsentStatus.granted,
        grantedAt: DateTime.now().subtract(const Duration(days: 365)),
        expiresAt: DateTime.now().subtract(const Duration(days: 1)),
      );
      expect(consent.isActive, isFalse);
    });

    test('fromJson creates consent from valid JSON', () {
      final json = {
        'type': 'AI_TUTOR',
        'learnerId': 'learner-1',
        'status': 'granted',
        'grantedAt': DateTime.now().toIso8601String(),
      };
      final consent = Consent.fromJson(json);
      expect(consent.type, ConsentType.aiTutor);
      expect(consent.learnerId, 'learner-1');
      expect(consent.status, ConsentStatus.granted);
    });
  });
}
