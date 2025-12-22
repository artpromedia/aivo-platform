/**
 * Export Routes Tests
 *
 * Tests for research export API endpoints including presigned URL generation.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the S3 service
vi.mock('../src/services/s3.service.js', () => ({
  getS3Service: vi.fn(() => ({
    getPresignedDownloadUrl: vi.fn().mockResolvedValue({
      url: 'https://s3.example.com/presigned-download-url',
      expiresAt: new Date(Date.now() + 3600 * 1000),
      filename: 'export-123.csv',
    }),
    upload: vi.fn().mockResolvedValue({
      key: 'exports/tenant/export.json',
      bucket: 'test-bucket',
      size: 1024,
      checksum: 'abc123def456',
      uploadedAt: new Date(),
    }),
    generateExportKey: vi.fn().mockReturnValue('exports/tenant/2024/01/export-123/export.json'),
  })),
  S3ServiceError: class S3ServiceError extends Error {
    constructor(
      message: string,
      public readonly code: string,
      public readonly statusCode?: number
    ) {
      super(message);
      this.name = 'S3ServiceError';
    }
  },
}));

// Mock the export service
vi.mock('../src/services/exportService.js', () => ({
  createExportJob: vi.fn(),
  getExportJob: vi.fn(),
  getUserExportJobs: vi.fn(),
  getProjectExportJobs: vi.fn(),
  recordDownload: vi.fn(),
}));

// Mock the audit service
vi.mock('../src/services/auditService.js', () => ({
  recordAuditLog: vi.fn(),
}));

import Fastify from 'fastify';
import { exportRoutes } from '../src/routes/exports.js';
import { getExportJob, recordDownload } from '../src/services/exportService.js';
import { getS3Service, S3ServiceError } from '../src/services/s3.service.js';

describe('Export Routes', () => {
  let app: ReturnType<typeof Fastify>;
  const mockGetExportJob = getExportJob as ReturnType<typeof vi.fn>;
  const mockRecordDownload = recordDownload as ReturnType<typeof vi.fn>;
  const mockGetS3Service = getS3Service as ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();

    app = Fastify();

    // Add mock user to request
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (request: { user: { sub: string; email: string; tenantId: string } | null }) => {
      request.user = {
        sub: 'user-123',
        email: 'researcher@example.com',
        tenantId: 'tenant-456',
      };
    });

    await app.register(exportRoutes, { prefix: '/research' });
    await app.ready();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /research/exports/:id/download', () => {
    it('should return presigned download URL for completed export', async () => {
      mockGetExportJob.mockResolvedValueOnce({
        id: 'export-123',
        status: 'SUCCEEDED',
        storagePath: 'exports/tenant-456/2024/01/export-123/export.csv',
        storageExpiresAt: new Date(Date.now() + 86400 * 1000), // Tomorrow
        format: 'CSV',
        tenantId: 'tenant-456',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/research/exports/export-123/download',
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toMatchObject({
        url: expect.stringContaining('presigned-download-url'),
        expiresIn: 3600,
        filename: 'export-export-123.csv',
      });
      expect(body.expiresAt).toBeDefined();
    });

    it('should record download in audit log', async () => {
      mockGetExportJob.mockResolvedValueOnce({
        id: 'export-123',
        status: 'SUCCEEDED',
        storagePath: 'exports/tenant-456/export.csv',
        storageExpiresAt: new Date(Date.now() + 86400 * 1000),
        format: 'CSV',
        tenantId: 'tenant-456',
      });

      await app.inject({
        method: 'GET',
        url: '/research/exports/export-123/download',
      });

      expect(mockRecordDownload).toHaveBeenCalledWith(
        'export-123',
        'user-123',
        expect.objectContaining({
          tenantId: 'tenant-456',
          userId: 'user-123',
          userEmail: 'researcher@example.com',
        })
      );
    });

    it('should return 404 when export not found', async () => {
      mockGetExportJob.mockResolvedValueOnce(null);

      const response = await app.inject({
        method: 'GET',
        url: '/research/exports/missing-export/download',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Export job not found',
      });
    });

    it('should return 400 when export not completed', async () => {
      mockGetExportJob.mockResolvedValueOnce({
        id: 'export-123',
        status: 'RUNNING',
        tenantId: 'tenant-456',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/research/exports/export-123/download',
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Export not ready for download',
        status: 'RUNNING',
      });
    });

    it('should return 410 when export has expired', async () => {
      mockGetExportJob.mockResolvedValueOnce({
        id: 'export-123',
        status: 'SUCCEEDED',
        storagePath: 'exports/tenant-456/export.csv',
        storageExpiresAt: new Date(Date.now() - 86400 * 1000), // Yesterday
        format: 'CSV',
        tenantId: 'tenant-456',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/research/exports/export-123/download',
      });

      expect(response.statusCode).toBe(410);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Export has expired',
      });
    });

    it('should return 500 when storage path is missing', async () => {
      mockGetExportJob.mockResolvedValueOnce({
        id: 'export-123',
        status: 'SUCCEEDED',
        storagePath: null,
        format: 'CSV',
        tenantId: 'tenant-456',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/research/exports/export-123/download',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Export file path missing',
      });
    });

    it('should handle S3 NOT_FOUND error gracefully', async () => {
      mockGetExportJob.mockResolvedValueOnce({
        id: 'export-123',
        status: 'SUCCEEDED',
        storagePath: 'exports/tenant-456/export.csv',
        storageExpiresAt: new Date(Date.now() + 86400 * 1000),
        format: 'CSV',
        tenantId: 'tenant-456',
      });

      // Mock S3 service to throw NOT_FOUND error
      const mockS3 = mockGetS3Service();
      mockS3.getPresignedDownloadUrl.mockRejectedValueOnce(
        new S3ServiceError('Object not found', 'NOT_FOUND', 404)
      );

      const response = await app.inject({
        method: 'GET',
        url: '/research/exports/export-123/download',
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Export file not found in storage',
      });
    });

    it('should handle S3 errors gracefully', async () => {
      mockGetExportJob.mockResolvedValueOnce({
        id: 'export-123',
        status: 'SUCCEEDED',
        storagePath: 'exports/tenant-456/export.csv',
        storageExpiresAt: new Date(Date.now() + 86400 * 1000),
        format: 'CSV',
        tenantId: 'tenant-456',
      });

      // Mock S3 service to throw generic error
      const mockS3 = mockGetS3Service();
      mockS3.getPresignedDownloadUrl.mockRejectedValueOnce(
        new S3ServiceError('Access denied', 'ACCESS_DENIED', 403)
      );

      const response = await app.inject({
        method: 'GET',
        url: '/research/exports/export-123/download',
      });

      expect(response.statusCode).toBe(500);
      expect(JSON.parse(response.body)).toMatchObject({
        error: 'Failed to generate download URL',
        code: 'ACCESS_DENIED',
      });
    });

    it('should parse s3:// URL format correctly', async () => {
      mockGetExportJob.mockResolvedValueOnce({
        id: 'export-123',
        status: 'SUCCEEDED',
        storagePath: 's3://aivo-research-exports/exports/tenant/export.csv',
        storageExpiresAt: new Date(Date.now() + 86400 * 1000),
        format: 'CSV',
        tenantId: 'tenant-456',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/research/exports/export-123/download',
      });

      expect(response.statusCode).toBe(200);
      // Verify the S3 service was called with the extracted key
      const mockS3 = mockGetS3Service();
      expect(mockS3.getPresignedDownloadUrl).toHaveBeenCalledWith(
        'exports/tenant/export.csv',
        expect.any(Object)
      );
    });
  });

  describe('Security considerations', () => {
    it('should include user context in audit logs', async () => {
      mockGetExportJob.mockResolvedValueOnce({
        id: 'export-123',
        status: 'SUCCEEDED',
        storagePath: 'exports/tenant-456/export.csv',
        storageExpiresAt: new Date(Date.now() + 86400 * 1000),
        format: 'CSV',
        tenantId: 'tenant-456',
      });

      await app.inject({
        method: 'GET',
        url: '/research/exports/export-123/download',
        headers: {
          'user-agent': 'TestClient/1.0',
        },
      });

      expect(mockRecordDownload).toHaveBeenCalledWith(
        'export-123',
        'user-123',
        expect.objectContaining({
          userAgent: 'TestClient/1.0',
        })
      );
    });

    it('should validate tenant ID from request user', async () => {
      mockGetExportJob.mockResolvedValueOnce({
        id: 'export-123',
        status: 'SUCCEEDED',
        storagePath: 'exports/tenant-456/export.csv',
        storageExpiresAt: new Date(Date.now() + 86400 * 1000),
        format: 'CSV',
        tenantId: 'tenant-456',
      });

      await app.inject({
        method: 'GET',
        url: '/research/exports/export-123/download',
      });

      // getExportJob should be called with tenantId for tenant isolation
      expect(mockGetExportJob).toHaveBeenCalledWith('export-123', 'tenant-456');
    });
  });
});
