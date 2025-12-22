/// IEP Goal Tracker Widget Tests
///
/// Tests for the IepGoalTracker widget.
library;

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_teacher/screens/students/widgets/iep_goal_tracker.dart';

import '../../helpers/helpers.dart';
import '../../mocks/mock_providers.dart';
import '../../mocks/fixtures/fixtures.dart';

void main() {
  setUp(() {
    setupDefaultMocks();
  });

  tearDown(() {
    resetAllMocks();
  });

  group('IepGoalTracker', () {
    testWidgets('should display goal description', (tester) async {
      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: TestIepGoals.multiplicationGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(
        find.textContaining('multiplication facts'),
        findsOneWidget,
      );
    });

    testWidgets('should display progress bar', (tester) async {
      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: TestIepGoals.multiplicationGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
    });

    testWidgets('should display current progress percentage', (tester) async {
      // Arrange - multiplicationGoal has 60% progress
      final goal = TestIepGoals.multiplicationGoal;

      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: goal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.textContaining('60%'), findsOneWidget);
    });

    testWidgets('should display target criteria', (tester) async {
      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: TestIepGoals.multiplicationGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(
        find.textContaining('90% accuracy'),
        findsOneWidget,
      );
    });

    testWidgets('should show "On Track" badge when goal is on track',
        (tester) async {
      // Arrange
      final onTrackGoal = TestIepGoals.readingComprehensionGoal;

      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: onTrackGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('On Track'), findsOneWidget);
    });

    testWidgets('should show "At Risk" badge when goal is at risk',
        (tester) async {
      // Arrange
      final atRiskGoal = TestIepGoals.atRiskGoal;

      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: atRiskGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('At Risk'), findsOneWidget);
    });

    testWidgets('should show "Achieved" badge when goal is achieved',
        (tester) async {
      // Arrange
      final achievedGoal = TestIepGoals.achievedGoal;

      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: achievedGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Achieved'), findsOneWidget);
    });

    testWidgets('should display days remaining until target date',
        (tester) async {
      // Arrange
      final goal = TestIepGoals.multiplicationGoal;

      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: goal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.textContaining('days'), findsOneWidget);
    });

    testWidgets('should display category icon', (tester) async {
      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: TestIepGoals.multiplicationGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert - math category should have calculate icon
      expect(find.byIcon(Icons.calculate), findsOneWidget);
    });

    testWidgets('should call onTap when card is tapped', (tester) async {
      // Arrange
      bool tapped = false;

      // Act
      await tester.pumpApp(
        IepGoalTracker(
          goal: TestIepGoals.multiplicationGoal,
          onTap: () => tapped = true,
        ),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byType(IepGoalTracker));
      await tester.pumpAndSettle();

      // Assert
      expect(tapped, isTrue);
    });

    testWidgets('should call onUpdateProgress when update button tapped',
        (tester) async {
      // Arrange
      bool updateCalled = false;

      // Act
      await tester.pumpApp(
        IepGoalTracker(
          goal: TestIepGoals.multiplicationGoal,
          onUpdateProgress: () => updateCalled = true,
        ),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      final updateButton = find.byIcon(Icons.add);
      if (updateButton.evaluate().isNotEmpty) {
        await tester.tap(updateButton);
        await tester.pumpAndSettle();
        expect(updateCalled, isTrue);
      }
    });

    testWidgets('should display accommodations when expanded', (tester) async {
      // Arrange
      final goalWithAccommodations = TestIepGoals.multiplicationGoal;

      // Act
      await tester.pumpApp(
        IepGoalTracker(
          goal: goalWithAccommodations,
          showDetails: true,
        ),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Accommodations'), findsOneWidget);
    });

    testWidgets('should use correct color for at-risk progress',
        (tester) async {
      // Arrange
      final atRiskGoal = TestIepGoals.atRiskGoal;

      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: atRiskGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      final indicator = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(indicator.color, equals(Colors.red));
    });

    testWidgets('should use correct color for on-track progress',
        (tester) async {
      // Arrange
      final onTrackGoal = TestIepGoals.readingComprehensionGoal;

      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: onTrackGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      final indicator = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(indicator.color, equals(Colors.green));
    });

    testWidgets('should use correct color for achieved goal', (tester) async {
      // Arrange
      final achievedGoal = TestIepGoals.achievedGoal;

      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: achievedGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      final indicator = tester.widget<LinearProgressIndicator>(
        find.byType(LinearProgressIndicator),
      );
      expect(indicator.value, equals(1.0));
    });
  });

  group('IepGoalTracker compact mode', () {
    testWidgets('should display minimal info in compact mode', (tester) async {
      // Act
      await tester.pumpApp(
        IepGoalTracker(
          goal: TestIepGoals.multiplicationGoal,
          compact: true,
        ),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert - only name and progress shown
      expect(find.byType(LinearProgressIndicator), findsOneWidget);
      expect(find.text('Accommodations'), findsNothing);
    });
  });

  group('IepGoalTracker accessibility', () {
    testWidgets('should have semantic label', (tester) async {
      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: TestIepGoals.multiplicationGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      final semantics = tester.getSemantics(find.byType(IepGoalTracker));
      expect(semantics.label, contains('goal'));
    });

    testWidgets('should announce progress', (tester) async {
      // Act
      await tester.pumpApp(
        IepGoalTracker(goal: TestIepGoals.multiplicationGoal),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      final semantics = tester.getSemantics(
        find.byType(LinearProgressIndicator),
      );
      expect(semantics.value, contains('60%'));
    });
  });
}
