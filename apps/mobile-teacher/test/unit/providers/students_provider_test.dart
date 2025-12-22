/// Students Provider Unit Tests
///
/// Tests for the students provider.
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_teacher/models/models.dart';
import 'package:mobile_teacher/providers/students_provider.dart';
import 'package:mobile_teacher/repositories/student_repository.dart';

import '../../mocks/mock_providers.dart';
import '../../mocks/fixtures/students.dart';

void main() {
  late ProviderContainer container;

  setUp(() {
    setupDefaultMocks();
    container = ProviderContainer(overrides: defaultMockProviders);
  });

  tearDown(() {
    container.dispose();
    resetAllMocks();
  });

  group('StudentsProvider', () {
    group('studentsProvider', () {
      test('should load students from repository', () async {
        // Arrange
        when(() => mockStudentRepository.getStudents())
            .thenAnswer((_) async => TestStudents.all);

        // Act
        final students = await container.read(studentsProvider.future);

        // Assert
        expect(students, equals(TestStudents.all));
        verify(() => mockStudentRepository.getStudents()).called(1);
      });

      test('should return empty list when no students', () async {
        // Arrange
        when(() => mockStudentRepository.getStudents())
            .thenAnswer((_) async => []);

        // Act
        final students = await container.read(studentsProvider.future);

        // Assert
        expect(students, isEmpty);
      });

      test('should handle repository errors', () async {
        // Arrange
        when(() => mockStudentRepository.getStudents())
            .thenThrow(Exception('Database error'));

        // Act & Assert
        expect(
          () => container.read(studentsProvider.future),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('studentProvider', () {
      test('should return specific student by id', () async {
        // Arrange
        when(() => mockStudentRepository.getStudent('student-alex'))
            .thenAnswer((_) async => TestStudents.alex);

        // Act
        final student =
            await container.read(studentProvider('student-alex').future);

        // Assert
        expect(student, equals(TestStudents.alex));
        expect(student.firstName, equals('Alex'));
      });

      test('should throw when student not found', () async {
        // Arrange
        when(() => mockStudentRepository.getStudent('non-existent'))
            .thenThrow(Exception('Student not found'));

        // Act & Assert
        expect(
          () => container.read(studentProvider('non-existent').future),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('studentsByClassProvider', () {
      test('should filter students by class', () async {
        // Arrange
        final mathStudents = TestStudents.all
            .where((s) => s.classIds.contains('class-math-5'))
            .toList();
        when(() => mockStudentRepository.getStudentsByClass('class-math-5'))
            .thenAnswer((_) async => mathStudents);

        // Act
        final students = await container
            .read(studentsByClassProvider('class-math-5').future);

        // Assert
        expect(students, equals(mathStudents));
        for (final student in students) {
          expect(student.classIds, contains('class-math-5'));
        }
      });
    });

    group('studentsWithIepProvider', () {
      test('should filter students with IEP', () async {
        // Arrange
        when(() => mockStudentRepository.getStudents())
            .thenAnswer((_) async => TestStudents.all);

        // Act
        final students = await container.read(studentsWithIepProvider.future);

        // Assert
        expect(students.every((s) => s.hasIep), isTrue);
        expect(students, contains(TestStudents.alex));
        expect(students, isNot(contains(TestStudents.emma)));
      });
    });

    group('studentSearchProvider', () {
      test('should search students by name', () async {
        // Arrange
        when(() => mockStudentRepository.searchStudents('alex')).thenAnswer(
          (_) async =>
              TestStudents.all.where((s) => s.fullName.toLowerCase().contains('alex')).toList(),
        );

        // Act
        final results =
            await container.read(studentSearchProvider('alex').future);

        // Assert
        expect(results, hasLength(1));
        expect(results.first.firstName, equals('Alex'));
      });

      test('should return empty for no matches', () async {
        // Arrange
        when(() => mockStudentRepository.searchStudents('xyz'))
            .thenAnswer((_) async => []);

        // Act
        final results =
            await container.read(studentSearchProvider('xyz').future);

        // Assert
        expect(results, isEmpty);
      });

      test('should search case-insensitively', () async {
        // Arrange
        when(() => mockStudentRepository.searchStudents('ALEX')).thenAnswer(
          (_) async => [TestStudents.alex],
        );

        // Act
        final results =
            await container.read(studentSearchProvider('ALEX').future);

        // Assert
        expect(results, hasLength(1));
      });
    });

    group('studentsNeedingAttentionProvider', () {
      test('should identify students needing attention', () async {
        // Arrange
        when(() => mockStudentRepository.getStudents())
            .thenAnswer((_) async => TestStudents.all);

        // Act
        final students =
            await container.read(studentsNeedingAttentionProvider.future);

        // Assert
        // Students with at-risk IEP goals or low progress
        expect(students, isNotEmpty);
      });
    });
  });

  group('StudentsNotifier', () {
    group('refresh', () {
      test('should reload students from repository', () async {
        // Arrange
        when(() => mockStudentRepository.getStudents())
            .thenAnswer((_) async => TestStudents.all);

        // Initial load
        await container.read(studentsProvider.future);

        // Add a new student
        final updatedStudents = [
          ...TestStudents.all,
          TestStudents.create(id: 'new-student', firstName: 'New'),
        ];
        when(() => mockStudentRepository.getStudents())
            .thenAnswer((_) async => updatedStudents);

        // Act
        await container.read(studentsProvider.notifier).refresh();
        final students = await container.read(studentsProvider.future);

        // Assert
        expect(students, hasLength(TestStudents.all.length + 1));
      });
    });
  });
}
