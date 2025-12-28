/// Mock Repositories
///
/// Mock repository implementations for testing.
library;

import 'package:mobile_teacher/models/models.dart';
import 'package:mobile_teacher/repositories/repositories.dart';

import 'fixtures/fixtures.dart';

/// Fake student repository for integration testing.
class FakeStudentRepository implements StudentRepository {
  FakeStudentRepository({
    List<Student>? initialStudents,
  }) : _students = initialStudents ?? List.from(TestStudents.all);

  final List<Student> _students;

  @override
  Future<List<Student>> getStudents() async => List.from(_students);

  @override
  Future<Student?> getStudent(String id) async {
    try {
      return _students.firstWhere((s) => s.id == id);
    } catch (_) {
      return null;
    }
  }

  @override
  Future<List<Student>> getStudentsByClass(String classId) async {
    return _students.where((s) => s.classIds.contains(classId)).toList();
  }

  @override
  Future<Student> updateStudent(String id, UpdateStudentDto dto) async {
    final index = _students.indexWhere((s) => s.id == id);
    if (index == -1) {
      throw NotFoundException('Student not found: $id');
    }
    // Apply DTO updates to student
    final updated = _students[index].copyWith(
      firstName: dto.firstName,
      lastName: dto.lastName,
      gradeLevel: dto.gradeLevel,
      accommodations: dto.accommodations,
      hasIep: dto.hasIep,
      has504: dto.has504,
    );
    _students[index] = updated;
    return updated;
  }

  @override
  Future<List<Student>> refreshStudents() async => List.from(_students);

  // Pass through other methods
  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Fake session repository for integration testing.
class FakeSessionRepository implements SessionRepository {
  FakeSessionRepository({
    List<Session>? initialSessions,
  }) : _sessions = initialSessions ?? List.from(TestSessions.all);

  final List<Session> _sessions;

  @override
  Future<List<Session>> getSessions() async => List.from(_sessions);

  @override
  Future<Session?> getSession(String id) async {
    try {
      return _sessions.firstWhere((s) => s.id == id);
    } catch (_) {
      return null;
    }
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
  Future<Session> createSession(CreateSessionDto dto) async {
    final session = Session(
      id: 'fake_${DateTime.now().millisecondsSinceEpoch}',
      classId: dto.classId,
      teacherId: 'teacher_1',
      status: SessionStatus.scheduled,
      sessionType: dto.sessionType,
      title: dto.title,
      description: dto.description,
      studentIds: dto.studentIds,
      subject: dto.subject,
      scheduledAt: dto.scheduledAt,
      durationMinutes: dto.durationMinutes,
      objectives: dto.objectives,
      createdAt: DateTime.now(),
    );
    _sessions.add(session);
    return session;
  }

  @override
  Future<Session> startSession(String id) async {
    final index = _sessions.indexWhere((s) => s.id == id);
    if (index == -1) {
      throw NotFoundException('Session not found: $id');
    }
    final updated = _sessions[index].copyWith(
      status: SessionStatus.active,
      startedAt: DateTime.now(),
    );
    _sessions[index] = updated;
    return updated;
  }

  @override
  Future<Session> endSession(String id, {String? notes}) async {
    final index = _sessions.indexWhere((s) => s.id == id);
    if (index == -1) {
      throw NotFoundException('Session not found: $id');
    }
    final updated = _sessions[index].copyWith(
      status: SessionStatus.completed,
      endedAt: DateTime.now(),
    );
    _sessions[index] = updated;
    return updated;
  }

  @override
  Future<SessionNote> addSessionNote({
    required String sessionId,
    required String content,
    String? studentId,
    bool isPrivate = false,
    List<String> tags = const [],
  }) async {
    return SessionNote(
      id: 'note_${DateTime.now().millisecondsSinceEpoch}',
      sessionId: sessionId,
      studentId: studentId,
      content: content,
      isPrivate: isPrivate,
      tags: tags,
      createdAt: DateTime.now(),
    );
  }

  @override
  Future<List<Session>> refreshSessions() async => List.from(_sessions);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Fake IEP repository for integration testing.
class FakeIepRepository implements IepRepository {
  FakeIepRepository({
    List<IepGoal>? initialGoals,
  }) : _goals = initialGoals ?? List.from(TestIepGoals.all);

  final List<IepGoal> _goals;

  @override
  Future<List<IepGoal>> getGoals(String studentId) async {
    return _goals.where((g) => g.studentId == studentId).toList();
  }

  @override
  Future<List<IepGoal>> getAllGoals() async {
    return List.from(_goals);
  }

  @override
  Future<List<IepGoal>> getGoalsAtRisk() async {
    return _goals.where((g) => g.status == GoalStatus.atRisk || !g.isOnTrack).toList();
  }

  @override
  Future<IepProgress> recordProgress(RecordProgressDto dto) async {
    final index = _goals.indexWhere((g) => g.id == dto.goalId);
    if (index != -1) {
      final goal = _goals[index];
      final progress = IepProgress(
        id: 'progress_${DateTime.now().millisecondsSinceEpoch}',
        goalId: dto.goalId,
        value: dto.value,
        recordedAt: DateTime.now(),
        notes: dto.notes,
        sessionId: dto.sessionId,
      );
      final updatedGoal = goal.copyWith(
        currentValue: dto.value,
        progressHistory: [...goal.progressHistory, progress],
        updatedAt: DateTime.now(),
      );
      _goals[index] = updatedGoal;
      return progress;
    }
    throw NotFoundException('Goal not found: ${dto.goalId}');
  }

  @override
  Future<IepReport?> generateReport(String studentId, DateRange range) async {
    return null; // Fake doesn't generate reports
  }

  @override
  Future<List<GoalRecommendation>> getRecommendations(String studentId) async {
    return []; // Fake returns empty recommendations
  }

  @override
  Future<List<IepGoal>> refreshGoals(String studentId) async {
    return getGoals(studentId);
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
