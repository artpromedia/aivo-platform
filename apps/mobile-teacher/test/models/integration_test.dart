import 'package:flutter_test/flutter_test.dart';
import 'package:mobile_teacher/models/integration.dart';

void main() {
  group('IntegrationConnection', () {
    test('fromJson creates valid connection', () {
      final json = {
        'type': 'googleClassroom',
        'status': 'connected',
        'email': 'teacher@school.edu',
        'lastSyncAt': '2024-01-15T10:30:00Z',
      };

      final connection = IntegrationConnection.fromJson(json);

      expect(connection.type, IntegrationType.googleClassroom);
      expect(connection.status, IntegrationStatus.connected);
      expect(connection.email, 'teacher@school.edu');
      expect(connection.isConnected, true);
    });

    test('isConnected returns false for other statuses', () {
      final disconnected = IntegrationConnection(
        type: IntegrationType.canvas,
        status: IntegrationStatus.disconnected,
      );
      final connecting = IntegrationConnection(
        type: IntegrationType.clever,
        status: IntegrationStatus.connecting,
      );
      final error = IntegrationConnection(
        type: IntegrationType.googleClassroom,
        status: IntegrationStatus.error,
        error: 'Auth failed',
      );

      expect(disconnected.isConnected, false);
      expect(connecting.isConnected, false);
      expect(error.isConnected, false);
    });
  });

  group('GoogleClassroomCourse', () {
    test('fromJson creates valid course', () {
      final json = {
        'id': 'gc1',
        'name': 'AP Math',
        'section': 'Period 3',
        'room': 'Room 201',
        'studentCount': 28,
        'isMapped': true,
        'mappedClassId': 'c1',
      };

      final course = GoogleClassroomCourse.fromJson(json);

      expect(course.id, 'gc1');
      expect(course.name, 'AP Math');
      expect(course.section, 'Period 3');
      expect(course.studentCount, 28);
      expect(course.isMapped, true);
      expect(course.mappedClassId, 'c1');
    });

    test('defaults isMapped to false', () {
      final json = {
        'id': 'gc1',
        'name': 'English',
      };

      final course = GoogleClassroomCourse.fromJson(json);

      expect(course.isMapped, false);
      expect(course.mappedClassId, null);
    });
  });

  group('CourseMapping', () {
    test('fromJson creates valid mapping', () {
      final json = {
        'id': 'm1',
        'aivoClassId': 'c1',
        'externalCourseId': 'gc1',
        'integrationType': 'googleClassroom',
        'aivoClassName': 'Math 101',
        'externalCourseName': 'AP Math',
        'syncRoster': true,
        'syncGrades': true,
        'syncAssignments': false,
        'lastSyncAt': '2024-01-15T10:30:00Z',
      };

      final mapping = CourseMapping.fromJson(json);

      expect(mapping.id, 'm1');
      expect(mapping.aivoClassId, 'c1');
      expect(mapping.integrationType, IntegrationType.googleClassroom);
      expect(mapping.syncRoster, true);
      expect(mapping.syncGrades, true);
      expect(mapping.syncAssignments, false);
    });

    test('copyWith creates modified copy', () {
      final original = CourseMapping(
        id: 'm1',
        aivoClassId: 'c1',
        externalCourseId: 'gc1',
        integrationType: IntegrationType.googleClassroom,
        syncRoster: true,
        syncGrades: false,
        syncAssignments: false,
      );

      final modified = original.copyWith(syncGrades: true);

      expect(modified.syncGrades, true);
      expect(original.syncGrades, false);
    });
  });

  group('SyncHistoryEntry', () {
    test('fromJson creates valid entry', () {
      final json = {
        'id': 'sh1',
        'mappingId': 'm1',
        'syncType': 'roster',
        'status': 'completed',
        'startedAt': '2024-01-15T10:00:00Z',
        'completedAt': '2024-01-15T10:05:00Z',
        'itemsSynced': 28,
        'itemsFailed': 0,
      };

      final entry = SyncHistoryEntry.fromJson(json);

      expect(entry.id, 'sh1');
      expect(entry.syncType, 'roster');
      expect(entry.status, 'completed');
      expect(entry.isComplete, true);
      expect(entry.isSuccess, true);
      expect(entry.itemsSynced, 28);
    });

    test('isSuccess returns false when items failed', () {
      final entry = SyncHistoryEntry(
        id: 'sh1',
        mappingId: 'm1',
        syncType: 'grades',
        status: 'completed',
        startedAt: DateTime.now(),
        itemsSynced: 25,
        itemsFailed: 3,
      );

      expect(entry.isComplete, true);
      expect(entry.isSuccess, false);
    });

    test('duration calculates correctly', () {
      final start = DateTime(2024, 1, 15, 10, 0, 0);
      final end = DateTime(2024, 1, 15, 10, 5, 30);

      final entry = SyncHistoryEntry(
        id: 'sh1',
        mappingId: 'm1',
        syncType: 'full',
        status: 'completed',
        startedAt: start,
        completedAt: end,
      );

      expect(entry.duration?.inSeconds, 330);
    });

    test('duration returns null when not completed', () {
      final entry = SyncHistoryEntry(
        id: 'sh1',
        mappingId: 'm1',
        syncType: 'roster',
        status: 'running',
        startedAt: DateTime.now(),
      );

      expect(entry.duration, null);
    });
  });

  group('PendingGradePassback', () {
    test('fromJson creates valid entry', () {
      final json = {
        'studentId': 'st1',
        'assignmentId': 'a1',
        'grade': 95.0,
        'externalStudentId': 'gc_st1',
        'externalAssignmentId': 'gc_a1',
        'studentName': 'John Doe',
        'assignmentTitle': 'Quiz 1',
        'pendingSince': '2024-01-15T09:00:00Z',
      };

      final entry = PendingGradePassback.fromJson(json);

      expect(entry.studentId, 'st1');
      expect(entry.grade, 95.0);
      expect(entry.externalStudentId, 'gc_st1');
      expect(entry.studentName, 'John Doe');
    });

    test('toJson produces valid JSON', () {
      final entry = PendingGradePassback(
        studentId: 'st1',
        assignmentId: 'a1',
        grade: 88.5,
        externalStudentId: 'gc_st1',
        externalAssignmentId: 'gc_a1',
      );

      final json = entry.toJson();

      expect(json['studentId'], 'st1');
      expect(json['grade'], 88.5);
    });
  });
}
