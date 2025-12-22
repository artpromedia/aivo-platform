/// Student Model Unit Tests
///
/// Tests for the Student model.
library;

import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_teacher/models/student.dart';

void main() {
  group('Student', () {
    group('constructor', () {
      test('should create student with required fields', () {
        final student = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.edu',
          classIds: ['class-1'],
        );

        expect(student.id, equals('student-1'));
        expect(student.firstName, equals('John'));
        expect(student.lastName, equals('Doe'));
        expect(student.email, equals('john.doe@test.edu'));
        expect(student.status, equals(StudentStatus.active));
        expect(student.hasIep, isFalse);
        expect(student.has504, isFalse);
      });

      test('should create student with all fields', () {
        final student = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@test.edu',
          classIds: ['class-1', 'class-2'],
          avatarUrl: 'https://example.com/avatar.jpg',
          gradeLevel: 5,
          dateOfBirth: DateTime(2014, 5, 15),
          status: StudentStatus.active,
          hasIep: true,
          has504: false,
          parentEmails: ['parent@test.com'],
          accommodations: ['extended_time', 'text_to_speech'],
          lastActiveAt: DateTime.now(),
          createdAt: DateTime(2024, 1, 1),
          updatedAt: DateTime.now(),
        );

        expect(student.hasIep, isTrue);
        expect(student.accommodations, hasLength(2));
        expect(student.gradeLevel, equals(5));
      });
    });

    group('fullName', () {
      test('should combine first and last name', () {
        final student = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: null,
          classIds: [],
        );

        expect(student.fullName, equals('John Doe'));
      });

      test('should handle empty first name', () {
        final student = Student(
          id: 'student-1',
          firstName: '',
          lastName: 'Doe',
          email: null,
          classIds: [],
        );

        expect(student.fullName, equals(' Doe'));
      });

      test('should handle empty last name', () {
        final student = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: '',
          email: null,
          classIds: [],
        );

        expect(student.fullName, equals('John '));
      });
    });

    group('initials', () {
      test('should return first letters of first and last name', () {
        final student = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: null,
          classIds: [],
        );

        expect(student.initials, equals('JD'));
      });

      test('should handle lowercase names', () {
        final student = Student(
          id: 'student-1',
          firstName: 'john',
          lastName: 'doe',
          email: null,
          classIds: [],
        );

        expect(student.initials, equals('JD'));
      });

      test('should handle empty first name', () {
        final student = Student(
          id: 'student-1',
          firstName: '',
          lastName: 'Doe',
          email: null,
          classIds: [],
        );

        expect(student.initials, equals('D'));
      });

      test('should handle empty last name', () {
        final student = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: '',
          email: null,
          classIds: [],
        );

        expect(student.initials, equals('J'));
      });
    });

    group('fromJson', () {
      test('should parse complete JSON', () {
        final json = {
          'id': 'student-1',
          'firstName': 'John',
          'lastName': 'Doe',
          'email': 'john@test.edu',
          'classIds': ['class-1', 'class-2'],
          'avatarUrl': 'https://example.com/avatar.jpg',
          'gradeLevel': 5,
          'dateOfBirth': '2014-05-15T00:00:00.000Z',
          'status': 'active',
          'hasIep': true,
          'has504': false,
          'parentEmails': ['parent@test.com'],
          'accommodations': ['extended_time'],
          'lastActiveAt': '2024-01-15T10:00:00.000Z',
          'createdAt': '2024-01-01T00:00:00.000Z',
          'updatedAt': '2024-01-15T10:00:00.000Z',
        };

        final student = Student.fromJson(json);

        expect(student.id, equals('student-1'));
        expect(student.firstName, equals('John'));
        expect(student.lastName, equals('Doe'));
        expect(student.classIds, hasLength(2));
        expect(student.gradeLevel, equals(5));
        expect(student.hasIep, isTrue);
        expect(student.accommodations, contains('extended_time'));
      });

      test('should handle missing optional fields', () {
        final json = {
          'id': 'student-1',
          'firstName': 'John',
          'lastName': 'Doe',
        };

        final student = Student.fromJson(json);

        expect(student.id, equals('student-1'));
        expect(student.email, isNull);
        expect(student.classIds, isEmpty);
        expect(student.avatarUrl, isNull);
        expect(student.gradeLevel, isNull);
        expect(student.hasIep, isFalse);
        expect(student.accommodations, isEmpty);
      });

      test('should handle null values', () {
        final json = {
          'id': 'student-1',
          'firstName': null,
          'lastName': null,
          'email': null,
          'classIds': null,
        };

        final student = Student.fromJson(json);

        expect(student.firstName, equals(''));
        expect(student.lastName, equals(''));
        expect(student.email, isNull);
        expect(student.classIds, isEmpty);
      });

      test('should parse all status values', () {
        for (final status in StudentStatus.values) {
          final json = {
            'id': 'student-1',
            'firstName': 'John',
            'lastName': 'Doe',
            'status': status.name,
          };

          final student = Student.fromJson(json);
          expect(student.status, equals(status));
        }
      });

      test('should default to active for unknown status', () {
        final json = {
          'id': 'student-1',
          'firstName': 'John',
          'lastName': 'Doe',
          'status': 'unknown_status',
        };

        final student = Student.fromJson(json);
        expect(student.status, equals(StudentStatus.active));
      });
    });

    group('toJson', () {
      test('should serialize all fields', () {
        final student = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.edu',
          classIds: ['class-1'],
          gradeLevel: 5,
          hasIep: true,
          accommodations: ['extended_time'],
        );

        final json = student.toJson();

        expect(json['id'], equals('student-1'));
        expect(json['firstName'], equals('John'));
        expect(json['lastName'], equals('Doe'));
        expect(json['email'], equals('john@test.edu'));
        expect(json['classIds'], equals(['class-1']));
        expect(json['gradeLevel'], equals(5));
        expect(json['hasIep'], isTrue);
        expect(json['accommodations'], contains('extended_time'));
      });

      test('should serialize null dates as null', () {
        final student = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: null,
          classIds: [],
        );

        final json = student.toJson();

        expect(json['dateOfBirth'], isNull);
        expect(json['lastActiveAt'], isNull);
        expect(json['createdAt'], isNull);
        expect(json['updatedAt'], isNull);
      });

      test('should round-trip through JSON', () {
        final original = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.edu',
          classIds: ['class-1', 'class-2'],
          gradeLevel: 5,
          hasIep: true,
          has504: false,
          accommodations: ['extended_time', 'text_to_speech'],
          status: StudentStatus.active,
        );

        final json = original.toJson();
        final restored = Student.fromJson(json);

        expect(restored.id, equals(original.id));
        expect(restored.firstName, equals(original.firstName));
        expect(restored.lastName, equals(original.lastName));
        expect(restored.email, equals(original.email));
        expect(restored.classIds, equals(original.classIds));
        expect(restored.gradeLevel, equals(original.gradeLevel));
        expect(restored.hasIep, equals(original.hasIep));
        expect(restored.has504, equals(original.has504));
        expect(restored.accommodations, equals(original.accommodations));
        expect(restored.status, equals(original.status));
      });
    });

    group('copyWith', () {
      test('should copy with updated fields', () {
        final original = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.edu',
          classIds: ['class-1'],
          gradeLevel: 5,
        );

        final updated = original.copyWith(
          firstName: 'Jane',
          gradeLevel: 6,
        );

        expect(updated.id, equals(original.id));
        expect(updated.firstName, equals('Jane'));
        expect(updated.lastName, equals(original.lastName));
        expect(updated.gradeLevel, equals(6));
      });

      test('should preserve original values when not specified', () {
        final original = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: 'john@test.edu',
          classIds: ['class-1'],
          gradeLevel: 5,
          hasIep: true,
          accommodations: ['extended_time'],
        );

        final updated = original.copyWith();

        expect(updated.id, equals(original.id));
        expect(updated.firstName, equals(original.firstName));
        expect(updated.hasIep, equals(original.hasIep));
        expect(updated.accommodations, equals(original.accommodations));
      });
    });

    group('equality', () {
      test('should be equal for same fields', () {
        final student1 = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: null,
          classIds: ['class-1'],
        );

        final student2 = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: null,
          classIds: ['class-1'],
        );

        expect(student1, equals(student2));
      });

      test('should not be equal for different ids', () {
        final student1 = Student(
          id: 'student-1',
          firstName: 'John',
          lastName: 'Doe',
          email: null,
          classIds: [],
        );

        final student2 = Student(
          id: 'student-2',
          firstName: 'John',
          lastName: 'Doe',
          email: null,
          classIds: [],
        );

        expect(student1, isNot(equals(student2)));
      });
    });
  });
}
