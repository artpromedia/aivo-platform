/// Test Teacher Profile
///
/// Test data for teacher profile.
library;

import 'package:mobile_teacher/models/models.dart';

/// Test teacher profiles.
class TestTeachers {
  /// Primary test teacher.
  static final testTeacher = TeacherProfile(
    id: 'teacher-1',
    email: 'teacher@test.school',
    firstName: 'Jane',
    lastName: 'Smith',
    displayName: 'Ms. Smith',
    avatarUrl: null,
    title: '5th Grade Teacher',
    department: 'Elementary',
    schoolId: 'school-1',
    schoolName: 'Test Elementary School',
    phoneNumber: '555-123-4567',
    preferences: const TeacherPreferences(
      notificationsEnabled: true,
      emailDigestFrequency: 'daily',
      theme: 'system',
      defaultSessionDuration: 60,
      showStudentAvatars: true,
    ),
    createdAt: DateTime(2024, 1, 15),
    updatedAt: DateTime.now().subtract(const Duration(days: 30)),
  );

  /// Second test teacher for collaboration tests.
  static final collaborator = TeacherProfile(
    id: 'teacher-2',
    email: 'collaborator@test.school',
    firstName: 'John',
    lastName: 'Doe',
    displayName: 'Mr. Doe',
    title: 'Special Education Teacher',
    department: 'Special Education',
    schoolId: 'school-1',
    schoolName: 'Test Elementary School',
    preferences: const TeacherPreferences(),
    createdAt: DateTime(2024, 2, 1),
    updatedAt: DateTime.now().subtract(const Duration(days: 60)),
  );

  /// All test teachers.
  static final all = [testTeacher, collaborator];

  /// Create a custom teacher profile.
  static TeacherProfile create({
    String? id,
    String email = 'teacher@test.edu',
    String firstName = 'Test',
    String lastName = 'Teacher',
    String? displayName,
    String? title,
    String? schoolId,
  }) {
    return TeacherProfile(
      id: id ?? 'teacher-${DateTime.now().millisecondsSinceEpoch}',
      email: email,
      firstName: firstName,
      lastName: lastName,
      displayName: displayName,
      title: title,
      schoolId: schoolId,
      preferences: const TeacherPreferences(),
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }
}
