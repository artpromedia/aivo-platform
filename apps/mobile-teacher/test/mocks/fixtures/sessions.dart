/// Session Test Fixtures
///
/// Test data for sessions.
library;

import 'package:mobile_teacher/models/models.dart';

/// Test sessions for testing.
class TestSessions {
  /// Active math session.
  static final mathSession = Session(
    id: 'session-math-1',
    classId: 'class-math-5',
    teacherId: 'teacher-1',
    status: SessionStatus.active,
    sessionType: SessionType.wholeClass,
    title: 'Multiplication Facts Practice',
    description: 'Practice multiplication facts 1-12',
    studentIds: ['student-alex', 'student-emma', 'student-jordan'],
    subject: 'math',
    scheduledAt: DateTime.now().subtract(const Duration(hours: 1)),
    startedAt: DateTime.now().subtract(const Duration(minutes: 45)),
    durationMinutes: 60,
    objectives: [
      'Master multiplication facts 1-12',
      'Complete 20 practice problems',
    ],
    activities: [
      SessionActivity(
        id: 'activity-1',
        title: 'Warm-up Quiz',
        type: 'quiz',
        durationMinutes: 10,
        status: ActivityStatus.completed,
        completedAt: DateTime.now().subtract(const Duration(minutes: 35)),
      ),
      SessionActivity(
        id: 'activity-2',
        title: 'Practice Problems',
        type: 'practice',
        durationMinutes: 30,
        status: ActivityStatus.inProgress,
      ),
    ],
    createdAt: DateTime.now().subtract(const Duration(days: 1)),
    updatedAt: DateTime.now().subtract(const Duration(minutes: 5)),
  );

  /// Active reading session.
  static final readingSession = Session(
    id: 'session-reading-1',
    classId: 'class-reading-5',
    teacherId: 'teacher-1',
    status: SessionStatus.active,
    sessionType: SessionType.smallGroup,
    title: 'Reading Comprehension',
    description: 'Guided reading with comprehension questions',
    studentIds: ['student-alex', 'student-sofia'],
    subject: 'reading',
    scheduledAt: DateTime.now().subtract(const Duration(minutes: 30)),
    startedAt: DateTime.now().subtract(const Duration(minutes: 25)),
    durationMinutes: 45,
    objectives: [
      'Read passage with 90% accuracy',
      'Answer comprehension questions',
    ],
    activities: [
      SessionActivity(
        id: 'activity-3',
        title: 'Passage Reading',
        type: 'reading',
        durationMinutes: 20,
        status: ActivityStatus.inProgress,
      ),
    ],
    createdAt: DateTime.now().subtract(const Duration(hours: 2)),
    updatedAt: DateTime.now().subtract(const Duration(minutes: 10)),
  );

  /// Scheduled session for tomorrow.
  static final scheduledSession = Session(
    id: 'session-scheduled-1',
    classId: 'class-math-5',
    teacherId: 'teacher-1',
    status: SessionStatus.scheduled,
    sessionType: SessionType.wholeClass,
    title: 'Division Introduction',
    description: 'Introduction to division concepts',
    studentIds: ['student-alex', 'student-emma', 'student-jordan', 'student-marcus'],
    subject: 'math',
    scheduledAt: DateTime.now().add(const Duration(days: 1)),
    durationMinutes: 60,
    objectives: [
      'Understand division as inverse of multiplication',
      'Solve simple division problems',
    ],
    activities: [],
    createdAt: DateTime.now().subtract(const Duration(hours: 5)),
    updatedAt: DateTime.now().subtract(const Duration(hours: 5)),
  );

  /// Completed session.
  static final completedSession = Session(
    id: 'session-completed-1',
    classId: 'class-math-5',
    teacherId: 'teacher-1',
    status: SessionStatus.completed,
    sessionType: SessionType.wholeClass,
    title: 'Addition Review',
    description: 'Review of addition concepts',
    studentIds: ['student-alex', 'student-emma'],
    subject: 'math',
    scheduledAt: DateTime.now().subtract(const Duration(days: 2)),
    startedAt: DateTime.now().subtract(const Duration(days: 2)),
    endedAt: DateTime.now().subtract(const Duration(days: 2)).add(const Duration(hours: 1)),
    durationMinutes: 60,
    objectives: ['Review addition facts'],
    notes: 'Students performed well. Alex needed extra time.',
    activities: [
      SessionActivity(
        id: 'activity-4',
        title: 'Practice',
        type: 'practice',
        durationMinutes: 45,
        status: ActivityStatus.completed,
        completedAt: DateTime.now().subtract(const Duration(days: 2)),
      ),
    ],
    createdAt: DateTime.now().subtract(const Duration(days: 3)),
    updatedAt: DateTime.now().subtract(const Duration(days: 2)),
  );

  /// Individual intervention session.
  static final interventionSession = Session(
    id: 'session-intervention-1',
    classId: 'class-math-5',
    teacherId: 'teacher-1',
    status: SessionStatus.scheduled,
    sessionType: SessionType.intervention,
    title: 'Math Intervention - Alex',
    description: 'One-on-one support for multiplication',
    studentIds: ['student-alex'],
    subject: 'math',
    scheduledAt: DateTime.now().add(const Duration(hours: 2)),
    durationMinutes: 30,
    objectives: ['Address gaps in multiplication facts'],
    activities: [],
    createdAt: DateTime.now().subtract(const Duration(hours: 1)),
    updatedAt: DateTime.now().subtract(const Duration(hours: 1)),
  );

  /// All test sessions.
  static final all = [
    mathSession,
    readingSession,
    scheduledSession,
    completedSession,
    interventionSession,
  ];

  /// Active sessions.
  static final active = all.where((s) => s.isActive).toList();

  /// Scheduled sessions.
  static final scheduled = all.where((s) => s.isScheduled).toList();

  /// Completed sessions.
  static final completed = all.where((s) => s.isCompleted).toList();

  /// Create a custom session.
  static Session create({
    String? id,
    String classId = 'class-1',
    String teacherId = 'teacher-1',
    SessionStatus status = SessionStatus.scheduled,
    SessionType sessionType = SessionType.wholeClass,
    String title = 'Test Session',
    List<String> studentIds = const [],
    String? subject,
    DateTime? scheduledAt,
    DateTime? startedAt,
    int durationMinutes = 60,
  }) {
    return Session(
      id: id ?? 'session-${DateTime.now().millisecondsSinceEpoch}',
      classId: classId,
      teacherId: teacherId,
      status: status,
      sessionType: sessionType,
      title: title,
      studentIds: studentIds,
      subject: subject,
      scheduledAt: scheduledAt ?? DateTime.now(),
      startedAt: startedAt,
      durationMinutes: durationMinutes,
      objectives: [],
      activities: [],
      createdAt: DateTime.now(),
      updatedAt: DateTime.now(),
    );
  }
}
