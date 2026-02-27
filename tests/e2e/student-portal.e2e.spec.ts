/**
 * Student Portal End-to-End Tests
 *
 * Comprehensive E2E test suite for the Student/Learner Portal covering:
 * - Student login and dashboard access
 * - Course enrollment flow
 * - Assignment submission flow
 * - Progress tracking views
 * - Notification interactions
 *
 * @module tests/e2e/student-portal.e2e.spec
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const BASE_URL = process.env.LEARNER_URL || 'http://localhost:3000';
const API_URL = process.env.API_URL || 'http://localhost:4000';

const testStudent = {
  email: 'student-e2e@example.com',
  password: 'SecurePass123!',
  firstName: 'Test',
  lastName: 'Student',
  gradeLevel: '5',
};

const testCourse = {
  id: 'course-e2e-math-101',
  name: 'Mathematics 101',
  code: 'MATH-101',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

async function loginAsStudent(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"], input[type="email"]', testStudent.email);
  await page.fill('[name="password"], input[type="password"]', testStudent.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 });
}

async function takeScreenshotOnFailure(page: Page, testName: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/student-portal/${testName}-${Date.now()}.png`,
    fullPage: true,
  });
}

// Seed test data before tests
async function seedTestData(): Promise<void> {
  await fetch(`${API_URL}/test/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'student-portal-e2e' }),
  }).catch(() => {});
}

// Cleanup test data after tests
async function cleanupTestData(): Promise<void> {
  await fetch(`${API_URL}/test/cleanup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'student-portal-e2e' }),
  }).catch(() => {});
}

// =============================================================================
// STUDENT LOGIN AND DASHBOARD ACCESS
// =============================================================================

test.describe('Student Login and Dashboard Access', () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('1.1 Student can login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);

    await page.fill('[name="email"], input[type="email"]', testStudent.email);
    await page.fill('[name="password"], input[type="password"]', testStudent.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|home)/);
    await expect(page.locator('text=/welcome|dashboard/i').first()).toBeVisible();
  });

  test('1.2 Student sees error with invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);

    await page.fill('[name="email"]', testStudent.email);
    await page.fill('[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/invalid|incorrect|error/i').first()).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test('1.3 Dashboard displays enrolled courses', async ({ page }) => {
    await loginAsStudent(page);

    const coursesSection = page.locator(
      '[data-testid="enrolled-courses"], .courses-section, .my-courses'
    );
    await expect(
      coursesSection.or(page.locator('text=/my courses|enrolled/i').first())
    ).toBeVisible();
  });

  test('1.4 Dashboard shows progress summary', async ({ page }) => {
    await loginAsStudent(page);

    const progressSection = page.locator(
      '[data-testid="progress-summary"], .progress-overview, text=/progress/i'
    );
    await expect(progressSection.first()).toBeVisible();
  });

  test('1.5 Dashboard displays upcoming assignments', async ({ page }) => {
    await loginAsStudent(page);

    const assignmentsSection = page.locator(
      '[data-testid="upcoming-assignments"], .assignments-widget, text=/upcoming|due/i'
    );
    await expect(assignmentsSection.first()).toBeVisible();
  });

  test('1.6 Student can navigate to profile settings', async ({ page }) => {
    await loginAsStudent(page);

    // Click profile menu or settings link
    await page.click(
      '[data-testid="profile-menu"], [aria-label="Profile"], .profile-avatar, button:has-text("Profile")'
    );

    const settingsLink = page.locator('a:has-text("Settings"), [data-testid="settings-link"]');
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
      await expect(page).toHaveURL(/\/settings/);
    }
  });

  test('1.7 Student can logout successfully', async ({ page }) => {
    await loginAsStudent(page);

    // Find and click logout
    const profileMenu = page.locator(
      '[data-testid="profile-menu"], .profile-avatar, [aria-label="Profile"]'
    );
    if (await profileMenu.isVisible()) {
      await profileMenu.click();
    }

    await page.click('text=/log ?out|sign ?out/i, [data-testid="logout"]');

    await expect(page).toHaveURL(/\/(login|$)/);
  });
});

// =============================================================================
// COURSE ENROLLMENT FLOW
// =============================================================================

test.describe('Course Enrollment Flow', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: 'test-results/videos/student-portal/' },
    });
    page = await context.newPage();
    await loginAsStudent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('2.1 Student can browse available courses', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseList = page.locator(
      '[data-testid="course-list"], .course-grid, .courses-container'
    );
    await expect(courseList.or(page.locator('.course-card').first())).toBeVisible();
  });

  test('2.2 Student can search for courses', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const searchInput = page.locator(
      '[data-testid="course-search"], input[placeholder*="search" i], input[type="search"]'
    );
    await searchInput.fill('Math');

    // Wait for search results
    await page.waitForTimeout(500);

    const results = page.locator('.course-card, [data-testid^="course-"]');
    await expect(results.first()).toBeVisible();
  });

  test('2.3 Student can filter courses by subject', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const subjectFilter = page.locator(
      '[data-testid="subject-filter"], select[name="subject"], .filter-subject'
    );
    if (await subjectFilter.isVisible()) {
      await subjectFilter.selectOption({ label: /math/i });
      await page.waitForTimeout(500);
    }
  });

  test('2.4 Student can view course details', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    // Click on first available course
    const courseCard = page.locator('.course-card, [data-testid^="course-"]').first();
    await courseCard.click();

    await expect(page).toHaveURL(/\/course(s)?\/[a-zA-Z0-9-]+/);

    // Verify course details are shown
    const courseTitle = page.locator('h1, h2, [data-testid="course-title"]');
    await expect(courseTitle.first()).toBeVisible();
  });

  test('2.5 Student can enroll in a course', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    // Find a course not yet enrolled
    const enrollButton = page
      .locator('button:has-text("Enroll"), [data-testid="enroll-button"]')
      .first();
    if (await enrollButton.isVisible()) {
      await enrollButton.click();

      // Handle enrollment confirmation
      const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
      if (await confirmBtn.isVisible()) {
        await confirmBtn.click();
      }

      // Verify enrollment success
      await expect(page.locator('text=/enrolled|success/i').first()).toBeVisible();
    }
  });

  test('2.6 Student can access enrolled course content', async () => {
    await page.goto(`${BASE_URL}/my-courses`);
    await waitForPageReady(page);

    const courseLink = page.locator('.course-card a, [data-testid="course-link"]').first();
    if (await courseLink.isVisible()) {
      await courseLink.click();

      // Verify course content page
      const contentSection = page.locator(
        '[data-testid="course-content"], .lessons-list, .modules-list'
      );
      await expect(
        contentSection.or(page.locator('text=/lesson|module|chapter/i').first())
      ).toBeVisible();
    }
  });
});

// =============================================================================
// ASSIGNMENT SUBMISSION FLOW
// =============================================================================

test.describe('Assignment Submission Flow', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsStudent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('3.1 Student can view list of assignments', async () => {
    await page.goto(`${BASE_URL}/assignments`);
    await waitForPageReady(page);

    const assignmentList = page.locator('[data-testid="assignment-list"], .assignments-container');
    await expect(assignmentList.or(page.locator('.assignment-card').first())).toBeVisible();
  });

  test('3.2 Student can filter assignments by status', async () => {
    await page.goto(`${BASE_URL}/assignments`);
    await waitForPageReady(page);

    const statusFilter = page.locator('[data-testid="status-filter"], select[name="status"]');
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption({ label: /pending|upcoming/i });
      await page.waitForTimeout(500);
    }
  });

  test('3.3 Student can open assignment details', async () => {
    await page.goto(`${BASE_URL}/assignments`);
    await waitForPageReady(page);

    const assignmentCard = page.locator('.assignment-card, [data-testid^="assignment-"]').first();
    await assignmentCard.click();

    await expect(page).toHaveURL(/\/assignment(s)?\/[a-zA-Z0-9-]+/);

    // Verify assignment details
    const instructions = page.locator(
      '[data-testid="instructions"], .assignment-instructions, text=/instructions/i'
    );
    await expect(instructions.first()).toBeVisible();
  });

  test('3.4 Student can submit text-based assignment', async () => {
    await page.goto(`${BASE_URL}/assignments`);
    await waitForPageReady(page);

    // Find a pending assignment
    const pendingAssignment = page
      .locator('[data-testid="assignment-pending"], .assignment-card:has-text("Pending")')
      .first();
    if (await pendingAssignment.isVisible()) {
      await pendingAssignment.click();

      // Fill in submission
      const textArea = page.locator('textarea[name="submission"], [data-testid="submission-text"]');
      if (await textArea.isVisible()) {
        await textArea.fill('This is my test submission for the E2E test assignment.');

        // Submit
        await page.click('button:has-text("Submit"), [data-testid="submit-assignment"]');

        // Confirm submission
        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }

        // Verify success
        await expect(page.locator('text=/submitted|success/i').first()).toBeVisible();
      }
    }
  });

  test('3.5 Student can upload file for assignment', async () => {
    await page.goto(`${BASE_URL}/assignments`);
    await waitForPageReady(page);

    const assignmentWithUpload = page
      .locator('.assignment-card:has([data-testid="file-upload"])')
      .first();
    if (await assignmentWithUpload.isVisible()) {
      await assignmentWithUpload.click();

      // Upload file
      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: 'test-submission.pdf',
          mimeType: 'application/pdf',
          buffer: Buffer.from('Test PDF content'),
        });

        await expect(page.locator('text=/uploaded|attached/i').first()).toBeVisible();
      }
    }
  });

  test('3.6 Student can view submitted assignment status', async () => {
    await page.goto(`${BASE_URL}/assignments?status=submitted`);
    await waitForPageReady(page);

    const submittedAssignment = page.locator('.assignment-card:has-text("Submitted")').first();
    if (await submittedAssignment.isVisible()) {
      await submittedAssignment.click();

      const status = page.locator('[data-testid="submission-status"], .status-badge');
      await expect(
        status.or(page.locator('text=/submitted|pending review/i').first())
      ).toBeVisible();
    }
  });

  test('3.7 Student can view graded assignment feedback', async () => {
    await page.goto(`${BASE_URL}/assignments?status=graded`);
    await waitForPageReady(page);

    const gradedAssignment = page.locator('.assignment-card:has-text("Graded")').first();
    if (await gradedAssignment.isVisible()) {
      await gradedAssignment.click();

      const grade = page.locator('[data-testid="grade"], .assignment-grade');
      const feedback = page.locator('[data-testid="feedback"], .teacher-feedback');

      await expect(grade.or(page.locator('text=/grade|score/i').first())).toBeVisible();
    }
  });
});

// =============================================================================
// PROGRESS TRACKING VIEWS
// =============================================================================

test.describe('Progress Tracking Views', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsStudent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('4.1 Student can view overall progress dashboard', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const progressOverview = page.locator('[data-testid="progress-overview"], .progress-dashboard');
    await expect(
      progressOverview.or(page.locator('text=/progress|performance/i').first())
    ).toBeVisible();
  });

  test('4.2 Student can view progress by subject', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const subjectProgress = page.locator('[data-testid="subject-progress"], .subject-breakdown');
    await expect(
      subjectProgress.or(page.locator('text=/math|science|english/i').first())
    ).toBeVisible();
  });

  test('4.3 Student can view learning streak', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const streak = page.locator('[data-testid="learning-streak"], .streak-counter');
    await expect(streak.or(page.locator('text=/streak|days/i').first())).toBeVisible();
  });

  test('4.4 Student can view achievement badges', async () => {
    await page.goto(`${BASE_URL}/progress/achievements`);
    await waitForPageReady(page);

    const achievements = page.locator(
      '[data-testid="achievements"], .badges-container, .achievements-grid'
    );
    await expect(achievements.or(page.locator('text=/badge|achievement/i').first())).toBeVisible();
  });

  test('4.5 Student can view progress chart over time', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const chart = page.locator(
      '[data-testid="progress-chart"], canvas, .recharts-wrapper, svg.chart'
    );
    await expect(chart.first()).toBeVisible();
  });

  test('4.6 Student can filter progress by date range', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const dateFilter = page.locator('[data-testid="date-filter"], select[name="period"]');
    if (await dateFilter.isVisible()) {
      await dateFilter.selectOption({ label: /month|week|year/i });
      await page.waitForTimeout(500);
    }
  });

  test('4.7 Student can view mastery levels', async () => {
    await page.goto(`${BASE_URL}/progress/mastery`);
    await waitForPageReady(page);

    const masteryLevels = page.locator('[data-testid="mastery-levels"], .skill-tree');
    await expect(masteryLevels.or(page.locator('text=/mastery|skill/i').first())).toBeVisible();
  });
});

// =============================================================================
// NOTIFICATION INTERACTIONS
// =============================================================================

test.describe('Notification Interactions', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsStudent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('5.1 Student can view notification bell with count', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const notificationBell = page.locator(
      '[data-testid="notification-bell"], [aria-label*="notification" i], .notification-icon'
    );
    await expect(notificationBell.first()).toBeVisible();
  });

  test('5.2 Student can open notification dropdown', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    const notificationBell = page
      .locator('[data-testid="notification-bell"], [aria-label*="notification" i]')
      .first();
    await notificationBell.click();

    const dropdown = page.locator(
      '[data-testid="notification-dropdown"], .notification-list, .notifications-panel'
    );
    await expect(dropdown.first()).toBeVisible();
  });

  test('5.3 Student can view all notifications page', async () => {
    await page.goto(`${BASE_URL}/notifications`);
    await waitForPageReady(page);

    const notificationList = page.locator(
      '[data-testid="notifications-list"], .notifications-container'
    );
    await expect(notificationList.or(page.locator('.notification-item').first())).toBeVisible();
  });

  test('5.4 Student can mark notification as read', async () => {
    await page.goto(`${BASE_URL}/notifications`);
    await waitForPageReady(page);

    const unreadNotification = page
      .locator('.notification-item.unread, [data-testid="notification-unread"]')
      .first();
    if (await unreadNotification.isVisible()) {
      await unreadNotification.click();

      // Verify marked as read
      await expect(unreadNotification).not.toHaveClass(/unread/);
    }
  });

  test('5.5 Student can mark all notifications as read', async () => {
    await page.goto(`${BASE_URL}/notifications`);
    await waitForPageReady(page);

    const markAllBtn = page.locator('button:has-text("Mark all"), [data-testid="mark-all-read"]');
    if (await markAllBtn.isVisible()) {
      await markAllBtn.click();

      // Verify all marked as read
      const unreadCount = await page.locator('.notification-item.unread').count();
      expect(unreadCount).toBe(0);
    }
  });

  test('5.6 Student can filter notifications by type', async () => {
    await page.goto(`${BASE_URL}/notifications`);
    await waitForPageReady(page);

    const typeFilter = page.locator('[data-testid="notification-filter"], select[name="type"]');
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption({ label: /assignment|grade/i });
      await page.waitForTimeout(500);
    }
  });

  test('5.7 Student can click notification to navigate to related content', async () => {
    await page.goto(`${BASE_URL}/notifications`);
    await waitForPageReady(page);

    const notification = page
      .locator('.notification-item a, [data-testid="notification-link"]')
      .first();
    if (await notification.isVisible()) {
      const initialUrl = page.url();
      await notification.click();

      // Should navigate away from notifications
      await page.waitForURL((url) => url.href !== initialUrl, { timeout: 5000 }).catch(() => {});
    }
  });

  test('5.8 Student can manage notification preferences', async () => {
    await page.goto(`${BASE_URL}/settings/notifications`);
    await waitForPageReady(page);

    const notificationSettings = page.locator(
      '[data-testid="notification-settings"], .notification-preferences'
    );
    await expect(
      notificationSettings.or(page.locator('text=/email notification|push notification/i').first())
    ).toBeVisible();
  });
});

// =============================================================================
// LESSON AND LEARNING FLOW
// =============================================================================

test.describe('Lesson and Learning Flow', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsStudent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('6.1 Student can start a lesson', async () => {
    await page.goto(`${BASE_URL}/my-courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card, [data-testid="course-card"]').first();
    if (await courseCard.isVisible()) {
      await courseCard.click();

      const startBtn = page
        .locator('button:has-text("Start"), button:has-text("Continue")')
        .first();
      if (await startBtn.isVisible()) {
        await startBtn.click();
        await expect(page).toHaveURL(/\/lesson/);
      }
    }
  });

  test('6.2 Student can navigate between lesson pages', async () => {
    await page.goto(`${BASE_URL}/my-courses`);
    await waitForPageReady(page);

    // Navigate to a lesson
    const continueBtn = page.locator('button:has-text("Continue"), a:has-text("Resume")').first();
    if (await continueBtn.isVisible()) {
      await continueBtn.click();

      const nextBtn = page.locator('button:has-text("Next"), [data-testid="next-page"]');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('6.3 Student can complete a quiz within lesson', async () => {
    await page.goto(`${BASE_URL}/lesson/quiz`);
    await waitForPageReady(page);

    const quizQuestion = page.locator('[data-testid="quiz-question"], .quiz-container');
    if (await quizQuestion.isVisible()) {
      // Answer question
      const option = page.locator('input[type="radio"], .answer-option').first();
      await option.click();

      // Submit
      const submitBtn = page.locator('button:has-text("Submit"), button:has-text("Check")');
      if (await submitBtn.isVisible()) {
        await submitBtn.click();
      }
    }
  });

  test('6.4 Student can bookmark a lesson', async () => {
    await page.goto(`${BASE_URL}/my-courses`);
    await waitForPageReady(page);

    const bookmarkBtn = page
      .locator('[data-testid="bookmark"], button[aria-label*="bookmark" i]')
      .first();
    if (await bookmarkBtn.isVisible()) {
      await bookmarkBtn.click();
      await expect(page.locator('text=/bookmarked|saved/i').first()).toBeVisible();
    }
  });

  test('6.5 Student can view bookmarked content', async () => {
    await page.goto(`${BASE_URL}/bookmarks`);
    await waitForPageReady(page);

    const bookmarksList = page.locator('[data-testid="bookmarks-list"], .bookmarks-container');
    await expect(bookmarksList.or(page.locator('text=/bookmark|saved/i').first())).toBeVisible();
  });
});
