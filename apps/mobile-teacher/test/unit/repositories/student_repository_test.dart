/// Student Repository Unit Tests
///
/// Tests for the StudentRepository.
library;

import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import 'package:mobile_teacher/models/student.dart';
import 'package:mobile_teacher/repositories/student_repository.dart';

import '../../mocks/mock_providers.dart';
import '../../mocks/mock_api_client.dart';
import '../../mocks/fixtures/fixtures.dart';

void main() {
  late MockApiClient mockApiClient;
  late StudentRepository repository;

  setUpAll(() {
    registerFallbackValue(<String, dynamic>{});
  });

  setUp(() {
    mockApiClient = MockApiClient();
    repository = StudentRepository(apiClient: mockApiClient);
  });

  group('StudentRepository', () {
    group('getStudents', () {
      test('should return list of students from API', () async {
        // Arrange
        mockApiClient.mockGet(
          '/students',
          response: {
            'data': TestStudents.all.map((s) => s.toJson()).toList(),
          },
        );

        // Act
        final students = await repository.getStudents();

        // Assert
        expect(students, hasLength(TestStudents.all.length));
        expect(students.first.firstName, equals(TestStudents.all.first.firstName));
      });

      test('should handle empty response', () async {
        // Arrange
        mockApiClient.mockGet('/students', response: {'data': []});

        // Act
        final students = await repository.getStudents();

        // Assert
        expect(students, isEmpty);
      });

      test('should throw on API error', () async {
        // Arrange
        mockApiClient.mockGetError('/students', error: 'Network error');

        // Act & Assert
        expect(
          () => repository.getStudents(),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('getStudent', () {
      test('should return single student by id', () async {
        // Arrange
        mockApiClient.mockGet(
          '/students/student-alex',
          response: {'data': TestStudents.alex.toJson()},
        );

        // Act
        final student = await repository.getStudent('student-alex');

        // Assert
        expect(student.id, equals('student-alex'));
        expect(student.firstName, equals('Alex'));
      });

      test('should throw when student not found', () async {
        // Arrange
        mockApiClient.mockGetError(
          '/students/non-existent',
          statusCode: 404,
          error: 'Not found',
        );

        // Act & Assert
        expect(
          () => repository.getStudent('non-existent'),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('getStudentsByClass', () {
      test('should return students filtered by class', () async {
        // Arrange
        final mathStudents = TestStudents.all
            .where((s) => s.classIds.contains('class-math-5'))
            .toList();
        mockApiClient.mockGet(
          '/classes/class-math-5/students',
          response: {'data': mathStudents.map((s) => s.toJson()).toList()},
        );

        // Act
        final students = await repository.getStudentsByClass('class-math-5');

        // Assert
        for (final student in students) {
          expect(student.classIds, contains('class-math-5'));
        }
      });
    });

    group('searchStudents', () {
      test('should search students by query', () async {
        // Arrange
        mockApiClient.mockGet(
          '/students/search',
          queryParams: {'q': 'alex'},
          response: {
            'data': [TestStudents.alex.toJson()],
          },
        );

        // Act
        final students = await repository.searchStudents('alex');

        // Assert
        expect(students, hasLength(1));
        expect(students.first.firstName, equalsIgnoringCase('Alex'));
      });

      test('should return empty for no matches', () async {
        // Arrange
        mockApiClient.mockGet(
          '/students/search',
          queryParams: {'q': 'xyz'},
          response: {'data': []},
        );

        // Act
        final students = await repository.searchStudents('xyz');

        // Assert
        expect(students, isEmpty);
      });
    });

    group('createStudent', () {
      test('should create student via API', () async {
        // Arrange
        final newStudent = Student(
          id: 'new-student',
          firstName: 'New',
          lastName: 'Student',
          email: 'new@test.edu',
          classIds: ['class-1'],
        );
        mockApiClient.mockPost(
          '/students',
          response: {'data': newStudent.toJson()},
        );

        // Act
        final created = await repository.createStudent(newStudent);

        // Assert
        expect(created.id, equals('new-student'));
        expect(created.firstName, equals('New'));
      });

      test('should throw on validation error', () async {
        // Arrange
        final invalidStudent = Student(
          id: '',
          firstName: '',
          lastName: '',
          email: null,
          classIds: [],
        );
        mockApiClient.mockPostError(
          '/students',
          statusCode: 400,
          error: 'Validation failed',
        );

        // Act & Assert
        expect(
          () => repository.createStudent(invalidStudent),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('updateStudent', () {
      test('should update student via API', () async {
        // Arrange
        final updated = TestStudents.alex.copyWith(
          firstName: 'Alexander',
        );
        mockApiClient.mockPut(
          '/students/student-alex',
          response: {'data': updated.toJson()},
        );

        // Act
        final result = await repository.updateStudent(updated);

        // Assert
        expect(result.firstName, equals('Alexander'));
      });
    });

    group('deleteStudent', () {
      test('should delete student via API', () async {
        // Arrange
        mockApiClient.mockDelete('/students/student-alex');

        // Act & Assert
        await expectLater(
          repository.deleteStudent('student-alex'),
          completes,
        );
      });

      test('should throw on delete error', () async {
        // Arrange
        mockApiClient.mockDeleteError(
          '/students/student-alex',
          statusCode: 403,
          error: 'Forbidden',
        );

        // Act & Assert
        expect(
          () => repository.deleteStudent('student-alex'),
          throwsA(isA<Exception>()),
        );
      });
    });

    group('caching', () {
      test('should cache students after first fetch', () async {
        // Arrange
        mockApiClient.mockGet(
          '/students',
          response: {
            'data': TestStudents.all.map((s) => s.toJson()).toList(),
          },
        );

        // Act
        await repository.getStudents();
        await repository.getStudents();

        // Assert - API called only once
        expect(mockApiClient.requestLog.where((r) => r.path == '/students').length, equals(1));
      });

      test('should invalidate cache on create', () async {
        // Arrange
        mockApiClient.mockGet(
          '/students',
          response: {
            'data': TestStudents.all.map((s) => s.toJson()).toList(),
          },
        );
        final newStudent = Student(
          id: 'new',
          firstName: 'New',
          lastName: 'Student',
          email: null,
          classIds: [],
        );
        mockApiClient.mockPost(
          '/students',
          response: {'data': newStudent.toJson()},
        );

        // Act
        await repository.getStudents();
        await repository.createStudent(newStudent);
        await repository.getStudents();

        // Assert - API called twice for GET
        expect(mockApiClient.requestLog.where((r) => r.path == '/students' && r.method == 'GET').length, equals(2));
      });

      test('should invalidate cache on update', () async {
        // Arrange
        mockApiClient.mockGet(
          '/students',
          response: {
            'data': TestStudents.all.map((s) => s.toJson()).toList(),
          },
        );
        final updated = TestStudents.alex.copyWith(firstName: 'Updated');
        mockApiClient.mockPut(
          '/students/student-alex',
          response: {'data': updated.toJson()},
        );

        // Act
        await repository.getStudents();
        await repository.updateStudent(updated);
        await repository.getStudents();

        // Assert - API called twice for GET
        expect(mockApiClient.requestLog.where((r) => r.path == '/students' && r.method == 'GET').length, equals(2));
      });

      test('should force refresh when requested', () async {
        // Arrange
        mockApiClient.mockGet(
          '/students',
          response: {
            'data': TestStudents.all.map((s) => s.toJson()).toList(),
          },
        );

        // Act
        await repository.getStudents();
        await repository.getStudents(forceRefresh: true);

        // Assert - API called twice
        expect(mockApiClient.requestLog.where((r) => r.path == '/students').length, equals(2));
      });
    });

    group('offline support', () {
      test('should return cached data when offline', () async {
        // Arrange - first fetch succeeds
        mockApiClient.mockGet(
          '/students',
          response: {
            'data': TestStudents.all.map((s) => s.toJson()).toList(),
          },
        );

        await repository.getStudents();

        // Simulate offline
        mockApiClient.mockGetError('/students', error: 'Network error');

        // Act
        final students = await repository.getStudents();

        // Assert - returns cached data
        expect(students, hasLength(TestStudents.all.length));
      });

      test('should queue updates when offline', () async {
        // Arrange
        mockApiClient.setOffline(true);

        final updated = TestStudents.alex.copyWith(firstName: 'Offline');

        // Act
        final result = await repository.updateStudent(updated);

        // Assert - returns optimistic result
        expect(result.firstName, equals('Offline'));
        expect(repository.hasPendingOperations, isTrue);
      });
    });
  });
}
