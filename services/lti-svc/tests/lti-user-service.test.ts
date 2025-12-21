/**
 * LTI User Service Tests
 *
 * Tests for user resolution and creation from LTI launches.
 */

import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';

import { LtiUserService, type LtiUserContext, type AivoUserRole } from '../src/lti-user-service';
import { LTI_ROLES, LtiUserRole } from '../src/types';

// ══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ══════════════════════════════════════════════════════════════════════════════

const mockPrisma = {
  ltiUserMapping: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
  },
};

// Mock fetch for auth service calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

// ══════════════════════════════════════════════════════════════════════════════
// TEST DATA
// ══════════════════════════════════════════════════════════════════════════════

const sampleLtiContext: LtiUserContext = {
  issuer: 'https://canvas.instructure.com',
  clientId: 'client-123',
  deploymentId: 'deploy-1',
  sub: 'user-12345',
  email: 'student@school.edu',
  givenName: 'John',
  familyName: 'Student',
  name: 'John Student',
  roles: [LTI_ROLES.CONTEXT_LEARNER],
  tenantId: 'tenant-uuid-1',
  toolId: 'tool-uuid-1',
};

const existingMapping = {
  id: 'mapping-uuid-1',
  tenantId: 'tenant-uuid-1',
  ltiToolId: 'tool-uuid-1',
  lmsUserId: 'user-12345',
  aivoUserId: 'aivo-user-uuid-1',
  lmsEmail: 'student@school.edu',
  lmsName: 'John Student',
  lastSeenAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
};

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('LtiUserService', () => {
  let service: LtiUserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LtiUserService(mockPrisma as any, 'http://auth-svc:3000');
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ROLE MAPPING TESTS
  // ════════════════════════════════════════════════════════════════════════════

  describe('mapLtiRoles', () => {
    it('should map context instructor to TEACHER', () => {
      const roles = [LTI_ROLES.CONTEXT_INSTRUCTOR];
      expect(service.mapLtiRoles(roles)).toBe('TEACHER');
    });

    it('should map context learner to LEARNER', () => {
      const roles = [LTI_ROLES.CONTEXT_LEARNER];
      expect(service.mapLtiRoles(roles)).toBe('LEARNER');
    });

    it('should map system administrator to ADMIN', () => {
      const roles = [LTI_ROLES.SYSTEM_ADMINISTRATOR];
      expect(service.mapLtiRoles(roles)).toBe('ADMIN');
    });

    it('should map institution administrator to ADMIN', () => {
      const roles = [LTI_ROLES.INSTITUTION_ADMINISTRATOR];
      expect(service.mapLtiRoles(roles)).toBe('ADMIN');
    });

    it('should map content developer to AUTHOR', () => {
      const roles = [LTI_ROLES.CONTEXT_CONTENT_DEVELOPER];
      expect(service.mapLtiRoles(roles)).toBe('AUTHOR');
    });

    it('should map teaching assistant to TEACHER', () => {
      const roles = [LTI_ROLES.CONTEXT_TEACHING_ASSISTANT];
      expect(service.mapLtiRoles(roles)).toBe('TEACHER');
    });

    it('should prioritize ADMIN over TEACHER when user has both roles', () => {
      const roles = [LTI_ROLES.CONTEXT_INSTRUCTOR, LTI_ROLES.SYSTEM_ADMINISTRATOR];
      expect(service.mapLtiRoles(roles)).toBe('ADMIN');
    });

    it('should prioritize TEACHER over LEARNER when user has both roles', () => {
      const roles = [LTI_ROLES.CONTEXT_LEARNER, LTI_ROLES.CONTEXT_INSTRUCTOR];
      expect(service.mapLtiRoles(roles)).toBe('TEACHER');
    });

    it('should default to LEARNER for unknown roles', () => {
      const roles = ['http://purl.imsglobal.org/vocab/lis/v2/unknown#UnknownRole'];
      expect(service.mapLtiRoles(roles)).toBe('LEARNER');
    });

    it('should default to LEARNER for empty roles array', () => {
      expect(service.mapLtiRoles([])).toBe('LEARNER');
    });

    it('should handle short-form roles (Instructor)', () => {
      const roles = ['Instructor'];
      expect(service.mapLtiRoles(roles)).toBe('TEACHER');
    });

    it('should handle short-form roles (Student)', () => {
      const roles = ['Student'];
      expect(service.mapLtiRoles(roles)).toBe('LEARNER');
    });
  });

  describe('aivoRoleToLtiRole', () => {
    it('should convert ADMIN to ADMINISTRATOR', () => {
      expect(service.aivoRoleToLtiRole('ADMIN')).toBe(LtiUserRole.ADMINISTRATOR);
    });

    it('should convert TEACHER to INSTRUCTOR', () => {
      expect(service.aivoRoleToLtiRole('TEACHER')).toBe(LtiUserRole.INSTRUCTOR);
    });

    it('should convert AUTHOR to CONTENT_DEVELOPER', () => {
      expect(service.aivoRoleToLtiRole('AUTHOR')).toBe(LtiUserRole.CONTENT_DEVELOPER);
    });

    it('should convert LEARNER to LEARNER', () => {
      expect(service.aivoRoleToLtiRole('LEARNER')).toBe(LtiUserRole.LEARNER);
    });

    it('should convert PARENT to LEARNER', () => {
      expect(service.aivoRoleToLtiRole('PARENT')).toBe(LtiUserRole.LEARNER);
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // USER RESOLUTION TESTS
  // ════════════════════════════════════════════════════════════════════════════

  describe('resolveOrCreateUser', () => {
    it('should return existing mapping when user is already linked', async () => {
      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(existingMapping);
      mockPrisma.ltiUserMapping.update.mockResolvedValue(existingMapping);
      mockFetch.mockResolvedValue({ ok: true });

      const result = await service.resolveOrCreateUser(sampleLtiContext);

      expect(result.userId).toBe('aivo-user-uuid-1');
      expect(result.isNewUser).toBe(false);
      expect(result.role).toBe('LEARNER');
      expect(result.displayName).toBe('John Student');
      expect(result.mapping).toBe(existingMapping);
    });

    it('should find user by email when no existing mapping', async () => {
      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(null);
      mockPrisma.ltiUserMapping.findFirst.mockResolvedValue({
        aivoUserId: 'email-matched-user-uuid',
      });
      mockPrisma.ltiUserMapping.create.mockResolvedValue({
        ...existingMapping,
        aivoUserId: 'email-matched-user-uuid',
      });
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'email-matched-user-uuid' }),
      });

      const result = await service.resolveOrCreateUser(sampleLtiContext);

      expect(result.userId).toBe('email-matched-user-uuid');
      expect(result.isNewUser).toBe(false);
    });

    it('should create new user when no mapping and no email match', async () => {
      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(null);
      mockPrisma.ltiUserMapping.findFirst.mockResolvedValue(null);

      // Mock auth service create user response
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/internal/users/by-email')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        if (url.includes('/internal/users')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ id: 'new-user-uuid' }),
          });
        }
        return Promise.resolve({ ok: true });
      });

      mockPrisma.ltiUserMapping.create.mockResolvedValue({
        ...existingMapping,
        aivoUserId: 'new-user-uuid',
      });

      const result = await service.resolveOrCreateUser(sampleLtiContext);

      expect(result.userId).toBe('new-user-uuid');
      expect(result.isNewUser).toBe(true);
    });

    it('should use display name from full name claim', async () => {
      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(existingMapping);
      mockPrisma.ltiUserMapping.update.mockResolvedValue(existingMapping);
      mockFetch.mockResolvedValue({ ok: true });

      const result = await service.resolveOrCreateUser(sampleLtiContext);

      expect(result.displayName).toBe('John Student');
    });

    it('should construct display name from given/family name if no full name', async () => {
      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(existingMapping);
      mockPrisma.ltiUserMapping.update.mockResolvedValue(existingMapping);
      mockFetch.mockResolvedValue({ ok: true });

      const contextWithoutName = {
        ...sampleLtiContext,
        name: undefined,
      };

      const result = await service.resolveOrCreateUser(contextWithoutName);

      expect(result.displayName).toBe('John Student');
    });

    it('should use email as display name if no name claims', async () => {
      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(existingMapping);
      mockPrisma.ltiUserMapping.update.mockResolvedValue(existingMapping);
      mockFetch.mockResolvedValue({ ok: true });

      const contextWithOnlyEmail = {
        ...sampleLtiContext,
        name: undefined,
        givenName: undefined,
        familyName: undefined,
      };

      const result = await service.resolveOrCreateUser(contextWithOnlyEmail);

      expect(result.displayName).toBe('student');
    });

    it('should fallback to "LTI User" if no identifying info', async () => {
      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(existingMapping);
      mockPrisma.ltiUserMapping.update.mockResolvedValue(existingMapping);
      mockFetch.mockResolvedValue({ ok: true });

      const contextWithNoInfo = {
        ...sampleLtiContext,
        name: undefined,
        givenName: undefined,
        familyName: undefined,
        email: undefined,
      };

      const result = await service.resolveOrCreateUser(contextWithNoInfo);

      expect(result.displayName).toBe('LTI User');
    });
  });

  // ════════════════════════════════════════════════════════════════════════════
  // ADMIN OPERATIONS TESTS
  // ════════════════════════════════════════════════════════════════════════════

  describe('getUserMappings', () => {
    it('should return all mappings for a user', async () => {
      const mappings = [
        { ...existingMapping, ltiToolId: 'tool-1' },
        { ...existingMapping, id: 'mapping-2', ltiToolId: 'tool-2' },
      ];
      mockPrisma.ltiUserMapping.findMany.mockResolvedValue(mappings);

      const result = await service.getUserMappings('aivo-user-uuid-1');

      expect(result).toHaveLength(2);
      expect(mockPrisma.ltiUserMapping.findMany).toHaveBeenCalledWith({
        where: { aivoUserId: 'aivo-user-uuid-1' },
      });
    });
  });

  describe('unlinkAccount', () => {
    it('should delete the mapping', async () => {
      mockPrisma.ltiUserMapping.delete.mockResolvedValue(existingMapping);

      await service.unlinkAccount('mapping-uuid-1');

      expect(mockPrisma.ltiUserMapping.delete).toHaveBeenCalledWith({
        where: { id: 'mapping-uuid-1' },
      });
    });
  });

  describe('getLtiContext', () => {
    it('should return user context when mapping exists', async () => {
      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(existingMapping);

      const result = await service.getLtiContext('tool-uuid-1', 'user-12345');

      expect(result).toBeDefined();
      expect(result?.aivoUserId).toBe('aivo-user-uuid-1');
    });

    it('should return null when no mapping exists', async () => {
      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(null);

      const result = await service.getLtiContext('tool-uuid-1', 'unknown-user');

      expect(result).toBeNull();
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// INTEGRATION SCENARIO TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('LTI User Service - Integration Scenarios', () => {
  let service: LtiUserService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new LtiUserService(mockPrisma as any, 'http://auth-svc:3000');
  });

  describe('Canvas SSO flow', () => {
    it('should correctly resolve a student from Canvas', async () => {
      const canvasContext: LtiUserContext = {
        issuer: 'https://springfield.instructure.com',
        clientId: 'canvas-client-123',
        deploymentId: 'canvas-deploy-1',
        sub: 'canvas-user-456',
        email: 'bart@springfield.edu',
        givenName: 'Bart',
        familyName: 'Simpson',
        name: 'Bart Simpson',
        roles: [LTI_ROLES.CONTEXT_LEARNER],
        tenantId: 'springfield-tenant',
        toolId: 'canvas-tool-1',
      };

      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(null);
      mockPrisma.ltiUserMapping.findFirst.mockResolvedValue(null);
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('/internal/users/by-email')) {
          return Promise.resolve({ ok: false, status: 404 });
        }
        if (url.includes('/internal/users')) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ id: 'bart-aivo-uuid' }),
          });
        }
        return Promise.resolve({ ok: true });
      });
      mockPrisma.ltiUserMapping.create.mockResolvedValue({
        id: 'new-mapping',
        tenantId: 'springfield-tenant',
        ltiToolId: 'canvas-tool-1',
        lmsUserId: 'canvas-user-456',
        aivoUserId: 'bart-aivo-uuid',
        lmsEmail: 'bart@springfield.edu',
        lmsName: 'Bart Simpson',
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.resolveOrCreateUser(canvasContext);

      expect(result.userId).toBe('bart-aivo-uuid');
      expect(result.isNewUser).toBe(true);
      expect(result.role).toBe('LEARNER');
      expect(result.displayName).toBe('Bart Simpson');
    });

    it('should correctly resolve a teacher from Canvas', async () => {
      const teacherContext: LtiUserContext = {
        issuer: 'https://springfield.instructure.com',
        clientId: 'canvas-client-123',
        deploymentId: 'canvas-deploy-1',
        sub: 'canvas-teacher-789',
        email: 'skinner@springfield.edu',
        givenName: 'Seymour',
        familyName: 'Skinner',
        name: 'Seymour Skinner',
        roles: [LTI_ROLES.CONTEXT_INSTRUCTOR],
        tenantId: 'springfield-tenant',
        toolId: 'canvas-tool-1',
      };

      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue({
        id: 'skinner-mapping',
        tenantId: 'springfield-tenant',
        ltiToolId: 'canvas-tool-1',
        lmsUserId: 'canvas-teacher-789',
        aivoUserId: 'skinner-aivo-uuid',
        lmsEmail: 'skinner@springfield.edu',
        lmsName: 'Seymour Skinner',
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      mockPrisma.ltiUserMapping.update.mockResolvedValue({});
      mockFetch.mockResolvedValue({ ok: true });

      const result = await service.resolveOrCreateUser(teacherContext);

      expect(result.userId).toBe('skinner-aivo-uuid');
      expect(result.isNewUser).toBe(false);
      expect(result.role).toBe('TEACHER');
    });
  });

  describe('Multi-platform user', () => {
    it('should link same AIVO user from different LMS platforms via email', async () => {
      // First login via Canvas
      const canvasContext: LtiUserContext = {
        issuer: 'https://canvas.school.edu',
        clientId: 'canvas-client',
        deploymentId: 'canvas-deploy',
        sub: 'canvas-user-1',
        email: 'student@school.edu',
        name: 'Test Student',
        roles: [LTI_ROLES.CONTEXT_LEARNER],
        tenantId: 'school-tenant',
        toolId: 'canvas-tool',
      };

      // User already exists from Canvas
      mockPrisma.ltiUserMapping.findUnique.mockResolvedValue(null);
      mockPrisma.ltiUserMapping.findFirst.mockResolvedValue({
        aivoUserId: 'existing-aivo-user',
      });
      mockPrisma.ltiUserMapping.create.mockResolvedValue({
        id: 'schoology-mapping',
        aivoUserId: 'existing-aivo-user',
        ltiToolId: 'schoology-tool',
        lmsUserId: 'schoology-user-1',
        tenantId: 'school-tenant',
        lmsEmail: 'student@school.edu',
        lmsName: 'Test Student',
        lastSeenAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Now login via Schoology with same email
      const schoologyContext: LtiUserContext = {
        issuer: 'https://lti.schoology.com',
        clientId: 'schoology-client',
        deploymentId: 'schoology-deploy',
        sub: 'schoology-user-1', // Different sub
        email: 'student@school.edu', // Same email
        name: 'Test Student',
        roles: [LTI_ROLES.CONTEXT_LEARNER],
        tenantId: 'school-tenant',
        toolId: 'schoology-tool',
      };

      const result = await service.resolveOrCreateUser(schoologyContext);

      expect(result.userId).toBe('existing-aivo-user');
      expect(result.isNewUser).toBe(false);
    });
  });
});
