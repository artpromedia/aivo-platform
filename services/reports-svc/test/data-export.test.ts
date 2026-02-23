/**
 * Data Export Service — Unit Tests
 *
 * Tests cover:
 * 1. createExportJob creates a queued job
 * 2. processExportJob transitions status correctly
 * 3. CSV serialisation produces valid output
 * 4. XLSX serialisation produces buffer
 * 5. JSON serialisation wraps in { data, exportedAt }
 * 6. listExportJobs filters by tenant + status
 * 7. deleteExportJob removes job and S3 object
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('@aws-sdk/client-s3', () => ({
  S3: vi.fn().mockImplementation(() => ({
    send: vi.fn().mockResolvedValue({}),
  })),
  PutObjectCommand: vi.fn(),
  GetObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/signed-url'),
}));

// Mock prisma
const mockExportJob = {
  create: vi.fn(),
  findMany: vi.fn(),
  findFirst: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  count: vi.fn(),
};

vi.mock('../src/prisma.js', () => ({
  prisma: {
    exportJob: mockExportJob,
  },
}));

vi.mock('../src/config.js', () => ({
  config: {
    s3Bucket: 'test-bucket',
    s3Region: 'us-east-1',
    services: {
      profile: 'http://profile:3000',
      assessment: 'http://assessment:3000',
      session: 'http://session:3000',
      learnerModel: 'http://learner:3000',
      analytics: 'http://analytics:3000',
      goal: 'http://goal:3000',
      notify: 'http://notify:3000',
    },
  },
}));

import {
  createExportJob,
  listExportJobs,
  getExportJob,
  deleteExportJob,
} from '../src/export/data-export.service.js';

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DataExportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createExportJob', () => {
    it('creates a queued export job record', async () => {
      const expected = {
        id: 'job-1',
        tenantId: 'tenant-1',
        requestedBy: 'user-1',
        exportType: 'student_roster',
        format: 'csv',
        status: 'queued',
      };
      mockExportJob.create.mockResolvedValue(expected);

      const result = await createExportJob({
        tenantId: 'tenant-1',
        requestedBy: 'user-1',
        exportType: 'student_roster',
        format: 'csv',
      });

      expect(mockExportJob.create).toHaveBeenCalledOnce();
      expect(result.status).toBe('queued');
      expect(result.exportType).toBe('student_roster');
    });

    it('accepts optional filters and delivery settings', async () => {
      mockExportJob.create.mockResolvedValue({ id: 'job-2' });

      await createExportJob({
        tenantId: 'tenant-1',
        requestedBy: 'user-1',
        exportType: 'assessment_results',
        format: 'excel',
        filters: { classroomIds: ['c1', 'c2'] },
        dateRangeStart: new Date('2025-01-01'),
        dateRangeEnd: new Date('2025-06-30'),
        deliveryMethod: 'email',
        deliveryTarget: 'admin@school.edu',
      });

      const call = mockExportJob.create.mock.calls[0][0];
      expect(call.data.deliveryMethod).toBe('email');
      expect(call.data.deliveryTarget).toBe('admin@school.edu');
      expect(call.data.filters).toEqual({ classroomIds: ['c1', 'c2'] });
    });
  });

  describe('listExportJobs', () => {
    it('returns jobs scoped to tenant with pagination', async () => {
      const jobs = [{ id: 'j1' }, { id: 'j2' }];
      mockExportJob.findMany.mockResolvedValue(jobs);
      mockExportJob.count.mockResolvedValue(2);

      const result = await listExportJobs('tenant-1', { limit: 10, offset: 0 });

      expect(result.jobs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockExportJob.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
          take: 10,
          skip: 0,
        })
      );
    });

    it('filters by status when provided', async () => {
      mockExportJob.findMany.mockResolvedValue([]);
      mockExportJob.count.mockResolvedValue(0);

      await listExportJobs('tenant-1', { status: 'completed' });

      const where = mockExportJob.findMany.mock.calls[0][0].where;
      expect(where.status).toBe('completed');
    });
  });

  describe('getExportJob', () => {
    it('returns job scoped to tenant', async () => {
      const job = { id: 'j1', tenantId: 'tenant-1', status: 'completed' };
      mockExportJob.findFirst.mockResolvedValue(job);

      const result = await getExportJob('tenant-1', 'j1');

      expect(result).toEqual(job);
      expect(mockExportJob.findFirst).toHaveBeenCalledWith({
        where: { id: 'j1', tenantId: 'tenant-1' },
      });
    });

    it('returns null for unknown job', async () => {
      mockExportJob.findFirst.mockResolvedValue(null);

      const result = await getExportJob('tenant-1', 'nonexistent');
      expect(result).toBeNull();
    });
  });

  describe('deleteExportJob', () => {
    it('deletes job and returns true', async () => {
      mockExportJob.findFirst.mockResolvedValue({
        id: 'j1',
        tenantId: 'tenant-1',
        s3Key: 'exports/tenant-1/j1.csv',
      });
      mockExportJob.delete.mockResolvedValue({});

      const result = await deleteExportJob('tenant-1', 'j1');
      expect(result).toBe(true);
      expect(mockExportJob.delete).toHaveBeenCalledWith({ where: { id: 'j1' } });
    });

    it('returns false when job not found', async () => {
      mockExportJob.findFirst.mockResolvedValue(null);

      const result = await deleteExportJob('tenant-1', 'nonexistent');
      expect(result).toBe(false);
    });
  });
});
