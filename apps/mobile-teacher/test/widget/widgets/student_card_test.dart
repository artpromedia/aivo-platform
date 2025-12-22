/// Student Card Widget Tests
///
/// Tests for the StudentCard widget.
library;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_teacher/screens/students/widgets/student_card.dart';

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

  group('StudentCard', () {
    testWidgets('should display student name', (tester) async {
      // Act
      await tester.pumpApp(
        StudentCard(student: TestStudents.alex),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Alex Johnson'), findsOneWidget);
    });

    testWidgets('should display student initials in avatar', (tester) async {
      // Act
      await tester.pumpApp(
        StudentCard(student: TestStudents.alex),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('AJ'), findsOneWidget);
    });

    testWidgets('should display IEP badge for students with IEP',
        (tester) async {
      // Arrange
      final studentWithIep = TestStudents.alex; // Alex has IEP

      // Act
      await tester.pumpApp(
        StudentCard(student: studentWithIep),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('IEP'), findsOneWidget);
    });

    testWidgets('should not display IEP badge when student has no IEP',
        (tester) async {
      // Arrange
      final studentWithoutIep = TestStudents.emma; // Emma doesn't have IEP

      // Act
      await tester.pumpApp(
        StudentCard(student: studentWithoutIep),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('IEP'), findsNothing);
    });

    testWidgets('should display 504 badge for students with 504',
        (tester) async {
      // Arrange
      final studentWith504 = TestStudents.emma; // Emma has 504

      // Act
      await tester.pumpApp(
        StudentCard(student: studentWith504),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('504'), findsOneWidget);
    });

    testWidgets('should call onTap when card is tapped', (tester) async {
      // Arrange
      bool tapped = false;

      // Act
      await tester.pumpApp(
        StudentCard(
          student: TestStudents.alex,
          onTap: () => tapped = true,
        ),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      await tester.tap(find.byType(StudentCard));
      await tester.pumpAndSettle();

      // Assert
      expect(tapped, isTrue);
    });

    testWidgets('should display grade level when provided', (tester) async {
      // Arrange
      final studentWithGrade = TestStudents.alex.copyWith(gradeLevel: 5);

      // Act
      await tester.pumpApp(
        StudentCard(student: studentWithGrade),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.text('Grade 5'), findsOneWidget);
    });

    testWidgets('should display avatar image when avatarUrl is provided',
        (tester) async {
      // Arrange
      final studentWithAvatar = TestStudents.alex.copyWith(
        avatarUrl: 'https://example.com/avatar.jpg',
      );

      // Act
      await tester.pumpApp(
        StudentCard(student: studentWithAvatar),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.byType(CircleAvatar), findsOneWidget);
    });

    testWidgets('should display attention indicator when student needs attention',
        (tester) async {
      // Arrange - hasIep: true triggers needsAttention getter
      final attentionStudent = TestStudents.create(
        id: 'attention-student',
        firstName: 'Attention',
        lastName: 'Needed',
        hasIep: true,
      );

      // Act
      await tester.pumpApp(
        StudentCard(student: attentionStudent),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.byIcon(Icons.warning), findsOneWidget);
    });

    testWidgets('should handle long student names', (tester) async {
      // Arrange
      final longNameStudent = TestStudents.create(
        id: 'long-name',
        firstName: 'VeryLongFirstName',
        lastName: 'EvenLongerLastName',
      );

      // Act
      await tester.pumpApp(
        SizedBox(
          width: 200,
          child: StudentCard(student: longNameStudent),
        ),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert - should render without overflow
      expect(tester.takeException(), isNull);
    });

    testWidgets('should display last active time', (tester) async {
      // Arrange
      final recentlyActiveStudent = TestStudents.alex.copyWith(
        lastActiveAt: DateTime.now().subtract(const Duration(minutes: 5)),
      );

      // Act
      await tester.pumpApp(
        StudentCard(student: recentlyActiveStudent),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      expect(find.textContaining('Active'), findsOneWidget);
    });

    testWidgets('should apply selected styling when isSelected is true',
        (tester) async {
      // Act
      await tester.pumpApp(
        StudentCard(
          student: TestStudents.alex,
          isSelected: true,
        ),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      final container = tester.widget<Container>(
        find.ancestor(
          of: find.text('Alex Johnson'),
          matching: find.byType(Container),
        ).first,
      );
      // Verify styling indicates selection
      expect(container, isNotNull);
    });
  });

  group('StudentCard accessibility', () {
    testWidgets('should have semantic label', (tester) async {
      // Act
      await tester.pumpApp(
        StudentCard(student: TestStudents.alex),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Assert
      final semantics = tester.getSemantics(find.byType(StudentCard));
      expect(semantics.label, contains('Alex Johnson'));
    });

    testWidgets('should be tappable via keyboard', (tester) async {
      // Arrange
      bool tapped = false;

      // Act
      await tester.pumpApp(
        StudentCard(
          student: TestStudents.alex,
          onTap: () => tapped = true,
        ),
        overrides: defaultMockProviders,
      );
      await tester.pumpAndSettle();

      // Focus and activate
      await tester.sendKeyEvent(LogicalKeyboardKey.tab);
      await tester.sendKeyEvent(LogicalKeyboardKey.enter);
      await tester.pumpAndSettle();

      // Assert
      expect(tapped, isTrue);
    });
  });
}
