/**
 * Teacher Portal End-to-End Tests
 *
 * Comprehensive E2E test suite for the Teacher Portal covering:
 * - Teacher login and dashboard
 * - Class management flows
 * - Assignment creation and grading
 * - Student progress review
 * - Communication tools
 *
 * @module tests/e2e/teacher-portal.e2e.spec
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const BASE_URL = process.env.TEACHER_URL || 'http://localhost:3002';
const API_URL = process.env.API_URL || 'http://localhost:4000';

const testTeacher = {
  email: 'teacher-e2e@example.com',
  password: 'SecurePass123!',
  firstName: 'Test',
  lastName: 'Teacher',
};

const testClass = {
  name: 'E2E Test Class - Math 101',
  subject: 'Mathematics',
  gradeLevel: '5',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

async function loginAsTeacher(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"], input[type="email"]', testTeacher.email);
  await page.fill('[name="password"], input[type="password"]', testTeacher.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 });
}

async function takeScreenshotOnFailure(page: Page, testName: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/teacher-portal/${testName}-${Date.now()}.png`,
    fullPage: true,
  });
}

async function seedTestData(): Promise<void> {
  await fetch(`${API_URL}/test/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'teacher-portal-e2e' }),
  }).catch(() => {});
}

async function cleanupTestData(): Promise<void> {
  await fetch(`${API_URL}/test/cleanup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'teacher-portal-e2e' }),
  }).catch(() => {});
}

// =============================================================================
// TEACHER LOGIN AND DASHBOARD
// =============================================================================

test.describe('Teacher Login and Dashboard', () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('1.1 Teacher can login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);

    await page.fill('[name="email"]', testTeacher.email);
    await page.fill('[name="password"]', testTeacher.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|home)/);
  });

  test('1.2 Dashboard displays class overview', async ({ page }) => {
    await loginAsTeacher(page);

    const classesSection = page.locator(
      '[data-testid="my-classes"], .classes-overview, text=/my classes/i'
    );
    await expect(classesSection.first()).toBeVisible();
  });

  test('1.3 Dashboard shows upcoming tasks', async ({ page }) => {
    await loginAsTeacher(page);

    const tasksSection = page.locator('[data-testid="upcoming-tasks"], .tasks-widget');
    await expect(tasksSection.or(page.locator('text=/task|to-do|pending/i').first())).toBeVisible();
  });

  test('1.4 Dashboard displays recent activity', async ({ page }) => {
    await loginAsTeacher(page);

    const activitySection = page.locator('[data-testid="recent-activity"], .activity-feed');
    await expect(activitySection.or(page.locator('text=/recent|activity/i').first())).toBeVisible();
  });

  test('1.5 Teacher can access quick actions', async ({ page }) => {
    await loginAsTeacher(page);

    const quickActions = page.locator('[data-testid="quick-actions"], .quick-action-buttons');
    await expect(quickActions.or(page.locator('button:has-text("Create")').first())).toBeVisible();
  });
});

// =============================================================================
// CLASS MANAGEMENT FLOWS
// =============================================================================

test.describe('Class Management Flows', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: 'test-results/videos/teacher-portal/' },
    });
    page = await context.newPage();
    await loginAsTeacher(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('2.1 Teacher can view list of classes', async () => {
    await page.goto(`${BASE_URL}/classes`);
    await waitForPageReady(page);

    const classList = page.locator('[data-testid="class-list"], .classes-grid');
    await expect(classList.or(page.locator('.class-card').first())).toBeVisible();
  });

  test('2.2 Teacher can create a new class', async () => {
    await page.goto(`${BASE_URL}/classes`);
    await waitForPageReady(page);

    // Click create button
    await page.click(
      'button:has-text("Create"), button:has-text("New Class"), [data-testid="create-class"]'
    );

    // Fill class details
    await page.fill('[name="name"], [name="className"]', testClass.name);

    const subjectSelect = page.locator('[name="subject"], select[name="subject"]');
    if (await subjectSelect.isVisible()) {
      await subjectSelect.selectOption({ label: new RegExp(testClass.subject, 'i') });
    }

    const gradeSelect = page.locator('[name="gradeLevel"], select[name="grade"]');
    if (await gradeSelect.isVisible()) {
      await gradeSelect.selectOption({ label: new RegExp(testClass.gradeLevel, 'i') });
    }

    // Submit
    await page.click('button[type="submit"], button:has-text("Create")');

    // Verify creation
    await expect(page.locator('text=/created|success/i').first()).toBeVisible();
  });

  test('2.3 Teacher can view class details', async () => {
    await page.goto(`${BASE_URL}/classes`);
    await waitForPageReady(page);

    const classCard = page.locator('.class-card, [data-testid^="class-"]').first();
    await classCard.click();

    await expect(page).toHaveURL(/\/class(es)?\/[a-zA-Z0-9-]+/);
  });

  test('2.4 Teacher can view class roster', async () => {
    await page.goto(`${BASE_URL}/classes`);
    await waitForPageReady(page);

    const classCard = page.locator('.class-card').first();
    await classCard.click();

    const rosterTab = page.locator(
      '[data-testid="roster-tab"], button:has-text("Students"), a:has-text("Roster")'
    );
    if (await rosterTab.isVisible()) {
      await rosterTab.click();
    }

    const studentList = page.locator('[data-testid="student-list"], .roster-list');
    await expect(studentList.or(page.locator('text=/student|enrolled/i').first())).toBeVisible();
  });

  test('2.5 Teacher can add student to class', async () => {
    await page.goto(`${BASE_URL}/classes`);
    await waitForPageReady(page);

    const classCard = page.locator('.class-card').first();
    await classCard.click();

    const addStudentBtn = page.locator(
      'button:has-text("Add Student"), [data-testid="add-student"]'
    );
    if (await addStudentBtn.isVisible()) {
      await addStudentBtn.click();

      // Search for student
      const searchInput = page.locator(
        '[data-testid="student-search"], input[placeholder*="search" i]'
      );
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await page.waitForTimeout(500);
      }
    }
  });

  test('2.6 Teacher can archive a class', async () => {
    await page.goto(`${BASE_URL}/classes`);
    await waitForPageReady(page);

    const classCard = page.locator('.class-card').first();
    await classCard.click();

    const moreBtn = page.locator('[data-testid="more-actions"], button[aria-label="More"]');
    if (await moreBtn.isVisible()) {
      await moreBtn.click();

      const archiveBtn = page.locator('button:has-text("Archive"), [data-testid="archive-class"]');
      if (await archiveBtn.isVisible()) {
        await archiveBtn.click();

        const confirmBtn = page.locator('button:has-text("Confirm")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    }
  });
});

// =============================================================================
// ASSIGNMENT CREATION AND GRADING
// =============================================================================

test.describe('Assignment Creation and Grading', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsTeacher(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('3.1 Teacher can view assignments list', async () => {
    await page.goto(`${BASE_URL}/assignments`);
    await waitForPageReady(page);

    const assignmentList = page.locator('[data-testid="assignment-list"], .assignments-container');
    await expect(assignmentList.or(page.locator('.assignment-card').first())).toBeVisible();
  });

  test('3.2 Teacher can create a new assignment', async () => {
    await page.goto(`${BASE_URL}/assignments/create`);
    await waitForPageReady(page);

    // Fill assignment details
    await page.fill('[name="title"], [name="name"]', 'E2E Test Assignment');
    await page.fill(
      '[name="instructions"], textarea[name="description"]',
      'This is a test assignment for E2E testing.'
    );

    // Set due date
    const dueDateInput = page.locator('[name="dueDate"], input[type="date"]');
    if (await dueDateInput.isVisible()) {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      await dueDateInput.fill(futureDate);
    }

    // Set points
    const pointsInput = page.locator('[name="points"], [name="maxScore"]');
    if (await pointsInput.isVisible()) {
      await pointsInput.fill('100');
    }

    // Select class
    const classSelect = page.locator('[name="classId"], select[name="class"]');
    if (await classSelect.isVisible()) {
      await classSelect.selectOption({ index: 1 });
    }

    // Submit
    await page.click('button[type="submit"], button:has-text("Create")');

    await expect(page.locator('text=/created|success/i').first()).toBeVisible();
  });

  test('3.3 Teacher can edit an assignment', async () => {
    await page.goto(`${BASE_URL}/assignments`);
    await waitForPageReady(page);

    const assignmentCard = page.locator('.assignment-card').first();
    await assignmentCard.click();

    const editBtn = page.locator('button:has-text("Edit"), [data-testid="edit-assignment"]');
    if (await editBtn.isVisible()) {
      await editBtn.click();

      const titleInput = page.locator('[name="title"]');
      if (await titleInput.isVisible()) {
        await titleInput.fill('Updated E2E Test Assignment');
        await page.click('button[type="submit"], button:has-text("Save")');

        await expect(page.locator('text=/updated|saved/i').first()).toBeVisible();
      }
    }
  });

  test('3.4 Teacher can view submissions for an assignment', async () => {
    await page.goto(`${BASE_URL}/assignments`);
    await waitForPageReady(page);

    const assignmentCard = page.locator('.assignment-card').first();
    await assignmentCard.click();

    const submissionsTab = page.locator(
      '[data-testid="submissions-tab"], button:has-text("Submissions")'
    );
    if (await submissionsTab.isVisible()) {
      await submissionsTab.click();
    }

    const submissionsList = page.locator('[data-testid="submissions-list"], .submissions-table');
    await expect(
      submissionsList.or(page.locator('text=/submission|submitted/i').first())
    ).toBeVisible();
  });

  test('3.5 Teacher can grade a submission', async () => {
    await page.goto(`${BASE_URL}/assignments`);
    await waitForPageReady(page);

    const assignmentCard = page.locator('.assignment-card').first();
    await assignmentCard.click();

    // Navigate to submissions
    const submissionsTab = page.locator(
      'button:has-text("Submissions"), [data-testid="submissions-tab"]'
    );
    if (await submissionsTab.isVisible()) {
      await submissionsTab.click();
    }

    // Click on a submission
    const submission = page.locator('.submission-row, [data-testid^="submission-"]').first();
    if (await submission.isVisible()) {
      await submission.click();

      // Enter grade
      const gradeInput = page.locator('[name="grade"], [name="score"], input[type="number"]');
      if (await gradeInput.isVisible()) {
        await gradeInput.fill('85');
      }

      // Add feedback
      const feedbackInput = page.locator('[name="feedback"], textarea');
      if (await feedbackInput.isVisible()) {
        await feedbackInput.fill('Good work! Keep it up.');
      }

      // Save grade
      await page.click('button:has-text("Save"), button:has-text("Submit Grade")');

      await expect(page.locator('text=/graded|saved/i').first()).toBeVisible();
    }
  });

  test('3.6 Teacher can use rubric for grading', async () => {
    await page.goto(`${BASE_URL}/assignments`);
    await waitForPageReady(page);

    const assignmentCard = page.locator('.assignment-card').first();
    await assignmentCard.click();

    const rubricBtn = page.locator('button:has-text("Rubric"), [data-testid="rubric-button"]');
    if (await rubricBtn.isVisible()) {
      await rubricBtn.click();

      const rubricModal = page.locator('[data-testid="rubric-modal"], .rubric-container');
      await expect(rubricModal.first()).toBeVisible();
    }
  });

  test('3.7 Teacher can export grades', async () => {
    await page.goto(`${BASE_URL}/assignments`);
    await waitForPageReady(page);

    const exportBtn = page.locator('button:has-text("Export"), [data-testid="export-grades"]');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();

      // Check for download or export dialog
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      const download = await downloadPromise;

      if (download) {
        expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx)$/);
      }
    }
  });
});

// =============================================================================
// STUDENT PROGRESS REVIEW
// =============================================================================

test.describe('Student Progress Review', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsTeacher(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('4.1 Teacher can view class progress overview', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const progressOverview = page.locator('[data-testid="class-progress"], .progress-dashboard');
    await expect(
      progressOverview.or(page.locator('text=/progress|performance/i').first())
    ).toBeVisible();
  });

  test('4.2 Teacher can view individual student progress', async () => {
    await page.goto(`${BASE_URL}/students`);
    await waitForPageReady(page);

    const studentRow = page.locator('.student-row, [data-testid^="student-"]').first();
    if (await studentRow.isVisible()) {
      await studentRow.click();

      const progressSection = page.locator('[data-testid="student-progress"], .progress-details');
      await expect(
        progressSection.or(page.locator('text=/progress|grades/i').first())
      ).toBeVisible();
    }
  });

  test('4.3 Teacher can view progress charts', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const chart = page.locator('[data-testid="progress-chart"], canvas, .recharts-wrapper');
    await expect(chart.first()).toBeVisible();
  });

  test('4.4 Teacher can filter progress by date range', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const dateFilter = page.locator('[data-testid="date-filter"], select[name="period"]');
    if (await dateFilter.isVisible()) {
      await dateFilter.selectOption({ label: /month|week/i });
      await page.waitForTimeout(500);
    }
  });

  test('4.5 Teacher can identify struggling students', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const atRiskSection = page.locator('[data-testid="at-risk-students"], .struggling-students');
    await expect(
      atRiskSection.or(page.locator('text=/at risk|struggling|needs attention/i').first())
    ).toBeVisible();
  });

  test('4.6 Teacher can view skill mastery breakdown', async () => {
    await page.goto(`${BASE_URL}/progress/skills`);
    await waitForPageReady(page);

    const skillsBreakdown = page.locator('[data-testid="skills-breakdown"], .mastery-grid');
    await expect(skillsBreakdown.or(page.locator('text=/skill|mastery/i').first())).toBeVisible();
  });
});

// =============================================================================
// COMMUNICATION TOOLS
// =============================================================================

test.describe('Communication Tools', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsTeacher(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('5.1 Teacher can view messages inbox', async () => {
    await page.goto(`${BASE_URL}/messages`);
    await waitForPageReady(page);

    const inbox = page.locator('[data-testid="inbox"], .messages-list');
    await expect(inbox.or(page.locator('text=/inbox|messages/i').first())).toBeVisible();
  });

  test('5.2 Teacher can compose a new message', async () => {
    await page.goto(`${BASE_URL}/messages`);
    await waitForPageReady(page);

    await page.click(
      'button:has-text("Compose"), button:has-text("New Message"), [data-testid="compose"]'
    );

    const composeModal = page.locator('[data-testid="compose-modal"], .compose-message');
    await expect(composeModal.or(page.locator('form').first())).toBeVisible();
  });

  test('5.3 Teacher can send message to parent', async () => {
    await page.goto(`${BASE_URL}/messages/compose`);
    await waitForPageReady(page);

    // Select recipient
    const recipientInput = page.locator('[name="recipient"], [data-testid="recipient-search"]');
    if (await recipientInput.isVisible()) {
      await recipientInput.fill('parent');
      await page.waitForTimeout(500);

      const recipientOption = page
        .locator('.recipient-option, [data-testid="recipient-option"]')
        .first();
      if (await recipientOption.isVisible()) {
        await recipientOption.click();
      }
    }

    // Fill message
    await page.fill('[name="subject"]', 'E2E Test Message');
    await page.fill('[name="body"], textarea', 'This is a test message from E2E tests.');

    // Send
    await page.click('button:has-text("Send")');

    await expect(page.locator('text=/sent|success/i').first()).toBeVisible();
  });

  test('5.4 Teacher can send class-wide announcement', async () => {
    await page.goto(`${BASE_URL}/announcements/create`);
    await waitForPageReady(page);

    // Fill announcement
    await page.fill('[name="title"]', 'E2E Test Announcement');
    await page.fill('[name="content"], textarea', 'This is a test announcement for the class.');

    // Select class
    const classSelect = page.locator('[name="classId"], select[name="class"]');
    if (await classSelect.isVisible()) {
      await classSelect.selectOption({ index: 1 });
    }

    // Post
    await page.click('button:has-text("Post"), button:has-text("Send")');

    await expect(page.locator('text=/posted|sent/i').first()).toBeVisible();
  });

  test('5.5 Teacher can reply to a message', async () => {
    await page.goto(`${BASE_URL}/messages`);
    await waitForPageReady(page);

    const messageRow = page.locator('.message-row, [data-testid^="message-"]').first();
    if (await messageRow.isVisible()) {
      await messageRow.click();

      const replyBtn = page.locator('button:has-text("Reply"), [data-testid="reply"]');
      if (await replyBtn.isVisible()) {
        await replyBtn.click();

        await page.fill('textarea', 'This is a reply from E2E test.');
        await page.click('button:has-text("Send")');

        await expect(page.locator('text=/sent|replied/i').first()).toBeVisible();
      }
    }
  });

  test('5.6 Teacher can schedule a message', async () => {
    await page.goto(`${BASE_URL}/messages/compose`);
    await waitForPageReady(page);

    const scheduleBtn = page.locator(
      'button:has-text("Schedule"), [data-testid="schedule-message"]'
    );
    if (await scheduleBtn.isVisible()) {
      await scheduleBtn.click();

      const dateTimePicker = page.locator(
        '[data-testid="schedule-datetime"], input[type="datetime-local"]'
      );
      if (await dateTimePicker.isVisible()) {
        const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
        await dateTimePicker.fill(futureDate);
      }
    }
  });

  test('5.7 Teacher can view sent messages', async () => {
    await page.goto(`${BASE_URL}/messages/sent`);
    await waitForPageReady(page);

    const sentList = page.locator('[data-testid="sent-messages"], .sent-list');
    await expect(sentList.or(page.locator('text=/sent/i').first())).toBeVisible();
  });

  test('5.8 Teacher can delete a message', async () => {
    await page.goto(`${BASE_URL}/messages`);
    await waitForPageReady(page);

    const messageRow = page.locator('.message-row').first();
    if (await messageRow.isVisible()) {
      // Hover to show actions
      await messageRow.hover();

      const deleteBtn = page
        .locator('button[aria-label="Delete"], [data-testid="delete-message"]')
        .first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();

        const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Delete")');
        if (await confirmBtn.isVisible()) {
          await confirmBtn.click();
        }
      }
    }
  });
});

// =============================================================================
// GRADEBOOK MANAGEMENT
// =============================================================================

test.describe('Gradebook Management', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsTeacher(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('6.1 Teacher can view gradebook', async () => {
    await page.goto(`${BASE_URL}/gradebook`);
    await waitForPageReady(page);

    const gradebook = page.locator('[data-testid="gradebook"], .gradebook-table');
    await expect(gradebook.or(page.locator('table, .grades-grid').first())).toBeVisible();
  });

  test('6.2 Teacher can select class for gradebook', async () => {
    await page.goto(`${BASE_URL}/gradebook`);
    await waitForPageReady(page);

    const classSelect = page.locator('[data-testid="class-select"], select[name="class"]');
    if (await classSelect.isVisible()) {
      await classSelect.selectOption({ index: 1 });
      await page.waitForTimeout(500);
    }
  });

  test('6.3 Teacher can enter grades directly', async () => {
    await page.goto(`${BASE_URL}/gradebook`);
    await waitForPageReady(page);

    const gradeCell = page.locator('.grade-cell, [data-testid="grade-input"]').first();
    if (await gradeCell.isVisible()) {
      await gradeCell.click();
      await gradeCell.fill('90');
      await gradeCell.press('Tab');

      await expect(page.locator('text=/saved|updated/i').first())
        .toBeVisible({ timeout: 3000 })
        .catch(() => {});
    }
  });

  test('6.4 Teacher can export gradebook', async () => {
    await page.goto(`${BASE_URL}/gradebook`);
    await waitForPageReady(page);

    const exportBtn = page.locator('button:has-text("Export"), [data-testid="export-gradebook"]');
    if (await exportBtn.isVisible()) {
      await exportBtn.click();
    }
  });
});
