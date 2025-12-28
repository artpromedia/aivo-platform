// ══════════════════════════════════════════════════════════════════════════════
// EXPORT SERVICE UNIT TESTS
// Tests for export orchestration, job management, and S3 integration
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ExportService } from './export.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ScormExporter } from './exporters/scorm.exporter';
import { QtiExporter } from './exporters/qti.exporter';
import { CommonCartridgeExporter } from './exporters/common-cartridge.exporter';
import { ConfigService } from '@nestjs/config';

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3');
vi.mock('@aws-sdk/s3-request-presigner');

// Mock exporters
vi.mock('./exporters/scorm.exporter');
vi.mock('./exporters/qti.exporter');
vi.mock('./exporters/common-cartridge.exporter');

describe('ExportService', () => {
  let service: ExportService;
  let prisma: PrismaService;
  let s3Client: S3Client;

  const mockPrisma = {
    exportJob: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    content: {
      findUnique: vi.fn(),
    },
    assessment: {
      findUnique: vi.fn(),
    },
  };

  const mockConfigService = {
    get: vi.fn((key: string) => {
      const config: Record<string, string> = {
        'AWS_S3_BUCKET': 'test-bucket',
        'AWS_REGION': 'us-east-1',
        'EXPORT_URL_EXPIRY': '3600',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: S3Client, useValue: new S3Client({}) },
        ScormExporter,
        QtiExporter,
        CommonCartridgeExporter,
      ],
    }).compile();

    service = module.get<ExportService>(ExportService);
    prisma = module.get<PrismaService>(PrismaService);
    s3Client = module.get<S3Client>(S3Client);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createExportJob', () => {
    it('should create a new export job', async () => {
      const userId = 'user-123';
      const request = {
        contentId: 'content-456',
        format: 'scorm_1.2' as const,
        options: { title: 'My Course' },
      };

      mockPrisma.exportJob.create.mockResolvedValue({
        id: 'job-789',
        userId,
        contentId: request.contentId,
        format: request.format,
        status: 'PENDING',
        createdAt: new Date(),
      });

      const result = await service.createExportJob(userId, request);

      expect(result.id).toBe('job-789');
      expect(result.status).toBe('PENDING');
      expect(mockPrisma.exportJob.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId,
          contentId: request.contentId,
          format: request.format,
          status: 'PENDING',
        }),
      });
    });

    it('should throw error for invalid content ID', async () => {
      const userId = 'user-123';
      const request = {
        contentId: 'invalid-id',
        format: 'scorm_1.2' as const,
      };

      mockPrisma.content.findUnique.mockResolvedValue(null);

      await expect(service.createExportJob(userId, request)).rejects.toThrow(
        'Content not found'
      );
    });
  });

  describe('processExportJob', () => {
    it('should process SCORM export job successfully', async () => {
      const job = {
        id: 'job-1',
        userId: 'user-1',
        contentId: 'content-1',
        format: 'scorm_1.2',
        status: 'PENDING',
        options: {},
      };

      const content = {
        id: 'content-1',
        title: 'Test Course',
        modules: [{ id: 'm1', title: 'Module 1', htmlContent: '<p>Content</p>' }],
      };

      mockPrisma.exportJob.findUnique.mockResolvedValue(job);
      mockPrisma.content.findUnique.mockResolvedValue(content);
      mockPrisma.exportJob.update.mockImplementation(async ({ data }) => ({
        ...job,
        ...data,
      }));

      vi.mocked(ScormExporter.prototype.export).mockResolvedValue(
        Buffer.from('scorm-package')
      );
      vi.mocked(getSignedUrl).mockResolvedValue('https://s3.example.com/download');

      await service.processExportJob(job.id);

      expect(mockPrisma.exportJob.update).toHaveBeenCalledWith({
        where: { id: job.id },
        data: expect.objectContaining({
          status: 'COMPLETED',
          downloadUrl: expect.any(String),
        }),
      });
    });

    it('should process QTI export job successfully', async () => {
      const job = {
        id: 'job-2',
        userId: 'user-1',
        contentId: 'assessment-1',
        format: 'qti_2.1',
        status: 'PENDING',
        options: {},
      };

      const assessment = {
        id: 'assessment-1',
        title: 'Math Quiz',
        questions: [
          { id: 'q1', type: 'multiple_choice', prompt: 'Q1' },
        ],
      };

      mockPrisma.exportJob.findUnique.mockResolvedValue(job);
      mockPrisma.assessment.findUnique.mockResolvedValue(assessment);
      mockPrisma.exportJob.update.mockImplementation(async ({ data }) => ({
        ...job,
        ...data,
      }));

      vi.mocked(QtiExporter.prototype.export).mockResolvedValue(
        Buffer.from('qti-package')
      );
      vi.mocked(getSignedUrl).mockResolvedValue('https://s3.example.com/download');

      await service.processExportJob(job.id);

      expect(QtiExporter.prototype.export).toHaveBeenCalled();
      expect(mockPrisma.exportJob.update).toHaveBeenCalledWith({
        where: { id: job.id },
        data: expect.objectContaining({
          status: 'COMPLETED',
        }),
      });
    });

    it('should handle export errors gracefully', async () => {
      const job = {
        id: 'job-3',
        userId: 'user-1',
        contentId: 'content-1',
        format: 'scorm_1.2',
        status: 'PENDING',
      };

      mockPrisma.exportJob.findUnique.mockResolvedValue(job);
      mockPrisma.content.findUnique.mockResolvedValue({
        id: 'content-1',
        title: 'Test',
      });
      mockPrisma.exportJob.update.mockImplementation(async ({ data }) => ({
        ...job,
        ...data,
      }));

      vi.mocked(ScormExporter.prototype.export).mockRejectedValue(
        new Error('Export failed')
      );

      await service.processExportJob(job.id);

      expect(mockPrisma.exportJob.update).toHaveBeenCalledWith({
        where: { id: job.id },
        data: expect.objectContaining({
          status: 'FAILED',
          errorMessage: 'Export failed',
        }),
      });
    });

    it('should update progress during processing', async () => {
      const job = {
        id: 'job-4',
        userId: 'user-1',
        contentId: 'content-1',
        format: 'common_cartridge',
        status: 'PENDING',
      };

      const content = {
        id: 'content-1',
        title: 'Big Course',
        modules: Array.from({ length: 10 }, (_, i) => ({
          id: `m${i}`,
          title: `Module ${i}`,
        })),
      };

      mockPrisma.exportJob.findUnique.mockResolvedValue(job);
      mockPrisma.content.findUnique.mockResolvedValue(content);
      mockPrisma.exportJob.update.mockImplementation(async ({ data }) => ({
        ...job,
        ...data,
      }));

      vi.mocked(CommonCartridgeExporter.prototype.export).mockResolvedValue(
        Buffer.from('cc-package')
      );
      vi.mocked(getSignedUrl).mockResolvedValue('https://s3.example.com/download');

      await service.processExportJob(job.id);

      // Progress should have been updated during processing
      const progressUpdates = mockPrisma.exportJob.update.mock.calls.filter(
        (call: any) => call[0].data.progress !== undefined
      );
      expect(progressUpdates.length).toBeGreaterThan(0);
    });
  });

  describe('getExportJob', () => {
    it('should return job with status', async () => {
      const job = {
        id: 'job-5',
        userId: 'user-1',
        contentId: 'content-1',
        format: 'scorm_1.2',
        status: 'COMPLETED',
        downloadUrl: 'https://s3.example.com/download',
        fileSize: 1024,
        createdAt: new Date(),
        completedAt: new Date(),
      };

      mockPrisma.exportJob.findUnique.mockResolvedValue(job);

      const result = await service.getExportJob('job-5', 'user-1');

      expect(result).toEqual(job);
    });

    it('should return null for non-existent job', async () => {
      mockPrisma.exportJob.findUnique.mockResolvedValue(null);

      const result = await service.getExportJob('invalid-job', 'user-1');

      expect(result).toBeNull();
    });

    it('should not return job for different user', async () => {
      const job = {
        id: 'job-6',
        userId: 'user-1',
        status: 'COMPLETED',
      };

      mockPrisma.exportJob.findUnique.mockResolvedValue(job);

      const result = await service.getExportJob('job-6', 'user-2');

      expect(result).toBeNull();
    });
  });

  describe('getExportHistory', () => {
    it('should return paginated export history', async () => {
      const jobs = [
        { id: 'job-1', status: 'COMPLETED', createdAt: new Date() },
        { id: 'job-2', status: 'COMPLETED', createdAt: new Date() },
      ];

      mockPrisma.exportJob.findMany.mockResolvedValue(jobs);

      const result = await service.getExportHistory('user-1', { page: 0, limit: 20 });

      expect(result.items).toEqual(jobs);
      expect(mockPrisma.exportJob.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20,
      });
    });
  });

  describe('cancelExportJob', () => {
    it('should cancel a pending job', async () => {
      const job = {
        id: 'job-7',
        userId: 'user-1',
        status: 'PENDING',
      };

      mockPrisma.exportJob.findUnique.mockResolvedValue(job);
      mockPrisma.exportJob.update.mockResolvedValue({
        ...job,
        status: 'CANCELLED',
      });

      await service.cancelExportJob('job-7', 'user-1');

      expect(mockPrisma.exportJob.update).toHaveBeenCalledWith({
        where: { id: 'job-7' },
        data: { status: 'CANCELLED' },
      });
    });

    it('should not cancel a completed job', async () => {
      const job = {
        id: 'job-8',
        userId: 'user-1',
        status: 'COMPLETED',
      };

      mockPrisma.exportJob.findUnique.mockResolvedValue(job);

      await expect(
        service.cancelExportJob('job-8', 'user-1')
      ).rejects.toThrow('Cannot cancel completed job');
    });
  });

  describe('uploadToS3', () => {
    it('should upload package to S3 and return URL', async () => {
      const buffer = Buffer.from('package-content');
      const jobId = 'job-9';

      vi.mocked(getSignedUrl).mockResolvedValue(
        'https://test-bucket.s3.amazonaws.com/exports/job-9/package.zip'
      );

      const result = await service['uploadToS3'](buffer, jobId, 'package.zip');

      expect(result).toContain('job-9');
      expect(result).toContain('package.zip');
    });
  });

  describe('getDownloadUrl', () => {
    it('should generate presigned URL for download', async () => {
      const job = {
        id: 'job-10',
        userId: 'user-1',
        status: 'COMPLETED',
        s3Key: 'exports/job-10/course.zip',
      };

      mockPrisma.exportJob.findUnique.mockResolvedValue(job);
      vi.mocked(getSignedUrl).mockResolvedValue(
        'https://s3.example.com/presigned-url'
      );

      const result = await service.getDownloadUrl('job-10', 'user-1');

      expect(result).toBe('https://s3.example.com/presigned-url');
    });

    it('should throw error for incomplete job', async () => {
      const job = {
        id: 'job-11',
        userId: 'user-1',
        status: 'PROCESSING',
      };

      mockPrisma.exportJob.findUnique.mockResolvedValue(job);

      await expect(
        service.getDownloadUrl('job-11', 'user-1')
      ).rejects.toThrow('Export not ready for download');
    });
  });

  describe('format detection', () => {
    it('should select correct exporter for SCORM 1.2', async () => {
      const exporter = service['getExporter']('scorm_1.2');
      expect(exporter).toBeInstanceOf(ScormExporter);
    });

    it('should select correct exporter for SCORM 2004', async () => {
      const exporter = service['getExporter']('scorm_2004');
      expect(exporter).toBeInstanceOf(ScormExporter);
    });

    it('should select correct exporter for QTI', async () => {
      const exporter = service['getExporter']('qti_2.1');
      expect(exporter).toBeInstanceOf(QtiExporter);
    });

    it('should select correct exporter for Common Cartridge', async () => {
      const exporter = service['getExporter']('common_cartridge');
      expect(exporter).toBeInstanceOf(CommonCartridgeExporter);
    });

    it('should throw error for unknown format', () => {
      expect(() => service['getExporter']('unknown' as any)).toThrow(
        'Unsupported export format'
      );
    });
  });
});
