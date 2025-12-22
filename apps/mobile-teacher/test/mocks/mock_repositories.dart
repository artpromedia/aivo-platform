/// Mock Repositories
///
/// Mock repository implementations for testing.
library;

import 'dart:async';

import 'package:mobile_teacher/models/models.dart';
import 'package:mobile_teacher/repositories/repositories.dart';

import 'fixtures/fixtures.dart';

/// Fake student repository for integration testing.
class FakeStudentRepository implements StudentRepository {
  FakeStudentRepository({
    List<Student>? initialStudents,
  }) : _students = initialStudents ?? List.from(TestStudents.all);

  final List<Student> _students;
  final _controller = StreamController<List<Student>>.broadcast();

  @override
  Future<List<Student>> getStudents() async => List.from(_students);

  @override
  Future<Student> getStudent(String id) async {
    return _students.firstWhere(
      (s) => s.id == id,
      orElse: () => throw NotFoundException('Student not found: $id'),
    );
  }

  @override
  Future<List<Student>> getStudentsByClass(String classId) async {
    return _students.where((s) => s.classIds.contains(classId)).toList();
  }

  @override
  Future<List<Student>> searchStudents(String query) async {
    final lowerQuery = query.toLowerCase();
    return _students.where((s) {
      return s.fullName.toLowerCase().contains(lowerQuery) ||
          s.email?.toLowerCase().contains(lowerQuery) == true;
    }).toList();
  }

  @override
  Future<Student> updateStudent(Student student) async {
    final index = _students.indexWhere((s) => s.id == student.id);
    if (index == -1) {
      throw NotFoundException('Student not found: ${student.id}');
    }
    _students[index] = student;
    _controller.add(_students);
    return student;
  }

  @override
  Stream<List<Student>> watchStudents() => _controller.stream;

  void dispose() {
    _controller.close();
  }

  // Ignore other methods
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Fake session repository for integration testing.
class FakeSessionRepository implements SessionRepository {
  FakeSessionRepository({
    List<Session>? initialSessions,
  }) : _sessions = initialSessions ?? List.from(TestSessions.all);

  final List<Session> _sessions;
  final _controller = StreamController<List<Session>>.broadcast();

  @override
  Future<List<Session>> getSessions() async => List.from(_sessions);

  @override
  Future<Session> getSession(String id) async {
    return _sessions.firstWhere(
      (s) => s.id == id,
      orElse: () => throw NotFoundException('Session not found: $id'),
    );
  }

  @override
  Future<List<Session>> getActiveSessions(String classId) async {
    return _sessions.where((s) => s.isActive && s.classId == classId).toList();
  }

  @override
  Future<List<Session>> getSessionsByClass(String classId) async {
    return _sessions.where((s) => s.classId == classId).toList();
  }

  @override
  Future<Session> createSession(Session session) async {
    _sessions.add(session);
    _controller.add(_sessions);
    return session;
  }

  @override
  Future<Session> updateSession(Session session) async {
    final index = _sessions.indexWhere((s) => s.id == session.id);
    if (index == -1) {
      throw NotFoundException('Session not found: ${session.id}');
    }
    _sessions[index] = session;
    _controller.add(_sessions);
    return session;
  }

  @override
  Future<void> deleteSession(String id) async {
    _sessions.removeWhere((s) => s.id == id);
    _controller.add(_sessions);
  }

  @override
  Stream<List<Session>> watchSessions() => _controller.stream;

  void dispose() {
    _controller.close();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Fake IEP repository for integration testing.
class FakeIepRepository implements IepRepository {
  FakeIepRepository({
    List<IepGoal>? initialGoals,
  }) : _goals = initialGoals ?? List.from(TestIepGoals.all);

  final List<IepGoal> _goals;
  final _controller = StreamController<List<IepGoal>>.broadcast();

  @override
  Future<List<IepGoal>> getGoalsForStudent(String studentId) async {
    return _goals.where((g) => g.studentId == studentId).toList();
  }

  @override
  Future<IepGoal> getGoal(String id) async {
    return _goals.firstWhere(
      (g) => g.id == id,
      orElse: () => throw NotFoundException('Goal not found: $id'),
    );
  }

  @override
  Future<IepGoal> updateProgress(
    String goalId,
    double newValue,
    String? note,
  ) async {
    final index = _goals.indexWhere((g) => g.id == goalId);
    if (index == -1) {
      throw NotFoundException('Goal not found: $goalId');
    }

    final updatedGoal = _goals[index].copyWith(
      currentValue: newValue,
      updatedAt: DateTime.now(),
    );
    _goals[index] = updatedGoal;
    _controller.add(_goals);
    return updatedGoal;
  }

  @override
  Stream<List<IepGoal>> watchGoalsForStudent(String studentId) {
    return _controller.stream.map(
      (goals) => goals.where((g) => g.studentId == studentId).toList(),
    );
  }

  void dispose() {
    _controller.close();
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Fake class repository for integration testing.
class FakeClassRepository implements ClassRepository {
  FakeClassRepository({
    List<ClassGroup>? initialClasses,
  }) : _classes = initialClasses ?? List.from(TestClasses.all);

  final List<ClassGroup> _classes;

  @override
  Future<List<ClassGroup>> getClasses() async => List.from(_classes);

  @override
  Future<ClassGroup> getClass(String id) async {
    return _classes.firstWhere(
      (c) => c.id == id,
      orElse: () => throw NotFoundException('Class not found: $id'),
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Not found exception.
class NotFoundException implements Exception {
  const NotFoundException(this.message);
  final String message;

  @override
  String toString() => 'NotFoundException: $message';
}
