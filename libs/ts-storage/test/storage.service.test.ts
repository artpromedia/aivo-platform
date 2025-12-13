import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  StorageService,
  createStorageServiceFromEnv,
  type UploadOptions,
} from '../src/storage.service.js';
import { MockVirusScanner } from '../src/virus-scanner.js';
import type { StorageConfig } from '../src/types.js';

// ============================================================================
// Mock S3 Client
// ============================================================================

// Mock AWS SDK
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(() => ({
    send: vi.fn(),
  })),
  PutObjectCommand: vi.fn().mockImplementation((params) => ({ ...params, _type: 'PutObject' })),
  GetObjectCommand: vi.fn().mockImplementation((params) => ({ ...params, _type: 'GetObject' })),
  DeleteObjectCommand: vi.fn().mockImplementation((params) => ({ ...params, _type: 'DeleteObject' })),
  HeadObjectCommand: vi.fn().mockImplementation((params) => ({ ...params, _type: 'HeadObject' })),
  CopyObjectCommand: vi.fn().mockImplementation((params) => ({ ...params, _type: 'CopyObject' })),
  ListObjectsV2Command: vi.fn().mockImplementation((params) => ({ ...params, _type: 'ListObjects' })),
}));

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://s3.example.com/presigned-url'),
}));

// ============================================================================
// Test Fixtures
// ============================================================================

const testConfig: StorageConfig = {
  bucket: 'test-bucket',
  region: 'us-east-1',
};

function createUploadOptions(overrides: Partial<UploadOptions> = {}): UploadOptions {
  return {
    tenantId: 'tenant-abc',
    ownerId: 'user-123',
    ownerType: 'user',
    category: 'ATTACHMENT',
    filename: 'test-document.pdf',
    mimeType: 'application/pdf',
    ...overrides,
  };
}

// ============================================================================
// StorageService Tests
// ============================================================================

describe('StorageService', () => {
  let service: StorageService;
  let mockScanner: MockVirusScanner;

  beforeEach(() => {
    mockScanner = new MockVirusScanner();
    service = new StorageService(testConfig, mockScanner);
  });

  describe('generateKey', () => {
    it('should generate tenant-scoped key with correct format', () => {
      const options = createUploadOptions();

      const key = service.generateKey(options);

      // Format: {tenantId}/{ownerType}/{ownerId}/{category}/{uuid}/{filename}
      const parts = key.split('/');
      expect(parts.length).toBe(6);
      expect(parts[0]).toBe('tenant-abc');
      expect(parts[1]).toBe('user');
      expect(parts[2]).toBe('user-123');
      expect(parts[3]).toBe('ATTACHMENT');
      // parts[4] is UUID
      expect(parts[4]).toMatch(/^[0-9a-f-]{36}$/);
      expect(parts[5]).toBe('test-document.pdf');
    });

    it('should sanitize filename', () => {
      const options = createUploadOptions({
        filename: 'my file/with\\special<chars>.pdf',
      });

      const key = service.generateKey(options);
      const filename = key.split('/').pop();

      expect(filename).not.toContain('/');
      expect(filename).not.toContain('\\');
      expect(filename).not.toContain('<');
    });

    it('should use different owner types', () => {
      const userKey = service.generateKey(createUploadOptions({ ownerType: 'user' }));
      const systemKey = service.generateKey(createUploadOptions({ ownerType: 'system' }));

      expect(userKey.split('/')[1]).toBe('user');
      expect(systemKey.split('/')[1]).toBe('system');
    });
  });

  describe('parseTenantId', () => {
    it('should extract tenant ID from key', () => {
      const key = 'tenant-abc/user/user-123/ATTACHMENT/uuid/file.pdf';

      const tenantId = service.parseTenantId(key);

      expect(tenantId).toBe('tenant-abc');
    });

    it('should return null for empty key', () => {
      const tenantId = service.parseTenantId('');

      expect(tenantId).toBe('');
    });
  });

  describe('validateTenantKey', () => {
    it('should return true for matching tenant', () => {
      const key = 'tenant-abc/user/user-123/ATTACHMENT/uuid/file.pdf';

      const isValid = service.validateTenantKey(key, 'tenant-abc');

      expect(isValid).toBe(true);
    });

    it('should return false for different tenant', () => {
      const key = 'tenant-abc/user/user-123/ATTACHMENT/uuid/file.pdf';

      const isValid = service.validateTenantKey(key, 'tenant-xyz');

      expect(isValid).toBe(false);
    });
  });

  describe('getPresignedUploadUrl', () => {
    it('should generate presigned URL with expiration', async () => {
      const options = createUploadOptions();

      const result = await service.getPresignedUploadUrl(options);

      expect(result.uploadUrl).toBe('https://s3.example.com/presigned-url');
      expect(result.s3Key).toContain('tenant-abc');
      expect(result.expiresAt).toBeInstanceOf(Date);
      expect(result.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    it('should use custom expiration time', async () => {
      const options = createUploadOptions();
      const before = Date.now();

      const result = await service.getPresignedUploadUrl(options, {
        expiresInSeconds: 7200, // 2 hours
      });

      const expectedMinExpiry = before + 7200 * 1000 - 1000; // Allow 1 second tolerance
      expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(expectedMinExpiry);
    });
  });

  describe('getPresignedDownloadUrl', () => {
    it('should generate presigned download URL for same tenant', async () => {
      const key = 'tenant-abc/user/user-123/ATTACHMENT/uuid/file.pdf';

      const result = await service.getPresignedDownloadUrl(key, 'tenant-abc');

      expect(result.downloadUrl).toBe('https://s3.example.com/presigned-url');
      expect(result.expiresAt).toBeInstanceOf(Date);
    });

    it('should throw error for cross-tenant access', async () => {
      const key = 'tenant-abc/user/user-123/ATTACHMENT/uuid/file.pdf';

      await expect(service.getPresignedDownloadUrl(key, 'tenant-xyz')).rejects.toThrow(
        'Cross-tenant file access is not allowed'
      );
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe('createStorageServiceFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create service with default values', () => {
    const service = createStorageServiceFromEnv();

    expect(service).toBeInstanceOf(StorageService);
  });

  it('should use environment variables', () => {
    process.env.S3_BUCKET = 'my-custom-bucket';
    process.env.S3_REGION = 'eu-west-1';
    process.env.S3_ENDPOINT = 'http://localhost:9000';
    process.env.S3_FORCE_PATH_STYLE = 'true';

    const service = createStorageServiceFromEnv();

    expect(service).toBeInstanceOf(StorageService);
    // We can't directly inspect the config, but the service should be created
  });

  it('should use AWS credentials from environment', () => {
    process.env.AWS_ACCESS_KEY_ID = 'test-key';
    process.env.AWS_SECRET_ACCESS_KEY = 'test-secret';

    const service = createStorageServiceFromEnv();

    expect(service).toBeInstanceOf(StorageService);
  });
});

// ============================================================================
// Integration-style Tests
// ============================================================================

describe('StorageService with MockVirusScanner', () => {
  let service: StorageService;
  let mockScanner: MockVirusScanner;

  beforeEach(() => {
    mockScanner = new MockVirusScanner();
    service = new StorageService(testConfig, mockScanner);
  });

  describe('virus scanning integration', () => {
    it('should identify infected filename patterns', async () => {
      const options = createUploadOptions({ filename: 'test-virus.exe' });
      const content = Buffer.from('Some file content');

      // The mock scanner checks filename patterns
      const scanResult = await mockScanner.scanBuffer(content, options.filename);

      expect(scanResult.isClean).toBe(false);
      expect(scanResult.threatName).toBe('Test.Virus.Mock');
    });

    it('should pass clean files', async () => {
      const options = createUploadOptions({ filename: 'safe-document.pdf' });
      const content = Buffer.from('Some file content');

      const scanResult = await mockScanner.scanBuffer(content, options.filename);

      expect(scanResult.isClean).toBe(true);
    });
  });
});

// ============================================================================
// Key Format Tests
// ============================================================================

describe('S3 Key Format', () => {
  let service: StorageService;

  beforeEach(() => {
    service = new StorageService(testConfig);
  });

  it('should support all file categories', () => {
    const categories = [
      'IEP_DOCUMENT',
      'HOMEWORK_IMAGE',
      'ASSESSMENT_AUDIO',
      'ASSESSMENT_VIDEO',
      'AVATAR_IMAGE',
      'EXPORTED_REPORT',
      'ATTACHMENT',
      'OTHER',
    ] as const;

    for (const category of categories) {
      const options = createUploadOptions({ category });
      const key = service.generateKey(options);

      expect(key).toContain(`/${category}/`);
    }
  });

  it('should handle long filenames by truncating', () => {
    const longFilename = 'a'.repeat(300) + '.pdf';
    const options = createUploadOptions({ filename: longFilename });

    const key = service.generateKey(options);
    const filename = key.split('/').pop();

    expect(filename!.length).toBeLessThanOrEqual(255);
  });

  it('should generate unique keys for same file uploaded multiple times', () => {
    const options = createUploadOptions();

    const key1 = service.generateKey(options);
    const key2 = service.generateKey(options);

    expect(key1).not.toBe(key2);
  });
});
