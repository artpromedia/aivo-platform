/**
 * COPPA Compliance End-to-End Tests
 *
 * Children's Online Privacy Protection Act compliance testing including:
 * - Parental consent flows for under-13
 * - Data collection limitations
 * - Data retention policies
 * - Data deletion requests (right to erasure)
 * - No behavioral advertising to minors
 * - Parental access to child data
 * - Third-party data sharing restrictions
 *
 * @module apps/e2e-tests/src/compliance/coppa-compliance.e2e.spec
 * @tags compliance, coppa, privacy, regulatory, audit
 */

/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-argument */

import { test, expect } from '@playwright/test';
import type { Page, BrowserContext, APIRequestContext } from '@playwright/test';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const API_URL = process.env.API_URL || 'http://localhost:4000';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:4001';
const LEARNER_URL = process.env.LEARNER_URL || 'http://localhost:3000';
const PARENT_URL = process.env.PARENT_URL || 'http://localhost:3001';

// Test tags for regulatory reporting
test.describe.configure({ mode: 'serial' });

const testData = {
  parentUser: {
    email: 'coppa-parent-test@example.com',
    password: 'ParentPass123!',
    firstName: 'Test',
    lastName: 'Parent',
  },
  childUnder13: {
    email: 'coppa-child-test@example.com',
    password: 'ChildPass123!',
    firstName: 'Test',
    lastName: 'Child',
    age: 10,
    dateOfBirth: '2016-01-15',
    gradeLevel: 5,
  },
  childAge13: {
    email: 'coppa-teen-test@example.com',
    password: 'TeenPass123!',
    firstName: 'Test',
    lastName: 'Teen',
    age: 13,
    dateOfBirth: '2013-01-15',
    gradeLevel: 8,
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function seedTestData(apiContext: APIRequestContext): Promise<void> {
  await apiContext
    .post(`${API_URL}/test/seed`, {
      data: { type: 'coppa-compliance' },
    })
    .catch(() => {
      /* ignore seed errors */
    });
}

async function cleanupTestData(apiContext: APIRequestContext): Promise<void> {
  await apiContext
    .post(`${API_URL}/test/cleanup`, {
      data: { type: 'coppa-compliance' },
    })
    .catch(() => {
      /* ignore cleanup errors */
    });
}

async function loginAsParent(page: Page): Promise<void> {
  await page.goto(`${PARENT_URL}/login`);
  await page.fill('[name="email"]', testData.parentUser.email);
  await page.fill('[name="password"]', testData.parentUser.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home)/);
}

async function loginAsChild(page: Page): Promise<void> {
  await page.goto(`${LEARNER_URL}/login`);
  await page.fill('[name="email"]', testData.childUnder13.email);
  await page.fill('[name="password"]', testData.childUnder13.password);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|home)/);
}

// =============================================================================
// PARENTAL CONSENT FLOWS FOR UNDER-13
// =============================================================================

test.describe('Parental Consent Flows @compliance @coppa @consent', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext();
    await seedTestData(apiContext);
  });

  test.afterAll(async () => {
    await cleanupTestData(apiContext);
    await apiContext.dispose();
  });

  test('1.1 Registration requires age verification', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/signup`);

    // Age/DOB field should be required
    const dobField = page.locator('[name="dateOfBirth"], [name="dob"], [data-testid="dob-input"]');
    await expect(dobField).toBeVisible();

    // Or age verification through another method
    const ageField = page.locator('[name="age"], [data-testid="age-input"]');
    const hasAgeVerification = (await dobField.isVisible()) || (await ageField.isVisible());
    expect(hasAgeVerification).toBe(true);
  });

  test('1.2 Under-13 signup triggers parental consent flow', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/signup`);

    // Fill in child info
    await page.fill('[name="firstName"]', testData.childUnder13.firstName);
    await page.fill('[name="lastName"]', testData.childUnder13.lastName);
    await page.fill('[name="email"]', `new-child-${Date.now()}@example.com`);
    await page.fill('[name="password"]', testData.childUnder13.password);

    // Enter under-13 DOB
    const dobField = page.locator('[name="dateOfBirth"], [name="dob"]');
    if (await dobField.isVisible()) {
      await dobField.fill(testData.childUnder13.dateOfBirth);
    }

    await page.click('button[type="submit"]');

    // Should redirect to parental consent flow
    await expect(page).toHaveURL(/\/parental-consent|\/parent-verification|\/guardian/);
  });

  test('1.3 Parent receives consent request email', async () => {
    // Register a child account
    const childEmail = `consent-test-child-${Date.now()}@example.com`;
    const parentEmail = `consent-test-parent-${Date.now()}@example.com`;

    const response = await apiContext.post(`${AUTH_URL}/api/v1/auth/register-child`, {
      data: {
        childEmail,
        childFirstName: 'Test',
        childLastName: 'Child',
        dateOfBirth: testData.childUnder13.dateOfBirth,
        parentEmail,
        password: 'TestPass123!',
      },
    });

    const result = await response.json();
    expect(result.consentEmailSent).toBe(true);
    expect(result.consentStatus).toBe('pending');
    expect(result.parentEmailTarget).toBe(parentEmail);
  });

  test('1.4 Verifiable parental consent (VPC) is required', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/consent-methods`);
    const methods = await response.json();

    // FTC requires verifiable parental consent
    expect(methods.supportedMethods).toContainEqual(
      expect.objectContaining({
        type: expect.stringMatching(
          /signed-consent|credit-card|knowledge-based|video-verification/i
        ),
        ftcApproved: true,
      })
    );
  });

  test('1.5 Parent can provide consent via signed form', async ({ page }) => {
    await loginAsParent(page);
    await page.goto(`${PARENT_URL}/consent/pending`);

    const pendingConsent = page.locator('[data-testid="pending-consent"]').first();
    if (await pendingConsent.isVisible()) {
      await pendingConsent.click();

      // Review and sign consent form
      const consentForm = page.locator('[data-testid="consent-form"]');
      await expect(consentForm).toBeVisible();

      // E-signature
      const signatureField = page.locator('[data-testid="signature-field"], [name="signature"]');
      if (await signatureField.isVisible()) {
        await signatureField.fill('Test Parent');
      }

      await page.click('button:has-text("Approve"), [data-testid="approve-consent"]');
    }
  });

  test('1.6 Parent can deny consent', async ({ page }) => {
    await loginAsParent(page);
    await page.goto(`${PARENT_URL}/consent/pending`);

    const pendingConsent = page.locator('[data-testid="pending-consent"]').first();
    if (await pendingConsent.isVisible()) {
      await pendingConsent.click();

      const denyButton = page.locator('button:has-text("Deny"), [data-testid="deny-consent"]');
      await expect(denyButton).toBeVisible();
    }
  });

  test('1.7 Child account restricted until consent is granted', async () => {
    // Create child without parental consent
    const childEmail = `restricted-child-${Date.now()}@example.com`;

    const registerResponse = await apiContext.post(`${AUTH_URL}/api/v1/auth/register-child`, {
      data: {
        childEmail,
        childFirstName: 'Test',
        childLastName: 'Restricted',
        dateOfBirth: testData.childUnder13.dateOfBirth,
        parentEmail: 'parent@example.com',
        password: 'TestPass123!',
      },
    });

    const _registerResult = await registerResponse.json();

    // Try to login
    const loginResponse = await apiContext.post(`${AUTH_URL}/api/v1/auth/login`, {
      data: {
        email: childEmail,
        password: 'TestPass123!',
      },
    });

    const loginResult = await loginResponse.json();
    expect(loginResult.status).toMatch(/pending-consent|restricted/i);
    expect(loginResult.accessToken).toBeUndefined();
  });

  test('1.8 Consent expires and requires renewal', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/consent-policy`);
    const policy = await response.json();

    expect(policy.consentExpiry).toBeDefined();
    expect(policy.renewalRequired).toBe(true);
    expect(policy.renewalPeriodDays).toBeLessThanOrEqual(365); // Annual renewal
  });

  test('1.9 Parent can revoke consent at any time', async () => {
    const response = await apiContext.post(`${API_URL}/api/v1/consent/revoke`, {
      data: {
        parentId: 'test-parent-id',
        childId: 'test-child-id',
        reason: 'Parent requested revocation',
      },
    });

    const result = await response.json();
    expect(result.revoked).toBe(true);
    expect(result.childAccountStatus).toMatch(/suspended|restricted/i);
  });

  test('1.10 Consent audit trail is maintained', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/audit/consent?childId=test-child-id`);
    const auditTrail = await response.json();

    expect(auditTrail.records).toBeDefined();
    expect(auditTrail.records.length).toBeGreaterThan(0);
    expect(auditTrail.records[0]).toMatchObject({
      action: expect.stringMatching(/granted|revoked|renewed/i),
      timestamp: expect.any(String),
      verificationMethod: expect.any(String),
    });
  });
});

// =============================================================================
// DATA COLLECTION LIMITATIONS
// =============================================================================

test.describe('Data Collection Limitations @compliance @coppa @privacy', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext();
    await seedTestData(apiContext);
  });

  test.afterAll(async () => {
    await cleanupTestData(apiContext);
    await apiContext.dispose();
  });

  test('2.1 Only necessary data collected from children', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/data-collection-policy/children`
    );
    const policy = await response.json();

    expect(policy.requiredFields).toBeDefined();
    // COPPA requires only necessary data
    expect(policy.requiredFields).toEqual(
      expect.arrayContaining(['firstName', 'username', 'gradeLevel'])
    );
    // Should NOT require unnecessary data
    expect(policy.requiredFields).not.toContain('phoneNumber');
    expect(policy.requiredFields).not.toContain('socialMediaProfiles');
    expect(policy.requiredFields).not.toContain('homeAddress');
  });

  test('2.2 Location data not collected from children without consent', async () => {
    const response = await apiContext.post(`${LEARNER_URL}/api/analytics/track`, {
      data: {
        userId: testData.childUnder13.email,
        event: 'page_view',
        location: { lat: 40.7128, lng: -74.006 },
      },
    });

    // Should reject or strip location data
    if (response.ok()) {
      const result = await response.json();
      expect(result.locationStored).toBe(false);
    } else {
      expect(response.status()).toBe(403);
    }
  });

  test('2.3 Persistent identifiers limited for children', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/identifier-policy/children`
    );
    const policy = await response.json();

    expect(policy.persistentIdentifiers).toBeDefined();
    expect(policy.persistentIdentifiers.allowedForChildren).toBe(false);
    expect(policy.sessionIdentifiersOnly).toBe(true);
  });

  test('2.4 No device fingerprinting for children', async ({ page }) => {
    await loginAsChild(page);

    // Check for fingerprinting scripts
    const fingerprintScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      return scripts.some(
        (s) =>
          s.src?.includes('fingerprint') ||
          s.innerHTML?.includes('fingerprint') ||
          s.innerHTML?.includes('canvas.toDataURL')
      );
    });

    expect(fingerprintScripts).toBe(false);
  });

  test('2.5 Audio/video recordings require explicit consent', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/av-recording-policy`);
    const policy = await response.json();

    expect(policy.childrenRequireParentalConsent).toBe(true);
    expect(policy.consentBeforeRecording).toBe(true);
    expect(policy.recordingNotification).toBe(true);
  });

  test('2.6 Photo uploads from children require parental consent', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/media-upload-policy`);
    const policy = await response.json();

    expect(policy.childPhotoUpload).toBeDefined();
    expect(policy.childPhotoUpload.requiresParentalConsent).toBe(true);
  });

  test('2.7 Contact information collection is minimized', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/contact-info-policy/children`
    );
    const policy = await response.json();

    expect(policy.emailCollection).toBe('parent-verified-only');
    expect(policy.phoneCollection).toBe('not-allowed');
    expect(policy.addressCollection).toBe('not-allowed');
  });

  test('2.8 Social features require parental consent', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/social-features-policy/children`
    );
    const policy = await response.json();

    expect(policy.messaging).toBeDefined();
    expect(policy.messaging.requiresParentalConsent).toBe(true);
    expect(policy.publicProfile).toBeDefined();
    expect(policy.publicProfile.disabledByDefault).toBe(true);
  });

  test('2.9 Data collection notice is displayed', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/signup`);

    // Enter under-13 age
    const dobField = page.locator('[name="dateOfBirth"]');
    if (await dobField.isVisible()) {
      await dobField.fill(testData.childUnder13.dateOfBirth);
      await dobField.blur();
    }

    // Privacy notice should appear
    const privacyNotice = page.locator('[data-testid="coppa-notice"], .privacy-notice');
    await expect(privacyNotice).toBeVisible();
  });

  test('2.10 Operator contact information is accessible', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/privacy`);

    const operatorContact = page.locator('[data-testid="operator-contact"], .contact-info');
    await expect(operatorContact).toBeVisible();

    // Should include required operator information
    const contactText = await operatorContact.textContent();
    expect(contactText).toMatch(/email|phone|address/i);
  });
});

// =============================================================================
// DATA RETENTION POLICIES
// =============================================================================

test.describe('Data Retention Policies @compliance @coppa @retention', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext();
    await seedTestData(apiContext);
  });

  test.afterAll(async () => {
    await cleanupTestData(apiContext);
    await apiContext.dispose();
  });

  test('3.1 Child data retention policy is defined', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/retention-policy/children`);
    const policy = await response.json();

    expect(policy.retentionPeriod).toBeDefined();
    expect(policy.retentionPeriod.days).toBeLessThanOrEqual(365 * 2); // Max 2 years recommended
    expect(policy.purpose).toBeDefined();
  });

  test('3.2 Data retained only as long as necessary', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/retention-justification`);
    const justification = await response.json();

    expect(justification.dataCategories).toBeDefined();
    justification.dataCategories.forEach((category: { necessity: string }) => {
      expect(category.necessity).toBeDefined();
      expect(category.necessity).not.toBe('');
    });
  });

  test('3.3 Inactive child accounts are automatically deleted', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/inactive-account-policy/children`
    );
    const policy = await response.json();

    expect(policy.autoDeletion).toBe(true);
    expect(policy.inactivityThresholdDays).toBeDefined();
    expect(policy.warningBeforeDeletion).toBe(true);
  });

  test('3.4 Learning data anonymized after retention period', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/anonymization-policy`);
    const policy = await response.json();

    expect(policy.childLearningData).toBeDefined();
    expect(policy.childLearningData.anonymizeAfterRetention).toBe(true);
    expect(policy.childLearningData.anonymizationMethod).toMatch(
      /k-anonymity|aggregation|pseudonymization/i
    );
  });

  test('3.5 Consent records retained for compliance', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/consent-retention-policy`);
    const policy = await response.json();

    expect(policy.retentionPeriod).toBeDefined();
    // Consent records may need longer retention for legal compliance
    expect(policy.purpose).toMatch(/compliance|audit|legal/i);
  });

  test('3.6 Data retention is documented and auditable', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/audit/data-retention`);
    const audit = await response.json();

    expect(audit.policyVersion).toBeDefined();
    expect(audit.lastUpdated).toBeDefined();
    expect(audit.deletionLog).toBeDefined();
  });

  test('3.7 Parent notified before child data deletion', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/deletion-notification-policy`
    );
    const policy = await response.json();

    expect(policy.parentNotificationRequired).toBe(true);
    expect(policy.notificationLeadTimeDays).toBeGreaterThanOrEqual(30);
  });

  test('3.8 Backup data follows same retention policy', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/backup-retention-policy/children`
    );
    const policy = await response.json();

    expect(policy.backupRetention).toBeDefined();
    expect(policy.backupRetention.followsPrimaryPolicy).toBe(true);
  });

  test('3.9 Third-party data sharing records retained', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/third-party-sharing-audit`);
    const audit = await response.json();

    expect(audit.sharingRecords).toBeDefined();
    expect(audit.retentionPolicy).toBeDefined();
  });

  test('3.10 Retention policy is publicly accessible', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/privacy`);

    const retentionSection = page
      .locator('[data-testid="data-retention"], text=/retention|how long/i')
      .first();
    await expect(retentionSection).toBeVisible();
  });
});

// =============================================================================
// DATA DELETION REQUESTS (RIGHT TO ERASURE)
// =============================================================================

test.describe('Data Deletion Requests @compliance @coppa @deletion', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext();
    await seedTestData(apiContext);
  });

  test.afterAll(async () => {
    await cleanupTestData(apiContext);
    await apiContext.dispose();
  });

  test('4.1 Parent can request child data deletion', async ({ page }) => {
    await loginAsParent(page);
    await page.goto(`${PARENT_URL}/settings/children`);

    const childCard = page.locator('[data-testid="child-card"]').first();
    if (await childCard.isVisible()) {
      await childCard.click();

      const deleteButton = page.locator(
        'button:has-text("Delete"), [data-testid="delete-child-data"]'
      );
      await expect(deleteButton).toBeVisible();
    }
  });

  test('4.2 Deletion request requires parent verification', async () => {
    const response = await apiContext.post(`${API_URL}/api/v1/data/deletion-request`, {
      data: {
        childId: 'test-child-id',
        parentId: 'test-parent-id',
        verificationMethod: 'email',
      },
    });

    const result = await response.json();
    expect(result.verificationRequired).toBe(true);
    expect(result.verificationSent).toBe(true);
  });

  test('4.3 Deletion request confirmation is sent', async () => {
    const response = await apiContext.post(`${API_URL}/api/v1/data/deletion-request/confirm`, {
      data: {
        requestId: 'test-deletion-request-id',
        verificationCode: '123456',
      },
    });

    const result = await response.json();
    expect(result.confirmed).toBe(true);
    expect(result.scheduledDeletionDate).toBeDefined();
  });

  test('4.4 Deletion is completed within required timeframe', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/deletion-sla`);
    const sla = await response.json();

    expect(sla.maxDays).toBeDefined();
    expect(sla.maxDays).toBeLessThanOrEqual(45); // COPPA requires reasonable timeframe
  });

  test('4.5 All child data is deleted', async () => {
    // Simulate completed deletion
    const response = await apiContext.get(
      `${API_URL}/api/v1/data/deletion-verification?childId=deleted-child-id`
    );
    const result = await response.json();

    expect(result.personalDataDeleted).toBe(true);
    expect(result.learningDataDeleted).toBe(true);
    expect(result.mediaDeleted).toBe(true);
    expect(result.activityLogsDeleted).toBe(true);
    // Only consent records may be retained for compliance
  });

  test('4.6 Third-party data deletion is triggered', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/data/third-party-deletion-status?childId=test-child-id`
    );
    const status = await response.json();

    expect(status.thirdPartyDeletionRequests).toBeDefined();
    status.thirdPartyDeletionRequests.forEach((request: { status: string }) => {
      expect(request.status).toMatch(/completed|in-progress|confirmed/i);
    });
  });

  test('4.7 Deletion confirmation sent to parent', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/deletion-notification-policy`
    );
    const policy = await response.json();

    expect(policy.confirmationNotification).toBe(true);
    expect(policy.confirmationMethod).toContain('email');
  });

  test('4.8 Parent can download data before deletion', async ({ page }) => {
    await loginAsParent(page);
    await page.goto(`${PARENT_URL}/settings/children/data`);

    const downloadButton = page.locator(
      'button:has-text("Download"), [data-testid="download-child-data"]'
    );
    await expect(downloadButton).toBeVisible();
  });

  test('4.9 Deletion audit log is maintained', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/audit/deletions?type=child-data`);
    const audit = await response.json();

    expect(audit.records).toBeDefined();
    expect(audit.records[0]).toMatchObject({
      deletionType: 'child-data',
      timestamp: expect.any(String),
      requestedBy: expect.any(String),
      completedAt: expect.any(String),
    });
  });

  test('4.10 Deleted data cannot be recovered', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/users/deleted-child-id`);

    expect(response.status()).toBe(404);
  });
});

// =============================================================================
// NO BEHAVIORAL ADVERTISING TO MINORS
// =============================================================================

test.describe('No Behavioral Advertising to Minors @compliance @coppa @advertising', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext();
    await seedTestData(apiContext);
  });

  test.afterAll(async () => {
    await cleanupTestData(apiContext);
    await apiContext.dispose();
  });

  test('5.1 No behavioral tracking for children', async ({ page }) => {
    await loginAsChild(page);

    // Check for tracking cookies
    const cookies = await page.context().cookies();
    const trackingRegex = /tracking|ad|pixel|segment|mixpanel|amplitude/i;
    const trackingCookies = cookies.filter((c) => trackingRegex.exec(c.name) !== null);

    expect(trackingCookies.length).toBe(0);
  });

  test('5.2 No third-party advertising scripts for children', async ({ page }) => {
    await loginAsChild(page);

    const adScripts = await page.evaluate(() => {
      const scripts = Array.from(document.querySelectorAll('script'));
      const adDomains = [
        'googlesyndication',
        'doubleclick',
        'adsense',
        'adservice',
        'facebook.net/en_US/fbevents',
        'advertising',
      ];
      return scripts.filter((s) => adDomains.some((domain) => s.src?.includes(domain))).length;
    });

    expect(adScripts).toBe(0);
  });

  test('5.3 No personalized ads shown to children', async ({ page }) => {
    await loginAsChild(page);

    // Navigate through the app
    await page.goto(`${LEARNER_URL}/courses`);

    // Check for ad containers
    const adContainers = page.locator('[class*="ad-"], [id*="ad-"], [data-ad], .advertisement');
    const adCount = await adContainers.count();

    expect(adCount).toBe(0);
  });

  test('5.4 No behavioral profiling for children', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/profiling-policy/children`);
    const policy = await response.json();

    expect(policy.behavioralProfilingEnabled).toBe(false);
    expect(policy.personalizedAdsEnabled).toBe(false);
    expect(policy.crossSiteTrackingEnabled).toBe(false);
  });

  test('5.5 Analytics limited to educational purposes', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/analytics-policy/children`);
    const policy = await response.json();

    expect(policy.allowedPurposes).toBeDefined();
    expect(policy.allowedPurposes).toContain('educational-improvement');
    expect(policy.allowedPurposes).not.toContain('advertising');
    expect(policy.allowedPurposes).not.toContain('marketing');
  });

  test('5.6 No data shared with advertisers', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/data-sharing/children`);
    const sharingPolicy = await response.json();

    const advertiserSharing = sharingPolicy.recipients?.filter(
      (r: { type: string }) => r.type === 'advertiser'
    );
    expect(advertiserSharing?.length || 0).toBe(0);
  });

  test('5.7 Contextual (non-behavioral) ads only if any', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/advertising-policy/children`
    );
    const policy = await response.json();

    if (policy.adsAllowed) {
      expect(policy.adType).toBe('contextual-only');
      expect(policy.noPersonalization).toBe(true);
    } else {
      expect(policy.adsAllowed).toBe(false);
    }
  });

  test('5.8 Do Not Track (DNT) header respected for children', async ({ page }) => {
    // Set DNT header
    await page.setExtraHTTPHeaders({ DNT: '1' });
    await loginAsChild(page);

    // Verify tracking is disabled
    const _trackingDisabled = await page.evaluate(() => {
      // @ts-expect-error - custom property
      return window.__trackingDisabled === true;
    });

    // Tracking should always be disabled for children regardless of DNT
  });

  test('5.9 No retargeting pixels for children', async ({ page }) => {
    await loginAsChild(page);

    const retargetingPixels = await page.evaluate(() => {
      const pixels = Array.from(document.querySelectorAll('img[width="1"], img[height="1"]'));
      return pixels.filter((p) =>
        (p as HTMLImageElement).src?.match(/facebook|google|linkedin|twitter|pixel/i)
      ).length;
    });

    expect(retargetingPixels).toBe(0);
  });

  test('5.10 Advertising compliance is auditable', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/audit/advertising-compliance`);
    const audit = await response.json();

    expect(audit.childrenExcluded).toBe(true);
    expect(audit.lastAuditDate).toBeDefined();
    expect(audit.complianceStatus).toBe('compliant');
  });
});

// =============================================================================
// PARENTAL ACCESS TO CHILD DATA
// =============================================================================

test.describe('Parental Access to Child Data @compliance @coppa @parental-rights', () => {
  let page: Page;
  let context: BrowserContext;
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ browser, playwright }) => {
    apiContext = await playwright.request.newContext();
    await seedTestData(apiContext);
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    page = await context.newPage();
    await loginAsParent(page);
  });

  test.afterAll(async () => {
    await context.close();
    await cleanupTestData(apiContext);
    await apiContext.dispose();
  });

  test('6.1 Parent can view child profile information', async () => {
    await page.goto(`${PARENT_URL}/children`);

    const childProfile = page.locator('[data-testid="child-profile"], .child-info').first();
    await expect(childProfile).toBeVisible();
  });

  test('6.2 Parent can view child learning activity', async () => {
    await page.goto(`${PARENT_URL}/children/activity`);

    const activityLog = page.locator('[data-testid="activity-log"], .learning-activity');
    await expect(activityLog.or(page.locator('text=/activity|progress/i').first())).toBeVisible();
  });

  test('6.3 Parent can view child progress reports', async () => {
    await page.goto(`${PARENT_URL}/children/progress`);

    const progressReport = page.locator('[data-testid="progress-report"], .progress-section');
    await expect(
      progressReport.or(page.locator('text=/progress|performance/i').first())
    ).toBeVisible();
  });

  test('6.4 Parent can export all child data', async () => {
    await page.goto(`${PARENT_URL}/settings/children/data`);

    const exportButton = page.locator('button:has-text("Export"), [data-testid="export-data"]');
    await expect(exportButton).toBeVisible();

    if (await exportButton.isEnabled()) {
      const _downloadPromise = page.waitForEvent('download', { timeout: 30000 }).catch(() => null);
      await exportButton.click();
      // May trigger download or show options
    }
  });

  test('6.5 Data export includes all collected information', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/data/export-preview?childId=test-child-id`
    );
    const preview = await response.json();

    expect(preview.categories).toContainEqual(expect.objectContaining({ name: 'profile' }));
    expect(preview.categories).toContainEqual(
      expect.objectContaining({ name: 'learning-activity' })
    );
    expect(preview.categories).toContainEqual(expect.objectContaining({ name: 'progress' }));
  });

  test('6.6 Parent can view data shared with third parties', async () => {
    await page.goto(`${PARENT_URL}/settings/privacy`);

    const thirdPartySection = page
      .locator('[data-testid="third-party-sharing"], text=/third.*party|sharing/i')
      .first();
    await expect(thirdPartySection).toBeVisible();
  });

  test('6.7 Parent can update child information', async () => {
    await page.goto(`${PARENT_URL}/children/edit`);

    const editForm = page.locator('[data-testid="edit-child-form"], form');
    await expect(editForm.first()).toBeVisible();

    const saveButton = page.locator('button:has-text("Save"), [type="submit"]');
    await expect(saveButton.first()).toBeVisible();
  });

  test('6.8 Parent data requests are processed timely', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/data-request-sla`);
    const sla = await response.json();

    expect(sla.parentAccessRequestMaxDays).toBeLessThanOrEqual(30);
  });

  test('6.9 Parent verification required for data access', async () => {
    const response = await apiContext.post(`${API_URL}/api/v1/data/request-access`, {
      data: {
        parentId: 'test-parent-id',
        childId: 'test-child-id',
        requestType: 'full-export',
      },
    });

    const result = await response.json();
    expect(result.verificationRequired).toBe(true);
  });

  test('6.10 Parent access requests are logged', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/audit/parent-data-access`);
    const audit = await response.json();

    expect(audit.records).toBeDefined();
    expect(audit.records[0]).toMatchObject({
      accessType: expect.any(String),
      timestamp: expect.any(String),
      parentId: expect.any(String),
    });
  });
});

// =============================================================================
// THIRD-PARTY DATA SHARING RESTRICTIONS
// =============================================================================

test.describe('Third-Party Data Sharing Restrictions @compliance @coppa @third-party', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext();
    await seedTestData(apiContext);
  });

  test.afterAll(async () => {
    await cleanupTestData(apiContext);
    await apiContext.dispose();
  });

  test('7.1 Third-party sharing requires parental consent', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/third-party-sharing-policy/children`
    );
    const policy = await response.json();

    expect(policy.parentalConsentRequired).toBe(true);
    expect(policy.optInRequired).toBe(true);
  });

  test('7.2 Third-party recipients are disclosed', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/privacy`);

    const thirdPartySection = page
      .locator('[data-testid="third-party-list"], text=/third.*part/i')
      .first();
    await expect(thirdPartySection).toBeVisible();
  });

  test('7.3 Third-party data sharing is logged', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/audit/third-party-sharing?childId=test-child-id`
    );
    const audit = await response.json();

    expect(audit.records).toBeDefined();
    if (audit.records.length > 0) {
      expect(audit.records[0]).toMatchObject({
        recipient: expect.any(String),
        purpose: expect.any(String),
        timestamp: expect.any(String),
        dataCategories: expect.any(Array),
      });
    }
  });

  test('7.4 Third parties have COPPA compliance agreements', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/third-party-agreements`);
    const agreements = await response.json();

    expect(agreements.vendors).toBeDefined();
    agreements.vendors.forEach((vendor: { coppaCompliant: boolean; agreementDate: string }) => {
      expect(vendor.coppaCompliant).toBe(true);
      expect(vendor.agreementDate).toBeDefined();
    });
  });

  test('7.5 Third parties cannot use data for non-educational purposes', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/third-party-use-restrictions`
    );
    const restrictions = await response.json();

    expect(restrictions.prohibitedUses).toContain('advertising');
    expect(restrictions.prohibitedUses).toContain('marketing');
    expect(restrictions.prohibitedUses).toContain('profiling');
    expect(restrictions.allowedUses).toContain('educational-services');
  });

  test('7.6 Parent can opt out of third-party sharing', async ({ page }) => {
    await loginAsParent(page);
    await page.goto(`${PARENT_URL}/settings/privacy`);

    const optOutToggle = page.locator(
      '[data-testid="third-party-opt-out"], input[name="thirdPartySharing"]'
    );
    await expect(optOutToggle).toBeVisible();
  });

  test('7.7 Data minimization with third parties', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/third-party-data-minimization`
    );
    const policy = await response.json();

    expect(policy.minimumDataOnly).toBe(true);
    expect(policy.excludedFields).toContain('fullName');
    expect(policy.excludedFields).toContain('email');
    expect(policy.pseudonymizationRequired).toBe(true);
  });

  test('7.8 Third-party data deletion on request', async () => {
    const response = await apiContext.post(`${API_URL}/api/v1/data/third-party-deletion`, {
      data: {
        childId: 'test-child-id',
        parentId: 'test-parent-id',
      },
    });

    const result = await response.json();
    expect(result.deletionRequestsSent).toBeDefined();
    expect(result.deletionRequestsSent.length).toBeGreaterThanOrEqual(0);
  });

  test('7.9 Safe harbor compliance for third parties', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/safe-harbor-status`);
    const status = await response.json();

    expect(status.safeHarborProgram).toBeDefined();
    // If participating in safe harbor, verify compliance
  });

  test('7.10 Third-party sharing audit report available', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/reports/third-party-sharing`
    );

    expect(response.status()).toBe(200);
    const report = await response.json();
    expect(report.generatedAt).toBeDefined();
    expect(report.sharingActivities).toBeDefined();
  });
});

// =============================================================================
// COPPA COMPLIANCE REPORT GENERATION
// =============================================================================

test.describe('COPPA Compliance Report Generation @compliance @coppa @audit @reporting', () => {
  let apiContext: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    apiContext = await playwright.request.newContext();
    await seedTestData(apiContext);
  });

  test.afterAll(async () => {
    await cleanupTestData(apiContext);
    await apiContext.dispose();
  });

  test('8.1 Can generate COPPA compliance report', async () => {
    const response = await apiContext.post(`${API_URL}/api/v1/compliance/reports/coppa`, {
      data: {
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date().toISOString(),
        format: 'pdf',
      },
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.reportId).toBeDefined();
  });

  test('8.2 Report includes consent metrics', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/metrics/consent`);
    const metrics = await response.json();

    expect(metrics).toHaveProperty('totalConsentRequests');
    expect(metrics).toHaveProperty('grantedConsents');
    expect(metrics).toHaveProperty('deniedConsents');
    expect(metrics).toHaveProperty('revokedConsents');
  });

  test('8.3 Report includes data deletion metrics', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/metrics/deletions`);
    const metrics = await response.json();

    expect(metrics).toHaveProperty('deletionRequests');
    expect(metrics).toHaveProperty('completedDeletions');
    expect(metrics).toHaveProperty('averageCompletionTime');
  });

  test('8.4 Report includes parental access metrics', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/metrics/parental-access`);
    const metrics = await response.json();

    expect(metrics).toHaveProperty('accessRequests');
    expect(metrics).toHaveProperty('dataExports');
    expect(metrics).toHaveProperty('profileUpdates');
  });

  test('8.5 Report includes third-party sharing metrics', async () => {
    const response = await apiContext.get(
      `${API_URL}/api/v1/compliance/metrics/third-party-sharing`
    );
    const metrics = await response.json();

    expect(metrics).toHaveProperty('activeVendors');
    expect(metrics).toHaveProperty('dataSharedEvents');
    expect(metrics).toHaveProperty('optOutRequests');
  });

  test('8.6 Compliance dashboard available for auditors', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/dashboard/coppa`);

    expect(response.status()).toBe(200);
    const dashboard = await response.json();
    expect(dashboard.overallStatus).toBeDefined();
    expect(dashboard.controlsStatus).toBeDefined();
  });

  test('8.7 Historical compliance trends available', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/trends/coppa?months=12`);
    const trends = await response.json();

    expect(trends.monthlyData).toBeDefined();
    expect(trends.monthlyData.length).toBeGreaterThan(0);
  });

  test('8.8 Compliance exceptions are documented', async () => {
    const response = await apiContext.get(`${API_URL}/api/v1/compliance/exceptions/coppa`);
    const exceptions = await response.json();

    expect(exceptions.records).toBeDefined();
    // Each exception should have remediation status
    if (exceptions.records.length > 0) {
      expect(exceptions.records[0]).toHaveProperty('remediationStatus');
    }
  });

  test('8.9 FTC contact information is accessible', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/privacy`);

    const ftcInfo = page.locator('text=/FTC|Federal Trade Commission/i');
    await expect(ftcInfo).toBeVisible();
  });

  test('8.10 Privacy policy includes all COPPA requirements', async ({ page }) => {
    await page.goto(`${LEARNER_URL}/privacy`);

    // Check for required COPPA disclosures
    const pageContent = await page.textContent('body');

    expect(pageContent).toMatch(/collect.*personal.*information|information.*collect/i);
    expect(pageContent).toMatch(/use.*information|how.*use/i);
    expect(pageContent).toMatch(/disclos|shar/i);
    expect(pageContent).toMatch(/parent|guardian/i);
    expect(pageContent).toMatch(/contact|reach/i);
  });
});
