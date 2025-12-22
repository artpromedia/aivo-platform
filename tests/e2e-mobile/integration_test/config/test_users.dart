/// Test User Accounts
///
/// Predefined test accounts for E2E testing with various states and configurations.
library;

/// Test user account data
class TestUser {
  const TestUser({
    required this.id,
    required this.email,
    required this.password,
    required this.role,
    this.displayName,
    this.accessCode,
    this.subscriptionTier = SubscriptionTier.free,
    this.hasChildren = false,
    this.childCount = 0,
    this.features = const [],
  });

  final String id;
  final String email;
  final String password;
  final UserRole role;
  final String? displayName;
  final String? accessCode;
  final SubscriptionTier subscriptionTier;
  final bool hasChildren;
  final int childCount;
  final List<String> features;

  /// Full name for display
  String get fullName => displayName ?? email.split('@').first;
}

/// User roles
enum UserRole {
  parent,
  teacher,
  learner,
  admin,
}

/// Subscription tiers
enum SubscriptionTier {
  free,
  basic,
  pro,
  enterprise,
}

/// Predefined test users for various scenarios
class TestUsers {
  TestUsers._();

  // ============================================
  // NEW USERS (for registration/onboarding tests)
  // ============================================

  /// Brand new parent for registration tests
  static const TestUser newParent = TestUser(
    id: 'new-parent-001',
    email: 'new.parent.test@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.parent,
    displayName: 'New Test Parent',
  );

  /// Brand new teacher for registration tests
  static const TestUser newTeacher = TestUser(
    id: 'new-teacher-001',
    email: 'new.teacher.test@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.teacher,
    displayName: 'New Test Teacher',
  );

  // ============================================
  // EXISTING PARENT ACCOUNTS
  // ============================================

  /// Parent with free account and one child
  static const TestUser existingParentFree = TestUser(
    id: 'parent-free-001',
    email: 'parent.free@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.parent,
    displayName: 'Free Parent',
    subscriptionTier: SubscriptionTier.free,
    hasChildren: true,
    childCount: 1,
  );

  /// Parent with Pro subscription and multiple children
  static const TestUser existingParentPro = TestUser(
    id: 'parent-pro-001',
    email: 'parent.pro@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.parent,
    displayName: 'Pro Parent',
    subscriptionTier: SubscriptionTier.pro,
    hasChildren: true,
    childCount: 3,
    features: ['ai_tutor', 'detailed_analytics', 'priority_support'],
  );

  /// Parent with expired subscription
  static const TestUser parentExpiredSubscription = TestUser(
    id: 'parent-expired-001',
    email: 'parent.expired@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.parent,
    displayName: 'Expired Subscription Parent',
    subscriptionTier: SubscriptionTier.free, // Downgraded
    hasChildren: true,
    childCount: 2,
  );

  /// Parent with payment method requiring update
  static const TestUser parentPaymentIssue = TestUser(
    id: 'parent-payment-001',
    email: 'parent.payment@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.parent,
    displayName: 'Payment Issue Parent',
    subscriptionTier: SubscriptionTier.pro,
    hasChildren: true,
    childCount: 1,
  );

  // ============================================
  // EXISTING TEACHER ACCOUNTS
  // ============================================

  /// Teacher with full class setup
  static const TestUser existingTeacher = TestUser(
    id: 'teacher-001',
    email: 'teacher@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.teacher,
    displayName: 'Test Teacher',
    subscriptionTier: SubscriptionTier.enterprise,
    features: ['iep_tracking', 'live_monitoring', 'analytics'],
  );

  /// Teacher with IEP students
  static const TestUser teacherWithIep = TestUser(
    id: 'teacher-iep-001',
    email: 'teacher.iep@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.teacher,
    displayName: 'IEP Teacher',
    subscriptionTier: SubscriptionTier.enterprise,
    features: ['iep_tracking', 'accommodations', 'progress_reports'],
  );

  /// New teacher for onboarding
  static const TestUser teacherOnboarding = TestUser(
    id: 'teacher-new-001',
    email: 'teacher.new@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.teacher,
    displayName: 'New Teacher',
  );

  // ============================================
  // LEARNER ACCOUNTS
  // ============================================

  /// Learner with typical setup
  static const TestUser learner = TestUser(
    id: 'learner-001',
    email: 'learner@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.learner,
    displayName: 'Test Learner',
    accessCode: 'TESTCODE123',
  );

  /// Learner with IEP accommodations
  static const TestUser learnerWithIep = TestUser(
    id: 'learner-iep-001',
    email: 'learner.iep@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.learner,
    displayName: 'IEP Learner',
    accessCode: 'IEPCODE456',
    features: ['extended_time', 'text_to_speech', 'frequent_breaks'],
  );

  /// Learner with 504 accommodations
  static const TestUser learnerWith504 = TestUser(
    id: 'learner-504-001',
    email: 'learner.504@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.learner,
    displayName: '504 Learner',
    accessCode: '504CODE789',
    features: ['extended_time', 'reduced_distractions'],
  );

  /// Learner with high achievements
  static const TestUser learnerHighAchiever = TestUser(
    id: 'learner-high-001',
    email: 'learner.high@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.learner,
    displayName: 'High Achiever',
    accessCode: 'HIGHCODE000',
  );

  /// Learner about to earn achievement
  static const TestUser learnerNearAchievement = TestUser(
    id: 'learner-near-001',
    email: 'learner.near@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.learner,
    displayName: 'Near Achievement Learner',
    accessCode: 'NEARCODE111',
  );

  // ============================================
  // LINKED ACCOUNTS (for cross-app testing)
  // ============================================

  /// Parent-child linked pair
  static const linkedParent = TestUser(
    id: 'linked-parent-001',
    email: 'linked.parent@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.parent,
    displayName: 'Linked Parent',
    subscriptionTier: SubscriptionTier.pro,
    hasChildren: true,
    childCount: 1,
  );

  static const linkedLearner = TestUser(
    id: 'linked-learner-001',
    email: 'linked.learner@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.learner,
    displayName: 'Linked Learner',
    accessCode: 'LINKCODE222',
  );

  /// Teacher-parent-learner linked trio
  static const trioTeacher = TestUser(
    id: 'trio-teacher-001',
    email: 'trio.teacher@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.teacher,
    displayName: 'Trio Teacher',
  );

  static const trioParent = TestUser(
    id: 'trio-parent-001',
    email: 'trio.parent@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.parent,
    displayName: 'Trio Parent',
    subscriptionTier: SubscriptionTier.pro,
    hasChildren: true,
    childCount: 1,
  );

  static const trioLearner = TestUser(
    id: 'trio-learner-001',
    email: 'trio.learner@aivo-test.com',
    password: 'TestPassword123!',
    role: UserRole.learner,
    displayName: 'Trio Learner',
    accessCode: 'TRIOCODE333',
  );

  // ============================================
  // HELPER METHODS
  // ============================================

  /// Get all parent test users
  static List<TestUser> get allParents => [
        newParent,
        existingParentFree,
        existingParentPro,
        parentExpiredSubscription,
        parentPaymentIssue,
        linkedParent,
        trioParent,
      ];

  /// Get all teacher test users
  static List<TestUser> get allTeachers => [
        newTeacher,
        existingTeacher,
        teacherWithIep,
        teacherOnboarding,
        trioTeacher,
      ];

  /// Get all learner test users
  static List<TestUser> get allLearners => [
        learner,
        learnerWithIep,
        learnerWith504,
        learnerHighAchiever,
        learnerNearAchievement,
        linkedLearner,
        trioLearner,
      ];
}

/// Test child profiles
class TestChildren {
  TestChildren._();

  static const child1 = TestChild(
    id: 'child-001',
    firstName: 'Alex',
    lastName: 'Test',
    gradeLevel: 5,
    hasIep: true,
    has504: false,
    accommodations: ['extended_time', 'text_to_speech'],
  );

  static const child2 = TestChild(
    id: 'child-002',
    firstName: 'Jordan',
    lastName: 'Test',
    gradeLevel: 3,
    hasIep: false,
    has504: true,
    accommodations: ['frequent_breaks'],
  );

  static const child3 = TestChild(
    id: 'child-003',
    firstName: 'Sam',
    lastName: 'Test',
    gradeLevel: 7,
    hasIep: false,
    has504: false,
    accommodations: [],
  );
}

/// Test child data
class TestChild {
  const TestChild({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.gradeLevel,
    this.hasIep = false,
    this.has504 = false,
    this.accommodations = const [],
  });

  final String id;
  final String firstName;
  final String lastName;
  final int gradeLevel;
  final bool hasIep;
  final bool has504;
  final List<String> accommodations;

  String get fullName => '$firstName $lastName';
}
