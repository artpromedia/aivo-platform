import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockPrisma = {
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  learner: {
    findUnique: vi.fn(),
  },
  learnerStaffAssignment: {
    findFirst: vi.fn(),
  },
  studentParent: {
    findFirst: vi.fn(),
  },
};

vi.mock('../src/prisma', () => ({ prisma: mockPrisma }));

import { verifyLearnerScope } from '../src/graphql/resolvers';

describe('GraphQL Resolvers - verifyLearnerScope', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('authorizes PLATFORM_ADMIN for any learner', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'admin-1',
      roles: [{ role: 'PLATFORM_ADMIN' }],
    });

    await expect(verifyLearnerScope('admin-1', 'learner-1')).resolves.not.toThrow();
  });

  it('authorizes SUPPORT role for any learner', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'support-1',
      roles: [{ role: 'SUPPORT' }],
    });

    await expect(verifyLearnerScope('support-1', 'learner-1')).resolves.not.toThrow();
  });

  it('authorizes DISTRICT_ADMIN if same tenant', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'district-admin-1',
      tenantId: 'tenant-1',
      roles: [{ role: 'DISTRICT_ADMIN' }],
    });
    mockPrisma.learner.findUnique.mockResolvedValue({
      id: 'learner-1',
      tenantId: 'tenant-1',
    });

    await expect(verifyLearnerScope('district-admin-1', 'learner-1')).resolves.not.toThrow();
  });

  it('rejects DISTRICT_ADMIN from different tenant', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'district-admin-1',
      tenantId: 'tenant-1',
      roles: [{ role: 'DISTRICT_ADMIN' }],
    });
    mockPrisma.learner.findUnique.mockResolvedValue({
      id: 'learner-1',
      tenantId: 'tenant-2',
    });

    await expect(verifyLearnerScope('district-admin-1', 'learner-1')).rejects.toThrow();
  });

  it('authorizes TEACHER with learner assignment', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'teacher-1',
      tenantId: 'tenant-1',
      roles: [{ role: 'TEACHER' }],
    });
    mockPrisma.learner.findUnique.mockResolvedValue({
      id: 'learner-1',
      tenantId: 'tenant-1',
    });
    mockPrisma.learnerStaffAssignment.findFirst.mockResolvedValue({ id: 'assignment-1' });

    await expect(verifyLearnerScope('teacher-1', 'learner-1')).resolves.not.toThrow();
  });

  it('authorizes PARENT with child relationship', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'parent-1',
      tenantId: 'tenant-1',
      roles: [{ role: 'PARENT' }],
    });
    mockPrisma.learner.findUnique.mockResolvedValue({
      id: 'learner-1',
      tenantId: 'tenant-1',
    });
    mockPrisma.studentParent.findFirst.mockResolvedValue({ id: 'sp-1' });

    await expect(verifyLearnerScope('parent-1', 'learner-1')).resolves.not.toThrow();
  });

  it('rejects PARENT without child relationship', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 'parent-1',
      tenantId: 'tenant-1',
      roles: [{ role: 'PARENT' }],
    });
    mockPrisma.learner.findUnique.mockResolvedValue({
      id: 'learner-1',
      tenantId: 'tenant-1',
    });
    mockPrisma.studentParent.findFirst.mockResolvedValue(null);

    await expect(verifyLearnerScope('parent-1', 'learner-1')).rejects.toThrow();
  });

  it('rejects when user is not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(verifyLearnerScope('non-existent', 'learner-1')).rejects.toThrow();
  });
});
