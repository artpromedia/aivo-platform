/// Students Provider Tests
library;

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';

import '../mocks/mocks.dart';
import 'package:mobile_teacher/providers/providers.dart';
import 'package:mobile_teacher/models/models.dart';

void main() {
  late MockStudentRepository mockRepository;
  late ProviderContainer container;

  setUp(() {
    mockRepository = MockStudentRepository();
    
    container = ProviderContainer(
      overrides: [
        studentRepositoryProvider.overrideWithValue(mockRepository),
      ],
    );
  });

  tearDown(() {
    container.dispose();
  });

  group('StudentsProvider', () {
    test('initial state is empty and not loading', () {
      // Act
      final state = container.read(studentsProvider);

      // Assert
      expect(state.students, isEmpty);
      expect(state.isLoading, false);
      expect(state.error, isNull);
    });

    test('loadStudents fetches and stores students', () async {
      // Arrange
      final students = TestDataFactory.createStudents(5);
      when(() => mockRepository.getStudents())
          .thenAnswer((_) async => students);

      // Act
      await container.read(studentsProvider.notifier).loadStudents();
      final state = container.read(studentsProvider);

      // Assert
      expect(state.students.length, 5);
      expect(state.isLoading, false);
      expect(state.lastUpdated, isNotNull);
      verify(() => mockRepository.getStudents()).called(1);
    });

    test('loadStudents sets error on failure', () async {
      // Arrange
      when(() => mockRepository.getStudents())
          .thenThrow(Exception('Network error'));

      // Act
      await container.read(studentsProvider.notifier).loadStudents();
      final state = container.read(studentsProvider);

      // Assert
      expect(state.students, isEmpty);
      expect(state.isLoading, false);
      expect(state.error, contains('Network error'));
    });

    test('updateStudent updates student in state', () async {
      // Arrange
      final student = TestDataFactory.createStudent();
      final updatedStudent = TestDataFactory.createStudent(firstName: 'Updated');
      
      when(() => mockRepository.getStudents())
          .thenAnswer((_) async => [student]);
      when(() => mockRepository.updateStudent(any(), any()))
          .thenAnswer((_) async => updatedStudent);

      // Load initial students
      await container.read(studentsProvider.notifier).loadStudents();

      // Act
      await container.read(studentsProvider.notifier).updateStudent(
        student.id,
        UpdateStudentDto(firstName: 'Updated'),
      );
      final state = container.read(studentsProvider);

      // Assert
      expect(state.students.first.firstName, 'Updated');
    });

    test('refreshStudents calls repository refresh', () async {
      // Arrange
      final students = TestDataFactory.createStudents(3);
      when(() => mockRepository.refreshStudents())
          .thenAnswer((_) async => students);

      // Act
      await container.read(studentsProvider.notifier).refreshStudents();
      final state = container.read(studentsProvider);

      // Assert
      expect(state.students.length, 3);
      verify(() => mockRepository.refreshStudents()).called(1);
    });
  });

  group('StudentsWithIepProvider', () {
    test('filters students with IEP', () async {
      // Arrange
      final students = [
        TestDataFactory.createStudent(id: '1', hasIep: true),
        TestDataFactory.createStudent(id: '2', hasIep: false),
        TestDataFactory.createStudent(id: '3', hasIep: true),
      ];
      when(() => mockRepository.getStudents())
          .thenAnswer((_) async => students);

      // Act
      await container.read(studentsProvider.notifier).loadStudents();
      final iepStudents = container.read(studentsWithIepProvider);

      // Assert
      expect(iepStudents.length, 2);
      expect(iepStudents.every((s) => s.hasIep), true);
    });
  });

  group('StudentsRequiringAttentionProvider', () {
    test('filters students needing attention', () async {
      // Arrange
      final students = [
        TestDataFactory.createStudent(id: '1', status: StudentStatus.active),
        TestDataFactory.createStudent(id: '2', status: StudentStatus.inactive),
        TestDataFactory.createStudent(id: '3', status: StudentStatus.active),
      ];
      when(() => mockRepository.getStudents())
          .thenAnswer((_) async => students);

      // Act
      await container.read(studentsProvider.notifier).loadStudents();
      final attentionStudents = container.read(studentsRequiringAttentionProvider);

      // Assert - inactive students need attention
      expect(attentionStudents.length, 1);
      expect(attentionStudents.first.id, '2');
    });
  });
}
