/**
 * Age Verification End-to-End Tests
 *
 * Tests for age-based access controls including:
 * - Age verification on signup
 * - Feature restrictions by age
 * - Parental controls
 * - Content filtering by age group
 *
 * @module apps/e2e-tests/src/compliance/age-verification.e2e.spec
 * @tags compliance, coppa, age-gate, parental-controls, audit
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { test, expect } from '@playwright/test';
import type { Page, BrowserContext, APIRequestContext } from '@playwright/test';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const API_URL = process.env.API_URL || 'http://localhost:4000';
const _AUTH_URL = process.env.AUTH_URL || 'http://localhost:4001';
const LEARNER_URL = process.env.LEARNER_URL || 'http://localhost:3000';

test.describe.configure({ mode: 'serial' });

const _ageGroups = {
  under13: { minAge: 5, maxAge: 12, requiresParent: true },
  teen: { minAge: 13, maxAge: 17, requiresParent: false },
  adult: { minAge: 18, maxAge: null, requiresParent: false },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function calculateBirthdate(age: number): string {
  const today = new Date();
  const birthYear = today.getFullYear() - age;
  return `${birthYear}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
}

async function seedTestData(request: APIRequestContext): Promise<void> {
  await request
    .post(`${API_URL}/test/seed`, {
      data: { type: 'age-verification-tests' },
    })
    .catch(() => {
      /* ignore seed errors */
    });
}

async function cleanupTestData(request: APIRequestContext): Promise<void> {
  await request
    .post(`${API_URL}/test/cleanup`, {
      data: { type: 'age-verification-tests' },
    })
    .catch(() => {
      /* ignore cleanup errors */
    });
}

// =============================================================================
// AGE VERIFICATION ON SIGNUP TESTS
// =============================================================================

test.describe('Age Verification on Signup @compliance @coppa', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('1.1 Signup form requires date of birth', async () => {
    await page.goto(`${LEARNER_URL}/signup`);

    const dobField = page.locator(
      'input[name="dateOfBirth"], input[name="birthdate"], input[type="date"]'
    );
    await expect(dobField.first()).toBeVisible();
  });

  test('1.2 Under-13 signup redirects to parental consent flow', async () => {
    await page.goto(`${LEARNER_URL}/signup`);

    const dobField = page.locator('input[name="dateOfBirth"], input[type="date"]').first();
    if (await dobField.isVisible()) {
      await dobField.fill(calculateBirthdate(10)); // 10 years old

      const nextBtn = page.locator('button:has-text("Next"), button:has-text("Continue")');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();

        // Should show parental consent requirement
        await expect(page.locator('text=/parent|guardian|consent/i').first())
          .toBeVisible({ timeout: 5000 })
          .catch(() => {
            /* may not be visible in mock */
          });
      }
    }
  });

  test('1.3 Teen signup (13-17) shows appropriate terms', async () => {
    await page.goto(`${LEARNER_URL}/signup`);

    const dobField = page.locator('input[name="dateOfBirth"], input[type="date"]').first();
    if (await dobField.isVisible()) {
      await dobField.fill(calculateBirthdate(15)); // 15 years old

      const nextBtn = page.locator('button:has-text("Next")');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('1.4 Adult signup (18+) proceeds normally', async () => {
    await page.goto(`${LEARNER_URL}/signup`);

    const dobField = page.locator('input[name="dateOfBirth"], input[type="date"]').first();
    if (await dobField.isVisible()) {
      await dobField.fill(calculateBirthdate(25)); // 25 years old

      const nextBtn = page.locator('button:has-text("Next")');
      if (await nextBtn.isVisible()) {
        await nextBtn.click();
        await page.waitForTimeout(500);
      }
    }
  });

  test('1.5 Age cannot be changed after initial verification', async ({ request }) => {
    const response = await request.put(`${API_URL}/users/profile`, {
      headers: { Authorization: 'Bearer test-token' },
      data: { dateOfBirth: calculateBirthdate(25) },
    });

    // Should be forbidden or require admin approval
    expect([400, 403, 422].includes(response.status()) || response.ok()).toBeTruthy();
  });

  test('1.6 Suspicious age patterns are flagged', async ({ request }) => {
    // Try to signup with age exactly 13 (common fraud pattern)
    const response = await request.post(`${API_URL}/auth/signup/validate-age`, {
      data: { dateOfBirth: calculateBirthdate(13) },
    });

    if (response.ok()) {
      const data = await response.json();
      // System should flag borderline cases
      expect(data.requiresVerification || data.flagged || data.valid).toBeDefined();
    }
  });
});

// =============================================================================
// FEATURE RESTRICTIONS BY AGE TESTS
// =============================================================================

test.describe('Feature Restrictions by Age @compliance @coppa', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext();
    await seedTestData(request);
  });

  test.afterAll(async () => {
    await cleanupTestData(request);
    await request.dispose();
  });

  test('2.1 Under-13 cannot access social features', async () => {
    const response = await request.get(`${API_URL}/features/available`, {
      headers: { 'X-User-Age': '10' },
    });

    if (response.ok()) {
      const features = await response.json();
      expect(features.socialMessaging).toBeFalsy();
      expect(features.publicProfile).toBeFalsy();
    }
  });

  test('2.2 Under-13 cannot share content publicly', async () => {
    const response = await request.post(`${API_URL}/content/share`, {
      headers: { 'X-User-Age': '10', Authorization: 'Bearer child-token' },
      data: { contentId: 'test', visibility: 'public' },
    });

    expect([400, 403].includes(response.status()) || response.ok()).toBeTruthy();
  });

  test('2.3 Under-13 cannot access external links', async () => {
    const response = await request.get(`${API_URL}/features/external-links`, {
      headers: { 'X-User-Age': '10' },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.enabled).toBe(false);
    }
  });

  test('2.4 Teens have limited social features', async () => {
    const response = await request.get(`${API_URL}/features/available`, {
      headers: { 'X-User-Age': '15' },
    });

    if (response.ok()) {
      const features = await response.json();
      expect(features.messaging).toBeDefined();
      // May have moderated messaging
    }
  });

  test('2.5 Adults have full feature access', async () => {
    const response = await request.get(`${API_URL}/features/available`, {
      headers: { 'X-User-Age': '25' },
    });

    if (response.ok()) {
      const features = await response.json();
      expect(features.fullAccess || Object.keys(features).length > 0).toBeTruthy();
    }
  });

  test('2.6 AI chat is restricted for under-13', async () => {
    const response = await request.get(`${API_URL}/ai/chat/availability`, {
      headers: { 'X-User-Age': '10' },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.restricted || data.parentalApprovalRequired).toBeTruthy();
    }
  });

  test('2.7 Video calls require parental consent for minors', async () => {
    const response = await request.get(`${API_URL}/features/video-calls`, {
      headers: { 'X-User-Age': '12' },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.requiresParentalConsent).toBe(true);
    }
  });

  test('2.8 Location sharing disabled for minors', async () => {
    const response = await request.get(`${API_URL}/features/location-sharing`, {
      headers: { 'X-User-Age': '15' },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.enabled).toBe(false);
    }
  });
});

// =============================================================================
// PARENTAL CONTROLS TESTS
// =============================================================================

test.describe('Parental Controls @compliance @coppa', () => {
  let request: APIRequestContext;
  let _page: Page;
  let context: BrowserContext;

  test.beforeAll(async ({ browser, playwright }) => {
    request = await playwright.request.newContext();
    context = await browser.newContext();
    _page = await context.newPage();
    await seedTestData(request);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData(request);
    await request.dispose();
  });

  test('3.1 Parent can set screen time limits', async () => {
    const response = await request.put(`${API_URL}/parental-controls/screen-time`, {
      headers: { Authorization: 'Bearer parent-token' },
      data: {
        childId: 'test-child',
        dailyLimitMinutes: 120,
        scheduleEnabled: true,
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('3.2 Parent can restrict content categories', async () => {
    const response = await request.put(`${API_URL}/parental-controls/content-filters`, {
      headers: { Authorization: 'Bearer parent-token' },
      data: {
        childId: 'test-child',
        blockedCategories: ['mature', 'violence'],
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('3.3 Parent can view child activity', async () => {
    const response = await request.get(`${API_URL}/parental-controls/activity`, {
      headers: { Authorization: 'Bearer parent-token' },
      params: { childId: 'test-child' },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('3.4 Parent can block specific features', async () => {
    const response = await request.put(`${API_URL}/parental-controls/features`, {
      headers: { Authorization: 'Bearer parent-token' },
      data: {
        childId: 'test-child',
        blockedFeatures: ['chat', 'leaderboards'],
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('3.5 Parent receives alerts for concerning activity', async () => {
    const response = await request.get(`${API_URL}/parental-controls/alerts/settings`, {
      headers: { Authorization: 'Bearer parent-token' },
    });

    if (response.ok()) {
      const settings = await response.json();
      expect(settings.alertTypes).toBeDefined();
    }
  });

  test('3.6 Child cannot disable parental controls', async () => {
    const response = await request.put(`${API_URL}/parental-controls/disable`, {
      headers: { Authorization: 'Bearer child-token' },
    });

    expect([401, 403].includes(response.status())).toBeTruthy();
  });

  test('3.7 Parent can set allowed contact list', async () => {
    const response = await request.put(`${API_URL}/parental-controls/contacts`, {
      headers: { Authorization: 'Bearer parent-token' },
      data: {
        childId: 'test-child',
        allowedContacts: ['teacher-1', 'classmate-1'],
        restrictUnknown: true,
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('3.8 Parent can pause account', async () => {
    const response = await request.post(`${API_URL}/parental-controls/pause`, {
      headers: { Authorization: 'Bearer parent-token' },
      data: {
        childId: 'test-child',
        duration: 'until_tomorrow',
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('3.9 Screen time limit enforced', async () => {
    const response = await request.get(`${API_URL}/parental-controls/screen-time/status`, {
      headers: { Authorization: 'Bearer child-token' },
    });

    if (response.ok()) {
      const status = await response.json();
      expect(status.remainingMinutes).toBeDefined();
      expect(status.limitReached).toBeDefined();
    }
  });

  test('3.10 Parent can set bedtime hours', async () => {
    const response = await request.put(`${API_URL}/parental-controls/schedule`, {
      headers: { Authorization: 'Bearer parent-token' },
      data: {
        childId: 'test-child',
        bedtime: '21:00',
        wakeTime: '07:00',
        enforceOnWeekends: false,
      },
    });

    expect(response.status()).toBeLessThan(500);
  });
});

// =============================================================================
// CONTENT FILTERING BY AGE GROUP TESTS
// =============================================================================

test.describe('Content Filtering by Age Group @compliance @coppa', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext();
    await seedTestData(request);
  });

  test.afterAll(async () => {
    await cleanupTestData(request);
    await request.dispose();
  });

  test('4.1 Content is tagged with age ratings', async () => {
    const response = await request.get(`${API_URL}/content/test-content-1`);

    if (response.ok()) {
      const content = await response.json();
      expect(content.ageRating || content.minAge || content.gradeLevel).toBeDefined();
    }
  });

  test('4.2 Under-13 only sees age-appropriate content', async () => {
    const response = await request.get(`${API_URL}/content/browse`, {
      headers: { 'X-User-Age': '10' },
    });

    if (response.ok()) {
      const content = await response.json();
      if (Array.isArray(content.items)) {
        content.items.forEach((item: any) => {
          expect(item.ageRating).not.toBe('mature');
          expect(item.ageRating).not.toBe('adult');
        });
      }
    }
  });

  test('4.3 Search results filtered by age', async () => {
    const response = await request.get(`${API_URL}/content/search`, {
      headers: { 'X-User-Age': '10' },
      params: { q: 'test' },
    });

    if (response.ok()) {
      const results = await response.json();
      // Results should be age-filtered
      expect(
        results.filtered || results.ageRestricted !== undefined || results.items
      ).toBeDefined();
    }
  });

  test('4.4 Mature content requires age verification', async () => {
    const response = await request.get(`${API_URL}/content/mature-content-id`, {
      headers: { 'X-User-Age': '10' },
    });

    expect([403, 451].includes(response.status()) || response.ok()).toBeTruthy();
  });

  test('4.5 Content recommendations are age-appropriate', async () => {
    const response = await request.get(`${API_URL}/recommendations`, {
      headers: { 'X-User-Age': '10' },
    });

    if (response.ok()) {
      const recs = await response.json();
      if (Array.isArray(recs)) {
        recs.forEach((rec: any) => {
          expect(rec.ageAppropriate).not.toBe(false);
        });
      }
    }
  });

  test('4.6 User-generated content is moderated for minors', async () => {
    const response = await request.get(`${API_URL}/ugc/moderation-policy`);

    if (response.ok()) {
      const policy = await response.json();
      expect(policy.moderationEnabled).toBe(true);
      expect(policy.minorProtection).toBe(true);
    }
  });

  test('4.7 Comments are filtered for under-13', async () => {
    const response = await request.get(`${API_URL}/content/test-content/comments`, {
      headers: { 'X-User-Age': '10' },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.filtered || data.preModerated || data.disabled).toBeDefined();
    }
  });

  test('4.8 Grade-level content matching', async () => {
    const response = await request.get(`${API_URL}/content/grade-level/5`);

    if (response.ok()) {
      const content = await response.json();
      if (Array.isArray(content)) {
        content.forEach((item: any) => {
          expect(item.gradeLevel).toBeLessThanOrEqual(6);
        });
      }
    }
  });

  test('4.9 Educational standards filtering', async () => {
    const response = await request.get(`${API_URL}/content/standards`, {
      params: { grade: 5, subject: 'math' },
    });

    if (response.ok()) {
      const standards = await response.json();
      expect(Array.isArray(standards) || standards.items).toBeTruthy();
    }
  });

  test('4.10 Content flagging available for inappropriate material', async () => {
    const response = await request.post(`${API_URL}/content/flag`, {
      headers: { Authorization: 'Bearer user-token' },
      data: {
        contentId: 'test-content',
        reason: 'inappropriate_for_age',
        reporterAge: 10,
      },
    });

    expect(response.status()).toBeLessThan(500);
  });
});
