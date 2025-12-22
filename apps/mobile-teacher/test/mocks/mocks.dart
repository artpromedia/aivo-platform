/// Test Mocks
///
/// Mock implementations for testing.
library;

import 'package:flutter_common/flutter_common.dart' hide SyncStatus, SyncOperationType, SessionType;
import 'package:mocktail/mocktail.dart';

import 'package:mobile_teacher/models/models.dart';
import 'package:mobile_teacher/repositories/repositories.dart';
import 'package:mobile_teacher/services/database/local_database.dart';
import 'package:mobile_teacher/services/sync/sync_service.dart';
import 'package:mobile_teacher/services/sync/connectivity_monitor.dart';

// ============================================================================
// Service Mocks
// ============================================================================

class MockAivoApiClient extends Mock implements AivoApiClient {}

class MockOfflineDatabase extends Mock implements OfflineDatabase {}

class MockTeacherLocalDatabase extends Mock implements TeacherLocalDatabase {}

class MockSyncService extends Mock implements SyncService {}

class MockConnectivityMonitor extends Mock implements ConnectivityMonitor {}

class MockConnectivityService extends Mock implements ConnectivityService {}

// ============================================================================
// Repository Mocks
// ============================================================================

class MockStudentRepository extends Mock implements StudentRepository {}

class MockSessionRepository extends Mock implements SessionRepository {}

class MockIepRepository extends Mock implements IepRepository {}

class MockMessageRepository extends Mock implements MessageRepository {}

class MockClassRepository extends Mock implements ClassRepository {}

// ============================================================================
// Test Data Factories
// ============================================================================

/// Factory for creating test data.
class TestDataFactory {
  static Student createStudent({
    String id = 'student-1',
    String firstName = 'John',
    String lastName = 'Doe',
    String email = 'john.doe@example.com',
    List<String> classIds = const ['class-1'],
    int? gradeLevel = 5,
    bool hasIep = false,
    StudentStatus status = StudentStatus.active,
  }) {
    return Student(
      id: id,
      firstName: firstName,
      lastName: lastName,
      email: email,
      classIds: classIds,
      gradeLevel: gradeLevel,
      hasIep: hasIep,
      status: status,
      accommodations: [],
      createdAt: DateTime.now(),
    );
  }

  static List<Student> createStudents(int count, {bool withIep = false}) {
    return List.generate(count, (i) => createStudent(
      id: 'student-$i',
      firstName: 'Student',
      lastName: '${i + 1}',
      email: 'student$i@example.com',
      hasIep: withIep && i % 2 == 0,
    ));
  }

  static Session createSession({
    String id = 'session-1',
    String classId = 'class-1',
    SessionStatus status = SessionStatus.scheduled,
    SessionType sessionType = SessionType.individual,
    String? title,
    List<String> studentIds = const [],
  }) {
    return Session(
      id: id,
      classId: classId,
      teacherId: 'teacher-1',
      status: status,
      sessionType: sessionType,
      title: title ?? 'Test Session',
      studentIds: studentIds.isEmpty ? ['student-1'] : studentIds,
      createdAt: DateTime.now(),
    );
  }

  static List<Session> createSessions(int count) {
    return List.generate(count, (i) => createSession(
      id: 'session-$i',
      title: 'Session ${i + 1}',
      status: i == 0 ? SessionStatus.active : SessionStatus.scheduled,
    ));
  }

  static IepGoal createIepGoal({
    String id = 'goal-1',
    String studentId = 'student-1',
    GoalCategory category = GoalCategory.reading,
    double currentValue = 50,
    double targetValue = 100,
    GoalStatus status = GoalStatus.inProgress,
  }) {
    return IepGoal(
      id: id,
      studentId: studentId,
      category: category,
      description: 'Test goal description',
      targetCriteria: 'Achieve target value',
      targetValue: targetValue,
      currentValue: currentValue,
      startDate: DateTime.now().subtract(const Duration(days: 30)),
      targetDate: DateTime.now().add(const Duration(days: 60)),
      status: status,
    );
  }

  static List<IepGoal> createIepGoals(int count, {String? studentId}) {
    return List.generate(count, (i) => createIepGoal(
      id: 'goal-$i',
      studentId: studentId ?? 'student-1',
      category: GoalCategory.values[i % GoalCategory.values.length],
      currentValue: (i + 1) * 20.0,
    ));
  }

  static Message createMessage({
    String id = 'msg-1',
    String conversationId = 'conv-1',
    String content = 'Test message',
    bool isFromTeacher = true,
  }) {
    return Message(
      id: id,
      conversationId: conversationId,
      senderId: isFromTeacher ? 'teacher-1' : 'parent-1',
      senderName: isFromTeacher ? 'Teacher' : 'Parent',
      content: content,
      createdAt: DateTime.now(),
      isFromTeacher: isFromTeacher,
    );
  }

  static Conversation createConversation({
    String id = 'conv-1',
    String studentName = 'Student Name',
    List<String> participantNames = const ['Parent Name'],
    int unreadCount = 0,
  }) {
    return Conversation(
      id: id,
      studentId: 'student-1',
      studentName: studentName,
      participantIds: ['parent-1'],
      participantNames: participantNames,
      unreadCount: unreadCount,
      lastMessage: 'Last message',
      lastMessageAt: DateTime.now(),
    );
  }

  static ClassGroup createClassGroup({
    String id = 'class-1',
    String name = 'Test Class',
    String teacherId = 'teacher-1',
    int studentCount = 10,
  }) {
    return ClassGroup(
      id: id,
      name: name,
      teacherId: teacherId,
      gradeLevel: 5,
      subject: 'Math',
      studentCount: studentCount,
      createdAt: DateTime.now(),
    );
  }

  static SyncOperation createSyncOperation({
    String id = 'sync-1',
    SyncOperationType type = SyncOperationType.update,
    String entityType = 'student',
    String entityId = 'student-1',
    SyncStatus status = SyncStatus.pending,
  }) {
    return SyncOperation(
      id: id,
      type: type,
      entityType: entityType,
      entityId: entityId,
      data: {'test': 'data'},
      status: status,
      createdAt: DateTime.now(),
    );
  }
}
