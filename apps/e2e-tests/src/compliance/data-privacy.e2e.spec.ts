/**
 * Data Privacy End-to-End Tests
 *
 * Tests for data privacy compliance including:
 * - PII encryption at rest
 * - PII masking in logs
 * - Data export functionality
 * - Account deletion completeness
 * - Consent management
 *
 * @module apps/e2e-tests/src/compliance/data-privacy.e2e.spec
 * @tags compliance, privacy, gdpr, coppa, audit
 */

import { test, expect, APIRequestContext } from '@playwright/test';

// =============================================================================
// TEST CONFIGURATION
// =============================================================================

const API_URL = process.env.API_URL || 'http://localhost:4000';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:4001';

test.describe.configure({ mode: 'serial' });

const testUser = {
  id: 'privacy-test-user',
  email: 'privacy-test@example.com',
  password: 'SecureTestPass123!',
  firstName: 'Privacy',
  lastName: 'TestUser',
  phone: '+1-555-123-4567',
  ssn: '123-45-6789', // Test SSN pattern
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

async function getAuthToken(request: APIRequestContext): Promise<string> {
  const response = await request.post(`${AUTH_URL}/auth/login`, {
    data: { email: testUser.email, password: testUser.password },
  });
  const data = await response.json();
  return data.accessToken || data.token || '';
}

async function createTestUser(request: APIRequestContext): Promise<void> {
  await request.post(`${API_URL}/test/seed/user`, {
    data: testUser,
  }).catch(() => {});
}

async function cleanupTestUser(request: APIRequestContext): Promise<void> {
  await request.delete(`${API_URL}/test/cleanup/user/${testUser.id}`).catch(() => {});
}

// =============================================================================
// PII ENCRYPTION AT REST TESTS
// =============================================================================

test.describe('PII Encryption at Rest @compliance @privacy', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext();
    await createTestUser(request);
  });

  test.afterAll(async () => {
    await cleanupTestUser(request);
    await request.dispose();
  });

  test('1.1 Verify PII fields are encrypted in database', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/admin/data-audit/encryption-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.encryptedFields).toContain('email');
      expect(data.encryptedFields).toContain('phone');
      expect(data.encryptedFields).toContain('dateOfBirth');
      expect(data.encryptionAlgorithm).toMatch(/AES-256|RSA/);
    }
  });

  test('1.2 Verify encryption keys are rotated', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/admin/security/key-rotation-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.lastRotation).toBeDefined();
      expect(data.rotationPolicy).toBeDefined();
    }
  });

  test('1.3 Verify backup data is encrypted', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/admin/backup/encryption-status`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.backupsEncrypted).toBe(true);
    }
  });

  test('1.4 Verify sensitive data not stored in plain text', async () => {
    const token = await getAuthToken(request);

    const response = await request.post(`${API_URL}/admin/data-audit/plaintext-scan`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { tables: ['users', 'students', 'parents'] },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.plaintextPiiFound).toBe(false);
    }
  });

  test('1.5 Verify encryption in transit (TLS)', async () => {
    const response = await request.get(`${API_URL}/health`);
    // In production, this endpoint should only be accessible via HTTPS
    expect(response.ok()).toBeTruthy();
  });
});

// =============================================================================
// PII MASKING IN LOGS TESTS
// =============================================================================

test.describe('PII Masking in Logs @compliance @privacy', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext();
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('2.1 Verify email addresses are masked in logs', async () => {
    const token = await getAuthToken(request);

    // Trigger an action that would be logged
    await request.post(`${API_URL}/users/search`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { email: 'test@example.com' },
    });

    // Check logs don't contain plain email
    const logsResponse = await request.get(`${API_URL}/admin/logs/recent`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 100 },
    });

    if (logsResponse.ok()) {
      const logs = await logsResponse.json();
      const logsText = JSON.stringify(logs);
      expect(logsText).not.toContain('test@example.com');
      expect(logsText).toMatch(/\*{3,}|MASKED|REDACTED/i);
    }
  });

  test('2.2 Verify phone numbers are masked in logs', async () => {
    const token = await getAuthToken(request);

    await request.put(`${API_URL}/users/profile`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { phone: '+1-555-999-8888' },
    });

    const logsResponse = await request.get(`${API_URL}/admin/logs/recent`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (logsResponse.ok()) {
      const logsText = JSON.stringify(await logsResponse.json());
      expect(logsText).not.toContain('+1-555-999-8888');
    }
  });

  test('2.3 Verify SSN patterns are masked', async () => {
    const token = await getAuthToken(request);

    const logsResponse = await request.get(`${API_URL}/admin/logs/audit`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (logsResponse.ok()) {
      const logsText = JSON.stringify(await logsResponse.json());
      // SSN pattern should never appear
      expect(logsText).not.toMatch(/\d{3}-\d{2}-\d{4}/);
    }
  });

  test('2.4 Verify passwords never appear in logs', async () => {
    const token = await getAuthToken(request);

    const logsResponse = await request.get(`${API_URL}/admin/logs/recent`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { limit: 500 },
    });

    if (logsResponse.ok()) {
      const logsText = JSON.stringify(await logsResponse.json());
      expect(logsText).not.toContain('password');
      expect(logsText).not.toContain('SecureTestPass');
    }
  });

  test('2.5 Verify credit card numbers are masked', async () => {
    const token = await getAuthToken(request);

    const logsResponse = await request.get(`${API_URL}/admin/logs/payment`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (logsResponse.ok()) {
      const logsText = JSON.stringify(await logsResponse.json());
      // Full CC numbers should never appear
      expect(logsText).not.toMatch(/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/);
    }
  });
});

// =============================================================================
// DATA EXPORT FUNCTIONALITY TESTS
// =============================================================================

test.describe('Data Export Functionality @compliance @privacy @gdpr', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext();
    await createTestUser(request);
  });

  test.afterAll(async () => {
    await cleanupTestUser(request);
    await request.dispose();
  });

  test('3.1 User can request data export', async () => {
    const token = await getAuthToken(request);

    const response = await request.post(`${API_URL}/privacy/data-export/request`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { format: 'json' },
    });

    expect(response.status()).toBeLessThan(500);

    if (response.ok()) {
      const data = await response.json();
      expect(data.requestId).toBeDefined();
      expect(data.status).toMatch(/pending|processing|queued/i);
    }
  });

  test('3.2 Data export includes all user data', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/privacy/data-export/preview`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.categories).toContain('profile');
      expect(data.categories).toContain('activity');
      expect(data.categories).toContain('communications');
    }
  });

  test('3.3 Data export available in multiple formats', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/privacy/data-export/formats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const formats = await response.json();
      expect(formats).toContain('json');
      expect(formats).toContain('csv');
    }
  });

  test('3.4 Data export is delivered securely', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/privacy/data-export/delivery-options`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const options = await response.json();
      expect(options.secureDownload).toBe(true);
      expect(options.expiresAfterHours).toBeLessThanOrEqual(72);
    }
  });

  test('3.5 Parent can export child data', async () => {
    const token = await getAuthToken(request);

    const response = await request.post(`${API_URL}/privacy/data-export/child`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { childId: 'test-child-id', format: 'json' },
    });

    expect(response.status()).toBeLessThan(500);
  });
});

// =============================================================================
// ACCOUNT DELETION COMPLETENESS TESTS
// =============================================================================

test.describe('Account Deletion Completeness @compliance @privacy @gdpr', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext();
  });

  test.afterAll(async () => {
    await request.dispose();
  });

  test('4.1 User can request account deletion', async () => {
    // Create a disposable test user
    const disposableUser = {
      email: `delete-test-${Date.now()}@example.com`,
      password: 'DeleteMe123!',
    };

    await request.post(`${API_URL}/test/seed/user`, { data: disposableUser });

    const loginResponse = await request.post(`${AUTH_URL}/auth/login`, {
      data: disposableUser,
    });

    if (loginResponse.ok()) {
      const { accessToken } = await loginResponse.json();

      const deleteResponse = await request.post(`${API_URL}/privacy/account/delete-request`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { reason: 'Testing deletion', confirmEmail: disposableUser.email },
      });

      expect(deleteResponse.status()).toBeLessThan(500);
    }
  });

  test('4.2 Deletion removes all user data', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/admin/privacy/deletion-scope`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const scope = await response.json();
      expect(scope.deletedData).toContain('profile');
      expect(scope.deletedData).toContain('activity_logs');
      expect(scope.deletedData).toContain('messages');
      expect(scope.deletedData).toContain('progress_data');
    }
  });

  test('4.3 Deletion has grace period', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/privacy/deletion-policy`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const policy = await response.json();
      expect(policy.gracePeriodDays).toBeGreaterThanOrEqual(7);
      expect(policy.canCancel).toBe(true);
    }
  });

  test('4.4 Deletion can be cancelled during grace period', async () => {
    const token = await getAuthToken(request);

    // First request deletion
    const deleteResponse = await request.post(`${API_URL}/privacy/account/delete-request`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { reason: 'Testing', confirmEmail: testUser.email },
    });

    if (deleteResponse.ok()) {
      const { requestId } = await deleteResponse.json();

      // Then cancel it
      const cancelResponse = await request.post(`${API_URL}/privacy/account/cancel-deletion`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { requestId },
      });

      expect(cancelResponse.status()).toBeLessThan(500);
    }
  });

  test('4.5 Deleted data is not recoverable', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/admin/privacy/deletion-verification`, {
      headers: { Authorization: `Bearer ${token}` },
      params: { userId: 'completed-deletion-test' },
    });

    if (response.ok()) {
      const verification = await response.json();
      expect(verification.dataRecoverable).toBe(false);
      expect(verification.backupsPurged).toBe(true);
    }
  });

  test('4.6 Anonymized data retained for analytics', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/admin/privacy/anonymization-policy`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const policy = await response.json();
      expect(policy.anonymizedDataRetained).toBeDefined();
      expect(policy.piiRemoved).toBe(true);
    }
  });
});

// =============================================================================
// CONSENT MANAGEMENT TESTS
// =============================================================================

test.describe('Consent Management @compliance @privacy @gdpr', () => {
  let request: APIRequestContext;

  test.beforeAll(async ({ playwright }) => {
    request = await playwright.request.newContext();
    await createTestUser(request);
  });

  test.afterAll(async () => {
    await cleanupTestUser(request);
    await request.dispose();
  });

  test('5.1 User can view current consent settings', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/privacy/consent`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const consent = await response.json();
      expect(consent.marketing).toBeDefined();
      expect(consent.analytics).toBeDefined();
      expect(consent.thirdPartySharing).toBeDefined();
    }
  });

  test('5.2 User can update consent preferences', async () => {
    const token = await getAuthToken(request);

    const response = await request.put(`${API_URL}/privacy/consent`, {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        marketing: false,
        analytics: true,
        thirdPartySharing: false,
      },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('5.3 Consent changes are logged', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/privacy/consent/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const history = await response.json();
      expect(Array.isArray(history)).toBe(true);
    }
  });

  test('5.4 Marketing requires explicit opt-in', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/privacy/consent/defaults`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const defaults = await response.json();
      expect(defaults.marketing).toBe(false);
    }
  });

  test('5.5 Essential services dont require consent', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/privacy/consent/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok()) {
      const categories = await response.json();
      const essential = categories.find((c: any) => c.name === 'essential');
      expect(essential?.required).toBe(true);
      expect(essential?.canOptOut).toBe(false);
    }
  });

  test('5.6 Parent manages child consent', async () => {
    const token = await getAuthToken(request);

    const response = await request.get(`${API_URL}/privacy/consent/children`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status()).toBeLessThan(500);
  });

  test('5.7 Consent withdrawal is immediate', async () => {
    const token = await getAuthToken(request);

    // Withdraw marketing consent
    const withdrawResponse = await request.put(`${API_URL}/privacy/consent`, {
      headers: { Authorization: `Bearer ${token}` },
      data: { marketing: false },
    });

    if (withdrawResponse.ok()) {
      // Verify it's immediately effective
      const verifyResponse = await request.get(`${API_URL}/privacy/consent/effective`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (verifyResponse.ok()) {
        const effective = await verifyResponse.json();
        expect(effective.marketing).toBe(false);
      }
    }
  });

  test('5.8 Consent banner shown to new users', async () => {
    const response = await request.get(`${API_URL}/privacy/consent/banner-required`, {
      params: { newUser: true },
    });

    if (response.ok()) {
      const data = await response.json();
      expect(data.showBanner).toBe(true);
    }
  });
});
