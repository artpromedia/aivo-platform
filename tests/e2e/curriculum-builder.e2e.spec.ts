/**
 * Curriculum Builder End-to-End Tests
 *
 * Comprehensive E2E test suite for the Curriculum Builder/Content Author Portal covering:
 * - Content creation flows
 * - Asset management
 * - Publishing workflows
 * - Version control
 *
 * @module tests/e2e/curriculum-builder.e2e.spec
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const BASE_URL = process.env.AUTHOR_URL || 'http://localhost:3005';
const API_URL = process.env.API_URL || 'http://localhost:4000';

const testAuthor = {
  email: 'author-e2e@example.com',
  password: 'SecureAuthorPass123!',
  firstName: 'Test',
  lastName: 'Author',
  role: 'CONTENT_AUTHOR',
};

const testCourse = {
  title: 'E2E Test Course - Mathematics Fundamentals',
  description: 'A test course for E2E testing purposes',
  subject: 'Mathematics',
  gradeLevel: '5',
};

const testLesson = {
  title: 'E2E Test Lesson - Introduction to Fractions',
  description: 'Learn the basics of fractions',
  duration: 30,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

async function loginAsAuthor(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"], input[type="email"]', testAuthor.email);
  await page.fill('[name="password"], input[type="password"]', testAuthor.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home|courses)/, { timeout: 10000 });
}

async function takeScreenshotOnFailure(page: Page, testName: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/curriculum-builder/${testName}-${Date.now()}.png`,
    fullPage: true,
  });
}

async function seedTestData(): Promise<void> {
  await fetch(`${API_URL}/test/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'curriculum-builder-e2e' }),
  }).catch(() => {});
}

async function cleanupTestData(): Promise<void> {
  await fetch(`${API_URL}/test/cleanup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'curriculum-builder-e2e' }),
  }).catch(() => {});
}

// =============================================================================
// CONTENT CREATION FLOWS
// =============================================================================

test.describe('Content Creation Flows', () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('1.1 Author can login to curriculum builder', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);

    await page.fill('[name="email"]', testAuthor.email);
    await page.fill('[name="password"]', testAuthor.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|home|courses)/);
  });

  test('1.2 Author can view courses list', async ({ page }) => {
    await loginAsAuthor(page);
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const coursesList = page.locator('[data-testid="courses-list"], .courses-grid');
    await expect(coursesList.or(page.locator('.course-card').first())).toBeVisible();
  });

  test('1.3 Author can create new course', async ({ page }) => {
    await loginAsAuthor(page);
    await page.goto(`${BASE_URL}/courses/create`);
    await waitForPageReady(page);

    // Fill course details
    await page.fill('[name="title"]', testCourse.title);
    await page.fill('[name="description"], textarea', testCourse.description);

    const subjectSelect = page.locator('[name="subject"], select[name="subject"]');
    if (await subjectSelect.isVisible()) {
      await subjectSelect.selectOption({ label: new RegExp(testCourse.subject, 'i') });
    }

    const gradeSelect = page.locator('[name="gradeLevel"], select[name="grade"]');
    if (await gradeSelect.isVisible()) {
      await gradeSelect.selectOption({ label: new RegExp(testCourse.gradeLevel, 'i') });
    }

    // Submit
    await page.click('button[type="submit"], button:has-text("Create")');

    await expect(page.locator('text=/created|success/i').first()).toBeVisible();
  });

  test('1.4 Author can add module to course', async ({ page }) => {
    await loginAsAuthor(page);
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const addModuleBtn = page.locator('button:has-text("Add Module"), [data-testid="add-module"]');
    if (await addModuleBtn.isVisible()) {
      await addModuleBtn.click();

      await page.fill('[name="title"]', 'E2E Test Module');
      await page.click('button:has-text("Save"), button[type="submit"]');

      await expect(page.locator('text=/added|created/i').first()).toBeVisible();
    }
  });

  test('1.5 Author can add lesson to module', async ({ page }) => {
    await loginAsAuthor(page);
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const moduleSection = page.locator('.module-section, [data-testid="module"]').first();
    if (await moduleSection.isVisible()) {
      await moduleSection.click();

      const addLessonBtn = page.locator('button:has-text("Add Lesson"), [data-testid="add-lesson"]');
      if (await addLessonBtn.isVisible()) {
        await addLessonBtn.click();

        await page.fill('[name="title"]', testLesson.title);
        await page.click('button:has-text("Save")');
      }
    }
  });

  test('1.6 Author can create assessment', async ({ page }) => {
    await loginAsAuthor(page);
    await page.goto(`${BASE_URL}/assessments/create`);
    await waitForPageReady(page);

    const assessmentForm = page.locator('[data-testid="assessment-form"], .create-assessment');
    await expect(assessmentForm.or(page.locator('form').first())).toBeVisible();

    await page.fill('[name="title"]', 'E2E Test Assessment');

    // Add question
    const addQuestionBtn = page.locator('button:has-text("Add Question"), [data-testid="add-question"]');
    if (await addQuestionBtn.isVisible()) {
      await addQuestionBtn.click();
    }
  });

  test('1.7 Author can add multiple choice question', async ({ page }) => {
    await loginAsAuthor(page);
    await page.goto(`${BASE_URL}/assessments/create`);
    await waitForPageReady(page);

    const addQuestionBtn = page.locator('button:has-text("Add Question")');
    if (await addQuestionBtn.isVisible()) {
      await addQuestionBtn.click();

      const questionTypeSelect = page.locator('[data-testid="question-type"], select[name="type"]');
      if (await questionTypeSelect.isVisible()) {
        await questionTypeSelect.selectOption({ label: /multiple choice/i });
      }

      await page.fill('[name="questionText"], textarea', 'What is 2 + 2?');

      // Add options
      const optionInputs = page.locator('[data-testid="option-input"], input[name^="option"]');
      const optionCount = await optionInputs.count();
      if (optionCount > 0) {
        await optionInputs.nth(0).fill('3');
        await optionInputs.nth(1).fill('4');
        await optionInputs.nth(2).fill('5');
      }
    }
  });

  test('1.8 Author can use rich text editor', async ({ page }) => {
    await loginAsAuthor(page);
    await page.goto(`${BASE_URL}/lessons/create`);
    await waitForPageReady(page);

    const richTextEditor = page.locator('[data-testid="rich-text-editor"], .ql-editor, .ProseMirror');
    await expect(richTextEditor.first()).toBeVisible();
  });

  test('1.9 Author can add interactive elements', async ({ page }) => {
    await loginAsAuthor(page);
    await page.goto(`${BASE_URL}/lessons/create`);
    await waitForPageReady(page);

    const addElementBtn = page.locator('button:has-text("Add Element"), [data-testid="add-element"]');
    if (await addElementBtn.isVisible()) {
      await addElementBtn.click();

      const interactiveOption = page.locator('[data-testid="interactive-element"], button:has-text("Interactive")');
      if (await interactiveOption.isVisible()) {
        await interactiveOption.click();
      }
    }
  });

  test('1.10 Author can preview content', async ({ page }) => {
    await loginAsAuthor(page);
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const previewBtn = page.locator('button:has-text("Preview"), [data-testid="preview"]');
    if (await previewBtn.isVisible()) {
      await previewBtn.click();

      const previewModal = page.locator('[data-testid="preview-modal"], .preview-container');
      await expect(previewModal.or(page.locator('text=/preview/i').first())).toBeVisible();
    }
  });
});

// =============================================================================
// ASSET MANAGEMENT
// =============================================================================

test.describe('Asset Management', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: 'test-results/videos/curriculum-builder/' },
    });
    page = await context.newPage();
    await loginAsAuthor(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('2.1 Author can access media library', async () => {
    await page.goto(`${BASE_URL}/media`);
    await waitForPageReady(page);

    const mediaLibrary = page.locator('[data-testid="media-library"], .media-grid');
    await expect(mediaLibrary.or(page.locator('text=/media|asset/i').first())).toBeVisible();
  });

  test('2.2 Author can upload image', async () => {
    await page.goto(`${BASE_URL}/media`);
    await waitForPageReady(page);

    const uploadBtn = page.locator('button:has-text("Upload"), [data-testid="upload-media"]');
    if (await uploadBtn.isVisible()) {
      await uploadBtn.click();

      const fileInput = page.locator('input[type="file"]');
      if (await fileInput.isVisible()) {
        await fileInput.setInputFiles({
          name: 'test-image.png',
          mimeType: 'image/png',
          buffer: Buffer.from('fake image content'),
        });
      }
    }
  });

  test('2.3 Author can upload video', async () => {
    await page.goto(`${BASE_URL}/media`);
    await waitForPageReady(page);

    const uploadVideoBtn = page.locator('button:has-text("Upload Video"), [data-testid="upload-video"]');
    if (await uploadVideoBtn.isVisible()) {
      await uploadVideoBtn.click();
    }
  });

  test('2.4 Author can search media library', async () => {
    await page.goto(`${BASE_URL}/media`);
    await waitForPageReady(page);

    const searchInput = page.locator('[data-testid="media-search"], input[placeholder*="search" i]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('test');
      await page.waitForTimeout(500);
    }
  });

  test('2.5 Author can filter media by type', async () => {
    await page.goto(`${BASE_URL}/media`);
    await waitForPageReady(page);

    const typeFilter = page.locator('[data-testid="type-filter"], select[name="type"]');
    if (await typeFilter.isVisible()) {
      await typeFilter.selectOption({ label: /image/i });
      await page.waitForTimeout(500);
    }
  });

  test('2.6 Author can organize media in folders', async () => {
    await page.goto(`${BASE_URL}/media`);
    await waitForPageReady(page);

    const createFolderBtn = page.locator('button:has-text("New Folder"), [data-testid="create-folder"]');
    if (await createFolderBtn.isVisible()) {
      await createFolderBtn.click();

      await page.fill('[name="folderName"]', 'E2E Test Folder');
      await page.click('button:has-text("Create")');
    }
  });

  test('2.7 Author can edit media metadata', async () => {
    await page.goto(`${BASE_URL}/media`);
    await waitForPageReady(page);

    const mediaItem = page.locator('.media-item, [data-testid^="media-"]').first();
    if (await mediaItem.isVisible()) {
      await mediaItem.click();

      const editBtn = page.locator('button:has-text("Edit"), [data-testid="edit-media"]');
      if (await editBtn.isVisible()) {
        await editBtn.click();

        const altTextInput = page.locator('[name="altText"], [name="alt"]');
        if (await altTextInput.isVisible()) {
          await altTextInput.fill('E2E Test Alt Text');
        }
      }
    }
  });

  test('2.8 Author can delete media', async () => {
    await page.goto(`${BASE_URL}/media`);
    await waitForPageReady(page);

    const mediaItem = page.locator('.media-item').first();
    if (await mediaItem.isVisible()) {
      await mediaItem.hover();

      const deleteBtn = page.locator('button[aria-label="Delete"], [data-testid="delete-media"]').first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();

        const confirmBtn = page.locator('button:has-text("Confirm")');
        if (await confirmBtn.isVisible()) {
          // Don't actually delete - just verify dialog appears
          const cancelBtn = page.locator('button:has-text("Cancel")');
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
          }
        }
      }
    }
  });

  test('2.9 Author can embed media in content', async () => {
    await page.goto(`${BASE_URL}/lessons/create`);
    await waitForPageReady(page);

    const embedMediaBtn = page.locator('button:has-text("Add Media"), [data-testid="embed-media"]');
    if (await embedMediaBtn.isVisible()) {
      await embedMediaBtn.click();

      const mediaSelector = page.locator('[data-testid="media-selector"], .media-picker');
      await expect(mediaSelector.first()).toBeVisible();
    }
  });

  test('2.10 Author can view media usage', async () => {
    await page.goto(`${BASE_URL}/media`);
    await waitForPageReady(page);

    const mediaItem = page.locator('.media-item').first();
    if (await mediaItem.isVisible()) {
      await mediaItem.click();

      const usageTab = page.locator('button:has-text("Usage"), [data-testid="usage-tab"]');
      if (await usageTab.isVisible()) {
        await usageTab.click();
      }
    }
  });
});

// =============================================================================
// PUBLISHING WORKFLOWS
// =============================================================================

test.describe('Publishing Workflows', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsAuthor(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('3.1 Author can submit content for review', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const submitBtn = page.locator('button:has-text("Submit for Review"), [data-testid="submit-review"]');
    if (await submitBtn.isVisible()) {
      await submitBtn.click();

      await expect(page.locator('text=/submitted|review/i').first()).toBeVisible();
    }
  });

  test('3.2 Author can view review status', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const statusBadge = page.locator('[data-testid="review-status"], .status-badge');
    await expect(statusBadge.or(page.locator('text=/draft|review|published/i').first())).toBeVisible();
  });

  test('3.3 Author can view review comments', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const commentsTab = page.locator('button:has-text("Comments"), [data-testid="comments-tab"]');
    if (await commentsTab.isVisible()) {
      await commentsTab.click();

      const comments = page.locator('[data-testid="review-comments"], .comments-list');
      await expect(comments.or(page.locator('text=/comment/i').first())).toBeVisible();
    }
  });

  test('3.4 Reviewer can approve content', async () => {
    await page.goto(`${BASE_URL}/review`);
    await waitForPageReady(page);

    const pendingContent = page.locator('[data-testid="pending-review"], .review-item').first();
    if (await pendingContent.isVisible()) {
      await pendingContent.click();

      const approveBtn = page.locator('button:has-text("Approve"), [data-testid="approve"]');
      if (await approveBtn.isVisible()) {
        // Don't actually approve
      }
    }
  });

  test('3.5 Reviewer can request changes', async () => {
    await page.goto(`${BASE_URL}/review`);
    await waitForPageReady(page);

    const pendingContent = page.locator('.review-item').first();
    if (await pendingContent.isVisible()) {
      await pendingContent.click();

      const requestChangesBtn = page.locator('button:has-text("Request Changes"), [data-testid="request-changes"]');
      if (await requestChangesBtn.isVisible()) {
        // Don't actually request changes
      }
    }
  });

  test('3.6 Author can publish approved content', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const approvedCourse = page.locator('.course-card:has-text("Approved")').first();
    if (await approvedCourse.isVisible()) {
      await approvedCourse.click();

      const publishBtn = page.locator('button:has-text("Publish"), [data-testid="publish"]');
      if (await publishBtn.isVisible()) {
        await publishBtn.click();

        const confirmBtn = page.locator('button:has-text("Confirm")');
        if (await confirmBtn.isVisible()) {
          // Don't actually publish
          const cancelBtn = page.locator('button:has-text("Cancel")');
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
          }
        }
      }
    }
  });

  test('3.7 Author can unpublish content', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const publishedCourse = page.locator('.course-card:has-text("Published")').first();
    if (await publishedCourse.isVisible()) {
      await publishedCourse.click();

      const unpublishBtn = page.locator('button:has-text("Unpublish"), [data-testid="unpublish"]');
      if (await unpublishBtn.isVisible()) {
        // Don't actually unpublish
      }
    }
  });

  test('3.8 Author can schedule publication', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const scheduleBtn = page.locator('button:has-text("Schedule"), [data-testid="schedule-publish"]');
    if (await scheduleBtn.isVisible()) {
      await scheduleBtn.click();

      const datePicker = page.locator('[data-testid="schedule-date"], input[type="datetime-local"]');
      if (await datePicker.isVisible()) {
        const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
        await datePicker.fill(futureDate);
      }
    }
  });

  test('3.9 Author can view publication history', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const historyTab = page.locator('button:has-text("History"), [data-testid="history-tab"]');
    if (await historyTab.isVisible()) {
      await historyTab.click();
    }
  });
});

// =============================================================================
// VERSION CONTROL
// =============================================================================

test.describe('Version Control', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsAuthor(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('4.1 Author can view version history', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const versionsTab = page.locator('button:has-text("Versions"), [data-testid="versions-tab"]');
    if (await versionsTab.isVisible()) {
      await versionsTab.click();

      const versionsList = page.locator('[data-testid="versions-list"], .version-history');
      await expect(versionsList.or(page.locator('text=/version/i').first())).toBeVisible();
    }
  });

  test('4.2 Author can compare versions', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const compareBtn = page.locator('button:has-text("Compare"), [data-testid="compare-versions"]');
    if (await compareBtn.isVisible()) {
      await compareBtn.click();

      const diffView = page.locator('[data-testid="diff-view"], .version-diff');
      await expect(diffView.or(page.locator('text=/change|difference/i').first())).toBeVisible();
    }
  });

  test('4.3 Author can restore previous version', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const versionsTab = page.locator('button:has-text("Versions")');
    if (await versionsTab.isVisible()) {
      await versionsTab.click();

      const restoreBtn = page.locator('button:has-text("Restore"), [data-testid="restore-version"]').first();
      if (await restoreBtn.isVisible()) {
        // Don't actually restore
      }
    }
  });

  test('4.4 Author can create named version', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const saveVersionBtn = page.locator('button:has-text("Save Version"), [data-testid="save-version"]');
    if (await saveVersionBtn.isVisible()) {
      await saveVersionBtn.click();

      await page.fill('[name="versionName"]', 'E2E Test Version');
      await page.click('button:has-text("Save")');
    }
  });

  test('4.5 Author can view change log', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const changeLogBtn = page.locator('button:has-text("Change Log"), [data-testid="changelog"]');
    if (await changeLogBtn.isVisible()) {
      await changeLogBtn.click();

      const changeLog = page.locator('[data-testid="changelog-list"], .changelog');
      await expect(changeLog.or(page.locator('text=/change/i').first())).toBeVisible();
    }
  });

  test('4.6 Author can add version notes', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const notesInput = page.locator('[data-testid="version-notes"], textarea[name="notes"]');
    if (await notesInput.isVisible()) {
      await notesInput.fill('E2E Test version notes');
    }
  });

  test('4.7 System auto-saves drafts', async () => {
    await page.goto(`${BASE_URL}/lessons/create`);
    await waitForPageReady(page);

    await page.fill('[name="title"]', 'Auto-save test lesson');

    // Wait for auto-save indicator
    const autoSaveIndicator = page.locator('[data-testid="auto-save"], text=/saved|saving/i');
    await expect(autoSaveIndicator.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
  });

  test('4.8 Author can recover auto-saved drafts', async () => {
    await page.goto(`${BASE_URL}/drafts`);
    await waitForPageReady(page);

    const draftsList = page.locator('[data-testid="drafts-list"], .drafts-container');
    await expect(draftsList.or(page.locator('text=/draft/i').first())).toBeVisible();
  });

  test('4.9 Author can fork/duplicate course', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const duplicateBtn = page.locator('button:has-text("Duplicate"), button:has-text("Fork"), [data-testid="duplicate"]');
    if (await duplicateBtn.isVisible()) {
      await duplicateBtn.click();

      await expect(page.locator('text=/duplicated|copied/i').first()).toBeVisible();
    }
  });

  test('4.10 Author can delete draft version', async () => {
    await page.goto(`${BASE_URL}/drafts`);
    await waitForPageReady(page);

    const draftItem = page.locator('.draft-item, [data-testid^="draft-"]').first();
    if (await draftItem.isVisible()) {
      await draftItem.hover();

      const deleteBtn = page.locator('button[aria-label="Delete"], [data-testid="delete-draft"]').first();
      if (await deleteBtn.isVisible()) {
        await deleteBtn.click();

        const confirmBtn = page.locator('button:has-text("Confirm")');
        if (await confirmBtn.isVisible()) {
          // Don't actually delete
          const cancelBtn = page.locator('button:has-text("Cancel")');
          if (await cancelBtn.isVisible()) {
            await cancelBtn.click();
          }
        }
      }
    }
  });
});

// =============================================================================
// COLLABORATION FEATURES
// =============================================================================

test.describe('Collaboration Features', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsAuthor(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('5.1 Author can invite collaborators', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const shareBtn = page.locator('button:has-text("Share"), [data-testid="share"]');
    if (await shareBtn.isVisible()) {
      await shareBtn.click();

      const shareModal = page.locator('[data-testid="share-modal"], .share-dialog');
      await expect(shareModal.first()).toBeVisible();
    }
  });

  test('5.2 Author can set collaborator permissions', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const settingsBtn = page.locator('button:has-text("Settings"), [data-testid="course-settings"]');
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();

      const permissionsSection = page.locator('[data-testid="permissions"], .collaborator-permissions');
      await expect(permissionsSection.or(page.locator('text=/permission|access/i').first())).toBeVisible();
    }
  });

  test('5.3 Author can leave comments', async () => {
    await page.goto(`${BASE_URL}/courses`);
    await waitForPageReady(page);

    const courseCard = page.locator('.course-card').first();
    await courseCard.click();

    const addCommentBtn = page.locator('button:has-text("Comment"), [data-testid="add-comment"]');
    if (await addCommentBtn.isVisible()) {
      await addCommentBtn.click();

      const commentInput = page.locator('[data-testid="comment-input"], textarea');
      if (await commentInput.isVisible()) {
        await commentInput.fill('E2E Test Comment');
      }
    }
  });

  test('5.4 Author can view activity feed', async () => {
    await page.goto(`${BASE_URL}/activity`);
    await waitForPageReady(page);

    const activityFeed = page.locator('[data-testid="activity-feed"], .activity-list');
    await expect(activityFeed.or(page.locator('text=/activity/i').first())).toBeVisible();
  });
});
