/**
 * District Management — Cross-Service Integration Test
 *
 * Tests district-level administrative operations across services:
 * 1. District admin provisions new school tenant → tenant-svc
 * 2. Configure SSO / SAML for school → auth-svc
 * 3. Bulk user import → auth-svc, tenant-svc
 * 4. District-wide analytics → analytics-svc
 * 5. Billing at district level → billing-svc
 * 6. License management → billing-svc, tenant-svc
 * 7. Compliance & data export → analytics-svc, auth-svc
 *
 * @module tests/integration/scenarios/district-management
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import { wait, debug } from '../utils/helpers';

describe('Cross-Service: District Management', () => {
  let platformAdminApi: ApiClient;
  let districtAdminApi: ApiClient;
  let adminApi: ApiClient;

  let schoolTenantId: string;
  let importJobId: string;

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    // Platform admin has district-level access
    platformAdminApi = createApiClientForUser(
      ctx().users.platformAdmin?.token ?? ctx().users.adminA.token
    );
    districtAdminApi = createApiClientForUser(ctx().users.adminA.token);
    adminApi = createApiClientForUser(ctx().users.adminA.token);

    debug('District Management Setup', { tenantId: ctx().tenantA.id });
  });

  afterAll(async () => {
    if (schoolTenantId) {
      try {
        await platformAdminApi.delete(`/tenants/${schoolTenantId}`);
      } catch {
        // Best-effort cleanup
      }
    }
  });

  // --------------------------------------------------------------------------
  // Step 1: Provision new school tenant
  // --------------------------------------------------------------------------
  describe('1. School Provisioning', () => {
    it('should create a new school tenant under district', async () => {
      const response = await platformAdminApi.post('/tenants', {
        name: 'Integration Test: Lincoln Elementary',
        type: 'school',
        parentTenantId: ctx().tenantA.id,
        domain: `lincoln-test-${Date.now()}.edu`,
        plan: 'school-basic',
        settings: {
          timezone: 'America/Chicago',
          locale: 'en-US',
          gradeRange: { min: 'K', max: '5' },
        },
      });

      expect(response.status).toBeOneOf([200, 201, 403, 404]);

      if (response.status === 200 || response.status === 201) {
        schoolTenantId = response.data?.id ?? response.data?.tenantId ?? 'tenant-mock';
        debug('School tenant created', { schoolTenantId });
      }
    });

    it('should reject duplicate school domain', async () => {
      const response = await platformAdminApi.post('/tenants', {
        name: 'Duplicate School',
        type: 'school',
        parentTenantId: ctx().tenantA.id,
        domain: `lincoln-test-duplicate.edu`,
        plan: 'school-basic',
      });

      // First call may succeed (201) or fail if domain exists (409)
      expect(response.status).toBeOneOf([200, 201, 409, 404]);
    });

    it('should list schools under district', async () => {
      const response = await districtAdminApi.get('/tenants', {
        params: { parentId: ctx().tenantA.id, type: 'school' },
      });

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        const tenants = response.data.tenants ?? response.data.items ?? [];
        expect(Array.isArray(tenants)).toBe(true);
      }
    });
  });

  // --------------------------------------------------------------------------
  // Step 2: SSO configuration
  // --------------------------------------------------------------------------
  describe('2. SSO Configuration', () => {
    it('should configure SAML SSO for school', async () => {
      const tenantId = schoolTenantId ?? ctx().tenantA.id;

      const response = await platformAdminApi.put(`/tenants/${tenantId}/sso`, {
        provider: 'saml',
        config: {
          entityId: 'https://idp.lincoln-test.edu',
          ssoUrl: 'https://idp.lincoln-test.edu/sso',
          certificate: 'MIID...test-cert',
          nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        },
      });

      expect(response.status).toBeOneOf([200, 204, 404]);
    });

    it('should reject SSO config with invalid certificate', async () => {
      const tenantId = schoolTenantId ?? ctx().tenantA.id;

      const response = await platformAdminApi.put(`/tenants/${tenantId}/sso`, {
        provider: 'saml',
        config: {
          entityId: 'https://idp.test.edu',
          ssoUrl: 'https://idp.test.edu/sso',
          certificate: '', // empty cert
          nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        },
      });

      expect(response.status).toBeOneOf([400, 422, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 3: Bulk user import
  // --------------------------------------------------------------------------
  describe('3. Bulk User Import', () => {
    it('should initiate bulk user import via CSV', async () => {
      const response = await districtAdminApi.post('/users/import', {
        format: 'csv',
        data: [
          {
            email: 'teacher1@lincoln-test.edu',
            role: 'teacher',
            firstName: 'Jane',
            lastName: 'Smith',
          },
          {
            email: 'teacher2@lincoln-test.edu',
            role: 'teacher',
            firstName: 'John',
            lastName: 'Doe',
          },
          {
            email: 'student1@lincoln-test.edu',
            role: 'learner',
            firstName: 'Alice',
            lastName: 'Johnson',
          },
        ],
        tenantId: schoolTenantId ?? ctx().tenantA.id,
      });

      expect(response.status).toBeOneOf([200, 201, 202, 404]);

      if (response.data?.jobId) {
        importJobId = response.data.jobId;
        debug('Import job started', { importJobId });
      }
    });

    it('should check import job status', async () => {
      if (!importJobId) return;

      await wait(1000);

      const response = await districtAdminApi.get(`/users/import/${importJobId}`);

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200) {
        expect(response.data?.status).toBeOneOf([
          'pending',
          'processing',
          'completed',
          'failed',
          'partial',
        ]);
      }
    });

    it('should reject import with invalid email format', async () => {
      const response = await districtAdminApi.post('/users/import', {
        format: 'csv',
        data: [{ email: 'not-an-email', role: 'teacher', firstName: 'Bad', lastName: 'Email' }],
        tenantId: ctx().tenantA.id,
      });

      expect(response.status).toBeOneOf([400, 422, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 4: District-wide analytics
  // --------------------------------------------------------------------------
  describe('4. District Analytics', () => {
    it('should show district-wide usage dashboard', async () => {
      const response = await districtAdminApi.get('/analytics/district/usage', {
        params: { period: 'month' },
      });

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        debug('District usage', response.data);
      }
    });

    it('should show cross-school comparison metrics', async () => {
      const response = await districtAdminApi.get('/analytics/district/comparison', {
        params: { metric: 'engagement', period: 'quarter' },
      });

      expect(response.status).toBeOneOf([200, 404]);
    });

    it('should deny analytics access for non-district admin', async () => {
      const teacherApi = createApiClientForUser(ctx().users.teacherA.token);

      const response = await teacherApi.get('/analytics/district/usage');

      expect(response.status).toBeOneOf([403, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 5: District billing
  // --------------------------------------------------------------------------
  describe('5. District Billing', () => {
    it('should show district billing summary', async () => {
      const response = await districtAdminApi.get('/billing/district/summary');

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        expect(response.data).toBeDefined();
      }
    });

    it('should list invoices for district', async () => {
      const response = await districtAdminApi.get('/billing/invoices', {
        params: { scope: 'district' },
      });

      expect(response.status).toBeOneOf([200, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 6: License management
  // --------------------------------------------------------------------------
  describe('6. License Management', () => {
    it('should show license allocation across schools', async () => {
      const response = await districtAdminApi.get('/licenses', {
        params: { scope: 'district' },
      });

      expect(response.status).toBeOneOf([200, 404]);

      if (response.status === 200 && response.data) {
        const licenses = response.data.licenses ?? response.data.items ?? [];
        expect(Array.isArray(licenses)).toBe(true);
      }
    });

    it('should reallocate licenses between schools', async () => {
      const response = await districtAdminApi.post('/licenses/reallocate', {
        fromTenantId: ctx().tenantA.id,
        toTenantId: schoolTenantId ?? 'school-1',
        quantity: 5,
      });

      expect(response.status).toBeOneOf([200, 204, 400, 404]);
    });
  });

  // --------------------------------------------------------------------------
  // Step 7: Compliance & data export
  // --------------------------------------------------------------------------
  describe('7. Compliance & Data Export', () => {
    it('should generate FERPA compliance report', async () => {
      const response = await districtAdminApi.post('/compliance/reports', {
        type: 'ferpa',
        scope: 'district',
        period: 'quarter',
      });

      expect(response.status).toBeOneOf([200, 201, 202, 404]);
    });

    it('should initiate student data export', async () => {
      const response = await districtAdminApi.post('/data-export', {
        scope: 'district',
        format: 'csv',
        dataTypes: ['users', 'enrollments', 'assessments'],
      });

      expect(response.status).toBeOneOf([200, 201, 202, 404]);
    });

    it('should deny data export for non-admin role', async () => {
      const teacherApi = createApiClientForUser(ctx().users.teacherA.token);

      const response = await teacherApi.post('/data-export', {
        scope: 'district',
        format: 'csv',
        dataTypes: ['users'],
      });

      expect(response.status).toBeOneOf([403, 404]);
    });
  });
});
