/**
 * Consumer Contract Tests (Pact)
 *
 * Defines the expectations that the web-learner frontend
 * has of the backend API. These contracts are published
 * to a Pact Broker and verified by the provider.
 *
 * COPPA Compliance: Contracts include child-safe data handling
 */

import { PactV3, MatchersV3 } from '@pact-foundation/pact';
import { resolve } from 'path';

const { like, eachLike, string, integer, boolean, datetime, email, uuid, regex } = MatchersV3;

// Provider configuration
const provider = new PactV3({
  consumer: 'WebLearner',
  provider: 'AivoAPI',
  dir: resolve(process.cwd(), 'pacts'),
  logLevel: 'warn',
});

describe('Web Learner API Consumer Contracts', () => {
  // ===========================================================================
  // AUTHENTICATION CONTRACTS
  // ===========================================================================

  describe('Authentication API', () => {
    describe('POST /api/auth/login', () => {
      it('should authenticate user with valid credentials', async () => {
        await provider
          .given('a user exists with email test@example.com')
          .uponReceiving('a request to login with valid credentials')
          .withRequest({
            method: 'POST',
            path: '/api/auth/login',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              email: 'test@example.com',
              password: 'TestP@ss123!',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              success: boolean(true),
              accessToken: string('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'),
              refreshToken: string('refresh_token_here'),
              expiresIn: integer(3600),
              user: {
                id: uuid('123e4567-e89b-12d3-a456-426614174000'),
                email: email('test@example.com'),
                name: string('Test User'),
                role: regex('learner|parent|teacher', 'learner'),
                isChild: boolean(false),
                createdAt: datetime("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"),
              },
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'TestP@ss123!',
            }),
          });

          const body = await response.json();
          expect(response.status).toBe(200);
          expect(body.success).toBe(true);
          expect(body.accessToken).toBeDefined();
        });
      });

      it('should return 401 for invalid credentials', async () => {
        await provider
          .given('a user exists with email test@example.com')
          .uponReceiving('a request to login with invalid password')
          .withRequest({
            method: 'POST',
            path: '/api/auth/login',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              email: 'test@example.com',
              password: 'WrongPassword123!',
            },
          })
          .willRespondWith({
            status: 401,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              success: boolean(false),
              error: string('Invalid credentials'),
              code: string('AUTH_INVALID_CREDENTIALS'),
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: 'test@example.com',
              password: 'WrongPassword123!',
            }),
          });

          expect(response.status).toBe(401);
        });
      });
    });

    describe('POST /api/auth/refresh', () => {
      it('should refresh access token', async () => {
        await provider
          .given('a valid refresh token exists')
          .uponReceiving('a request to refresh access token')
          .withRequest({
            method: 'POST',
            path: '/api/auth/refresh',
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              refreshToken: string('valid_refresh_token'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              accessToken: string('new_access_token'),
              expiresIn: integer(3600),
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken: 'valid_refresh_token' }),
          });

          expect(response.status).toBe(200);
        });
      });
    });
  });

  // ===========================================================================
  // USER CONTRACTS
  // ===========================================================================

  describe('User API', () => {
    describe('GET /api/user/profile', () => {
      it('should return user profile', async () => {
        await provider
          .given('an authenticated user exists')
          .uponReceiving('a request to get user profile')
          .withRequest({
            method: 'GET',
            path: '/api/user/profile',
            headers: {
              Authorization: 'Bearer valid_token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: uuid(),
              email: email(),
              name: string('Test User'),
              avatar: like('https://cdn.aivolearning.com/avatars/default.png'),
              role: regex('learner|parent|teacher', 'learner'),
              isChild: boolean(false),
              preferences: {
                theme: regex('light|dark|system', 'light'),
                language: string('en'),
                soundEnabled: boolean(true),
                notificationsEnabled: boolean(true),
              },
              createdAt: datetime(),
              updatedAt: datetime(),
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/user/profile`, {
            headers: { Authorization: 'Bearer valid_token' },
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.email).toBeDefined();
        });
      });
    });

    describe('GET /api/user/progress', () => {
      it('should return learning progress', async () => {
        await provider
          .given('an authenticated user with progress')
          .uponReceiving('a request to get learning progress')
          .withRequest({
            method: 'GET',
            path: '/api/user/progress',
            headers: {
              Authorization: 'Bearer valid_token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              totalXP: integer(1500),
              level: integer(5),
              streak: integer(7),
              lessonsCompleted: integer(25),
              coursesCompleted: integer(2),
              coursesInProgress: eachLike({
                id: uuid(),
                title: string('Introduction to Math'),
                progress: integer(65),
                lastAccessedAt: datetime(),
              }),
              weeklyProgress: eachLike({
                date: string('2024-01-15'),
                xpEarned: integer(150),
                lessonsCompleted: integer(3),
              }),
              achievements: eachLike({
                id: string('first_lesson'),
                name: string('First Steps'),
                unlockedAt: datetime(),
              }),
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/user/progress`, {
            headers: { Authorization: 'Bearer valid_token' },
          });

          expect(response.status).toBe(200);
        });
      });
    });
  });

  // ===========================================================================
  // COURSE CONTRACTS
  // ===========================================================================

  describe('Course API', () => {
    describe('GET /api/courses', () => {
      it('should return paginated course list', async () => {
        await provider
          .given('courses exist in the catalog')
          .uponReceiving('a request to list courses')
          .withRequest({
            method: 'GET',
            path: '/api/courses',
            query: {
              page: '1',
              limit: '10',
            },
            headers: {
              Authorization: 'Bearer valid_token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              courses: eachLike({
                id: uuid(),
                title: string('Introduction to Mathematics'),
                description: string('Learn the basics of math'),
                thumbnail: like('https://cdn.aivolearning.com/courses/math-intro.jpg'),
                duration: integer(120),
                lessonsCount: integer(10),
                difficulty: regex('beginner|intermediate|advanced', 'beginner'),
                ageGroups: eachLike(string('6-8')),
                rating: like(4.5),
                enrolledCount: integer(1000),
                tags: eachLike(string('math')),
              }),
              pagination: {
                page: integer(1),
                limit: integer(10),
                total: integer(50),
                totalPages: integer(5),
              },
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/courses?page=1&limit=10`, {
            headers: { Authorization: 'Bearer valid_token' },
          });

          expect(response.status).toBe(200);
          const body = await response.json();
          expect(body.courses).toBeInstanceOf(Array);
        });
      });

      it('should filter courses by age group (COPPA)', async () => {
        await provider
          .given('courses exist for age group 6-8')
          .uponReceiving('a request to list courses filtered by age group')
          .withRequest({
            method: 'GET',
            path: '/api/courses',
            query: {
              ageGroup: '6-8',
            },
            headers: {
              Authorization: 'Bearer valid_token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              courses: eachLike({
                id: uuid(),
                title: string('Kids Math'),
                ageGroups: eachLike(string('6-8')),
                adultContent: boolean(false),
              }),
              pagination: like({ page: 1, total: 10 }),
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/courses?ageGroup=6-8`, {
            headers: { Authorization: 'Bearer valid_token' },
          });

          expect(response.status).toBe(200);
        });
      });
    });

    describe('GET /api/courses/:id', () => {
      it('should return course details', async () => {
        await provider
          .given('a course with id course-123 exists')
          .uponReceiving('a request to get course details')
          .withRequest({
            method: 'GET',
            path: '/api/courses/course-123',
            headers: {
              Authorization: 'Bearer valid_token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: string('course-123'),
              title: string('Introduction to Mathematics'),
              description: string('A comprehensive math course'),
              longDescription: like('Detailed course description...'),
              thumbnail: like('https://cdn.aivolearning.com/courses/math.jpg'),
              instructor: {
                id: uuid(),
                name: string('Dr. Math'),
                avatar: like('https://cdn.aivolearning.com/avatars/instructor.jpg'),
              },
              lessons: eachLike({
                id: uuid(),
                title: string('Numbers and Counting'),
                duration: integer(15),
                order: integer(1),
                type: regex('video|interactive|quiz', 'video'),
              }),
              totalLessons: integer(10),
              totalDuration: integer(120),
              difficulty: regex('beginner|intermediate|advanced', 'beginner'),
              prerequisites: eachLike(string('None')),
              objectives: eachLike(string('Learn to count')),
              isEnrolled: boolean(false),
              progress: integer(0),
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/courses/course-123`, {
            headers: { Authorization: 'Bearer valid_token' },
          });

          expect(response.status).toBe(200);
        });
      });
    });

    describe('POST /api/courses/:id/enroll', () => {
      it('should enroll user in course', async () => {
        await provider
          .given('a course with id course-123 exists and user is not enrolled')
          .uponReceiving('a request to enroll in course')
          .withRequest({
            method: 'POST',
            path: '/api/courses/course-123/enroll',
            headers: {
              Authorization: 'Bearer valid_token',
              'Content-Type': 'application/json',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              enrolled: boolean(true),
              enrolledAt: datetime(),
              courseId: string('course-123'),
              progress: integer(0),
              nextLesson: like({
                id: uuid(),
                title: string('Getting Started'),
              }),
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/courses/course-123/enroll`, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer valid_token',
              'Content-Type': 'application/json',
            },
          });

          expect(response.status).toBe(200);
        });
      });
    });
  });

  // ===========================================================================
  // LESSON CONTRACTS
  // ===========================================================================

  describe('Lesson API', () => {
    describe('GET /api/lessons/:id', () => {
      it('should return lesson content', async () => {
        await provider
          .given('a lesson with id lesson-123 exists')
          .uponReceiving('a request to get lesson content')
          .withRequest({
            method: 'GET',
            path: '/api/lessons/lesson-123',
            headers: {
              Authorization: 'Bearer valid_token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              id: string('lesson-123'),
              title: string('Numbers and Counting'),
              description: string('Learn to count from 1 to 10'),
              courseId: uuid(),
              order: integer(1),
              estimatedDuration: integer(15),
              blocks: eachLike({
                id: uuid(),
                type: regex('video|text|quiz|interactive', 'video'),
                content: like({
                  videoUrl: 'https://cdn.aivolearning.com/videos/lesson.mp4',
                }),
                order: integer(1),
              }),
              objectives: eachLike(string('Count to 10')),
              progress: {
                completed: boolean(false),
                currentBlock: integer(0),
                timeSpent: integer(0),
              },
              navigation: {
                previousLesson: like({ id: uuid(), title: string('Intro') }),
                nextLesson: like({ id: uuid(), title: string('Addition') }),
              },
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/lessons/lesson-123`, {
            headers: { Authorization: 'Bearer valid_token' },
          });

          expect(response.status).toBe(200);
        });
      });
    });

    describe('POST /api/lessons/:id/complete', () => {
      it('should mark lesson complete and return rewards', async () => {
        await provider
          .given('user is enrolled in the lesson course')
          .uponReceiving('a request to complete lesson')
          .withRequest({
            method: 'POST',
            path: '/api/lessons/lesson-123/complete',
            headers: {
              Authorization: 'Bearer valid_token',
              'Content-Type': 'application/json',
            },
            body: {
              score: integer(85),
              timeSpent: integer(600),
              answers: eachLike({
                questionId: string('q1'),
                answer: string('A'),
                correct: boolean(true),
              }),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              completed: boolean(true),
              completedAt: datetime(),
              score: integer(85),
              xpEarned: integer(100),
              bonusXP: integer(20),
              streak: integer(7),
              achievements: eachLike({
                id: string('speed_demon'),
                name: string('Speed Demon'),
                description: string('Complete a lesson in under 5 minutes'),
                xpBonus: integer(50),
              }),
              nextLesson: like({
                id: uuid(),
                title: string('Addition'),
              }),
              courseProgress: integer(33),
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/lessons/lesson-123/complete`, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer valid_token',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              score: 85,
              timeSpent: 600,
              answers: [{ questionId: 'q1', answer: 'A', correct: true }],
            }),
          });

          expect(response.status).toBe(200);
        });
      });
    });
  });

  // ===========================================================================
  // PARENTAL CONTROLS CONTRACTS (COPPA)
  // ===========================================================================

  describe('Parental Controls API', () => {
    describe('GET /api/parental/children', () => {
      it('should return list of linked children', async () => {
        await provider
          .given('a parent user with linked children')
          .uponReceiving('a request to list children')
          .withRequest({
            method: 'GET',
            path: '/api/parental/children',
            headers: {
              Authorization: 'Bearer parent_token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              children: eachLike({
                id: uuid(),
                name: string('Child Name'),
                avatar: like('https://cdn.aivolearning.com/avatars/child.png'),
                age: integer(8),
                settings: {
                  dailyTimeLimit: integer(60),
                  allowedHours: like({ start: '08:00', end: '20:00' }),
                  contentRestrictions: eachLike(string('advanced')),
                },
                stats: {
                  totalTimeToday: integer(45),
                  lessonsCompletedToday: integer(3),
                  currentStreak: integer(5),
                },
                lastActive: datetime(),
              }),
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/parental/children`, {
            headers: { Authorization: 'Bearer parent_token' },
          });

          expect(response.status).toBe(200);
        });
      });
    });

    describe('POST /api/parental/consent', () => {
      it('should record parental consent (COPPA)', async () => {
        await provider
          .given('a parent with a linked child requiring consent')
          .uponReceiving('a request to record parental consent')
          .withRequest({
            method: 'POST',
            path: '/api/parental/consent',
            headers: {
              Authorization: 'Bearer parent_token',
              'Content-Type': 'application/json',
            },
            body: {
              childId: uuid('child-123'),
              consentType: regex('data_collection|marketing|third_party', 'data_collection'),
              granted: boolean(true),
              signature: string('Parent Name'),
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              consentRecorded: boolean(true),
              consentId: uuid(),
              timestamp: datetime(),
              childId: uuid('child-123'),
              consentType: string('data_collection'),
              expiresAt: datetime(),
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/parental/consent`, {
            method: 'POST',
            headers: {
              Authorization: 'Bearer parent_token',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              childId: 'child-123',
              consentType: 'data_collection',
              granted: true,
              signature: 'Parent Name',
            }),
          });

          expect(response.status).toBe(200);
        });
      });
    });

    describe('DELETE /api/parental/children/:id/data', () => {
      it('should delete all child data (COPPA right to erasure)', async () => {
        await provider
          .given('a parent with a linked child')
          .uponReceiving('a request to delete child data')
          .withRequest({
            method: 'DELETE',
            path: '/api/parental/children/child-123/data',
            headers: {
              Authorization: 'Bearer parent_token',
            },
          })
          .willRespondWith({
            status: 200,
            headers: {
              'Content-Type': 'application/json',
            },
            body: {
              deleted: boolean(true),
              deletedAt: datetime(),
              dataTypes: eachLike(string('profile')),
              retentionNotice: string(
                'Some data may be retained for legal compliance for up to 30 days'
              ),
            },
          });

        await provider.executeTest(async (mockServer) => {
          const response = await fetch(`${mockServer.url}/api/parental/children/child-123/data`, {
            method: 'DELETE',
            headers: { Authorization: 'Bearer parent_token' },
          });

          expect(response.status).toBe(200);
        });
      });
    });
  });
});
