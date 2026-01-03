import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

/// Creates a testable widget wrapped with MaterialApp and ProviderScope.
Widget createTestableWidget(
  Widget child, {
  List<Override>? overrides,
  ThemeData? theme,
}) {
  return ProviderScope(
    overrides: overrides ?? [],
    child: MaterialApp(
      theme: theme ?? ThemeData.light(),
      home: child,
    ),
  );
}

/// Creates a testable widget with navigation support.
Widget createTestableWidgetWithNav(
  Widget child, {
  List<Override>? overrides,
  String initialRoute = '/',
  Map<String, WidgetBuilder>? routes,
}) {
  return ProviderScope(
    overrides: overrides ?? [],
    child: MaterialApp(
      initialRoute: initialRoute,
      routes: {
        initialRoute: (_) => child,
        ...?routes,
      },
    ),
  );
}

/// Pumps widget and settles all animations.
Future<void> pumpAndSettle(WidgetTester tester) async {
  await tester.pumpAndSettle();
}

/// Pumps widget multiple times for async operations.
Future<void> pumpAsync(WidgetTester tester, {int times = 5}) async {
  for (var i = 0; i < times; i++) {
    await tester.pump(const Duration(milliseconds: 100));
  }
}

/// Finds widget by text and taps it.
Future<void> tapByText(WidgetTester tester, String text) async {
  await tester.tap(find.text(text));
  await tester.pumpAndSettle();
}

/// Enters text into a TextField by key.
Future<void> enterTextByKey(
  WidgetTester tester,
  Key key,
  String text,
) async {
  await tester.enterText(find.byKey(key), text);
  await tester.pumpAndSettle();
}

/// Mock data generators
class MockData {
  static Map<String, dynamic> assignment({
    String id = 'a1',
    String classId = 'c1',
    String title = 'Test Assignment',
    String status = 'published',
    String type = 'homework',
    double points = 100,
    int submissions = 25,
    int graded = 20,
    int students = 30,
  }) {
    return {
      'id': id,
      'classId': classId,
      'title': title,
      'status': status,
      'assignmentType': type,
      'pointsPossible': points,
      'submissionCount': submissions,
      'gradedCount': graded,
      'studentCount': students,
    };
  }

  static Map<String, dynamic> submission({
    String id = 's1',
    String assignmentId = 'a1',
    String studentId = 'st1',
    String studentName = 'Test Student',
    String status = 'submitted',
    double? pointsEarned,
    bool isLate = false,
    bool isExcused = false,
  }) {
    return {
      'id': id,
      'assignmentId': assignmentId,
      'studentId': studentId,
      'studentName': studentName,
      'status': status,
      'pointsEarned': pointsEarned,
      'isLate': isLate,
      'isExcused': isExcused,
    };
  }

  static Map<String, dynamic> gradeEntry({
    String id = 'g1',
    String studentId = 'st1',
    String assignmentId = 'a1',
    double? pointsEarned,
    double? pointsPossible = 100,
    bool isExcused = false,
    bool isMissing = false,
  }) {
    return {
      'id': id,
      'studentId': studentId,
      'assignmentId': assignmentId,
      'pointsEarned': pointsEarned,
      'pointsPossible': pointsPossible,
      'isExcused': isExcused,
      'isMissing': isMissing,
    };
  }

  static Map<String, dynamic> gradebook({
    String classId = 'c1',
    String className = 'Test Class',
    List<Map<String, dynamic>>? students,
    List<Map<String, dynamic>>? assignments,
  }) {
    return {
      'classId': classId,
      'className': className,
      'gradeScale': {
        'id': 'standard',
        'name': 'Standard',
        'entries': [
          {'letter': 'A', 'minPercent': 90.0, 'maxPercent': 100.0, 'gpaValue': 4.0},
          {'letter': 'B', 'minPercent': 80.0, 'maxPercent': 89.99, 'gpaValue': 3.0},
          {'letter': 'C', 'minPercent': 70.0, 'maxPercent': 79.99, 'gpaValue': 2.0},
          {'letter': 'D', 'minPercent': 60.0, 'maxPercent': 69.99, 'gpaValue': 1.0},
          {'letter': 'F', 'minPercent': 0.0, 'maxPercent': 59.99, 'gpaValue': 0.0},
        ],
      },
      'students': students ?? [
        {'id': 'st1', 'name': 'Student One'},
        {'id': 'st2', 'name': 'Student Two'},
      ],
      'assignments': assignments ?? [
        {'id': 'a1', 'title': 'Assignment 1', 'pointsPossible': 100.0},
        {'id': 'a2', 'title': 'Assignment 2', 'pointsPossible': 50.0},
      ],
      'grades': {},
      'categories': [],
    };
  }

  static Map<String, dynamic> student({
    String id = 'st1',
    String firstName = 'Test',
    String lastName = 'Student',
    int? gradeLevel = 9,
    bool hasIep = false,
    bool has504 = false,
  }) {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'email': '$firstName.$lastName@school.edu'.toLowerCase(),
      'classIds': ['c1'],
      'gradeLevel': gradeLevel,
      'status': 'active',
      'hasIep': hasIep,
      'has504': has504,
      'accommodations': [],
    };
  }
}
