/// Session Model Unit Tests
///
/// Tests for the Session model.
library;

import 'package:flutter_test/flutter_test.dart';

import 'package:mobile_teacher/models/session.dart';

void main() {
  group('Session', () {
    group('constructor', () {
      test('should create session with required fields', () {
        final session = Session(
          id: 'session-1',
          title: 'Math Practice',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
        );

        expect(session.id, equals('session-1'));
        expect(session.title, equals('Math Practice'));
        expect(session.classId, equals('class-1'));
        expect(session.status, equals(SessionStatus.scheduled));
      });

      test('should create session with all fields', () {
        final now = DateTime.now();
        final session = Session(
          id: 'session-1',
          title: 'Math Practice',
          description: 'Multiplication facts 1-12',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
          scheduledAt: now,
          startedAt: now,
          endedAt: null,
          duration: const Duration(minutes: 45),
          studentIds: ['student-1', 'student-2'],
          notes: 'Good progress',
          activityType: 'practice',
          objectives: ['Master 5x tables', 'Review 6x tables'],
          createdAt: now,
          updatedAt: now,
        );

        expect(session.description, equals('Multiplication facts 1-12'));
        expect(session.studentIds, hasLength(2));
        expect(session.objectives, hasLength(2));
        expect(session.duration, equals(const Duration(minutes: 45)));
      });
    });

    group('status predicates', () {
      test('isActive should return true for active sessions', () {
        final session = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
        );

        expect(session.isActive, isTrue);
        expect(session.isScheduled, isFalse);
        expect(session.isCompleted, isFalse);
      });

      test('isScheduled should return true for scheduled sessions', () {
        final session = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
        );

        expect(session.isScheduled, isTrue);
        expect(session.isActive, isFalse);
      });

      test('isCompleted should return true for completed sessions', () {
        final session = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.completed,
        );

        expect(session.isCompleted, isTrue);
        expect(session.isActive, isFalse);
      });

      test('isPaused should return true for paused sessions', () {
        final session = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.paused,
        );

        expect(session.isPaused, isTrue);
      });

      test('isCancelled should return true for cancelled sessions', () {
        final session = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.cancelled,
        );

        expect(session.isCancelled, isTrue);
      });
    });

    group('elapsed duration', () {
      test('should calculate elapsed time for active session', () {
        final startTime = DateTime.now().subtract(const Duration(minutes: 10));
        final session = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
          startedAt: startTime,
        );

        expect(session.elapsedDuration.inMinutes, closeTo(10, 1));
      });

      test('should calculate elapsed time for completed session', () {
        final startTime = DateTime.now().subtract(const Duration(minutes: 45));
        final endTime = DateTime.now().subtract(const Duration(minutes: 5));
        final session = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.completed,
          startedAt: startTime,
          endedAt: endTime,
        );

        expect(session.elapsedDuration.inMinutes, equals(40));
      });

      test('should return zero duration if not started', () {
        final session = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
        );

        expect(session.elapsedDuration, equals(Duration.zero));
      });
    });

    group('fromJson / toJson', () {
      test('should round-trip through JSON', () {
        final now = DateTime.now();
        final original = Session(
          id: 'session-1',
          title: 'Math Practice',
          description: 'Practice session',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
          scheduledAt: now,
          startedAt: now,
          studentIds: ['student-1', 'student-2'],
          notes: 'Going well',
          activityType: 'practice',
          objectives: ['Master multiplication'],
          createdAt: now,
          updatedAt: now,
        );

        final json = original.toJson();
        final restored = Session.fromJson(json);

        expect(restored.id, equals(original.id));
        expect(restored.title, equals(original.title));
        expect(restored.description, equals(original.description));
        expect(restored.classId, equals(original.classId));
        expect(restored.status, equals(original.status));
        expect(restored.studentIds, equals(original.studentIds));
        expect(restored.notes, equals(original.notes));
        expect(restored.objectives, equals(original.objectives));
      });

      test('should parse all status values', () {
        for (final status in SessionStatus.values) {
          final json = {
            'id': 'session-1',
            'title': 'Test',
            'classId': 'class-1',
            'teacherId': 'teacher-1',
            'status': status.name,
          };

          final session = Session.fromJson(json);
          expect(session.status, equals(status));
        }
      });

      test('should handle missing optional fields', () {
        final json = {
          'id': 'session-1',
          'title': 'Test',
          'classId': 'class-1',
          'teacherId': 'teacher-1',
          'status': 'scheduled',
        };

        final session = Session.fromJson(json);

        expect(session.description, isNull);
        expect(session.scheduledAt, isNull);
        expect(session.startedAt, isNull);
        expect(session.studentIds, isEmpty);
        expect(session.objectives, isEmpty);
      });

      test('should parse duration from seconds', () {
        final json = {
          'id': 'session-1',
          'title': 'Test',
          'classId': 'class-1',
          'teacherId': 'teacher-1',
          'status': 'scheduled',
          'durationSeconds': 2700, // 45 minutes
        };

        final session = Session.fromJson(json);
        expect(session.duration, equals(const Duration(minutes: 45)));
      });
    });

    group('copyWith', () {
      test('should update status and preserve other fields', () {
        final original = Session(
          id: 'session-1',
          title: 'Math Practice',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
          notes: 'Original notes',
        );

        final updated = original.copyWith(
          status: SessionStatus.active,
          startedAt: DateTime.now(),
        );

        expect(updated.id, equals(original.id));
        expect(updated.title, equals(original.title));
        expect(updated.notes, equals(original.notes));
        expect(updated.status, equals(SessionStatus.active));
        expect(updated.startedAt, isNotNull);
      });

      test('should update notes', () {
        final original = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
        );

        final updated = original.copyWith(notes: 'New notes');

        expect(updated.notes, equals('New notes'));
      });
    });

    group('participant management', () {
      test('should add student to session', () {
        final session = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
          studentIds: ['student-1'],
        );

        final updated = session.addStudent('student-2');

        expect(updated.studentIds, contains('student-1'));
        expect(updated.studentIds, contains('student-2'));
      });

      test('should remove student from session', () {
        final session = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
          studentIds: ['student-1', 'student-2'],
        );

        final updated = session.removeStudent('student-1');

        expect(updated.studentIds, isNot(contains('student-1')));
        expect(updated.studentIds, contains('student-2'));
      });

      test('should not duplicate student ids', () {
        final session = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
          studentIds: ['student-1'],
        );

        final updated = session.addStudent('student-1');

        expect(updated.studentIds, hasLength(1));
      });
    });

    group('equality', () {
      test('should be equal for same fields', () {
        final session1 = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
        );

        final session2 = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
        );

        expect(session1, equals(session2));
      });

      test('should not be equal for different ids', () {
        final session1 = Session(
          id: 'session-1',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
        );

        final session2 = Session(
          id: 'session-2',
          title: 'Test',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
        );

        expect(session1, isNot(equals(session2)));
      });
    });
  });
}
