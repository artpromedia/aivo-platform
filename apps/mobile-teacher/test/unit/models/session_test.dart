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
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
          sessionType: SessionType.wholeClass,
        );

        expect(session.id, equals('session-1'));
        expect(session.classId, equals('class-1'));
        expect(session.status, equals(SessionStatus.scheduled));
        expect(session.sessionType, equals(SessionType.wholeClass));
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
          sessionType: SessionType.smallGroup,
          scheduledAt: now,
          startedAt: now,
          endedAt: null,
          durationMinutes: 45,
          studentIds: ['student-1', 'student-2'],
          notes: 'Good progress',
          objectives: ['Master 5x tables', 'Review 6x tables'],
          createdAt: now,
          updatedAt: now,
        );

        expect(session.title, equals('Math Practice'));
        expect(session.description, equals('Multiplication facts 1-12'));
        expect(session.studentIds, hasLength(2));
        expect(session.objectives, hasLength(2));
        expect(session.durationMinutes, equals(45));
      });
    });

    group('status predicates', () {
      test('isActive should return true for active sessions', () {
        final session = Session(
          id: 'session-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
          sessionType: SessionType.wholeClass,
        );

        expect(session.isActive, isTrue);
        expect(session.isScheduled, isFalse);
        expect(session.isCompleted, isFalse);
      });

      test('isScheduled should return true for scheduled sessions', () {
        final session = Session(
          id: 'session-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
          sessionType: SessionType.wholeClass,
        );

        expect(session.isScheduled, isTrue);
        expect(session.isActive, isFalse);
      });

      test('isCompleted should return true for completed sessions', () {
        final session = Session(
          id: 'session-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.completed,
          sessionType: SessionType.wholeClass,
        );

        expect(session.isCompleted, isTrue);
        expect(session.isActive, isFalse);
      });

      test('paused status should be accessible', () {
        final session = Session(
          id: 'session-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.paused,
          sessionType: SessionType.wholeClass,
        );

        expect(session.status, equals(SessionStatus.paused));
      });

      test('cancelled status should be accessible', () {
        final session = Session(
          id: 'session-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.cancelled,
          sessionType: SessionType.wholeClass,
        );

        expect(session.status, equals(SessionStatus.cancelled));
      });
    });

    group('actualDuration', () {
      test('should calculate duration for active session', () {
        final startTime = DateTime.now().subtract(const Duration(minutes: 10));
        final session = Session(
          id: 'session-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
          sessionType: SessionType.wholeClass,
          startedAt: startTime,
        );

        expect(session.actualDuration!.inMinutes, closeTo(10, 1));
      });

      test('should calculate duration for completed session', () {
        final startTime = DateTime.now().subtract(const Duration(minutes: 45));
        final endTime = DateTime.now().subtract(const Duration(minutes: 5));
        final session = Session(
          id: 'session-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.completed,
          sessionType: SessionType.wholeClass,
          startedAt: startTime,
          endedAt: endTime,
        );

        expect(session.actualDuration!.inMinutes, equals(40));
      });

      test('should return null if not started', () {
        final session = Session(
          id: 'session-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
          sessionType: SessionType.wholeClass,
        );

        expect(session.actualDuration, isNull);
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
          sessionType: SessionType.smallGroup,
          scheduledAt: now,
          startedAt: now,
          studentIds: ['student-1', 'student-2'],
          notes: 'Going well',
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
        expect(restored.sessionType, equals(original.sessionType));
        expect(restored.studentIds, equals(original.studentIds));
        expect(restored.notes, equals(original.notes));
        expect(restored.objectives, equals(original.objectives));
      });

      test('should parse all status values', () {
        for (final status in SessionStatus.values) {
          final json = {
            'id': 'session-1',
            'classId': 'class-1',
            'teacherId': 'teacher-1',
            'status': status.name,
            'sessionType': 'wholeClass',
          };

          final session = Session.fromJson(json);
          expect(session.status, equals(status));
        }
      });

      test('should parse all session type values', () {
        for (final type in SessionType.values) {
          final json = {
            'id': 'session-1',
            'classId': 'class-1',
            'teacherId': 'teacher-1',
            'status': 'scheduled',
            'sessionType': type.name,
          };

          final session = Session.fromJson(json);
          expect(session.sessionType, equals(type));
        }
      });
    });

    group('SessionType', () {
      test('should have all expected types', () {
        expect(SessionType.values, containsAll([
          SessionType.individual,
          SessionType.smallGroup,
          SessionType.wholeClass,
          SessionType.assessment,
          SessionType.intervention,
        ]));
      });
    });

    group('activities', () {
      test('should create session with activities', () {
        final session = Session(
          id: 'session-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
          sessionType: SessionType.wholeClass,
          activities: const [
            SessionActivity(
              id: 'activity-1',
              name: 'Warm-up',
              type: 'warmup',
              durationMinutes: 5,
              completed: true,
            ),
            SessionActivity(
              id: 'activity-2',
              name: 'Main lesson',
              type: 'lesson',
              durationMinutes: 30,
              completed: false,
            ),
          ],
        );

        expect(session.activities, hasLength(2));
        expect(session.activities.first.name, equals('Warm-up'));
        expect(session.activities.first.completed, isTrue);
        expect(session.activities.last.completed, isFalse);
      });
    });

    group('copyWith', () {
      test('should create copy with updated status', () {
        final original = Session(
          id: 'session-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.scheduled,
          sessionType: SessionType.wholeClass,
        );

        final updated = original.copyWith(status: SessionStatus.active);

        expect(updated.id, equals(original.id));
        expect(updated.status, equals(SessionStatus.active));
        expect(original.status, equals(SessionStatus.scheduled));
      });

      test('should create copy with updated notes', () {
        final original = Session(
          id: 'session-1',
          classId: 'class-1',
          teacherId: 'teacher-1',
          status: SessionStatus.active,
          sessionType: SessionType.wholeClass,
        );

        final updated = original.copyWith(notes: 'New notes');

        expect(updated.notes, equals('New notes'));
        expect(original.notes, isNull);
      });
    });
  });
}
