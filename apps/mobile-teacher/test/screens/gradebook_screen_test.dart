import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_teacher/models/grade.dart';
import 'package:mobile_teacher/providers/providers.dart';
import 'package:mobile_teacher/screens/gradebook/gradebook_screen.dart';

import '../test_helpers.dart';

// Mock providers
class MockGradebookNotifier extends StateNotifier<GradebookState>
    with Mock
    implements GradebookNotifier {
  MockGradebookNotifier() : super(const GradebookState());

  void setLoading() {
    state = state.copyWith(isLoading: true);
  }

  void setLoaded(Gradebook gradebook) {
    state = state.copyWith(
      isLoading: false,
      gradebook: gradebook,
      lastUpdated: DateTime.now(),
    );
  }

  void setError(String error) {
    state = state.copyWith(isLoading: false, error: error);
  }
}

void main() {
  group('GradebookScreen', () {
    late MockGradebookNotifier mockNotifier;

    setUp(() {
      mockNotifier = MockGradebookNotifier();
    });

    testWidgets('shows loading indicator when loading', (tester) async {
      mockNotifier.setLoading();

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            gradebookProvider('c1').overrideWith((ref) => mockNotifier),
          ],
          child: const MaterialApp(
            home: GradebookScreen(classId: 'c1'),
          ),
        ),
      );

      expect(find.byType(CircularProgressIndicator), findsOneWidget);
    });

    testWidgets('shows error view when error occurs', (tester) async {
      mockNotifier.setError('Network error');

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            gradebookProvider('c1').overrideWith((ref) => mockNotifier),
          ],
          child: const MaterialApp(
            home: GradebookScreen(classId: 'c1'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Error loading gradebook'), findsOneWidget);
      expect(find.text('Retry'), findsOneWidget);
    });

    testWidgets('shows gradebook content when loaded', (tester) async {
      final gradebook = Gradebook.fromJson(MockData.gradebook(
        className: 'Math 101',
      ));
      mockNotifier.setLoaded(gradebook);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            gradebookProvider('c1').overrideWith((ref) => mockNotifier),
          ],
          child: const MaterialApp(
            home: GradebookScreen(classId: 'c1'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      expect(find.text('Math 101'), findsOneWidget);
      expect(find.text('Overall'), findsOneWidget);
    });

    testWidgets('search filters students', (tester) async {
      final gradebook = Gradebook.fromJson(MockData.gradebook(
        students: [
          {'id': 'st1', 'name': 'Alice Smith'},
          {'id': 'st2', 'name': 'Bob Jones'},
        ],
      ));
      mockNotifier.setLoaded(gradebook);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            gradebookProvider('c1').overrideWith((ref) => mockNotifier),
          ],
          child: const MaterialApp(
            home: GradebookScreen(classId: 'c1'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Initially both students visible
      expect(find.text('Alice Smith'), findsOneWidget);
      expect(find.text('Bob Jones'), findsOneWidget);

      // Enter search query
      await tester.enterText(find.byType(TextField), 'Alice');
      await tester.pumpAndSettle();

      // Only Alice visible
      expect(find.text('Alice Smith'), findsOneWidget);
      expect(find.text('Bob Jones'), findsNothing);
    });

    testWidgets('assignment chips are selectable', (tester) async {
      final gradebook = Gradebook.fromJson(MockData.gradebook(
        assignments: [
          {'id': 'a1', 'title': 'Quiz 1', 'pointsPossible': 50.0},
          {'id': 'a2', 'title': 'Homework 1', 'pointsPossible': 100.0},
        ],
      ));
      mockNotifier.setLoaded(gradebook);

      await tester.pumpWidget(
        ProviderScope(
          overrides: [
            gradebookProvider('c1').overrideWith((ref) => mockNotifier),
          ],
          child: const MaterialApp(
            home: GradebookScreen(classId: 'c1'),
          ),
        ),
      );

      await tester.pumpAndSettle();

      // Find assignment chips
      expect(find.text('Overall'), findsOneWidget);
      expect(find.text('Quiz 1'), findsOneWidget);
      expect(find.text('Homework 1'), findsOneWidget);

      // Tap Quiz 1 chip
      await tester.tap(find.text('Quiz 1'));
      await tester.pumpAndSettle();

      // Chip should be selected (visual feedback)
    });
  });
}
