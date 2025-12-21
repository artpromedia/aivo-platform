/**
 * S3 Service Tests
 *
 * Tests for secure S3 presigned URL generation and file operations.
 * Uses mocked AWS SDK for unit testing.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock AWS SDK before importing the service
vi.mock('@aws-sdk/client-s3', () => {
  const mockSend = vi.fn();
  return {
    S3Client: vi.fn(() => ({
      send: mockSend,
    })),
    PutObjectCommand: vi.fn((input) => ({ ...input, _type: 'PutObjectCommand' })),
    GetObjectCommand: vi.fn((input) => ({ ...input, _type: 'GetObjectCommand' })),
    HeadObjectCommand: vi.fn((input) => ({ ...input, _type: 'HeadObjectCommand' })),
    DeleteObjectCommand: vi.fn((input) => ({ ...input, _type: 'DeleteObjectCommand' })),
    __mockSend: mockSend,
  };
});

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-url?signature=abc123'),
}));

// Import after mocking
import { S3Client, __mockSend } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  S3Service,
  S3ServiceError,
  createS3Service,
  resetS3Service,
} from '../src/services/s3.service.js';

describe('S3Service', () => {
  let s3Service: S3Service;
  const mockSend = __mockSend as ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    resetS3Service();
    s3Service = createS3Service({
      region: 'us-east-1',
      bucket: 'test-bucket',
      accessKeyId: 'test-key',
      secretAccessKey: 'test-secret',
      kmsKeyId: 'alias/test-key',
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('should generate a presigned upload URL with default options', async () => {
      const result = await s3Service.getPresignedUploadUrl('exports/test-tenant/export.json');

      expect(result).toMatchObject({
        key: 'exports/test-tenant/export.json',
        bucket: 'test-bucket',
        url: expect.stringContaining('presigned-url'),
      });
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(result.requiredHeaders).toHaveProperty('Content-Type', 'application/json');
      expect(result.requiredHeaders).toHaveProperty('x-amz-server-side-encryption', 'aws:kms');
    });

    it('should include custom content type and metadata', async () => {
      const result = await s3Service.getPresignedUploadUrl('exports/test.csv', {
        contentType: 'text/csv',
        metadata: {
          'export-id': '123',
          'tenant-id': 'tenant-456',
        },
      });

      expect(result.requiredHeaders['Content-Type']).toBe('text/csv');
      expect(getSignedUrl).toHaveBeenCalled();
    });

    it('should use custom expiry time', async () => {
      const startTime = Date.now();
      const result = await s3Service.getPresignedUploadUrl('exports/test.json', {
        expiresIn: 7200, // 2 hours
      });

      const expectedExpiry = startTime + 7200 * 1000;
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedExpiry - 1000);
      expect(result.expiresAt.getTime()).toBeLessThanOrEqual(expectedExpiry + 1000);
    });

    it('should include compliance metadata in presigned URL', async () => {
      await s3Service.getPresignedUploadUrl('exports/test.json');

      // Verify the PutObjectCommand was called with compliance metadata
      const mockGetSignedUrl = getSignedUrl as ReturnType<typeof vi.fn>;
      expect(mockGetSignedUrl).toHaveBeenCalled();
      const callArgs = mockGetSignedUrl.mock.calls[0];
      const command = callArgs[1];
      expect(command.Metadata).toMatchObject({
        'x-amz-meta-service': 'research-svc',
        'x-amz-meta-compliance': 'ferpa-coppa',
      });
    });
  });

  describe('getPresignedDownloadUrl', () => {
    beforeEach(() => {
      // Mock HeadObjectCommand to succeed (file exists)
      mockSend.mockResolvedValue({
        ContentLength: 1024,
        ContentType: 'application/json',
        LastModified: new Date(),
        ETag: '"abc123"',
      });
    });

    it('should generate a presigned download URL', async () => {
      const result = await s3Service.getPresignedDownloadUrl('exports/tenant/export.json');

      expect(result).toMatchObject({
        url: expect.stringContaining('presigned-url'),
        filename: 'export.json',
      });
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should verify file exists before generating URL', async () => {
      await s3Service.getPresignedDownloadUrl('exports/test.json');

      expect(mockSend).toHaveBeenCalledTimes(1);
      // First call should be HeadObjectCommand to verify existence
    });

    it('should throw S3ServiceError when file not found', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'NotFound',
        message: 'Not Found',
        $metadata: { httpStatusCode: 404 },
      });

      await expect(s3Service.getPresignedDownloadUrl('exports/missing.json')).rejects.toThrow(
        S3ServiceError
      );
    });

    it('should set content disposition for download', async () => {
      const result = await s3Service.getPresignedDownloadUrl('exports/report.csv');

      expect(result.filename).toBe('report.csv');
    });
  });

  describe('upload', () => {
    beforeEach(() => {
      mockSend.mockResolvedValue({});
    });

    it('should upload data directly to S3', async () => {
      const data = JSON.stringify({ test: 'data' });
      const result = await s3Service.upload('exports/test.json', data);

      expect(result).toMatchObject({
        key: 'exports/test.json',
        bucket: 'test-bucket',
        size: Buffer.byteLength(data),
      });
      expect(result.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
      expect(result.uploadedAt).toBeInstanceOf(Date);
    });

    it('should upload Buffer data', async () => {
      const data = Buffer.from('binary data');
      const result = await s3Service.upload('exports/binary.bin', data, {
        contentType: 'application/octet-stream',
      });

      expect(result.size).toBe(data.length);
      expect(mockSend).toHaveBeenCalled();
    });

    it('should calculate SHA-256 checksum', async () => {
      const data = 'test content';
      const result1 = await s3Service.upload('exports/test1.json', data);
      mockSend.mockResolvedValue({});
      const result2 = await s3Service.upload('exports/test2.json', data);

      // Same content should produce same checksum
      expect(result1.checksum).toBe(result2.checksum);
    });

    it('should include compliance metadata', async () => {
      await s3Service.upload('exports/test.json', '{}', {
        metadata: {
          'export-job-id': 'job-123',
        },
      });

      expect(mockSend).toHaveBeenCalled();
    });

    it('should throw S3ServiceError on upload failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error'));

      await expect(s3Service.upload('exports/test.json', 'data')).rejects.toThrow(S3ServiceError);
    });
  });

  describe('download', () => {
    it('should download data from S3', async () => {
      const mockData = Buffer.from('downloaded content');
      const mockStream = {
        async *[Symbol.asyncIterator]() {
          yield mockData;
        },
      };
      mockSend.mockResolvedValueOnce({ Body: mockStream });

      const result = await s3Service.download('exports/test.json');

      expect(result).toBeInstanceOf(Buffer);
      expect(result.toString()).toBe('downloaded content');
    });

    it('should throw S3ServiceError when download fails', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access denied'));

      await expect(s3Service.download('exports/test.json')).rejects.toThrow(S3ServiceError);
    });
  });

  describe('objectExists', () => {
    it('should return true when object exists', async () => {
      mockSend.mockResolvedValueOnce({
        ContentLength: 100,
      });

      const exists = await s3Service.objectExists('exports/test.json');

      expect(exists).toBe(true);
    });

    it('should return false when object does not exist', async () => {
      mockSend.mockRejectedValueOnce({
        name: 'NotFound',
        $metadata: { httpStatusCode: 404 },
      });

      const exists = await s3Service.objectExists('exports/missing.json');

      expect(exists).toBe(false);
    });

    it('should throw on other errors', async () => {
      mockSend.mockRejectedValueOnce(new Error('Network error'));

      await expect(s3Service.objectExists('exports/test.json')).rejects.toThrow(S3ServiceError);
    });
  });

  describe('getObjectMetadata', () => {
    it('should return object metadata', async () => {
      const lastModified = new Date();
      mockSend.mockResolvedValueOnce({
        ContentLength: 1024,
        ContentType: 'application/json',
        LastModified: lastModified,
        Metadata: { 'export-id': '123' },
        ETag: '"abc123"',
      });

      const metadata = await s3Service.getObjectMetadata('exports/test.json');

      expect(metadata).toMatchObject({
        key: 'exports/test.json',
        size: 1024,
        contentType: 'application/json',
        lastModified,
        metadata: { 'export-id': '123' },
        etag: 'abc123',
      });
    });
  });

  describe('deleteObject', () => {
    it('should delete object from S3', async () => {
      mockSend.mockResolvedValueOnce({});

      await expect(s3Service.deleteObject('exports/test.json')).resolves.not.toThrow();
      expect(mockSend).toHaveBeenCalled();
    });

    it('should throw S3ServiceError on delete failure', async () => {
      mockSend.mockRejectedValueOnce(new Error('Access denied'));

      await expect(s3Service.deleteObject('exports/test.json')).rejects.toThrow(S3ServiceError);
    });
  });

  describe('generateExportKey', () => {
    it('should generate a tenant-scoped key with correct format', () => {
      const key = s3Service.generateExportKey({
        tenantId: 'tenant-123',
        exportId: 'export-456',
        format: 'json',
      });

      expect(key).toMatch(
        /^exports\/tenant-123\/\d{4}\/\d{2}\/export-456\/export-export-456\.json$/
      );
    });

    it('should use custom prefix', () => {
      const key = s3Service.generateExportKey({
        tenantId: 'tenant-123',
        exportId: 'export-456',
        format: 'csv',
        prefix: 'research-exports',
      });

      expect(key).toMatch(/^research-exports\/tenant-123\//);
      expect(key).toMatch(/\.csv$/);
    });

    it('should generate correct extension for each format', () => {
      const jsonKey = s3Service.generateExportKey({
        tenantId: 't1',
        exportId: 'e1',
        format: 'json',
      });
      const csvKey = s3Service.generateExportKey({
        tenantId: 't1',
        exportId: 'e1',
        format: 'csv',
      });
      const parquetKey = s3Service.generateExportKey({
        tenantId: 't1',
        exportId: 'e1',
        format: 'parquet',
      });

      expect(jsonKey).toMatch(/\.json$/);
      expect(csvKey).toMatch(/\.csv$/);
      expect(parquetKey).toMatch(/\.parquet$/);
    });
  });

  describe('parseTenantFromKey', () => {
    it('should extract tenant ID from key', () => {
      const tenantId = s3Service.parseTenantFromKey('exports/tenant-123/2024/01/export.json');
      expect(tenantId).toBe('tenant-123');
    });

    it('should return null for invalid key format', () => {
      const tenantId = s3Service.parseTenantFromKey('invalid');
      expect(tenantId).toBeNull();
    });
  });

  describe('validateTenantKey', () => {
    it('should return true when key belongs to tenant', () => {
      const valid = s3Service.validateTenantKey(
        'exports/tenant-123/2024/01/export.json',
        'tenant-123'
      );
      expect(valid).toBe(true);
    });

    it('should return false when key belongs to different tenant', () => {
      const valid = s3Service.validateTenantKey(
        'exports/tenant-123/2024/01/export.json',
        'tenant-456'
      );
      expect(valid).toBe(false);
    });
  });
});

describe('S3ServiceError', () => {
  it('should create error with all properties', () => {
    const cause = new Error('Original error');
    const error = new S3ServiceError('Test error', 'TEST_CODE', 500, cause);

    expect(error.message).toBe('Test error');
    expect(error.code).toBe('TEST_CODE');
    expect(error.statusCode).toBe(500);
    expect(error.cause).toBe(cause);
    expect(error.name).toBe('S3ServiceError');
  });

  it('should be instanceof Error', () => {
    const error = new S3ServiceError('Test', 'CODE');
    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(S3ServiceError);
  });
});
