import { describe, it, expect, beforeEach } from 'vitest';
import {
  FileAccessControl,
  FileOperation,
  createAccessContext,
  hasRole,
  hasAnyRole,
  hasAllRoles,
  DEFAULT_CATEGORY_POLICIES,
  DEFAULT_POLICY,
} from '../src/access-control.js';
import type { StoredFile, FileAccessContext } from '../src/types.js';

// ============================================================================
// Test Fixtures
// ============================================================================

function createTestFile(overrides: Partial<StoredFile> = {}): StoredFile {
  return {
    id: 'file-123',
    tenantId: 'tenant-abc',
    ownerId: 'user-456',
    ownerType: 'user',
    category: 'ATTACHMENT',
    filename: 'test-document.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 1024,
    s3Bucket: 'test-bucket',
    s3Key: 'tenant-abc/user/user-456/ATTACHMENT/file-123/test-document.pdf',
    virusScanStatus: 'CLEAN',
    isDeleted: false,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createTestContext(overrides: Partial<FileAccessContext> = {}): FileAccessContext {
  return {
    userId: 'user-456',
    tenantId: 'tenant-abc',
    roles: ['student'],
    permissions: [],
    ...overrides,
  };
}

// ============================================================================
// FileAccessControl Tests
// ============================================================================

describe('FileAccessControl', () => {
  let accessControl: FileAccessControl;

  beforeEach(() => {
    accessControl = new FileAccessControl();
  });

  describe('tenant isolation', () => {
    it('should deny access to files from different tenants', async () => {
      const file = createTestFile({ tenantId: 'tenant-abc' });
      const context = createTestContext({ tenantId: 'tenant-xyz' });

      const result = await accessControl.canAccess(file, FileOperation.READ, context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Cross-tenant file access is not allowed');
    });

    it('should allow access within same tenant', async () => {
      const file = createTestFile({ tenantId: 'tenant-abc' });
      const context = createTestContext({ tenantId: 'tenant-abc' });

      const result = await accessControl.canAccess(file, FileOperation.READ, context);

      expect(result.allowed).toBe(true);
    });
  });

  describe('super admin bypass', () => {
    it('should allow super admin access to any file', async () => {
      const file = createTestFile();
      const context = createTestContext({
        userId: 'admin-user',
        roles: ['platform_super_admin'],
      });

      const readResult = await accessControl.canAccess(file, FileOperation.READ, context);
      const writeResult = await accessControl.canAccess(file, FileOperation.WRITE, context);
      const deleteResult = await accessControl.canAccess(file, FileOperation.DELETE, context);
      const adminResult = await accessControl.canAccess(file, FileOperation.ADMIN, context);

      expect(readResult.allowed).toBe(true);
      expect(readResult.reason).toBe('Super admin access');
      expect(writeResult.allowed).toBe(true);
      expect(deleteResult.allowed).toBe(true);
      expect(adminResult.allowed).toBe(true);
    });
  });

  describe('owner permissions', () => {
    describe('ATTACHMENT category', () => {
      it('should allow owner to read their own attachment', async () => {
        const file = createTestFile({ ownerId: 'user-456', category: 'ATTACHMENT' });
        const context = createTestContext({ userId: 'user-456' });

        const result = await accessControl.canRead(file, context);

        expect(result).toBe(true);
      });

      it('should allow owner to write their own attachment', async () => {
        const file = createTestFile({ ownerId: 'user-456', category: 'ATTACHMENT' });
        const context = createTestContext({ userId: 'user-456' });

        const result = await accessControl.canWrite(file, context);

        expect(result).toBe(true);
      });

      it('should allow owner to delete their own attachment', async () => {
        const file = createTestFile({ ownerId: 'user-456', category: 'ATTACHMENT' });
        const context = createTestContext({ userId: 'user-456' });

        const result = await accessControl.canDelete(file, context);

        expect(result).toBe(true);
      });
    });

    describe('ASSESSMENT_AUDIO category', () => {
      it('should allow owner to read their own assessment audio', async () => {
        const file = createTestFile({ ownerId: 'user-456', category: 'ASSESSMENT_AUDIO' });
        const context = createTestContext({ userId: 'user-456' });

        const result = await accessControl.canRead(file, context);

        expect(result).toBe(true);
      });

      it('should deny owner from writing to their assessment audio', async () => {
        const file = createTestFile({ ownerId: 'user-456', category: 'ASSESSMENT_AUDIO' });
        const context = createTestContext({ userId: 'user-456', roles: [] });

        const result = await accessControl.canWrite(file, context);

        expect(result).toBe(false);
      });

      it('should deny owner from deleting their assessment audio', async () => {
        const file = createTestFile({ ownerId: 'user-456', category: 'ASSESSMENT_AUDIO' });
        const context = createTestContext({ userId: 'user-456', roles: [] });

        const result = await accessControl.canDelete(file, context);

        expect(result).toBe(false);
      });
    });
  });

  describe('role-based permissions', () => {
    describe('IEP_DOCUMENT category', () => {
      const iepFile = createTestFile({
        ownerId: 'other-user',
        category: 'IEP_DOCUMENT',
      });

      it('should allow teacher to read IEP documents', async () => {
        const context = createTestContext({
          userId: 'teacher-123',
          roles: ['teacher'],
        });

        const result = await accessControl.canRead(iepFile, context);

        expect(result).toBe(true);
      });

      it('should allow special_education_coordinator to write IEP documents', async () => {
        const context = createTestContext({
          userId: 'sped-coordinator',
          roles: ['special_education_coordinator'],
        });

        const result = await accessControl.canWrite(iepFile, context);

        expect(result).toBe(true);
      });

      it('should deny student from reading IEP documents', async () => {
        const context = createTestContext({
          userId: 'student-123',
          roles: ['student'],
        });

        const result = await accessControl.canRead(iepFile, context);

        expect(result).toBe(false);
      });

      it('should allow district_admin to delete IEP documents', async () => {
        const context = createTestContext({
          userId: 'admin-123',
          roles: ['district_admin'],
        });

        const result = await accessControl.canDelete(iepFile, context);

        expect(result).toBe(true);
      });
    });

    describe('HOMEWORK_IMAGE category', () => {
      it('should allow teacher to read homework images', async () => {
        const file = createTestFile({
          ownerId: 'student-123',
          category: 'HOMEWORK_IMAGE',
        });
        const context = createTestContext({
          userId: 'teacher-456',
          roles: ['teacher'],
        });

        const result = await accessControl.canRead(file, context);

        expect(result).toBe(true);
      });

      it('should allow parent to read homework images', async () => {
        const file = createTestFile({
          ownerId: 'student-123',
          category: 'HOMEWORK_IMAGE',
        });
        const context = createTestContext({
          userId: 'parent-789',
          roles: ['parent'],
        });

        const result = await accessControl.canRead(file, context);

        expect(result).toBe(true);
      });
    });

    describe('AVATAR_IMAGE category', () => {
      it('should allow any authenticated user to read avatars (wildcard)', async () => {
        const file = createTestFile({
          ownerId: 'user-123',
          category: 'AVATAR_IMAGE',
        });
        const context = createTestContext({
          userId: 'user-456',
          roles: ['student'],
        });

        const result = await accessControl.canRead(file, context);

        expect(result).toBe(true);
      });
    });
  });

  describe('canCreateInCategory', () => {
    it('should allow student to create homework images', () => {
      const context = createTestContext({ roles: ['student'] });

      const result = accessControl.canCreateInCategory('HOMEWORK_IMAGE', context);

      expect(result.allowed).toBe(true);
    });

    it('should allow teacher to create attachments', () => {
      const context = createTestContext({ roles: ['teacher'] });

      const result = accessControl.canCreateInCategory('ATTACHMENT', context);

      expect(result.allowed).toBe(true);
    });

    it('should deny creation without tenant context', () => {
      const context = createTestContext({ tenantId: '' });

      const result = accessControl.canCreateInCategory('ATTACHMENT', context);

      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('Tenant context is required');
    });
  });

  describe('filterAccessibleFiles', () => {
    it('should filter files based on access permissions', async () => {
      const files = [
        createTestFile({ id: 'file-1', ownerId: 'user-456' }),
        createTestFile({ id: 'file-2', ownerId: 'other-user', category: 'IEP_DOCUMENT' }),
        createTestFile({ id: 'file-3', ownerId: 'other-user', category: 'ATTACHMENT' }),
      ];
      const context = createTestContext({ roles: ['student'] });

      const accessible = await accessControl.filterAccessibleFiles(
        files,
        FileOperation.READ,
        context
      );

      // Should include file-1 (owner) but not file-2 (IEP requires teacher role)
      // file-3 depends on whether student can read other's attachments
      expect(accessible.some((f) => f.id === 'file-1')).toBe(true);
      expect(accessible.some((f) => f.id === 'file-2')).toBe(false);
    });
  });

  describe('getUploadableCategories', () => {
    it('should return categories a student can upload to', () => {
      const context = createTestContext({ roles: ['student'] });

      const categories = accessControl.getUploadableCategories(context);

      expect(categories).toContain('HOMEWORK_IMAGE');
      expect(categories).toContain('ASSESSMENT_AUDIO');
      expect(categories).toContain('ASSESSMENT_VIDEO');
      expect(categories).not.toContain('IEP_DOCUMENT');
    });

    it('should return categories a teacher can upload to', () => {
      const context = createTestContext({ roles: ['teacher'] });

      const categories = accessControl.getUploadableCategories(context);

      expect(categories).toContain('IEP_DOCUMENT');
      expect(categories).toContain('ATTACHMENT');
    });
  });
});

// ============================================================================
// Helper Function Tests
// ============================================================================

describe('Helper Functions', () => {
  describe('createAccessContext', () => {
    it('should create context with all fields', () => {
      const context = createAccessContext('user-123', 'tenant-abc', ['teacher', 'admin'], [
        'read:files',
      ]);

      expect(context.userId).toBe('user-123');
      expect(context.tenantId).toBe('tenant-abc');
      expect(context.roles).toEqual(['teacher', 'admin']);
      expect(context.permissions).toEqual(['read:files']);
    });

    it('should default permissions to empty array', () => {
      const context = createAccessContext('user-123', 'tenant-abc', ['teacher']);

      expect(context.permissions).toEqual([]);
    });
  });

  describe('hasRole', () => {
    it('should return true when user has role', () => {
      const context = createTestContext({ roles: ['teacher', 'admin'] });

      expect(hasRole(context, 'teacher')).toBe(true);
    });

    it('should return false when user does not have role', () => {
      const context = createTestContext({ roles: ['student'] });

      expect(hasRole(context, 'teacher')).toBe(false);
    });
  });

  describe('hasAnyRole', () => {
    it('should return true when user has at least one role', () => {
      const context = createTestContext({ roles: ['student'] });

      expect(hasAnyRole(context, ['teacher', 'student', 'admin'])).toBe(true);
    });

    it('should return false when user has none of the roles', () => {
      const context = createTestContext({ roles: ['student'] });

      expect(hasAnyRole(context, ['teacher', 'admin'])).toBe(false);
    });
  });

  describe('hasAllRoles', () => {
    it('should return true when user has all roles', () => {
      const context = createTestContext({ roles: ['teacher', 'admin', 'reviewer'] });

      expect(hasAllRoles(context, ['teacher', 'admin'])).toBe(true);
    });

    it('should return false when user is missing a role', () => {
      const context = createTestContext({ roles: ['teacher'] });

      expect(hasAllRoles(context, ['teacher', 'admin'])).toBe(false);
    });
  });
});

// ============================================================================
// Default Policies Tests
// ============================================================================

describe('Default Policies', () => {
  it('should have default policy defined', () => {
    expect(DEFAULT_POLICY).toBeDefined();
    expect(DEFAULT_POLICY.ownerCanRead).toBe(true);
    expect(DEFAULT_POLICY.adminRoles).toContain('platform_admin');
  });

  it('should have policies for all file categories', () => {
    const expectedCategories = [
      'IEP_DOCUMENT',
      'HOMEWORK_IMAGE',
      'ASSESSMENT_AUDIO',
      'ASSESSMENT_VIDEO',
      'AVATAR_IMAGE',
      'EXPORTED_REPORT',
      'ATTACHMENT',
      'OTHER',
    ];

    for (const category of expectedCategories) {
      expect(DEFAULT_CATEGORY_POLICIES.has(category as any)).toBe(true);
    }
  });

  it('should have IEP_DOCUMENT policy with educator roles', () => {
    const policy = DEFAULT_CATEGORY_POLICIES.get('IEP_DOCUMENT' as any);

    expect(policy).toBeDefined();
    expect(policy?.readRoles).toContain('teacher');
    expect(policy?.readRoles).toContain('special_education_coordinator');
    expect(policy?.readRoles).not.toContain('student');
  });

  it('should have AVATAR_IMAGE policy with wildcard read', () => {
    const policy = DEFAULT_CATEGORY_POLICIES.get('AVATAR_IMAGE' as any);

    expect(policy).toBeDefined();
    expect(policy?.readRoles).toContain('*');
  });
});
