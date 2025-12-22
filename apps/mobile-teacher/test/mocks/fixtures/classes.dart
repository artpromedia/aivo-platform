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
    description: '5th grade mathematics',
    gradeLevel: 5,
    subject: 'math',
    teacherId: 'teacher-1',
    studentIds: ['student-alex', 'student-emma', 'student-jordan', 'student-marcus'],
    schedule: ClassSchedule(
      dayOfWeek: [1, 2, 3, 4, 5], // Monday-Friday
      startTime: '10:00',
      endTime: '11:00',
      room: 'Room 205',
    ),
    academicYear: '2024-2025',
    semester: 'Fall',
    isActive: true,
    createdAt: DateTime(2024, 8, 1),
    updatedAt: DateTime.now().subtract(const Duration(days: 5)),
  );

  /// 5th grade reading class.
  static final reading5th = ClassGroup(
    id: 'class-reading-5',
    name: 'Reading 3rd Period',
    description: '5th grade reading and language arts',
    gradeLevel: 5,
    subject: 'reading',
    teacherId: 'teacher-1',
    studentIds: ['student-alex', 'student-emma', 'student-marcus', 'student-sofia'],
    schedule: ClassSchedule(
      dayOfWeek: [1, 2, 3, 4, 5],
      startTime: '09:00',
      endTime: '10:00',
      room: 'Room 205',
    ),
    academicYear: '2024-2025',
    semester: 'Fall',
    isActive: true,
    createdAt: DateTime(2024, 8, 1),
    updatedAt: DateTime.now().subtract(const Duration(days: 3)),
  );

  /// Science class.
  static final science5th = ClassGroup(
    id: 'class-science-5',
    name: 'Science 6th Period',
    description: '5th grade science',
    gradeLevel: 5,
    subject: 'science',
    teacherId: 'teacher-1',
    studentIds: ['student-emma', 'student-jordan'],
    schedule: ClassSchedule(
      dayOfWeek: [2, 4], // Tuesday, Thursday
      startTime: '13:00',
      endTime: '14:00',
      room: 'Science Lab',
    ),
    academicYear: '2024-2025',
    semester: 'Fall',
    isActive: true,
    createdAt: DateTime(2024, 8, 1),
    updatedAt: DateTime.now().subtract(const Duration(days: 7)),
  );

  /// Inactive class from previous semester.
  static final inactiveClass = ClassGroup(
    id: 'class-inactive',
    name: 'Math 5th Period (Spring)',
    description: 'Previous semester class',
    gradeLevel: 5,
    subject: 'math',
    teacherId: 'teacher-1',
    studentIds: [],
    schedule: null,
    academicYear: '2023-2024',
    semester: 'Spring',
    isActive: false,
    createdAt: DateTime(2024, 1, 10),
    updatedAt: DateTime(2024, 6, 15),
  );

  /// All test classes.
  static final all = [math5th, reading5th, science5th];

  /// Active classes.
  static final active = all.where((c) => c.isActive).toList();

  /// Classes by subject.
  static List<ClassGroup> bySubject(String subject) =>
      all.where((c) => c.subject == subject).toList();

  /// Create a custom class.
  static ClassGroup create({
    String? id,
    String name = 'Test Class',
    String? description,
    int gradeLevel = 5,
    String subject = 'general',
    String teacherId = 'teacher-1',
    List<String> studentIds = const [],
    bool isActive = true,
  }) {
    return ClassGroup(
      id: id ?? 'class-${DateTime.now().millisecondsSinceEpoch}',
      name: name,
      description: description,
      gradeLevel: gradeLevel,
      subject: subject,
      teacherId: teacherId,
      studentIds: studentIds,
      isActive: isActive,
      academicYear: '2024-2025',
      semester: 'Fall',
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }
}
