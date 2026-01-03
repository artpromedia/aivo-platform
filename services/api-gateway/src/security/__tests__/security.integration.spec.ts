/**
 * Security Module Integration Tests
 * Tests for security guards, services, and middleware
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ExecutionContext } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as request from 'supertest';

import { SecurityModule } from '../security.module';
import { EncryptionService } from '../services/encryption.service';
import { HashingService } from '../services/hashing.service';
import { TokenService } from '../services/token.service';
import { PIIDetectionService } from '../services/pii-detection.service';
import { DataMaskingService } from '../services/data-masking.service';
import { DataClassificationService } from '../services/data-classification.service';

describe('Security Module Integration', () => {
  let app: INestApplication;
  let encryptionService: EncryptionService;
  let hashingService: HashingService;
  let tokenService: TokenService;
  let piiDetectionService: PIIDetectionService;
  let dataMaskingService: DataMaskingService;
  let dataClassificationService: DataClassificationService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        SecurityModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    encryptionService = moduleFixture.get<EncryptionService>(EncryptionService);
    hashingService = moduleFixture.get<HashingService>(HashingService);
    tokenService = moduleFixture.get<TokenService>(TokenService);
    piiDetectionService = moduleFixture.get<PIIDetectionService>(PIIDetectionService);
    dataMaskingService = moduleFixture.get<DataMaskingService>(DataMaskingService);
    dataClassificationService = moduleFixture.get<DataClassificationService>(DataClassificationService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('EncryptionService', () => {
    it('should encrypt and decrypt data correctly', async () => {
      const plaintext = 'sensitive student data';
      const context = { tenantId: 'tenant-123', purpose: 'test' };

      const encrypted = await encryptionService.encrypt(plaintext, context);
      expect(encrypted).toHaveProperty('ciphertext');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('tag');
      expect(encrypted.ciphertext).not.toBe(plaintext);

      const decrypted = await encryptionService.decrypt(encrypted, context);
      expect(decrypted).toBe(plaintext);
    });

    it('should produce different ciphertexts for same plaintext', async () => {
      const plaintext = 'test data';
      const context = { tenantId: 'tenant-123' };

      const encrypted1 = await encryptionService.encrypt(plaintext, context);
      const encrypted2 = await encryptionService.encrypt(plaintext, context);

      expect(encrypted1.ciphertext).not.toBe(encrypted2.ciphertext);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
    });
  });

  describe('HashingService', () => {
    it('should hash and verify passwords correctly', async () => {
      const password = 'SecureP@ssw0rd123!';

      const hash = await hashingService.hashPassword(password);
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);

      const isValid = await hashingService.verifyPassword(password, hash);
      expect(isValid).toBe(true);

      const isInvalid = await hashingService.verifyPassword('wrongpassword', hash);
      expect(isInvalid).toBe(false);
    });

    it('should produce different hashes for same password', async () => {
      const password = 'TestPassword123!';

      const hash1 = await hashingService.hashPassword(password);
      const hash2 = await hashingService.hashPassword(password);

      expect(hash1).not.toBe(hash2);

      // Both should still verify correctly
      expect(await hashingService.verifyPassword(password, hash1)).toBe(true);
      expect(await hashingService.verifyPassword(password, hash2)).toBe(true);
    });
  });

  describe('PIIDetectionService', () => {
    it('should detect SSN patterns', () => {
      const text = 'My SSN is 123-45-6789';
      const matches = piiDetectionService.detectPII(text);

      expect(matches.length).toBe(1);
      expect(matches[0].type).toBe('ssn');
      expect(matches[0].value).toBe('123-45-6789');
    });

    it('should detect email addresses', () => {
      const text = 'Contact me at john.doe@school.edu';
      const matches = piiDetectionService.detectPII(text);

      expect(matches.length).toBe(1);
      expect(matches[0].type).toBe('email');
      expect(matches[0].value).toBe('john.doe@school.edu');
    });

    it('should detect phone numbers', () => {
      const text = 'Call me at (555) 123-4567';
      const matches = piiDetectionService.detectPII(text);

      expect(matches.length).toBe(1);
      expect(matches[0].type).toBe('phone');
    });

    it('should detect multiple PII types', () => {
      const text = 'SSN: 123-45-6789, Email: test@test.com, Phone: 555-123-4567';
      const matches = piiDetectionService.detectPII(text);

      expect(matches.length).toBe(3);
      const types = matches.map(m => m.type);
      expect(types).toContain('ssn');
      expect(types).toContain('email');
      expect(types).toContain('phone');
    });

    it('should validate SSN correctly', () => {
      // Invalid SSNs should not match
      const invalidTexts = [
        '000-12-3456', // Area cannot be 000
        '666-12-3456', // Area cannot be 666
        '123-00-4567', // Group cannot be 00
        '123-45-0000', // Serial cannot be 0000
      ];

      for (const text of invalidTexts) {
        const matches = piiDetectionService.detectPII(text);
        expect(matches.filter(m => m.type === 'ssn').length).toBe(0);
      }
    });
  });

  describe('DataMaskingService', () => {
    it('should mask email addresses', () => {
      const email = 'john.doe@school.edu';
      const masked = dataMaskingService.maskEmail(email);

      expect(masked).not.toBe(email);
      expect(masked).toContain('@school.edu');
      expect(masked).toContain('*');
    });

    it('should mask phone numbers', () => {
      const phone = '555-123-4567';
      const masked = dataMaskingService.maskPhone(phone);

      expect(masked).not.toBe(phone);
      expect(masked).toContain('4567'); // Last 4 digits visible
      expect(masked).toContain('*');
    });

    it('should mask SSN completely', () => {
      const ssn = '123-45-6789';
      const masked = dataMaskingService.maskSSN(ssn);

      expect(masked).toBe('***-**-****');
    });

    it('should mask objects recursively', () => {
      const data = {
        name: 'John Doe',
        email: 'john@test.com',
        password: 'secret123',
        nested: {
          ssn: '123-45-6789',
        },
      };

      const masked = dataMaskingService.maskObject(data);

      expect(masked.email).not.toBe('john@test.com');
      expect(masked.password).not.toBe('secret123');
      expect(masked.nested.ssn).not.toBe('123-45-6789');
    });
  });

  describe('DataClassificationService', () => {
    it('should classify restricted fields correctly', () => {
      const data = {
        grades: [95, 87, 92],
        gpa: 3.8,
        studentId: 'STU123',
      };

      const result = dataClassificationService.classifyData(data);

      expect(result.classification).toBe('restricted');
      expect(result.educationalRecord).toBe(true);
      expect(result.requiresEncryption).toBe(true);
      expect(result.regulations).toContain('FERPA');
    });

    it('should classify confidential PII correctly', () => {
      const data = {
        name: 'John Doe',
        ssn: '123-45-6789',
        email: 'john@test.com',
      };

      const result = dataClassificationService.classifyData(data);

      expect(result.classification).toBe('confidential');
      expect(result.piiDetected).toBe(true);
      expect(result.requiresEncryption).toBe(true);
    });

    it('should identify child data for COPPA', () => {
      const data = {
        name: 'Young Student',
        age: 10,
        gradeLevel: 4,
      };

      const result = dataClassificationService.classifyData(data);

      expect(result.regulations).toContain('COPPA');
    });

    it('should classify public data correctly', () => {
      const data = {
        schoolName: 'Test School',
        address: '123 Main St',
        publicInfo: 'General information',
      };

      const result = dataClassificationService.classifyData(data);

      // Address is PII, so should be at least internal
      expect(['internal', 'confidential'].includes(result.classification)).toBe(true);
    });
  });
});

describe('TokenService', () => {
  let tokenService: TokenService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        SecurityModule,
      ],
    }).compile();

    tokenService = moduleFixture.get<TokenService>(TokenService);
  });

  it('should generate valid access tokens', async () => {
    const payload = {
      userId: 'user-123',
      email: 'test@test.com',
      tenantId: 'tenant-123',
      roles: ['teacher'],
      permissions: ['read:students', 'write:grades'],
      sessionId: 'session-123',
    };

    const tokens = await tokenService.generateTokens(payload);

    expect(tokens).toHaveProperty('accessToken');
    expect(tokens).toHaveProperty('refreshToken');
    expect(tokens).toHaveProperty('expiresIn');
    expect(tokens.tokenType).toBe('Bearer');
  });

  it('should validate access tokens correctly', async () => {
    const payload = {
      userId: 'user-123',
      email: 'test@test.com',
      tenantId: 'tenant-123',
      roles: ['teacher'],
      permissions: ['read:students'],
      sessionId: 'session-123',
    };

    const tokens = await tokenService.generateTokens(payload);
    const decoded = await tokenService.validateAccessToken(tokens.accessToken);

    expect(decoded).toBeDefined();
    expect(decoded.sub).toBe(payload.userId);
    expect(decoded.email).toBe(payload.email);
    expect(decoded.tenantId).toBe(payload.tenantId);
  });

  it('should reject invalid tokens', async () => {
    await expect(
      tokenService.validateAccessToken('invalid.token.here'),
    ).rejects.toThrow();
  });

  it('should blacklist tokens', async () => {
    const payload = {
      userId: 'user-123',
      email: 'test@test.com',
      tenantId: 'tenant-123',
      roles: ['teacher'],
      permissions: ['read:students'],
      sessionId: 'session-123',
    };

    const tokens = await tokenService.generateTokens(payload);

    // Token should be valid initially
    const decoded = await tokenService.validateAccessToken(tokens.accessToken);
    expect(decoded).toBeDefined();

    // Blacklist the token
    await tokenService.blacklistToken(tokens.accessToken, 3600);

    // Token should now be rejected
    await expect(
      tokenService.validateAccessToken(tokens.accessToken),
    ).rejects.toThrow();
  });
});
