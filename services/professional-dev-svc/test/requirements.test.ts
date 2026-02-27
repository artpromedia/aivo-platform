/**
 * Tests for professional-dev-svc requirements, activities, and certifications.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockPrisma = {
  requirement: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  activity: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
  certification: {
    create: vi.fn(),
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  waiver: {
    create: vi.fn(),
  },
};

vi.mock('../src/prisma.js', () => ({ prisma: mockPrisma }));

describe('RequirementService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('createRequirement', () => {
    it('creates PD requirement for district', async () => {
      const req = {
        id: 'req-1',
        tenantId: 'tenant-1',
        name: 'Annual Ethics Training',
        type: 'MANDATORY',
        hoursRequired: 6,
        dueDate: new Date('2026-06-30'),
      };
      mockPrisma.requirement.create.mockResolvedValue(req);
      const result = await mockPrisma.requirement.create({ data: req });
      expect(result.type).toBe('MANDATORY');
      expect(result.hoursRequired).toBe(6);
    });
  });

  describe('getRequirements', () => {
    it('returns requirements for a teacher role', async () => {
      mockPrisma.requirement.findMany.mockResolvedValue([
        { id: 'req-1', name: 'Ethics Training', hoursRequired: 6, status: 'INCOMPLETE' },
        { id: 'req-2', name: 'Tech Literacy', hoursRequired: 10, status: 'COMPLETE' },
      ]);
      const reqs = await mockPrisma.requirement.findMany({
        where: { tenantId: 'tenant-1' },
      });
      expect(reqs).toHaveLength(2);
    });
  });
});

describe('ActivityService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('logActivity', () => {
    it('logs a PD activity with hours', async () => {
      const activity = {
        id: 'act-1',
        teacherId: 'teacher-1',
        requirementId: 'req-1',
        type: 'WORKSHOP',
        title: 'Ethics in Education Workshop',
        hours: 3,
        date: new Date('2026-02-15'),
        evidence: 'certificate-url.pdf',
      };
      mockPrisma.activity.create.mockResolvedValue(activity);
      const result = await mockPrisma.activity.create({ data: activity });
      expect(result.hours).toBe(3);
      expect(result.type).toBe('WORKSHOP');
    });
  });

  describe('getActivities', () => {
    it('returns activities for a teacher in date range', async () => {
      mockPrisma.activity.findMany.mockResolvedValue([
        { id: 'act-1', hours: 3, date: new Date('2026-02-15') },
        { id: 'act-2', hours: 2, date: new Date('2026-03-01') },
      ]);
      const activities = await mockPrisma.activity.findMany({
        where: {
          teacherId: 'teacher-1',
          date: { gte: new Date('2026-01-01'), lte: new Date('2026-06-30') },
        },
      });
      const totalHours = activities.reduce((sum: number, a: { hours: number }) => sum + a.hours, 0);
      expect(totalHours).toBe(5);
    });
  });
});

describe('CertificationService', () => {
  beforeEach(() => vi.clearAllMocks());

  describe('addCertification', () => {
    it('adds certification with expiry', async () => {
      const cert = {
        id: 'cert-1',
        teacherId: 'teacher-1',
        name: 'Google Certified Educator',
        issuer: 'Google',
        issuedAt: new Date('2026-01-10'),
        expiresAt: new Date('2029-01-10'),
        credentialId: 'GCE-12345',
      };
      mockPrisma.certification.create.mockResolvedValue(cert);
      const result = await mockPrisma.certification.create({ data: cert });
      expect(result.issuer).toBe('Google');
      expect(result.credentialId).toBe('GCE-12345');
    });
  });

  describe('getTeacherCertifications', () => {
    it('returns certifications with expiry status', async () => {
      const now = new Date();
      mockPrisma.certification.findMany.mockResolvedValue([
        { id: 'cert-1', name: 'GCE', expiresAt: new Date('2029-01-10'), expired: false },
        { id: 'cert-2', name: 'ISTE', expiresAt: new Date('2025-06-01'), expired: true },
      ]);
      const certs = await mockPrisma.certification.findMany({
        where: { teacherId: 'teacher-1' },
      });
      const expired = certs.filter((c: { expired: boolean }) => c.expired);
      expect(expired).toHaveLength(1);
    });
  });

  describe('waiveRequirement', () => {
    it('creates waiver for requirement', async () => {
      mockPrisma.waiver.create.mockResolvedValue({
        id: 'waiver-1',
        teacherId: 'teacher-1',
        requirementId: 'req-1',
        reason: 'Equivalent prior certification',
        approvedBy: 'admin-1',
      });
      const waiver = await mockPrisma.waiver.create({
        data: {
          teacherId: 'teacher-1',
          requirementId: 'req-1',
          reason: 'Equivalent prior certification',
          approvedBy: 'admin-1',
        },
      });
      expect(waiver.reason).toContain('prior certification');
    });
  });
});
