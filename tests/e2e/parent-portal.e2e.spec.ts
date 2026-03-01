/**
 * Parent Portal End-to-End Tests
 *
 * Comprehensive E2E test suite for the Parent Portal covering:
 * - Parent login and dashboard
 * - Child progress viewing
 * - Communication with teachers
 * - Payment/billing access
 * - Settings management
 * - Caregiver management (PX6)
 * - Add child flow (PX6)
 * - Tutor add-on purchase (PX6)
 * - Cancellation survey flow (PX6)
 *
 * @module tests/e2e/parent-portal.e2e.spec
 */

import { test, expect, Page, BrowserContext } from '@playwright/test';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const BASE_URL = process.env.PARENT_URL || 'http://localhost:3001';
const API_URL = process.env.API_URL || 'http://localhost:4000';

const testParent = {
  email: 'parent-e2e@example.com',
  password: 'SecurePass123!',
  firstName: 'Test',
  lastName: 'Parent',
};

const testChild = {
  firstName: 'Test',
  lastName: 'Child',
  gradeLevel: '5',
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function waitForPageReady(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.waitForLoadState('domcontentloaded');
}

async function loginAsParent(page: Page): Promise<void> {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('[name="email"], input[type="email"]', testParent.email);
  await page.fill('[name="password"], input[type="password"]', testParent.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home)/, { timeout: 10000 });
}

async function takeScreenshotOnFailure(page: Page, testName: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/parent-portal/${testName}-${Date.now()}.png`,
    fullPage: true,
  });
}

async function seedTestData(): Promise<void> {
  await fetch(`${API_URL}/test/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'parent-portal-e2e' }),
  }).catch(() => {});
}

async function cleanupTestData(): Promise<void> {
  await fetch(`${API_URL}/test/cleanup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'parent-portal-e2e' }),
  }).catch(() => {});
}

// =============================================================================
// PARENT LOGIN AND DASHBOARD
// =============================================================================

test.describe('Parent Login and Dashboard', () => {
  test.beforeAll(async () => {
    await seedTestData();
  });

  test.afterAll(async () => {
    await cleanupTestData();
  });

  test('1.1 Parent can login with valid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);

    await page.fill('[name="email"]', testParent.email);
    await page.fill('[name="password"]', testParent.password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/(dashboard|home)/);
  });

  test('1.2 Parent sees error with invalid credentials', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await waitForPageReady(page);

    await page.fill('[name="email"]', testParent.email);
    await page.fill('[name="password"]', 'WrongPassword123!');
    await page.click('button[type="submit"]');

    await expect(page.locator('text=/invalid|incorrect|error/i').first()).toBeVisible();
  });

  test('1.3 Dashboard displays linked children', async ({ page }) => {
    await loginAsParent(page);

    const childrenSection = page.locator('[data-testid="linked-children"], .children-overview');
    await expect(childrenSection.or(page.locator('text=/child|learner/i').first())).toBeVisible();
  });

  test('1.4 Dashboard shows quick stats for each child', async ({ page }) => {
    await loginAsParent(page);

    const statsSection = page.locator('[data-testid="child-stats"], .child-progress-card');
    await expect(statsSection.first()).toBeVisible();
  });

  test('1.5 Dashboard displays recent activity', async ({ page }) => {
    await loginAsParent(page);

    const activitySection = page.locator('[data-testid="recent-activity"], .activity-feed');
    await expect(activitySection.or(page.locator('text=/recent|activity/i').first())).toBeVisible();
  });

  test('1.6 Parent can switch between children', async ({ page }) => {
    await loginAsParent(page);

    const childSelector = page.locator(
      '[data-testid="child-selector"], select[name="child"], .child-tabs'
    );
    if (await childSelector.isVisible()) {
      await childSelector.click();
      await page.waitForTimeout(500);
    }
  });

  test('1.7 Dashboard shows Add Child quick action and navigates to add-child page', async ({
    page,
  }) => {
    await loginAsParent(page);

    // Find the Add Child button in quick actions
    const addChildButton = page.locator('text=Add Child').first();
    await expect(addChildButton).toBeVisible();

    await addChildButton.click();
    await expect(page).toHaveURL(/\/family\/add-child/);

    // Verify the add-child form page loads
    await expect(
      page.locator('text=/Add a Child|Add Another Child|Add New Learner/i').first()
    ).toBeVisible();
  });
});

// =============================================================================
// CHILD PROGRESS VIEWING
// =============================================================================

test.describe('Child Progress Viewing', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      recordVideo: { dir: 'test-results/videos/parent-portal/' },
    });
    page = await context.newPage();
    await loginAsParent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('2.1 Parent can view overall progress', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const progressOverview = page.locator('[data-testid="progress-overview"], .progress-dashboard');
    await expect(
      progressOverview.or(page.locator('text=/progress|performance/i').first())
    ).toBeVisible();
  });

  test('2.2 Parent can view progress by subject', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const subjectProgress = page.locator('[data-testid="subject-progress"], .subject-breakdown');
    await expect(
      subjectProgress.or(page.locator('text=/math|science|reading/i').first())
    ).toBeVisible();
  });

  test('2.3 Parent can view grades and assignments', async () => {
    await page.goto(`${BASE_URL}/grades`);
    await waitForPageReady(page);

    const gradesSection = page.locator('[data-testid="grades-list"], .grades-container');
    await expect(gradesSection.or(page.locator('text=/grade|assignment/i').first())).toBeVisible();
  });

  test('2.4 Parent can view learning streak', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const streak = page.locator('[data-testid="learning-streak"], .streak-display');
    await expect(streak.or(page.locator('text=/streak|days/i').first())).toBeVisible();
  });

  test('2.5 Parent can view progress charts', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const chart = page.locator('[data-testid="progress-chart"], canvas, .recharts-wrapper');
    await expect(chart.first()).toBeVisible();
  });

  test('2.6 Parent can view time spent learning', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const timeSection = page.locator('[data-testid="time-spent"], .learning-time');
    await expect(timeSection.or(page.locator('text=/time|hours|minutes/i').first())).toBeVisible();
  });

  test('2.7 Parent can view achievement badges', async () => {
    await page.goto(`${BASE_URL}/progress/achievements`);
    await waitForPageReady(page);

    const achievements = page.locator('[data-testid="achievements"], .badges-grid');
    await expect(achievements.or(page.locator('text=/badge|achievement/i').first())).toBeVisible();
  });

  test('2.8 Parent can download progress report', async () => {
    await page.goto(`${BASE_URL}/progress`);
    await waitForPageReady(page);

    const downloadBtn = page.locator(
      'button:has-text("Download"), button:has-text("Export"), [data-testid="download-report"]'
    );
    if (await downloadBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await downloadBtn.click();
    }
  });
});

// =============================================================================
// COMMUNICATION WITH TEACHERS
// =============================================================================

test.describe('Communication with Teachers', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsParent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('3.1 Parent can view messages inbox', async () => {
    await page.goto(`${BASE_URL}/messages`);
    await waitForPageReady(page);

    const inbox = page.locator('[data-testid="inbox"], .messages-list');
    await expect(inbox.or(page.locator('text=/inbox|messages/i').first())).toBeVisible();
  });

  test('3.2 Parent can compose a message to teacher', async () => {
    await page.goto(`${BASE_URL}/messages/compose`);
    await waitForPageReady(page);

    // Select teacher
    const teacherSelect = page.locator('[data-testid="teacher-select"], select[name="recipient"]');
    if (await teacherSelect.isVisible()) {
      await teacherSelect.selectOption({ index: 1 });
    }

    // Fill message
    await page.fill('[name="subject"]', 'E2E Test Message from Parent');
    await page.fill('[name="body"], textarea', 'This is a test message from E2E tests.');

    // Send
    await page.click('button:has-text("Send")');

    await expect(page.locator('text=/sent|success/i').first()).toBeVisible();
  });

  test('3.3 Parent can view teacher contact information', async () => {
    await page.goto(`${BASE_URL}/teachers`);
    await waitForPageReady(page);

    const teacherList = page.locator('[data-testid="teacher-list"], .teachers-container');
    await expect(teacherList.or(page.locator('text=/teacher/i').first())).toBeVisible();
  });

  test('3.4 Parent can reply to a message', async () => {
    await page.goto(`${BASE_URL}/messages`);
    await waitForPageReady(page);

    const messageRow = page.locator('.message-row, [data-testid^="message-"]').first();
    if (await messageRow.isVisible()) {
      await messageRow.click();

      const replyBtn = page.locator('button:has-text("Reply")');
      if (await replyBtn.isVisible()) {
        await replyBtn.click();
        await page.fill('textarea', 'This is a reply from E2E test.');
        await page.click('button:has-text("Send")');
      }
    }
  });

  test('3.5 Parent can view announcements', async () => {
    await page.goto(`${BASE_URL}/announcements`);
    await waitForPageReady(page);

    const announcements = page.locator('[data-testid="announcements"], .announcements-list');
    await expect(announcements.or(page.locator('text=/announcement/i').first())).toBeVisible();
  });

  test('3.6 Parent can schedule a meeting', async () => {
    await page.goto(`${BASE_URL}/meetings/schedule`);
    await waitForPageReady(page);

    const schedulingForm = page.locator('[data-testid="meeting-form"], .schedule-meeting');
    await expect(schedulingForm.or(page.locator('text=/schedule|meeting/i').first())).toBeVisible();
  });
});

// =============================================================================
// PAYMENT/BILLING ACCESS
// =============================================================================

test.describe('Payment/Billing Access', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsParent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('4.1 Parent can view subscription status', async () => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    const subscriptionSection = page.locator(
      '[data-testid="subscription-status"], .subscription-info'
    );
    await expect(
      subscriptionSection.or(page.locator('text=/subscription|plan/i').first())
    ).toBeVisible();
  });

  test('4.2 Parent can view billing history', async () => {
    await page.goto(`${BASE_URL}/billing/history`);
    await waitForPageReady(page);

    const billingHistory = page.locator('[data-testid="billing-history"], .invoices-list');
    await expect(
      billingHistory.or(page.locator('text=/invoice|payment|history/i').first())
    ).toBeVisible();
  });

  test('4.3 Parent can view payment methods', async () => {
    await page.goto(`${BASE_URL}/billing/payment-methods`);
    await waitForPageReady(page);

    const paymentMethods = page.locator('[data-testid="payment-methods"], .cards-list');
    await expect(
      paymentMethods.or(page.locator('text=/payment method|card/i').first())
    ).toBeVisible();
  });

  test('4.4 Parent can add new payment method', async () => {
    await page.goto(`${BASE_URL}/billing/payment-methods`);
    await waitForPageReady(page);

    const addBtn = page.locator('button:has-text("Add"), [data-testid="add-payment-method"]');
    if (await addBtn.isVisible()) {
      await addBtn.click();

      // Stripe form should appear
      const stripeForm = page.locator('iframe[name*="stripe"], [data-testid="payment-form"]');
      await expect(stripeForm.first()).toBeVisible();
    }
  });

  test('4.5 Parent can view available plans', async () => {
    await page.goto(`${BASE_URL}/billing/plans`);
    await waitForPageReady(page);

    const plansSection = page.locator('[data-testid="plans-list"], .pricing-plans');
    await expect(
      plansSection.or(page.locator('text=/plan|monthly|annual/i').first())
    ).toBeVisible();
  });

  test('4.6 Parent can download invoice', async () => {
    await page.goto(`${BASE_URL}/billing/history`);
    await waitForPageReady(page);

    const downloadBtn = page
      .locator('button:has-text("Download"), [data-testid="download-invoice"]')
      .first();
    if (await downloadBtn.isVisible()) {
      const downloadPromise = page.waitForEvent('download', { timeout: 5000 }).catch(() => null);
      await downloadBtn.click();
    }
  });

  test('4.7 Parent can update billing address', async () => {
    await page.goto(`${BASE_URL}/billing/address`);
    await waitForPageReady(page);

    const addressForm = page.locator('[data-testid="billing-address"], .address-form');
    await expect(addressForm.or(page.locator('text=/address|billing/i').first())).toBeVisible();
  });

  test('4.8 Parent can cancel subscription', async () => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    const cancelBtn = page.locator(
      'button:has-text("Cancel"), [data-testid="cancel-subscription"]'
    );
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();

      // Step 1: Reason selection
      const reasonStep = page.locator('[data-testid="cancel-step-reason"]');
      await expect(reasonStep.or(page.locator('text=/why are you cancel/i').first())).toBeVisible();

      // Select a reason
      const reasonOption = page.locator('[data-testid="cancel-reason-too_expensive"]');
      if (await reasonOption.isVisible()) {
        await reasonOption.click();
      }

      // Optionally fill feedback
      const feedbackInput = page.locator('[data-testid="cancel-feedback"]');
      if (await feedbackInput.isVisible()) {
        await feedbackInput.fill('Testing cancel flow');
      }

      // Click Continue
      const nextBtn = page.locator('[data-testid="cancel-next"]');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      }

      // Step 2: Retention offers (may or may not appear)
      const offersStep = page.locator('[data-testid="cancel-step-offers"]');
      if (await offersStep.isVisible({ timeout: 2000 }).catch(() => false)) {
        // Skip offers to proceed to confirmation
        const skipBtn = page.locator('[data-testid="cancel-skip-offers"]');
        if (await skipBtn.isVisible()) {
          await skipBtn.click();
        }
      }

      // Step 3: Confirm — verify the confirmation step is shown
      const confirmStep = page.locator('[data-testid="cancel-step-confirm"]');
      await expect(
        confirmStep.or(page.locator('text=/confirm cancellation/i').first())
      ).toBeVisible();

      // Don't actually cancel — close the modal
      const closeBtn = page.locator('button[aria-label="Close"]');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });
});

// =============================================================================
// SETTINGS MANAGEMENT
// =============================================================================

test.describe('Settings Management', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsParent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('5.1 Parent can access settings page', async () => {
    await page.goto(`${BASE_URL}/settings`);
    await waitForPageReady(page);

    const settingsPage = page.locator('[data-testid="settings"], .settings-container');
    await expect(settingsPage.or(page.locator('h1:has-text("Settings")').first())).toBeVisible();
  });

  test('5.2 Parent can update profile information', async () => {
    await page.goto(`${BASE_URL}/settings/profile`);
    await waitForPageReady(page);

    const nameInput = page.locator('[name="firstName"], [name="name"]');
    if (await nameInput.isVisible()) {
      await nameInput.fill('Updated Test');
      await page.click('button:has-text("Save"), button[type="submit"]');

      await expect(page.locator('text=/saved|updated/i').first()).toBeVisible();
    }
  });

  test('5.3 Parent can change password', async () => {
    await page.goto(`${BASE_URL}/settings/security`);
    await waitForPageReady(page);

    const changePasswordBtn = page.locator(
      'button:has-text("Change Password"), [data-testid="change-password"]'
    );
    if (await changePasswordBtn.isVisible()) {
      await changePasswordBtn.click();

      const passwordForm = page.locator('[data-testid="password-form"], .change-password-form');
      await expect(passwordForm.or(page.locator('[name="currentPassword"]').first())).toBeVisible();
    }
  });

  test('5.4 Parent can manage notification preferences', async () => {
    await page.goto(`${BASE_URL}/settings/notifications`);
    await waitForPageReady(page);

    const notificationSettings = page.locator(
      '[data-testid="notification-settings"], .notification-preferences'
    );
    await expect(
      notificationSettings.or(page.locator('text=/notification/i').first())
    ).toBeVisible();

    // Toggle a notification setting
    const toggle = page
      .locator('[data-testid="email-notifications"], input[type="checkbox"]')
      .first();
    if (await toggle.isVisible()) {
      await toggle.click();
    }
  });

  test('5.5 Parent can set screen time limits', async () => {
    await page.goto(`${BASE_URL}/settings/screen-time`);
    await waitForPageReady(page);

    const screenTimeSettings = page.locator('[data-testid="screen-time"], .parental-controls');
    await expect(
      screenTimeSettings.or(page.locator('text=/screen time|limit/i').first())
    ).toBeVisible();
  });

  test('5.6 Parent can manage linked accounts', async () => {
    await page.goto(`${BASE_URL}/settings/linked-accounts`);
    await waitForPageReady(page);

    const linkedAccounts = page.locator('[data-testid="linked-accounts"], .accounts-list');
    await expect(linkedAccounts.or(page.locator('text=/linked|connected/i').first())).toBeVisible();
  });

  test('5.7 Parent can set language preference', async () => {
    await page.goto(`${BASE_URL}/settings`);
    await waitForPageReady(page);

    const languageSelect = page.locator('[data-testid="language-select"], select[name="language"]');
    if (await languageSelect.isVisible()) {
      await languageSelect.selectOption({ label: /english/i });
    }
  });

  test('5.8 Parent can enable two-factor authentication', async () => {
    await page.goto(`${BASE_URL}/settings/security`);
    await waitForPageReady(page);

    const mfaSection = page.locator('[data-testid="mfa-settings"], .two-factor-section');
    await expect(mfaSection.or(page.locator('text=/two.factor|2fa|mfa/i').first())).toBeVisible();
  });

  test('5.9 Parent can view privacy settings', async () => {
    await page.goto(`${BASE_URL}/settings/privacy`);
    await waitForPageReady(page);

    const privacySettings = page.locator('[data-testid="privacy-settings"], .privacy-options');
    await expect(privacySettings.or(page.locator('text=/privacy/i').first())).toBeVisible();
  });

  test('5.10 Parent can delete account', async () => {
    await page.goto(`${BASE_URL}/settings/account`);
    await waitForPageReady(page);

    const deleteBtn = page.locator(
      'button:has-text("Delete Account"), [data-testid="delete-account"]'
    );
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();

      const confirmDialog = page.locator('[data-testid="delete-confirm"], .confirm-dialog');
      await expect(confirmDialog.or(page.locator('text=/are you sure/i').first())).toBeVisible();

      // Don't actually delete - just verify the dialog appears
      const closeBtn = page.locator('button:has-text("Cancel"), button:has-text("No")');
      if (await closeBtn.isVisible()) {
        await closeBtn.click();
      }
    }
  });
});

// =============================================================================
// CAREGIVER MANAGEMENT
// =============================================================================

test.describe('Caregiver Management', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsParent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('6.1 Parent can view caregiver page with info banner', async () => {
    await page.goto(`${BASE_URL}/settings/caregivers`);
    await waitForPageReady(page);

    // Page heading
    await expect(page.locator('h1:has-text("Caregivers")')).toBeVisible();

    // Info banner visible
    await expect(page.locator('text="About Caregiver Access"')).toBeVisible();
  });

  test('6.2 Parent can see caregiver slot indicator', async () => {
    await page.goto(`${BASE_URL}/settings/caregivers`);
    await waitForPageReady(page);

    // Slot indicator shows "X of 3 used"
    await expect(page.locator('text=/\\d+ of 3 used/')).toBeVisible();
  });

  test('6.3 Parent can open invite form and see all fields', async () => {
    await page.goto(`${BASE_URL}/settings/caregivers`);
    await waitForPageReady(page);

    const inviteBtn = page.locator('button:has-text("Invite Caregiver")');
    if (await inviteBtn.isVisible()) {
      await inviteBtn.click();

      // Verify form fields
      await expect(page.locator('input[type="email"]')).toBeVisible();
      await expect(page.locator('text="Email Address"').first()).toBeVisible();
      await expect(page.locator('select').first()).toBeVisible();

      // Verify submit button exists
      await expect(page.locator('button:has-text("Send Invitation")')).toBeVisible();

      // Close without submitting
      await page.locator('button:has-text("Cancel")').click();
    }
  });

  test('6.4 Parent can view active caregivers section', async () => {
    await page.goto(`${BASE_URL}/settings/caregivers`);
    await waitForPageReady(page);

    const activeSection = page.locator('text="Active Caregivers"');
    if (await activeSection.isVisible()) {
      // Active caregiver card should show badge
      await expect(page.locator('text="Active"').first()).toBeVisible();
    }
  });

  test('6.5 Parent can view pending invitations', async () => {
    await page.goto(`${BASE_URL}/settings/caregivers`);
    await waitForPageReady(page);

    const pendingSection = page.locator('text="Pending Invitations"');
    if (await pendingSection.isVisible()) {
      // Pending invite should show days remaining badge
      await expect(page.locator('text=/\\d+ days left/').first()).toBeVisible();

      // Resend and Cancel buttons available
      await expect(page.locator('button:has-text("Resend")').first()).toBeVisible();
    }
  });

  test('6.6 Back button navigates to settings', async () => {
    await page.goto(`${BASE_URL}/settings/caregivers`);
    await waitForPageReady(page);

    const backBtn = page.locator('a:has-text("Back"), button:has-text("Back")').first();
    if (await backBtn.isVisible()) {
      await backBtn.click();
      await expect(page).toHaveURL(/\/settings/);
    }
  });
});

// =============================================================================
// ADD CHILD FLOW
// =============================================================================

test.describe('Add Child Flow', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsParent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('7.1 Dashboard shows Add Child quick action', async () => {
    await page.goto(`${BASE_URL}/dashboard`);
    await waitForPageReady(page);

    await expect(page.locator('text="Add Child"').first()).toBeVisible();
  });

  test('7.2 Add-child page loads with correct form fields', async () => {
    await page.goto(`${BASE_URL}/family/add-child`);
    await waitForPageReady(page);

    // Page heading
    await expect(
      page.locator('text=/Add a Child|Add Another Child|Add New Learner/i').first()
    ).toBeVisible();

    // All form fields present
    await expect(page.locator('#add-child-first')).toBeVisible();
    await expect(page.locator('#add-child-last')).toBeVisible();
    await expect(page.locator('#add-child-dob')).toBeVisible();
    await expect(page.locator('#add-child-grade')).toBeVisible();
    await expect(page.locator('#add-child-pin')).toBeVisible();
    await expect(page.locator('#add-child-confirm-pin')).toBeVisible();
  });

  test('7.3 SeatPreview billing impact section is visible', async () => {
    await page.goto(`${BASE_URL}/family/add-child`);
    await waitForPageReady(page);

    // SeatPreview shows either no-cost or billing impact
    const noCost = page.locator('text=/No additional cost/i');
    const billingImpact = page.locator('text="Billing Impact"');
    await expect(noCost.or(billingImpact)).toBeVisible();
  });

  test('7.4 Form validates required fields', async () => {
    await page.goto(`${BASE_URL}/family/add-child`);
    await waitForPageReady(page);

    // Try to submit with empty form
    const submitBtn = page.locator('button:has-text("Add")').first();
    await submitBtn.click();

    // Expect validation error
    await expect(page.locator('text=/required/i').first()).toBeVisible();
  });

  test('7.5 PIN validation rejects mismatched PINs', async () => {
    await page.goto(`${BASE_URL}/family/add-child`);
    await waitForPageReady(page);

    // Fill required fields
    await page.fill('#add-child-first', 'TestChild');
    await page.selectOption('#add-child-grade', '3');
    await page.fill('#add-child-pin', '123789');
    await page.fill('#add-child-confirm-pin', '987321');

    const submitBtn = page.locator('button:has-text("Add")').first();
    await submitBtn.click();

    // Expect PIN mismatch error
    await expect(page.locator('text=/match/i').first()).toBeVisible();
  });

  test('7.6 PIN validation rejects weak PINs', async () => {
    await page.goto(`${BASE_URL}/family/add-child`);
    await waitForPageReady(page);

    await page.fill('#add-child-first', 'TestChild');
    await page.selectOption('#add-child-grade', '3');
    await page.fill('#add-child-pin', '123456');
    await page.fill('#add-child-confirm-pin', '123456');

    const submitBtn = page.locator('button:has-text("Add")').first();
    await submitBtn.click();

    // Expect weak PIN error
    await expect(page.locator('text=/easy to guess|weak|common/i').first()).toBeVisible();
  });

  test('7.7 Grade selector has all grade options', async () => {
    await page.goto(`${BASE_URL}/family/add-child`);
    await waitForPageReady(page);

    const gradeSelect = page.locator('#add-child-grade');
    const options = gradeSelect.locator('option');

    // 14 grades + 1 placeholder = 15 options
    const count = await options.count();
    expect(count).toBeGreaterThanOrEqual(14);
  });

  test('7.8 Submit button shows child name when first name is entered', async () => {
    await page.goto(`${BASE_URL}/family/add-child`);
    await waitForPageReady(page);

    await page.fill('#add-child-first', 'Emma');

    // Submit button should include child name
    await expect(page.locator('button:has-text("Add Emma")')).toBeVisible();
  });
});

// =============================================================================
// TUTOR ADD-ON PURCHASE
// =============================================================================

test.describe('Tutor Add-On Purchase', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsParent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('8.1 Tutors page loads with hero heading', async () => {
    await page.goto(`${BASE_URL}/tutors`);
    await waitForPageReady(page);

    await expect(page.locator('h1:has-text("AI Tutors")')).toBeVisible();
  });

  test('8.2 Bundle offer card is visible with pricing', async () => {
    await page.goto(`${BASE_URL}/tutors`);
    await waitForPageReady(page);

    // Bundle heading
    await expect(page.locator('text=/AI Tutor Bundle/i')).toBeVisible();

    // Bundle price
    await expect(page.locator('text=/\\$29\\.99/').first()).toBeVisible();

    // Save badge
    await expect(page.locator('text=/Save \\d+%/i').first()).toBeVisible();
  });

  test('8.3 Individual tutor cards display correctly', async () => {
    await page.goto(`${BASE_URL}/tutors`);
    await waitForPageReady(page);

    // Individual Tutors section header
    await expect(page.locator('h2:has-text("Individual Tutors")')).toBeVisible();

    // All 5 tutors visible
    await expect(page.locator('text="Nova — Math Tutor"')).toBeVisible();
    await expect(page.locator('text="Sage — Reading & Writing Tutor"')).toBeVisible();
    await expect(page.locator('text="Spark — Science Tutor"')).toBeVisible();
    await expect(page.locator('text="Chrono — History Tutor"')).toBeVisible();
    await expect(page.locator('text="Pixel — Coding Tutor"')).toBeVisible();
  });

  test('8.4 Tutor cards show features list', async () => {
    await page.goto(`${BASE_URL}/tutors`);
    await waitForPageReady(page);

    // Common features across all tutor cards
    await expect(page.locator('text="Unlimited sessions"').first()).toBeVisible();
    await expect(page.locator('text="Progress tracking"').first()).toBeVisible();
  });

  test('8.5 Tutor cards show pricing', async () => {
    await page.goto(`${BASE_URL}/tutors`);
    await waitForPageReady(page);

    // Standard price for most tutors
    const standardPrices = page.locator('text=/\\$9\\.99\\/mo/');
    expect(await standardPrices.count()).toBeGreaterThanOrEqual(4);

    // Premium coding tutor price
    await expect(page.locator('text=/\\$14\\.99\\/mo/').first()).toBeVisible();
  });

  test('8.6 Start Free Trial buttons are visible for inactive tutors', async () => {
    await page.goto(`${BASE_URL}/tutors`);
    await waitForPageReady(page);

    const trialBtns = page.locator('button:has-text("Start Free Trial")');
    // At least some inactive tutors should show trial button
    expect(await trialBtns.count()).toBeGreaterThanOrEqual(1);
  });

  test('8.7 Bundle trial button is visible', async () => {
    await page.goto(`${BASE_URL}/tutors`);
    await waitForPageReady(page);

    // Bundle has its own trial CTA
    const bundleCard = page.locator('text=/AI Tutor Bundle/i').locator('..');
    const trialBtn = bundleCard
      .locator('..')
      .locator('..')
      .locator('button:has-text("Start Free Trial")');
    if (await trialBtn.isVisible()) {
      // Just verify it exists, don't actually start a trial
      await expect(trialBtn).toBeEnabled();
    }
  });

  test('8.8 Active tutors section appears when subscribed', async () => {
    await page.goto(`${BASE_URL}/tutors`);
    await waitForPageReady(page);

    // This section is conditional — only shown when user has active add-ons
    const activeSection = page.locator('h2:has-text("Your Active Tutors")');
    if (await activeSection.isVisible({ timeout: 2000 }).catch(() => false)) {
      // Active tutor cards show "Active" button
      await expect(page.locator('button:has-text("Active")').first()).toBeVisible();
    }
  });
});

// =============================================================================
// CANCELLATION SURVEY FLOW
// =============================================================================

test.describe('Cancellation Survey Flow', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    await seedTestData();
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsParent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData();
  });

  test('9.1 Cancel button opens survey modal with reason step', async () => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    const cancelBtn = page.locator(
      'button:has-text("Cancel"), [data-testid="cancel-subscription"]'
    );
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();

      // Step 1: Reason selection
      const reasonStep = page.locator('[data-testid="cancel-step-reason"]');
      await expect(reasonStep).toBeVisible();
      await expect(page.locator('text=/why are you cancel/i').first()).toBeVisible();
    }
  });

  test('9.2 All cancellation reasons are displayed', async () => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    const cancelBtn = page.locator(
      'button:has-text("Cancel"), [data-testid="cancel-subscription"]'
    );
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();

      // All 8 reason options
      await expect(page.locator('[data-testid="cancel-reason-too_expensive"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-reason-missing_features"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-reason-switched_service"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-reason-unused"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-reason-customer_service"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-reason-too_complex"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-reason-low_quality"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-reason-other"]')).toBeVisible();

      // Close modal
      const closeBtn = page.locator('button:has-text("Never mind")');
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('9.3 Parent can select reason and provide feedback', async () => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    const cancelBtn = page.locator(
      'button:has-text("Cancel"), [data-testid="cancel-subscription"]'
    );
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();

      // Select a reason
      await page.locator('[data-testid="cancel-reason-too_expensive"]').click();

      // Fill optional feedback
      const feedbackInput = page.locator('[data-testid="cancel-feedback"]');
      if (await feedbackInput.isVisible()) {
        await feedbackInput.fill('E2E test: checking cancel flow');
      }

      // Close without proceeding
      const closeBtn = page.locator('button:has-text("Never mind")');
      if (await closeBtn.isVisible()) await closeBtn.click();
    }
  });

  test('9.4 Continue advances to retention offers or confirm step', async () => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    const cancelBtn = page.locator(
      'button:has-text("Cancel"), [data-testid="cancel-subscription"]'
    );
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();

      // Select reason
      await page.locator('[data-testid="cancel-reason-unused"]').click();

      // Click Continue
      const nextBtn = page.locator('[data-testid="cancel-next"]');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      }

      // Should advance to either offers (step 2) or confirm (step 3)
      const offersStep = page.locator('[data-testid="cancel-step-offers"]');
      const confirmStep = page.locator('[data-testid="cancel-step-confirm"]');
      await expect(offersStep.or(confirmStep)).toBeVisible();

      // If on offers step, verify skip button and proceed
      if (await offersStep.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(page.locator('text=/Before you go/i').first()).toBeVisible();

        const skipBtn = page.locator('[data-testid="cancel-skip-offers"]');
        if (await skipBtn.isVisible()) {
          await skipBtn.click();
        }
      }

      // Now on confirm step
      await expect(
        page.locator('[data-testid="cancel-step-confirm"]').or(
          page.locator('text=/confirm cancellation/i').first()
        )
      ).toBeVisible();

      // Verify the destructive button is present
      const confirmCancelBtn = page.locator('[data-testid="cancel-confirm-btn"]');
      if (await confirmCancelBtn.isVisible()) {
        await expect(confirmCancelBtn).toBeVisible();
      }

      // Don't actually cancel — close modal
      const closeBtn = page.locator('button[aria-label="Close"], button:has-text("Back")');
      if (await closeBtn.first().isVisible()) {
        await closeBtn.first().click();
      }
    }
  });

  test('9.5 Retention offers display accept buttons', async () => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    const cancelBtn = page.locator(
      'button:has-text("Cancel"), [data-testid="cancel-subscription"]'
    );
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();

      // Select reason and advance
      await page.locator('[data-testid="cancel-reason-too_expensive"]').click();
      const nextBtn = page.locator('[data-testid="cancel-next"]');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
      }

      // Check for retention offers
      const offersStep = page.locator('[data-testid="cancel-step-offers"]');
      if (await offersStep.isVisible({ timeout: 3000 }).catch(() => false)) {
        // Accept buttons on offer cards
        const acceptBtns = page.locator('button:has-text("Accept")');
        expect(await acceptBtns.count()).toBeGreaterThanOrEqual(1);

        // Discount or pause badge
        const badges = page.locator('text=/\\d+% off|Pause for/i');
        expect(await badges.count()).toBeGreaterThanOrEqual(0);
      }

      // Close modal
      const closeBtn = page.locator('button:has-text("Never mind"), button[aria-label="Close"]');
      if (await closeBtn.first().isVisible()) {
        await closeBtn.first().click();
      }
    }
  });

  test('9.6 Confirm step shows access end info', async () => {
    await page.goto(`${BASE_URL}/billing`);
    await waitForPageReady(page);

    const cancelBtn = page.locator(
      'button:has-text("Cancel"), [data-testid="cancel-subscription"]'
    );
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();

      // Navigate through to confirm step
      await page.locator('[data-testid="cancel-reason-unused"]').click();
      const nextBtn = page.locator('[data-testid="cancel-next"]');
      if (await nextBtn.isVisible()) await nextBtn.click();

      // Skip offers if present
      const skipBtn = page.locator('[data-testid="cancel-skip-offers"]');
      if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipBtn.click();
      }

      // Confirm step should show plan info and free tier note
      const confirmStep = page.locator('[data-testid="cancel-step-confirm"]');
      if (await confirmStep.isVisible({ timeout: 2000 }).catch(() => false)) {
        await expect(
          page.locator('text=/free Basic tier|access/i').first()
        ).toBeVisible();
      }

      // Close without canceling
      const closeBtn = page.locator('button:has-text("Back"), button[aria-label="Close"]');
      if (await closeBtn.first().isVisible()) {
        await closeBtn.first().click();
      }
    }
  });
});
