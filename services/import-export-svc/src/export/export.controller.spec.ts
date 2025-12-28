// ══════════════════════════════════════════════════════════════════════════════
// EXPORT CONTROLLER INTEGRATION TESTS
// Tests for export API endpoints
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

describe('ExportController (Integration)', () => {
  let app: INestApplication;
  let exportService: ExportService;

  const mockExportService = {
    createExportJob: vi.fn(),
    getExportJob: vi.fn(),
    getExportHistory: vi.fn(),
    cancelExportJob: vi.fn(),
    getDownloadUrl: vi.fn(),
  };

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    roles: ['instructor'],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ExportController],
      providers: [
        { provide: ExportService, useValue: mockExportService },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.user = mockUser;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    exportService = moduleFixture.get<ExportService>(ExportService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /export', () => {
    it('should create export job with valid request', async () => {
      const createRequest = {
        contentId: 'content-123',
        format: 'scorm_1.2',
        options: {
          title: 'My Course',
          language: 'en',
        },
      };

      mockExportService.createExportJob.mockResolvedValue({
        id: 'job-456',
        status: 'PENDING',
        contentId: 'content-123',
        format: 'scorm_1.2',
        createdAt: new Date().toISOString(),
      });

      const response = await request(app.getHttpServer())
        .post('/export')
        .send(createRequest)
        .expect(201);

      expect(response.body).toMatchObject({
        jobId: 'job-456',
        status: 'PENDING',
      });
      expect(mockExportService.createExportJob).toHaveBeenCalledWith(
        mockUser.id,
        createRequest
      );
    });

    it('should reject invalid format', async () => {
      const createRequest = {
        contentId: 'content-123',
        format: 'invalid_format',
      };

      const response = await request(app.getHttpServer())
        .post('/export')
        .send(createRequest)
        .expect(400);

      expect(response.body.message).toContain('format');
    });

    it('should reject missing contentId', async () => {
      const createRequest = {
        format: 'scorm_1.2',
      };

      const response = await request(app.getHttpServer())
        .post('/export')
        .send(createRequest)
        .expect(400);

      expect(response.body.message).toContain('contentId');
    });

    it('should accept all valid export formats', async () => {
      const formats = ['scorm_1.2', 'scorm_2004', 'qti_2.1', 'qti_3.0', 'common_cartridge', 'xapi'];

      for (const format of formats) {
        mockExportService.createExportJob.mockResolvedValue({
          id: `job-${format}`,
          status: 'PENDING',
          format,
        });

        await request(app.getHttpServer())
          .post('/export')
          .send({ contentId: 'content-123', format })
          .expect(201);
      }
    });
  });

  describe('GET /export/jobs/:id', () => {
    it('should return job status', async () => {
      const job = {
        id: 'job-123',
        status: 'PROCESSING',
        progress: 50,
        format: 'scorm_1.2',
        contentId: 'content-123',
        createdAt: new Date().toISOString(),
      };

      mockExportService.getExportJob.mockResolvedValue(job);

      const response = await request(app.getHttpServer())
        .get('/export/jobs/job-123')
        .expect(200);

      expect(response.body).toMatchObject({
        id: 'job-123',
        status: 'PROCESSING',
        progress: 50,
      });
    });

    it('should return 404 for non-existent job', async () => {
      mockExportService.getExportJob.mockResolvedValue(null);

      await request(app.getHttpServer())
        .get('/export/jobs/invalid-job')
        .expect(404);
    });

    it('should include download URL for completed job', async () => {
      const job = {
        id: 'job-completed',
        status: 'COMPLETED',
        progress: 100,
        downloadUrl: 'https://s3.example.com/download',
        fileSize: 1024 * 1024,
        fileName: 'course.zip',
        completedAt: new Date().toISOString(),
      };

      mockExportService.getExportJob.mockResolvedValue(job);

      const response = await request(app.getHttpServer())
        .get('/export/jobs/job-completed')
        .expect(200);

      expect(response.body.downloadUrl).toBeDefined();
      expect(response.body.fileSize).toBe(1024 * 1024);
    });
  });

  describe('POST /export/jobs/:id/cancel', () => {
    it('should cancel pending job', async () => {
      mockExportService.cancelExportJob.mockResolvedValue(undefined);

      await request(app.getHttpServer())
        .post('/export/jobs/job-123/cancel')
        .expect(200);

      expect(mockExportService.cancelExportJob).toHaveBeenCalledWith(
        'job-123',
        mockUser.id
      );
    });

    it('should return error for completed job', async () => {
      mockExportService.cancelExportJob.mockRejectedValue(
        new Error('Cannot cancel completed job')
      );

      const response = await request(app.getHttpServer())
        .post('/export/jobs/completed-job/cancel')
        .expect(400);

      expect(response.body.message).toContain('cancel');
    });
  });

  describe('GET /export/jobs/:id/download', () => {
    it('should return download URL', async () => {
      mockExportService.getDownloadUrl.mockResolvedValue(
        'https://s3.example.com/presigned-download-url'
      );

      const response = await request(app.getHttpServer())
        .get('/export/jobs/job-123/download')
        .expect(200);

      expect(response.body.downloadUrl).toBe(
        'https://s3.example.com/presigned-download-url'
      );
    });

    it('should return error for incomplete job', async () => {
      mockExportService.getDownloadUrl.mockRejectedValue(
        new Error('Export not ready for download')
      );

      await request(app.getHttpServer())
        .get('/export/jobs/incomplete-job/download')
        .expect(400);
    });
  });

  describe('GET /export/history', () => {
    it('should return paginated export history', async () => {
      const history = {
        items: [
          { id: 'job-1', status: 'COMPLETED', format: 'scorm_1.2' },
          { id: 'job-2', status: 'COMPLETED', format: 'qti_2.1' },
        ],
        total: 2,
        page: 0,
        limit: 20,
      };

      mockExportService.getExportHistory.mockResolvedValue(history);

      const response = await request(app.getHttpServer())
        .get('/export/history')
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should respect pagination parameters', async () => {
      mockExportService.getExportHistory.mockResolvedValue({
        items: [],
        total: 50,
        page: 2,
        limit: 10,
      });

      await request(app.getHttpServer())
        .get('/export/history?page=2&limit=10')
        .expect(200);

      expect(mockExportService.getExportHistory).toHaveBeenCalledWith(
        mockUser.id,
        { page: 2, limit: 10 }
      );
    });

    it('should filter by format', async () => {
      mockExportService.getExportHistory.mockResolvedValue({
        items: [{ id: 'job-1', format: 'scorm_1.2' }],
        total: 1,
      });

      await request(app.getHttpServer())
        .get('/export/history?format=scorm_1.2')
        .expect(200);

      expect(mockExportService.getExportHistory).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({ format: 'scorm_1.2' })
      );
    });
  });

  describe('GET /export/formats', () => {
    it('should return available export formats', async () => {
      const response = await request(app.getHttpServer())
        .get('/export/formats')
        .expect(200);

      expect(response.body.formats).toBeDefined();
      expect(response.body.formats).toContainEqual(
        expect.objectContaining({
          id: 'scorm_1.2',
          name: expect.any(String),
        })
      );
    });

    it('should include format compatibility info', async () => {
      const response = await request(app.getHttpServer())
        .get('/export/formats?contentType=assessment')
        .expect(200);

      // QTI should be compatible with assessments
      const qtiFormat = response.body.formats.find((f: any) => f.id === 'qti_2.1');
      expect(qtiFormat?.compatible).toBe(true);
    });
  });
});
