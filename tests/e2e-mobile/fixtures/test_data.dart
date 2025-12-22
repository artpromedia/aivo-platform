/// Test Data Fixtures
///
/// Static test data for E2E tests including classes, sessions, achievements.
library;

/// Test class data
class TestClasses {
  TestClasses._();

  static const mathClass = TestClass(
    id: 'class-math-001',
    name: '5th Grade Math',
    subject: 'Mathematics',
    gradeLevel: 5,
    studentCount: 25,
  );

  static const readingClass = TestClass(
    id: 'class-reading-001',
    name: 'Reading Comprehension',
    subject: 'Language Arts',
    gradeLevel: 4,
    studentCount: 22,
  );

  static const scienceClass = TestClass(
    id: 'class-science-001',
    name: 'Science Explorers',
    subject: 'Science',
    gradeLevel: 5,
    studentCount: 24,
  );
}

class TestClass {
  const TestClass({
    required this.id,
    required this.name,
    required this.subject,
    required this.gradeLevel,
    required this.studentCount,
  });

  final String id;
  final String name;
  final String subject;
  final int gradeLevel;
  final int studentCount;
}

/// Test session data
class TestSessions {
  TestSessions._();

  static const activeSession = TestSession(
    id: 'session-001',
    learnerId: 'learner-001',
    subject: 'Mathematics',
    status: SessionStatus.active,
    durationMinutes: 30,
    elapsedMinutes: 15,
    questionsAnswered: 8,
    correctAnswers: 6,
  );

  static const completedSession = TestSession(
    id: 'session-002',
    learnerId: 'learner-001',
    subject: 'Reading',
    status: SessionStatus.completed,
    durationMinutes: 25,
    elapsedMinutes: 25,
    questionsAnswered: 15,
    correctAnswers: 12,
    score: 80,
  );

  static const pausedSession = TestSession(
    id: 'session-003',
    learnerId: 'learner-001',
    subject: 'Science',
    status: SessionStatus.paused,
    durationMinutes: 20,
    elapsedMinutes: 10,
    questionsAnswered: 5,
    correctAnswers: 4,
  );
}

class TestSession {
  const TestSession({
    required this.id,
    required this.learnerId,
    required this.subject,
    required this.status,
    required this.durationMinutes,
    required this.elapsedMinutes,
    required this.questionsAnswered,
    required this.correctAnswers,
    this.score,
  });

  final String id;
  final String learnerId;
  final String subject;
  final SessionStatus status;
  final int durationMinutes;
  final int elapsedMinutes;
  final int questionsAnswered;
  final int correctAnswers;
  final int? score;

  double get accuracy => questionsAnswered > 0 
      ? (correctAnswers / questionsAnswered) * 100 
      : 0;
}

enum SessionStatus {
  pending,
  active,
  paused,
  completed,
  cancelled,
}

/// Test achievement data
class TestAchievements {
  TestAchievements._();

  static const firstSession = TestAchievement(
    id: 'ach-first-session',
    name: 'First Steps',
    description: 'Complete your first learning session',
    iconName: 'star',
    points: 10,
  );

  static const fiveStreak = TestAchievement(
    id: 'ach-five-streak',
    name: 'On Fire!',
    description: 'Complete 5 sessions in a row',
    iconName: 'fire',
    points: 50,
  );

  static const perfectScore = TestAchievement(
    id: 'ach-perfect-score',
    name: 'Perfect!',
    description: 'Get 100% on a session',
    iconName: 'trophy',
    points: 25,
  );

  static const mathMaster = TestAchievement(
    id: 'ach-math-master',
    name: 'Math Master',
    description: 'Complete 50 math sessions',
    iconName: 'calculator',
    points: 100,
  );

  static const allAchievements = [
    firstSession,
    fiveStreak,
    perfectScore,
    mathMaster,
  ];
}

class TestAchievement {
  const TestAchievement({
    required this.id,
    required this.name,
    required this.description,
    required this.iconName,
    required this.points,
  });

  final String id;
  final String name;
  final String description;
  final String iconName;
  final int points;
}

/// Test IEP goal data
class TestIepGoals {
  TestIepGoals._();

  static const readingGoal = TestIepGoal(
    id: 'iep-reading-001',
    studentId: 'learner-iep-001',
    description: 'Read 20 pages independently per week',
    category: 'Reading',
    targetProgress: 100,
    currentProgress: 65,
    targetDate: '2025-06-01',
  );

  static const mathGoal = TestIepGoal(
    id: 'iep-math-001',
    studentId: 'learner-iep-001',
    description: 'Solve multi-step word problems with 80% accuracy',
    category: 'Mathematics',
    targetProgress: 100,
    currentProgress: 45,
    targetDate: '2025-05-15',
  );

  static const socialGoal = TestIepGoal(
    id: 'iep-social-001',
    studentId: 'learner-iep-001',
    description: 'Participate in group activities for 15 minutes',
    category: 'Social Skills',
    targetProgress: 100,
    currentProgress: 80,
    targetDate: '2025-04-30',
  );
}

class TestIepGoal {
  const TestIepGoal({
    required this.id,
    required this.studentId,
    required this.description,
    required this.category,
    required this.targetProgress,
    required this.currentProgress,
    required this.targetDate,
  });

  final String id;
  final String studentId;
  final String description;
  final String category;
  final int targetProgress;
  final int currentProgress;
  final String targetDate;

  double get progressPercent => (currentProgress / targetProgress) * 100;
  bool get isOnTrack => progressPercent >= 50;
}

/// Test notification data
class TestNotifications {
  TestNotifications._();

  static const sessionComplete = TestNotification(
    id: 'notif-001',
    title: 'Session Complete!',
    body: 'Alex just finished their math session with 85% accuracy',
    type: NotificationType.sessionComplete,
  );

  static const achievementUnlocked = TestNotification(
    id: 'notif-002',
    title: 'Achievement Unlocked!',
    body: 'Alex earned the "Math Master" badge',
    type: NotificationType.achievement,
  );

  static const iepUpdate = TestNotification(
    id: 'notif-003',
    title: 'IEP Progress Update',
    body: 'Reading goal is now at 75% progress',
    type: NotificationType.iepUpdate,
  );

  static const messageReceived = TestNotification(
    id: 'notif-004',
    title: 'New Message',
    body: 'Teacher Smith sent you a message',
    type: NotificationType.message,
  );
}

class TestNotification {
  const TestNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.type,
  });

  final String id;
  final String title;
  final String body;
  final NotificationType type;
}

enum NotificationType {
  sessionComplete,
  achievement,
  iepUpdate,
  message,
  reminder,
  system,
}

/// Test subscription plans
class TestSubscriptions {
  TestSubscriptions._();

  static const freePlan = TestSubscription(
    id: 'plan-free',
    name: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    features: ['Basic learning sessions', 'Progress tracking'],
  );

  static const basicPlan = TestSubscription(
    id: 'plan-basic',
    name: 'Basic',
    priceMonthly: 9.99,
    priceYearly: 99.99,
    features: ['All Free features', 'Detailed analytics', 'Multiple children'],
  );

  static const proPlan = TestSubscription(
    id: 'plan-pro',
    name: 'Pro',
    priceMonthly: 19.99,
    priceYearly: 199.99,
    features: ['All Basic features', 'AI Tutor', 'Priority support', 'Offline mode'],
  );
}

class TestSubscription {
  const TestSubscription({
    required this.id,
    required this.name,
    required this.priceMonthly,
    required this.priceYearly,
    required this.features,
  });

  final String id;
  final String name;
  final double priceMonthly;
  final double priceYearly;
  final List<String> features;
}
