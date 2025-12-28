/// Class Test Fixtures
///
/// Test data for classes.
library;

import 'package:mobile_teacher/models/models.dart';

/// Test classes for testing.
class TestClasses {
  /// 5th grade math class.
  static final math5th = ClassGroup(
    id: 'class-math-5',
    name: 'Math 5th Period',
    gradeLevel: 5,
    subject: 'math',
    teacherId: 'teacher-1',
    studentIds: ['student-alex', 'student-emma', 'student-jordan', 'student-marcus'],
    studentCount: 4,
    period: '5th',
    room: 'Room 205',
    schedule: ClassSchedule(
      daysOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
      startTime: '10:00',
      endTime: '11:00',
    ),
    schoolYear: '2024-2025',
    createdAt: DateTime(2024, 8, 1),
    updatedAt: DateTime.now().subtract(const Duration(days: 5)),
  );

  /// 5th grade reading class.
  static final reading5th = ClassGroup(
    id: 'class-reading-5',
    name: 'Reading 3rd Period',
    gradeLevel: 5,
    subject: 'reading',
    teacherId: 'teacher-1',
    studentIds: ['student-alex', 'student-emma', 'student-marcus', 'student-sofia'],
    studentCount: 4,
    period: '3rd',
    room: 'Room 205',
    schedule: ClassSchedule(
      daysOfWeek: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '10:00',
    ),
    schoolYear: '2024-2025',
    createdAt: DateTime(2024, 8, 1),
    updatedAt: DateTime.now().subtract(const Duration(days: 3)),
  );

  /// Science class.
  static final science5th = ClassGroup(
    id: 'class-science-5',
    name: 'Science 6th Period',
    gradeLevel: 5,
    subject: 'science',
    teacherId: 'teacher-1',
    studentIds: ['student-emma', 'student-jordan'],
    studentCount: 2,
    period: '6th',
    room: 'Science Lab',
    schedule: ClassSchedule(
      daysOfWeek: [2, 4], // Tuesday, Thursday
      startTime: '13:00',
      endTime: '14:00',
    ),
    schoolYear: '2024-2025',
    createdAt: DateTime(2024, 8, 1),
    updatedAt: DateTime.now().subtract(const Duration(days: 7)),
  );

  /// Inactive class from previous semester.
  static final inactiveClass = ClassGroup(
    id: 'class-inactive',
    name: 'Math 5th Period (Spring)',
    gradeLevel: 5,
    subject: 'math',
    teacherId: 'teacher-1',
    studentIds: [],
    studentCount: 0,
    schedule: null,
    schoolYear: '2023-2024',
    createdAt: DateTime(2024, 1, 10),
    updatedAt: DateTime(2024, 6, 15),
  );

  /// All test classes.
  static final all = [math5th, reading5th, science5th];

  /// Classes by subject.
  static List<ClassGroup> bySubject(String subject) =>
      all.where((c) => c.subject == subject).toList();

  /// Create a custom class.
  static ClassGroup create({
    String? id,
    String name = 'Test Class',
    int gradeLevel = 5,
    String subject = 'general',
    String teacherId = 'teacher-1',
    List<String> studentIds = const [],
  }) {
    return ClassGroup(
      id: id ?? 'class-${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      gradeLevel: gradeLevel,
      subject: subject,
      teacherId: teacherId,
      studentIds: studentIds,
      studentCount: studentIds.length,
      schoolYear: '2024-2025',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }
}
