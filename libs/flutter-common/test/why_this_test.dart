import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:flutter_common/data/explanation.dart';
import 'package:flutter_common/widgets/why_this.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:mocktail/mocktail.dart';

/// Mock HTTP client for testing.
class MockHttpClient extends Mock implements http.Client {}

/// Mock HTTP response for testing.
class MockResponse extends Mock implements http.Response {}

/// A testable ExplanationService that uses a mock HTTP client.
class TestableExplanationService extends ExplanationService {
  final http.Client httpClient;

  TestableExplanationService({
    required super.baseUrl,
    required super.getAuthToken,
    required this.httpClient,
  });

  @override
  Future<ExplanationsResponse> getByEntity({
    required String relatedEntityType,
    required String relatedEntityId,
    String? learnerId,
    int limit = 3,
  }) async {
    final token = await getAuthToken();

    final queryParams = {
      'relatedEntityType': relatedEntityType,
      'relatedEntityId': relatedEntityId,
      if (learnerId != null) 'learnerId': learnerId,
      'limit': limit.toString(),
    };

    final uri = Uri.parse('$baseUrl/analytics/explanations/by-entity')
        .replace(queryParameters: queryParams);

    try {
      final response = await httpClient.get(
        uri,
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
      );

      if (response.statusCode == 200) {
        final json = jsonDecode(response.body) as Map<String, dynamic>;
        return ExplanationsResponse.fromJson(json);
      } else {
        // Return fallback on error
        return ExplanationsResponse(
          explanations: [_createFallbackExplanation(relatedEntityType, relatedEntityId)],
          hasFallback: true,
        );
      }
    } catch (e) {
      // Return fallback on network error
      return ExplanationsResponse(
        explanations: [_createFallbackExplanation(relatedEntityType, relatedEntityId)],
        hasFallback: true,
      );
    }
  }

  Explanation _createFallbackExplanation(String entityType, String entityId) {
    return Explanation(
      id: 'fallback',
      sourceType: 'SYSTEM',
      actionType: 'UNKNOWN',
      relatedEntityType: entityType,
      relatedEntityId: entityId,
      summary: "Aivo used your child's recent work and learning goals to pick this activity.",
      details: const ExplanationDetails(reasons: [], inputs: []),
      createdAt: DateTime.now(),
    );
  }
}

void main() {
  late MockHttpClient mockHttpClient;
  late TestableExplanationService explanationService;

  setUpAll(() {
    registerFallbackValue(Uri());
  });

  setUp(() {
    mockHttpClient = MockHttpClient();
    explanationService = TestableExplanationService(
      baseUrl: 'https://api.test.aivolearning.com',
      getAuthToken: () async => 'test-token',
      httpClient: mockHttpClient,
    );
  });

  group('WhyThisButton', () {
    testWidgets('renders subtle button with default label', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: WhyThisButton(
              entityType: 'LEARNING_OBJECT_VERSION',
              entityId: 'test-entity-123',
              explanationService: explanationService,
            ),
          ),
        ),
      );

      expect(find.text('Why this?'), findsOneWidget);
      expect(find.byIcon(Icons.info_outline), findsOneWidget);
    });

    testWidgets('renders with custom label', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: WhyThisButton(
              entityType: 'SKILL',
              entityId: 'skill-456',
              explanationService: explanationService,
              label: 'Learn more',
            ),
          ),
        ),
      );

      expect(find.text('Learn more'), findsOneWidget);
    });

    testWidgets('renders icon-only variant', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: WhyThisButton(
              entityType: 'MODULE',
              entityId: 'module-789',
              explanationService: explanationService,
              iconOnly: true,
            ),
          ),
        ),
      );

      expect(find.text('Why this?'), findsNothing);
      expect(find.byIcon(Icons.info_outline), findsOneWidget);
    });

    testWidgets('renders outlined style', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: WhyThisButton(
              entityType: 'LEARNING_OBJECT_VERSION',
              entityId: 'test-123',
              explanationService: explanationService,
              style: WhyThisButtonStyle.outlined,
            ),
          ),
        ),
      );

      expect(find.byType(OutlinedButton), findsOneWidget);
    });

    testWidgets('renders filled style', (tester) async {
      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: WhyThisButton(
              entityType: 'LEARNING_OBJECT_VERSION',
              entityId: 'test-123',
              explanationService: explanationService,
              style: WhyThisButtonStyle.filled,
            ),
          ),
        ),
      );

      expect(find.byType(FilledButton), findsOneWidget);
    });

    testWidgets('opens bottom sheet when tapped', (tester) async {
      // Setup mock response
      when(() => mockHttpClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer((_) async => http.Response(
            jsonEncode({
              'explanations': [
                {
                  'id': 'exp-1',
                  'sourceType': 'VIRTUAL_BRAIN',
                  'actionType': 'CONTENT_SELECTION',
                  'relatedEntityType': 'LEARNING_OBJECT_VERSION',
                  'relatedEntityId': 'test-entity-123',
                  'summary': 'This was chosen based on your reading level.',
                  'details': {
                    'reasons': [
                      {'label': 'Matches current skills', 'description': 'Good skill alignment'}
                    ],
                    'inputs': []
                  },
                  'createdAt': DateTime.now().toIso8601String(),
                }
              ],
              'hasFallback': false,
            }),
            200,
          ));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: WhyThisButton(
              entityType: 'LEARNING_OBJECT_VERSION',
              entityId: 'test-entity-123',
              explanationService: explanationService,
            ),
          ),
        ),
      );

      await tester.tap(find.text('Why this?'));
      await tester.pumpAndSettle();

      expect(find.text('Why Aivo chose this'), findsOneWidget);
    });
  });

  group('ExplanationBottomSheet', () {
    testWidgets('shows loading indicator while fetching', (tester) async {
      // Setup mock to delay response
      when(() => mockHttpClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer(
        (_) => Future.delayed(
          const Duration(seconds: 5),
          () => http.Response('{}', 200),
        ),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  showModalBottomSheet<void>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => ExplanationBottomSheet(
                      entityType: 'LEARNING_OBJECT_VERSION',
                      entityId: 'test-entity-123',
                      explanationService: explanationService,
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pump();

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('displays explanation summary when loaded', (tester) async {
      final testSummary = 'This activity matches your current reading level and builds on recent progress.';

      when(() => mockHttpClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer((_) async => http.Response(
            jsonEncode({
              'explanations': [
                {
                  'id': 'exp-1',
                  'sourceType': 'VIRTUAL_BRAIN',
                  'actionType': 'CONTENT_SELECTION',
                  'relatedEntityType': 'LEARNING_OBJECT_VERSION',
                  'relatedEntityId': 'test-entity-123',
                  'summary': testSummary,
                  'details': {'reasons': [], 'inputs': []},
                  'createdAt': DateTime.now().toIso8601String(),
                }
              ],
              'hasFallback': false,
            }),
            200,
          ));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  showModalBottomSheet<void>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => ExplanationBottomSheet(
                      entityType: 'LEARNING_OBJECT_VERSION',
                      entityId: 'test-entity-123',
                      explanationService: explanationService,
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      expect(find.text(testSummary), findsOneWidget);
    });

    testWidgets('shows fallback message on API error', (tester) async {
      when(() => mockHttpClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer((_) async => http.Response('Internal Error', 500));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  showModalBottomSheet<void>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => ExplanationBottomSheet(
                      entityType: 'LEARNING_OBJECT_VERSION',
                      entityId: 'test-entity-123',
                      explanationService: explanationService,
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      // Should show fallback message
      expect(
        find.text("Aivo used your child's recent work and learning goals to pick this activity."),
        findsOneWidget,
      );
    });

    testWidgets('shows More details toggle when details exist', (tester) async {
      when(() => mockHttpClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer((_) async => http.Response(
            jsonEncode({
              'explanations': [
                {
                  'id': 'exp-1',
                  'sourceType': 'VIRTUAL_BRAIN',
                  'actionType': 'CONTENT_SELECTION',
                  'relatedEntityType': 'LEARNING_OBJECT_VERSION',
                  'relatedEntityId': 'test-entity-123',
                  'summary': 'Summary text here.',
                  'details': {
                    'reasons': [
                      {'label': 'Matches skill level', 'description': 'Your skills match'}
                    ],
                    'inputs': [
                      {'label': 'Reading Level', 'value': '4.2', 'unit': 'grade'}
                    ],
                  },
                  'createdAt': DateTime.now().toIso8601String(),
                }
              ],
              'hasFallback': false,
            }),
            200,
          ));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  showModalBottomSheet<void>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => ExplanationBottomSheet(
                      entityType: 'LEARNING_OBJECT_VERSION',
                      entityId: 'test-entity-123',
                      explanationService: explanationService,
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      expect(find.text('More details'), findsOneWidget);
    });

    testWidgets('expands details when More details is tapped', (tester) async {
      when(() => mockHttpClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer((_) async => http.Response(
            jsonEncode({
              'explanations': [
                {
                  'id': 'exp-1',
                  'sourceType': 'VIRTUAL_BRAIN',
                  'actionType': 'CONTENT_SELECTION',
                  'relatedEntityType': 'LEARNING_OBJECT_VERSION',
                  'relatedEntityId': 'test-entity-123',
                  'summary': 'Summary text here.',
                  'details': {
                    'reasons': [
                      {'label': 'Matches skill level', 'description': 'Your skills match'}
                    ],
                    'inputs': [
                      {'label': 'Reading Level', 'value': '4.2', 'unit': 'grade'}
                    ],
                  },
                  'createdAt': DateTime.now().toIso8601String(),
                }
              ],
              'hasFallback': false,
            }),
            200,
          ));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  showModalBottomSheet<void>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => ExplanationBottomSheet(
                      entityType: 'LEARNING_OBJECT_VERSION',
                      entityId: 'test-entity-123',
                      explanationService: explanationService,
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      // Tap to expand details
      await tester.tap(find.text('More details'));
      await tester.pumpAndSettle();

      // Should show detail sections
      expect(find.text('What Aivo considered:'), findsOneWidget);
      expect(find.text('Matches skill level'), findsOneWidget);
      expect(find.text('Based on these factors:'), findsOneWidget);
      expect(find.text('Reading Level'), findsOneWidget);
      expect(find.text('4.2 grade'), findsOneWidget);
    });

    testWidgets('can close bottom sheet via close button', (tester) async {
      when(() => mockHttpClient.get(
            any(),
            headers: any(named: 'headers'),
          )).thenAnswer((_) async => http.Response(
            jsonEncode({
              'explanations': [
                {
                  'id': 'exp-1',
                  'sourceType': 'SYSTEM',
                  'actionType': 'CONTENT_SELECTION',
                  'relatedEntityType': 'LEARNING_OBJECT_VERSION',
                  'relatedEntityId': 'test-123',
                  'summary': 'Test summary.',
                  'details': {'reasons': [], 'inputs': []},
                  'createdAt': DateTime.now().toIso8601String(),
                }
              ],
              'hasFallback': false,
            }),
            200,
          ));

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () {
                  showModalBottomSheet<void>(
                    context: context,
                    isScrollControlled: true,
                    builder: (_) => ExplanationBottomSheet(
                      entityType: 'LEARNING_OBJECT_VERSION',
                      entityId: 'test-123',
                      explanationService: explanationService,
                    ),
                  );
                },
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      );

      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      expect(find.text('Why Aivo chose this'), findsOneWidget);

      // Tap close button
      await tester.tap(find.byIcon(Icons.close));
      await tester.pumpAndSettle();

      expect(find.text('Why Aivo chose this'), findsNothing);
    });
  });

  group('ExplanationCard', () {
    testWidgets('renders explanation summary', (tester) async {
      final explanation = Explanation(
        id: 'exp-1',
        sourceType: 'VIRTUAL_BRAIN',
        actionType: 'CONTENT_SELECTION',
        relatedEntityType: 'LEARNING_OBJECT_VERSION',
        relatedEntityId: 'lo-123',
        summary: 'This activity was selected for reading practice.',
        details: const ExplanationDetails(reasons: [], inputs: []),
        createdAt: DateTime.now().subtract(const Duration(hours: 2)),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExplanationCard(explanation: explanation),
          ),
        ),
      );

      expect(find.text('Activity Selection'), findsOneWidget);
      expect(find.text('This activity was selected for reading practice.'), findsOneWidget);
      expect(find.text('2h ago'), findsOneWidget);
    });

    testWidgets('shows difficulty change action type', (tester) async {
      final explanation = Explanation(
        id: 'exp-2',
        sourceType: 'LESSON_PLANNER',
        actionType: 'DIFFICULTY_CHANGE',
        relatedEntityType: 'LEARNING_OBJECT_VERSION',
        relatedEntityId: 'lo-456',
        summary: 'Difficulty was adjusted based on performance.',
        details: const ExplanationDetails(reasons: [], inputs: []),
        createdAt: DateTime.now().subtract(const Duration(minutes: 30)),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExplanationCard(explanation: explanation),
          ),
        ),
      );

      expect(find.text('Difficulty Adjustment'), findsOneWidget);
      expect(find.byIcon(Icons.tune), findsOneWidget);
    });

    testWidgets('calls onTap callback when tapped', (tester) async {
      var tapped = false;

      final explanation = Explanation(
        id: 'exp-3',
        sourceType: 'FOCUS_AGENT',
        actionType: 'FOCUS_BREAK_TRIGGER',
        relatedEntityType: 'SESSION',
        relatedEntityId: 'session-789',
        summary: 'A break was suggested after 20 minutes of focus.',
        details: const ExplanationDetails(reasons: [], inputs: []),
        createdAt: DateTime.now().subtract(const Duration(days: 1)),
      );

      await tester.pumpWidget(
        MaterialApp(
          home: Scaffold(
            body: ExplanationCard(
              explanation: explanation,
              onTap: () => tapped = true,
            ),
          ),
        ),
      );

      await tester.tap(find.byType(ExplanationCard));
      await tester.pump();

      expect(tapped, isTrue);
    });
  });

  group('Explanation models', () {
    test('ExplanationReason.fromJson parses correctly', () {
      final json = {
        'label': 'Skill alignment',
        'description': 'Matches current skills',
      };

      final reason = ExplanationReason.fromJson(json);

      expect(reason.label, 'Skill alignment');
      expect(reason.description, 'Matches current skills');
    });

    test('ExplanationInput displayValue formats with unit', () {
      final input = ExplanationInput(
        label: 'Reading Level',
        value: '4.5',
        unit: 'grade',
      );

      expect(input.displayValue, '4.5 grade');
    });

    test('ExplanationInput displayValue without unit', () {
      final input = ExplanationInput(
        label: 'Accuracy',
        value: '85%',
      );

      expect(input.displayValue, '85%');
    });

    test('ExplanationDetails.hasContent returns true when reasons exist', () {
      final details = ExplanationDetails(
        reasons: [
          ExplanationReason(label: 'Test', description: 'Desc'),
        ],
        inputs: [],
      );

      expect(details.hasContent, isTrue);
    });

    test('ExplanationDetails.hasContent returns false when empty', () {
      const details = ExplanationDetails(reasons: [], inputs: []);

      expect(details.hasContent, isFalse);
    });

    test('Explanation.isFallback returns true for fallback id', () {
      final explanation = Explanation(
        id: 'fallback',
        sourceType: 'SYSTEM',
        actionType: 'UNKNOWN',
        relatedEntityType: 'LEARNING_OBJECT_VERSION',
        relatedEntityId: 'test',
        summary: 'Fallback summary',
        details: const ExplanationDetails(reasons: [], inputs: []),
        createdAt: DateTime.now(),
      );

      expect(explanation.isFallback, isTrue);
    });

    test('ExplanationsResponse.primary returns first explanation', () {
      final response = ExplanationsResponse(
        explanations: [
          Explanation(
            id: 'exp-1',
            sourceType: 'VB',
            actionType: 'CS',
            relatedEntityType: 'LO',
            relatedEntityId: '123',
            summary: 'First',
            details: const ExplanationDetails(reasons: [], inputs: []),
            createdAt: DateTime.now(),
          ),
          Explanation(
            id: 'exp-2',
            sourceType: 'VB',
            actionType: 'CS',
            relatedEntityType: 'LO',
            relatedEntityId: '456',
            summary: 'Second',
            details: const ExplanationDetails(reasons: [], inputs: []),
            createdAt: DateTime.now(),
          ),
        ],
        hasFallback: false,
      );

      expect(response.primary?.id, 'exp-1');
    });
  });
}
