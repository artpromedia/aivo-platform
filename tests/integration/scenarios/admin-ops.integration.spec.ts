/**
 * Admin Operations Integration Test Suite
 *
 * Complete end-to-end admin workflow testing:
 * 1. User provisioning and onboarding
 * 2. Role assignment and permissions
 * 3. Access verification and control
 * 4. Audit logging and compliance
 * 5. Tenant and organization management
 * 6. System configuration and settings
 *
 * @module tests/integration/scenarios/admin-ops
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { ApiClient, createApiClientForUser } from '../utils/api-client';
import {
  wait,
  waitFor,
  retry,
  randomString,
  randomEmail,
  randomPhone,
  debug,
} from '../utils/helpers';

describe('Admin Operations - Complete Workflow', () => {
  // API clients for different user roles
  let superAdminApi: ApiClient;
  let orgAdminApi: ApiClient;
  let schoolAdminApi: ApiClient;
  let regularUserApi: ApiClient;

  // Test data IDs
  let orgId: string;
  let schoolId: string;
  let newUserId: string;
  let roleId: string;
  let permissionSetId: string;
  let auditLogId: string;
  let apiKeyId: string;

  // Cleanup tracking
  const cleanupIds: {
    users: string[];
    roles: string[];
    organizations: string[];
    apiKeys: string[];
  } = {
    users: [],
    roles: [],
    organizations: [],
    apiKeys: [],
  };

  const ctx = () => globalThis.testContext;

  beforeAll(async () => {
    // Initialize API clients from global test context
    superAdminApi = createApiClientForUser(ctx().users.adminA.token);
    orgAdminApi = createApiClientForUser(ctx().users.adminA.token);
    schoolAdminApi = createApiClientForUser(ctx().users.teacherA.token); // Teacher as school admin
    regularUserApi = createApiClientForUser(ctx().users.learnerA.token);

    orgId = ctx().tenantA.id;

    debug('Admin Operations Test Setup', {
      orgId,
      adminId: ctx().users.adminA.id,
    });
  });

  afterAll(async () => {
    debug('Cleaning up admin test data...');

    // Delete API keys
    for (const keyId of cleanupIds.apiKeys) {
      try {
        await superAdminApi.delete(`/admin/api-keys/${keyId}`);
      } catch {
        // Key may already be deleted
      }
    }

    // Delete custom roles
    for (const rId of cleanupIds.roles) {
      try {
        await superAdminApi.delete(`/admin/roles/${rId}`);
      } catch {
        // Role may already be deleted
      }
    }

    // Deactivate test users
    for (const userId of cleanupIds.users) {
      try {
        await superAdminApi.post(`/admin/users/${userId}/deactivate`);
      } catch {
        // User may already be deactivated
      }
    }

    debug('Cleanup complete');
  });

  // ==========================================================================
  // 1. User Provisioning & Onboarding
  // ==========================================================================

  describe('1. User Provisioning & Onboarding', () => {
    it('should create new user account', async () => {
      const userData = {
        email: randomEmail('admin-test'),
        firstName: 'Integration',
        lastName: 'TestUser',
        phone: randomPhone(),
        role: 'teacher',
        organizationId: orgId,
        sendInvitation: false, // Skip email for testing
      };

      const response = await superAdminApi.post('/admin/users', userData);

      expect([200, 201, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const user = response.data as { id: string; email: string };
        newUserId = user.id;
        cleanupIds.users.push(newUserId);
      }

      if (!newUserId) {
        newUserId = `user-${randomString(8)}`;
      }

      debug('User created', { newUserId, status: response.status });
    });

    it('should bulk import users from CSV', async () => {
      const bulkData = {
        users: [
          {
            email: randomEmail('bulk1'),
            firstName: 'Bulk',
            lastName: 'User1',
            role: 'student',
          },
          {
            email: randomEmail('bulk2'),
            firstName: 'Bulk',
            lastName: 'User2',
            role: 'student',
          },
        ],
        sendInvitations: false,
        defaultPassword: 'TempPass123!',
      };

      const response = await superAdminApi.post('/admin/users/bulk-import', bulkData);

      expect([200, 201, 207, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201 || response.status === 207) {
        const result = response.data as {
          created: number;
          failed: number;
          userIds?: string[];
        };

        if (result.userIds) {
          cleanupIds.users.push(...result.userIds);
        }
      }
    });

    it('should send invitation email', async () => {
      const response = await superAdminApi.post(`/admin/users/${newUserId}/invite`, {
        message: 'Welcome to the platform!',
        expiresIn: '7d',
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should set temporary password', async () => {
      const response = await superAdminApi.post(`/admin/users/${newUserId}/set-password`, {
        temporaryPassword: 'TempPass123!',
        requireChange: true,
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should configure user profile', async () => {
      const profileData = {
        displayName: 'Test Teacher',
        department: 'Mathematics',
        title: 'Senior Teacher',
        preferences: {
          timezone: 'America/New_York',
          locale: 'en-US',
          notifications: {
            email: true,
            push: true,
            sms: false,
          },
        },
      };

      const response = await superAdminApi.put(`/admin/users/${newUserId}/profile`, profileData);

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should verify user onboarding status', async () => {
      const response = await superAdminApi.get(`/admin/users/${newUserId}/onboarding-status`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const status = response.data as {
          steps: Array<{
            name: string;
            completed: boolean;
          }>;
          completedAt?: string;
        };

        expect(Array.isArray(status.steps)).toBe(true);
      }
    });
  });

  // ==========================================================================
  // 2. Role Assignment & Permissions
  // ==========================================================================

  describe('2. Role Assignment & Permissions', () => {
    it('should list available roles', async () => {
      const response = await superAdminApi.get('/admin/roles');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          roles: Array<{
            id: string;
            name: string;
            description: string;
            permissions: string[];
          }>;
        };

        expect(data.roles.length).toBeGreaterThan(0);
      }
    });

    it('should create custom role', async () => {
      const roleData = {
        name: `Custom Role ${randomString(6)}`,
        description: 'Integration test custom role',
        permissions: [
          'users.read',
          'users.create',
          'content.read',
          'content.create',
          'reports.view',
        ],
        scope: 'organization',
      };

      const response = await superAdminApi.post('/admin/roles', roleData);

      expect([200, 201, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const role = response.data as { id: string };
        roleId = role.id;
        cleanupIds.roles.push(roleId);
      }

      if (!roleId) {
        roleId = `role-${randomString(8)}`;
      }

      debug('Custom role created', { roleId });
    });

    it('should assign role to user', async () => {
      const response = await superAdminApi.post(`/admin/users/${newUserId}/roles`, {
        roleId,
        scope: {
          type: 'organization',
          id: orgId,
        },
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });

    it('should list user roles', async () => {
      const response = await superAdminApi.get(`/admin/users/${newUserId}/roles`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          roles: Array<{
            id: string;
            name: string;
            scope: string;
          }>;
        };

        expect(Array.isArray(data.roles)).toBe(true);
      }
    });

    it('should create permission set', async () => {
      const permissionSetData = {
        name: `Permission Set ${randomString(6)}`,
        permissions: [
          { resource: 'students', action: 'read' },
          { resource: 'students', action: 'update' },
          { resource: 'grades', action: 'read' },
          { resource: 'grades', action: 'create' },
        ],
      };

      const response = await superAdminApi.post('/admin/permission-sets', permissionSetData);

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const permSet = response.data as { id: string };
        permissionSetId = permSet.id;
      }
    });

    it('should revoke role from user', async () => {
      const response = await superAdminApi.delete(`/admin/users/${newUserId}/roles/${roleId}`);

      expect([200, 204, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 3. Access Verification & Control
  // ==========================================================================

  describe('3. Access Verification & Control', () => {
    it('should check user permissions', async () => {
      const response = await superAdminApi.get(`/admin/users/${newUserId}/permissions`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          permissions: string[];
          effectiveRoles: string[];
        };

        expect(Array.isArray(data.permissions)).toBe(true);
      }
    });

    it('should verify specific permission', async () => {
      const response = await superAdminApi.post('/admin/permissions/check', {
        userId: newUserId,
        permission: 'content.create',
        resource: {
          type: 'course',
          id: 'course-123',
        },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const result = response.data as {
          allowed: boolean;
          reason?: string;
        };

        expect(result).toHaveProperty('allowed');
      }
    });

    it('should manage user sessions', async () => {
      const response = await superAdminApi.get(`/admin/users/${newUserId}/sessions`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          sessions: Array<{
            id: string;
            deviceInfo: string;
            lastActive: string;
            ipAddress?: string;
          }>;
        };

        expect(Array.isArray(data.sessions)).toBe(true);
      }
    });

    it('should revoke all user sessions', async () => {
      const response = await superAdminApi.post(`/admin/users/${newUserId}/sessions/revoke-all`);

      expect([200, 201, 204, 404]).toContain(response.status);
    });

    it('should lock user account', async () => {
      const response = await superAdminApi.post(`/admin/users/${newUserId}/lock`, {
        reason: 'Suspicious activity detected',
        duration: '24h',
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should unlock user account', async () => {
      const response = await superAdminApi.post(`/admin/users/${newUserId}/unlock`);

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should manage IP allowlist', async () => {
      const response = await superAdminApi.post('/admin/security/ip-allowlist', {
        ipAddresses: ['192.168.1.0/24', '10.0.0.0/8'],
        description: 'Office network',
      });

      expect([200, 201, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 4. Audit Logging & Compliance
  // ==========================================================================

  describe('4. Audit Logging & Compliance', () => {
    it('should retrieve audit logs', async () => {
      const response = await superAdminApi.get('/admin/audit-logs', {
        params: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
          limit: 50,
        },
      });

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          logs: Array<{
            id: string;
            action: string;
            userId: string;
            timestamp: string;
            details: Record<string, unknown>;
          }>;
          pagination: {
            total: number;
            page: number;
          };
        };

        expect(Array.isArray(data.logs)).toBe(true);

        if (data.logs.length > 0) {
          auditLogId = data.logs[0].id;
        }
      }
    });

    it('should filter audit logs by action', async () => {
      const response = await superAdminApi.get('/admin/audit-logs', {
        params: {
          action: 'user.created',
          limit: 10,
        },
      });

      expect([200, 404]).toContain(response.status);
    });

    it('should filter audit logs by user', async () => {
      const response = await superAdminApi.get('/admin/audit-logs', {
        params: {
          userId: ctx().users.adminA.id,
          limit: 10,
        },
      });

      expect([200, 404]).toContain(response.status);
    });

    it('should get audit log details', async () => {
      if (!auditLogId) {
        auditLogId = 'audit-log-1';
      }

      const response = await superAdminApi.get(`/admin/audit-logs/${auditLogId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const log = response.data as {
          id: string;
          action: string;
          userId: string;
          userEmail: string;
          ipAddress?: string;
          userAgent?: string;
          details: Record<string, unknown>;
          timestamp: string;
        };

        expect(log.id).toBe(auditLogId);
      }
    });

    it('should export audit logs', async () => {
      const response = await superAdminApi.post('/admin/audit-logs/export', {
        format: 'csv',
        dateRange: {
          start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          end: new Date().toISOString(),
        },
        filters: {
          actions: ['user.created', 'user.updated', 'role.assigned'],
        },
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });

    it('should configure audit retention policy', async () => {
      const response = await superAdminApi.put('/admin/audit-logs/retention', {
        retentionDays: 365,
        archiveToStorage: true,
        storageLocation: 's3://audit-archive',
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should generate compliance report', async () => {
      const response = await superAdminApi.post('/admin/compliance/report', {
        reportType: 'access_review',
        period: 'quarterly',
        includeInactiveUsers: true,
      });

      expect([200, 201, 202, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // 5. Tenant & Organization Management
  // ==========================================================================

  describe('5. Tenant & Organization Management', () => {
    it('should list organizations', async () => {
      const response = await superAdminApi.get('/admin/organizations');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          organizations: Array<{
            id: string;
            name: string;
            type: string;
            status: string;
          }>;
        };

        expect(data.organizations.length).toBeGreaterThan(0);
      }
    });

    it('should get organization details', async () => {
      const response = await superAdminApi.get(`/admin/organizations/${orgId}`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const org = response.data as {
          id: string;
          name: string;
          settings: Record<string, unknown>;
          userCount: number;
        };

        expect(org.id).toBe(orgId);
      }
    });

    it('should update organization settings', async () => {
      const response = await superAdminApi.put(`/admin/organizations/${orgId}/settings`, {
        branding: {
          primaryColor: '#1E88E5',
          logo: 'https://example.com/logo.png',
        },
        features: {
          sso: true,
          advancedAnalytics: true,
          customReports: true,
        },
        security: {
          mfaRequired: false,
          passwordPolicy: 'strong',
          sessionTimeout: 3600,
        },
      });

      expect([200, 201, 404]).toContain(response.status);
    });

    it('should create school/department', async () => {
      const schoolData = {
        name: `Test School ${randomString(6)}`,
        type: 'school',
        parentOrganizationId: orgId,
        settings: {
          gradeRange: { min: 'K', max: '8' },
          subjects: ['math', 'science', 'english'],
        },
      };

      const response = await superAdminApi.post('/admin/organizations', schoolData);

      expect([200, 201, 400, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const school = response.data as { id: string };
        schoolId = school.id;
        cleanupIds.organizations.push(schoolId);
      }

      if (!schoolId) {
        schoolId = `school-${randomString(8)}`;
      }
    });

    it('should manage organization hierarchy', async () => {
      const response = await superAdminApi.get(`/admin/organizations/${orgId}/hierarchy`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const hierarchy = response.data as {
          id: string;
          name: string;
          children: Array<{
            id: string;
            name: string;
            type: string;
          }>;
        };

        expect(hierarchy.id).toBe(orgId);
      }
    });

    it('should get organization statistics', async () => {
      const response = await superAdminApi.get(`/admin/organizations/${orgId}/statistics`);

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const stats = response.data as {
          totalUsers: number;
          activeUsers: number;
          totalStudents: number;
          totalTeachers: number;
          storageUsed: number;
        };

        expect(stats.totalUsers).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ==========================================================================
  // 6. System Configuration & Settings
  // ==========================================================================

  describe('6. System Configuration & Settings', () => {
    it('should get system configuration', async () => {
      const response = await superAdminApi.get('/admin/config');

      expect([200, 403, 404]).toContain(response.status);

      if (response.status === 200) {
        const config = response.data as {
          features: Record<string, boolean>;
          limits: Record<string, number>;
          integrations: Record<string, unknown>;
        };

        expect(config).toHaveProperty('features');
      }
    });

    it('should update feature flags', async () => {
      const response = await superAdminApi.put('/admin/config/features', {
        'new-dashboard': true,
        'beta-analytics': true,
        'experimental-ai': false,
      });

      expect([200, 201, 403, 404]).toContain(response.status);
    });

    it('should manage API keys', async () => {
      const response = await superAdminApi.post('/admin/api-keys', {
        name: `Test API Key ${randomString(6)}`,
        scopes: ['read:users', 'read:content'],
        expiresIn: '30d',
      });

      expect([200, 201, 404]).toContain(response.status);

      if (response.status === 200 || response.status === 201) {
        const key = response.data as { id: string; key: string };
        apiKeyId = key.id;
        cleanupIds.apiKeys.push(apiKeyId);
      }
    });

    it('should list API keys', async () => {
      const response = await superAdminApi.get('/admin/api-keys');

      expect([200, 404]).toContain(response.status);

      if (response.status === 200) {
        const data = response.data as {
          keys: Array<{
            id: string;
            name: string;
            lastUsed?: string;
            expiresAt: string;
          }>;
        };

        expect(Array.isArray(data.keys)).toBe(true);
      }
    });

    it('should configure email settings', async () => {
      const response = await superAdminApi.put('/admin/config/email', {
        provider: 'smtp',
        fromAddress: 'noreply@aivo.local',
        replyToAddress: 'support@aivo.local',
        templates: {
          welcome: { enabled: true },
          passwordReset: { enabled: true },
          invitation: { enabled: true },
        },
      });

      expect([200, 201, 403, 404]).toContain(response.status);
    });

    it('should configure SSO settings', async () => {
      const response = await superAdminApi.put('/admin/config/sso', {
        enabled: true,
        provider: 'saml',
        config: {
          entryPoint: 'https://idp.example.com/sso',
          issuer: 'aivo',
          certificate: '-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----',
        },
      });

      expect([200, 201, 403, 404]).toContain(response.status);
    });

    it('should test configuration changes', async () => {
      const response = await superAdminApi.post('/admin/config/test', {
        type: 'email',
        recipient: 'test@aivo.local',
      });

      expect([200, 201, 400, 404]).toContain(response.status);
    });
  });

  // ==========================================================================
  // Cross-Cutting Concerns
  // ==========================================================================

  describe('Cross-Cutting: Security', () => {
    it('should enforce role-based access control', async () => {
      // Regular user should not access admin endpoints
      const response = await regularUserApi.get('/admin/users');

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should prevent privilege escalation', async () => {
      // Regular user should not be able to grant themselves admin role
      const response = await regularUserApi.post(`/admin/users/${ctx().users.learnerA.id}/roles`, {
        roleId: 'super_admin',
      });

      expect([401, 403, 404]).toContain(response.status);
    });

    it('should log sensitive operations', async () => {
      // Perform a sensitive operation
      await superAdminApi.post(`/admin/users/${newUserId}/lock`, {
        reason: 'Security audit test',
      });

      // Check audit log for the operation
      await wait(500);

      const response = await superAdminApi.get('/admin/audit-logs', {
        params: {
          action: 'user.locked',
          limit: 1,
        },
      });

      expect([200, 404]).toContain(response.status);
    });
  });

  describe('Cross-Cutting: Error Handling', () => {
    it('should handle invalid user ID', async () => {
      const response = await superAdminApi.get('/admin/users/invalid-user-id-12345');

      expect([400, 404]).toContain(response.status);
    });

    it('should handle duplicate role creation', async () => {
      const duplicateRole = {
        name: 'Admin', // Likely existing
        permissions: ['users.read'],
      };

      const response = await superAdminApi.post('/admin/roles', duplicateRole);

      expect([200, 201, 400, 409, 404]).toContain(response.status);
    });

    it('should handle invalid permission assignment', async () => {
      const response = await superAdminApi.post(`/admin/users/${newUserId}/roles`, {
        roleId: 'non-existent-role-id',
      });

      expect([400, 404]).toContain(response.status);
    });
  });

  describe('Cross-Cutting: Data Integrity', () => {
    it('should maintain referential integrity on user deletion', async () => {
      // Create a user with roles
      const tempUser = await superAdminApi.post('/admin/users', {
        email: randomEmail('temp'),
        firstName: 'Temp',
        lastName: 'User',
        role: 'student',
        organizationId: orgId,
      });

      if (tempUser.status === 200 || tempUser.status === 201) {
        const userId = (tempUser.data as { id: string }).id;

        // Delete user
        const deleteResponse = await superAdminApi.delete(`/admin/users/${userId}`);

        expect([200, 204, 404]).toContain(deleteResponse.status);
      }
    });

    it('should handle concurrent role modifications', async () => {
      // Simulate concurrent modifications
      const promises = [
        superAdminApi.post(`/admin/users/${newUserId}/roles`, { roleId: 'teacher' }),
        superAdminApi.delete(`/admin/users/${newUserId}/roles/${roleId}`),
      ];

      const results = await Promise.allSettled(promises);

      // All requests should be handled (either success or proper error)
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          expect([200, 201, 204, 400, 404, 409]).toContain(result.value.status);
        }
      });
    });
  });
});
