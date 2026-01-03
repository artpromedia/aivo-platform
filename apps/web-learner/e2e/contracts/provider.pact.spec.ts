/**
 * Provider Contract Verification Tests (Pact)
 *
 * Verifies that the AIVO API provider fulfills the contracts
 * defined by the web-learner consumer.
 *
 * Runs against the real API with test fixtures.
 */

import { Verifier, LogLevel } from '@pact-foundation/pact';
import { resolve } from 'path';

// State handlers set up the provider in the correct state
// before each interaction is verified
const stateHandlers: Record<string, () => Promise<void>> = {
  'a user exists with email test@example.com': async () => {
    // Seed the test user
    await seedTestUser({
      email: 'test@example.com',
      password: 'TestP@ss123!',
      name: 'Test User',
    });
  },

  'a valid refresh token exists': async () => {
    // Create a valid refresh token in the database
    await createRefreshToken({
      token: 'valid_refresh_token',
      userId: 'test-user-id',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
  },

  'an authenticated user exists': async () => {
    // Seed authenticated user and create valid session
    await seedTestUser({
      id: 'auth-user-id',
      email: 'auth@example.com',
      password: 'TestP@ss123!',
    });
    await createSession({
      token: 'valid_token',
      userId: 'auth-user-id',
    });
  },

  'an authenticated user with progress': async () => {
    const userId = 'progress-user-id';
    await seedTestUser({ id: userId, email: 'progress@example.com' });
    await createSession({ token: 'valid_token', userId });
    await seedUserProgress({
      userId,
      totalXP: 1500,
      level: 5,
      streak: 7,
      lessonsCompleted: 25,
    });
  },

  'courses exist in the catalog': async () => {
    await seedCourses([
      {
        id: 'course-1',
        title: 'Introduction to Mathematics',
        ageGroups: ['6-8', '9-11'],
        difficulty: 'beginner',
      },
      {
        id: 'course-2',
        title: 'Advanced Science',
        ageGroups: ['12-14'],
        difficulty: 'intermediate',
      },
    ]);
  },

  'courses exist for age group 6-8': async () => {
    await seedCourses([
      {
        id: 'kids-course-1',
        title: 'Kids Math',
        ageGroups: ['6-8'],
        adultContent: false,
      },
      {
        id: 'kids-course-2',
        title: 'Kids Science',
        ageGroups: ['6-8'],
        adultContent: false,
      },
    ]);
  },

  'a course with id course-123 exists': async () => {
    await seedCourse({
      id: 'course-123',
      title: 'Introduction to Mathematics',
      description: 'A comprehensive math course',
      lessons: [
        { id: 'lesson-1', title: 'Numbers and Counting', order: 1 },
        { id: 'lesson-2', title: 'Addition', order: 2 },
      ],
    });
  },

  'a course with id course-123 exists and user is not enrolled': async () => {
    await seedCourse({ id: 'course-123', title: 'Sample Course' });
    await seedTestUser({ id: 'enroll-user' });
    await createSession({ token: 'valid_token', userId: 'enroll-user' });
  },

  'a lesson with id lesson-123 exists': async () => {
    await seedLesson({
      id: 'lesson-123',
      title: 'Numbers and Counting',
      courseId: 'course-123',
      blocks: [
        { id: 'block-1', type: 'video', order: 1 },
        { id: 'block-2', type: 'quiz', order: 2 },
      ],
    });
  },

  'user is enrolled in the lesson course': async () => {
    const userId = 'lesson-user';
    await seedTestUser({ id: userId });
    await createSession({ token: 'valid_token', userId });
    await seedCourse({ id: 'course-123' });
    await seedLesson({ id: 'lesson-123', courseId: 'course-123' });
    await enrollUser({ userId, courseId: 'course-123' });
  },

  'a parent user with linked children': async () => {
    const parentId = 'parent-user';
    const childId = 'child-123';

    await seedTestUser({ id: parentId, role: 'parent' });
    await seedTestUser({ id: childId, role: 'learner', isChild: true, parentId });
    await createSession({ token: 'parent_token', userId: parentId });
  },

  'a parent with a linked child requiring consent': async () => {
    const parentId = 'consent-parent';
    const childId = 'child-123';

    await seedTestUser({ id: parentId, role: 'parent' });
    await seedTestUser({
      id: childId,
      role: 'learner',
      isChild: true,
      parentId,
      requiresConsent: true,
    });
    await createSession({ token: 'parent_token', userId: parentId });
  },

  'a parent with a linked child': async () => {
    const parentId = 'delete-parent';
    const childId = 'child-123';

    await seedTestUser({ id: parentId, role: 'parent' });
    await seedTestUser({
      id: childId,
      role: 'learner',
      isChild: true,
      parentId,
    });
    await createSession({ token: 'parent_token', userId: parentId });
    // Add some data for the child
    await seedUserProgress({ userId: childId, totalXP: 500 });
  },
};

// Cleanup function to reset state between tests
async function cleanupProvider(): Promise<void> {
  await clearDatabase();
  await clearCache();
}

describe('Provider Contract Verification', () => {
  const providerBaseUrl = process.env.PROVIDER_URL || 'http://localhost:3001';

  beforeAll(async () => {
    // Start provider if needed (in CI, provider should already be running)
    if (process.env.START_PROVIDER === 'true') {
      await startProvider();
    }
  });

  afterAll(async () => {
    await cleanupProvider();
  });

  it('should verify all pacts from broker', async () => {
    const verifier = new Verifier({
      providerBaseUrl,
      provider: 'AivoAPI',
      logLevel: (process.env.LOG_LEVEL as LogLevel) || 'warn',

      // Pact Broker configuration
      pactBrokerUrl: process.env.PACT_BROKER_URL,
      pactBrokerToken: process.env.PACT_BROKER_TOKEN,

      // Consumer version selectors
      consumerVersionSelectors: [
        { mainBranch: true },
        { deployedOrReleased: true },
        { matchingBranch: true },
      ],

      // Enable pending pacts
      enablePending: true,
      includeWipPactsSince: '2024-01-01',

      // State handlers
      stateHandlers,

      // Request filter (add test headers)
      requestFilter: (req, res, next) => {
        req.headers['X-Test-Mode'] = 'true';
        next();
      },

      // Publish verification results
      publishVerificationResult: process.env.CI === 'true',
      providerVersion: process.env.GIT_COMMIT || 'local',
      providerVersionBranch: process.env.GIT_BRANCH || 'develop',

      // Timeout settings
      timeout: 30000,
    });

    await verifier.verifyProvider();
  });

  it('should verify local pacts', async () => {
    const verifier = new Verifier({
      providerBaseUrl,
      provider: 'AivoAPI',
      logLevel: 'warn',

      // Use local pact files
      pactUrls: [resolve(process.cwd(), 'pacts', 'WebLearner-AivoAPI.json')],

      // State handlers
      stateHandlers,

      // Request filter
      requestFilter: (req, res, next) => {
        req.headers['X-Test-Mode'] = 'true';
        next();
      },
    });

    await verifier.verifyProvider();
  });
});

// ===========================================================================
// HELPER FUNCTIONS
// ===========================================================================

interface TestUser {
  id?: string;
  email?: string;
  password?: string;
  name?: string;
  role?: string;
  isChild?: boolean;
  parentId?: string;
  requiresConsent?: boolean;
}

interface TestCourse {
  id: string;
  title: string;
  description?: string;
  ageGroups?: string[];
  difficulty?: string;
  adultContent?: boolean;
  lessons?: Array<{ id: string; title: string; order: number }>;
}

interface TestLesson {
  id: string;
  title?: string;
  courseId?: string;
  blocks?: Array<{ id: string; type: string; order: number }>;
}

async function seedTestUser(user: TestUser): Promise<void> {
  const apiUrl = process.env.PROVIDER_URL || 'http://localhost:3001';

  await fetch(`${apiUrl}/_test/seed/user`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Mode': 'true',
    },
    body: JSON.stringify({
      id: user.id || `user-${Date.now()}`,
      email: user.email || `test-${Date.now()}@example.com`,
      password: user.password || 'TestP@ss123!',
      name: user.name || 'Test User',
      role: user.role || 'learner',
      isChild: user.isChild || false,
      parentId: user.parentId,
      requiresConsent: user.requiresConsent,
    }),
  });
}

async function createSession(session: { token: string; userId: string }): Promise<void> {
  const apiUrl = process.env.PROVIDER_URL || 'http://localhost:3001';

  await fetch(`${apiUrl}/_test/seed/session`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Mode': 'true',
    },
    body: JSON.stringify(session),
  });
}

async function createRefreshToken(token: {
  token: string;
  userId: string;
  expiresAt: Date;
}): Promise<void> {
  const apiUrl = process.env.PROVIDER_URL || 'http://localhost:3001';

  await fetch(`${apiUrl}/_test/seed/refresh-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Mode': 'true',
    },
    body: JSON.stringify(token),
  });
}

async function seedCourse(course: TestCourse): Promise<void> {
  const apiUrl = process.env.PROVIDER_URL || 'http://localhost:3001';

  await fetch(`${apiUrl}/_test/seed/course`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Mode': 'true',
    },
    body: JSON.stringify(course),
  });
}

async function seedCourses(courses: TestCourse[]): Promise<void> {
  await Promise.all(courses.map(seedCourse));
}

async function seedLesson(lesson: TestLesson): Promise<void> {
  const apiUrl = process.env.PROVIDER_URL || 'http://localhost:3001';

  await fetch(`${apiUrl}/_test/seed/lesson`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Mode': 'true',
    },
    body: JSON.stringify(lesson),
  });
}

async function seedUserProgress(progress: {
  userId: string;
  totalXP?: number;
  level?: number;
  streak?: number;
  lessonsCompleted?: number;
}): Promise<void> {
  const apiUrl = process.env.PROVIDER_URL || 'http://localhost:3001';

  await fetch(`${apiUrl}/_test/seed/progress`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Mode': 'true',
    },
    body: JSON.stringify(progress),
  });
}

async function enrollUser(enrollment: { userId: string; courseId: string }): Promise<void> {
  const apiUrl = process.env.PROVIDER_URL || 'http://localhost:3001';

  await fetch(`${apiUrl}/_test/seed/enrollment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Test-Mode': 'true',
    },
    body: JSON.stringify(enrollment),
  });
}

async function clearDatabase(): Promise<void> {
  const apiUrl = process.env.PROVIDER_URL || 'http://localhost:3001';

  await fetch(`${apiUrl}/_test/reset`, {
    method: 'POST',
    headers: {
      'X-Test-Mode': 'true',
    },
  });
}

async function clearCache(): Promise<void> {
  const apiUrl = process.env.PROVIDER_URL || 'http://localhost:3001';

  await fetch(`${apiUrl}/_test/cache/clear`, {
    method: 'POST',
    headers: {
      'X-Test-Mode': 'true',
    },
  });
}

async function startProvider(): Promise<void> {
  // Implementation depends on how the provider is started
  // This might spawn a child process or use docker-compose
  console.log('Starting provider...');
}
