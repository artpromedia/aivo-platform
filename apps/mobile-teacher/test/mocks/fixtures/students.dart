/// Student Test Fixtures
///
/// Test data for students.
library;

import 'package:mobile_teacher/models/models.dart';

/// Test students for testing.
class TestStudents {
  /// Alex Johnson - student with IEP.
  static final alex = Student(
    id: 'student-alex',
    firstName: 'Alex',
    lastName: 'Johnson',
    email: 'alex.johnson@school.edu',
    classIds: ['class-math-5', 'class-reading-5'],
    avatarUrl: null,
    gradeLevel: 5,
    dateOfBirth: DateTime(2014, 3, 15),
    status: StudentStatus.active,
    hasIep: true,
    has504: false,
    parentEmails: ['parent.johnson@email.com'],
    accommodations: ['extended_time', 'text_to_speech', 'reduced_distractions'],
    lastActiveAt: DateTime.now().subtract(const Duration(hours: 2)),
    createdAt: DateTime(2024, 8, 15),
    updatedAt: DateTime.now().subtract(const Duration(days: 1)),
  );

  /// Emma Williams - high performing student.
  static final emma = Student(
    id: 'student-emma',
    firstName: 'Emma',
    lastName: 'Williams',
    email: 'emma.williams@school.edu',
    classIds: ['class-math-5', 'class-reading-5'],
    avatarUrl: null,
    gradeLevel: 5,
    dateOfBirth: DateTime(2014, 7, 22),
    status: StudentStatus.active,
    hasIep: false,
    has504: false,
    parentEmails: ['williams.family@email.com'],
    accommodations: [],
    lastActiveAt: DateTime.now().subtract(const Duration(days: 1)),
    createdAt: DateTime(2024, 8, 15),
    updatedAt: DateTime.now().subtract(const Duration(days: 2)),
  );

  /// Jordan Smith - student with 504 plan.
  static final jordan = Student(
    id: 'student-jordan',
    firstName: 'Jordan',
    lastName: 'Smith',
    email: 'jordan.smith@school.edu',
    classIds: ['class-math-5'],
    avatarUrl: null,
    gradeLevel: 5,
    dateOfBirth: DateTime(2014, 1, 8),
    status: StudentStatus.active,
    hasIep: false,
    has504: true,
    parentEmails: ['smith.parents@email.com'],
    accommodations: ['frequent_breaks', 'preferential_seating'],
    lastActiveAt: DateTime.now().subtract(const Duration(hours: 4)),
    createdAt: DateTime(2024, 8, 15),
    updatedAt: DateTime.now().subtract(const Duration(hours: 5)),
  );

  /// Marcus Chen - new student.
  static final marcus = Student(
    id: 'student-marcus',
    firstName: 'Marcus',
    lastName: 'Chen',
    email: 'marcus.chen@school.edu',
    classIds: ['class-math-5', 'class-reading-5'],
    avatarUrl: null,
    gradeLevel: 5,
    dateOfBirth: DateTime(2014, 11, 30),
    status: StudentStatus.active,
    hasIep: false,
    has504: false,
    parentEmails: ['chen.family@email.com'],
    accommodations: [],
    lastActiveAt: null,
    createdAt: DateTime(2024, 9, 1),
    updatedAt: DateTime.now().subtract(const Duration(days: 5)),
  );

  /// Sofia Rodriguez - student with IEP.
  static final sofia = Student(
    id: 'student-sofia',
    firstName: 'Sofia',
    lastName: 'Rodriguez',
    email: 'sofia.rodriguez@school.edu',
    classIds: ['class-reading-5'],
    avatarUrl: null,
    gradeLevel: 5,
    dateOfBirth: DateTime(2014, 5, 17),
    status: StudentStatus.active,
    hasIep: true,
    has504: false,
    parentEmails: ['rodriguez.family@email.com'],
    accommodations: ['audio_books', 'graphic_organizers'],
    lastActiveAt: DateTime.now().subtract(const Duration(hours: 6)),
    createdAt: DateTime(2024, 8, 15),
    updatedAt: DateTime.now().subtract(const Duration(days: 1)),
  );

  /// Inactive student for testing filters.
  static final inactiveStudent = Student(
    id: 'student-inactive',
    firstName: 'Taylor',
    lastName: 'Brown',
    email: 'taylor.brown@school.edu',
    classIds: ['class-math-5'],
    gradeLevel: 5,
    status: StudentStatus.inactive,
    hasIep: false,
    has504: false,
    parentEmails: [],
    accommodations: [],
  );

  /// All test students.
  static final all = [alex, emma, jordan, marcus, sofia];

  /// Students with IEP.
  static final withIep = all.where((s) => s.hasIep).toList();

  /// Students with 504.
  static final with504 = all.where((s) => s.has504).toList();

  /// Students needing accommodations.
  static final needingAccommodations =
      all.where((s) => s.accommodations.isNotEmpty).toList();

  /// Create a custom student for testing.
  static Student create({
    String? id,
    String firstName = 'Test',
    String lastName = 'Student',
    String? email,
    List<String> classIds = const [],
    int gradeLevel = 5,
    bool hasIep = false,
    bool has504 = false,
    List<String> accommodations = const [],
  }) {
    return Student(
      id: id ?? 'student-${DateTime.now().millisecondsSinceEpoch}',
      firstName: firstName,
      lastName: lastName,
      email: email ?? '${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.edu',
      classIds: classIds,
      gradeLevel: gradeLevel,
      hasIep: hasIep,
      has504: has504,
      accommodations: accommodations,
      status: StudentStatus.active,
      parentEmails: [],
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }

  /// Create multiple students.
  static List<Student> createMany(int count, {bool withIep = false}) {
    return List.generate(
      count,
      (i) => create(
        id: 'student-$i',
        firstName: 'Student',
        lastName: '${i + 1}',
        hasIep: withIep && i % 2 == 0,
      ),
    );
  }
}
