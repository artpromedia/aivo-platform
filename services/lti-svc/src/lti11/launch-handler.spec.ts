/**
 * LTI 1.1 Launch Handler Tests
 *
 * Tests OAuth 1.0a signature verification, nonce handling,
 * timestamp validation, and launch processing.
 */
/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment */
import crypto from 'node:crypto';

import type { FastifyRequest } from 'fastify';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { PrismaClient } from '../../generated/prisma-client/index.js';
import type { LtiUserService } from '../lti-user-service.js';

import { Lti11LaunchHandler, Lti11Error } from './launch-handler.js';
import type { Lti11Consumer } from './types.js';

// Mock Prisma client
function createMockPrisma() {
  return {
    lti11Consumer: {
      findUnique: vi.fn(),
    },
    lti11Nonce: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    lti11Session: {
      create: vi.fn(),
    },
    lti11LaunchLog: {
      create: vi.fn(),
    },
    lti11OutcomeBinding: {
      upsert: vi.fn(),
    },
  } as unknown as PrismaClient;
}

// Mock LTI User Service
function createMockLtiUserService() {
  return {
    resolveOrCreateUser: vi.fn(),
  } as unknown as LtiUserService;
}

// Helper to generate OAuth 1.0a signature
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  sharedSecret: string,
  signatureMethod: 'HMAC-SHA1' | 'HMAC-SHA256' = 'HMAC-SHA1'
): string {
  // Sort and encode parameters
  const sortedParams = Object.keys(params)
    .filter((k) => k !== 'oauth_signature')
    .sort((a, b) => a.localeCompare(b))
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(params[k] ?? '')}`)
    .join('&');

  const baseString = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  // For LTI 1.1, key is shared_secret + '&' (no token secret)
  const key = `${encodeURIComponent(sharedSecret)}&`;

  const algorithm = signatureMethod === 'HMAC-SHA256' ? 'sha256' : 'sha1';
  return crypto.createHmac(algorithm, key).update(baseString).digest('base64');
}

// Helper to create mock FastifyRequest
function createMockRequest(params: Record<string, string>, url: string): FastifyRequest {
  const parsedUrl = new URL(url);
  return {
    body: params,
    protocol: parsedUrl.protocol.replace(':', ''),
    hostname: parsedUrl.hostname,
    url: parsedUrl.pathname,
    headers: {
      host: parsedUrl.host,
    },
    method: 'POST',
  } as unknown as FastifyRequest;
}

describe('Lti11LaunchHandler', () => {
  let handler: Lti11LaunchHandler;
  let mockPrisma: ReturnType<typeof createMockPrisma>;
  let mockLtiUserService: ReturnType<typeof createMockLtiUserService>;

  const testConsumer: Lti11Consumer = {
    id: 'consumer-123',
    tenantId: 'tenant-abc',
    consumerKey: 'test-consumer-key',
    sharedSecret: 'test-shared-secret-12345',
    name: 'Test LMS',
    isActive: true,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseUrl = 'https://lti.aivo.com';
  const launchUrl = `${baseUrl}/lti/1.1/launch`;

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    mockLtiUserService = createMockLtiUserService();
    handler = new Lti11LaunchHandler(mockPrisma, mockLtiUserService, { baseUrl });
    vi.clearAllMocks();
  });

  describe('OAuth 1.0a Signature Verification', () => {
    it('should verify valid HMAC-SHA1 signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');

      const params: Record<string, string> = {
        oauth_consumer_key: testConsumer.consumerKey,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
        user_id: 'user-456',
        roles: 'Learner',
      };

      params.oauth_signature = generateOAuthSignature(
        'POST',
        launchUrl,
        params,
        testConsumer.sharedSecret,
        'HMAC-SHA1'
      );

      const mockRequest = createMockRequest(params, launchUrl);

      // Mock consumer lookup
      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );
      (mockPrisma.lti11Nonce.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockPrisma.lti11Nonce.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.lti11LaunchLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.lti11Session.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'session-123',
        userId: 'aivo-user-id',
      });
      (mockLtiUserService.resolveOrCreateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'aivo-user-id',
        displayName: 'Test User',
        email: 'user@test.com',
        role: 'learner',
        isNewUser: false,
      });

      const result = await handler.handleLaunch(mockRequest);

      expect(result.user.userId).toBe('aivo-user-id');
      expect(result.resourceLinkId).toBe('resource-123');
    });

    it('should reject invalid signature', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');

      const params: Record<string, string> = {
        oauth_consumer_key: testConsumer.consumerKey,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0',
        oauth_signature: 'invalid-signature-here',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
      };

      const mockRequest = createMockRequest(params, launchUrl);

      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );

      await expect(handler.handleLaunch(mockRequest)).rejects.toThrow(Lti11Error);
    });

    it('should reject unknown consumer key', async () => {
      const params = {
        oauth_consumer_key: 'unknown-key',
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_nonce: crypto.randomBytes(16).toString('hex'),
        oauth_version: '1.0',
        oauth_signature: 'some-signature',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
      };

      const mockRequest = createMockRequest(params, launchUrl);

      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(handler.handleLaunch(mockRequest)).rejects.toThrow('Unknown consumer key');
    });

    it('should reject inactive consumer', async () => {
      const inactiveConsumer = { ...testConsumer, isActive: false };
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');

      const params = {
        oauth_consumer_key: testConsumer.consumerKey,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0',
        oauth_signature: generateOAuthSignature(
          'POST',
          launchUrl,
          {
            oauth_consumer_key: testConsumer.consumerKey,
            oauth_signature_method: 'HMAC-SHA1',
            oauth_timestamp: timestamp,
            oauth_nonce: nonce,
            oauth_version: '1.0',
            lti_message_type: 'basic-lti-launch-request',
            lti_version: 'LTI-1p0',
            resource_link_id: 'resource-123',
          },
          testConsumer.sharedSecret
        ),
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
      };

      const mockRequest = createMockRequest(params, launchUrl);

      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        inactiveConsumer
      );

      // Implementation returns "Unknown consumer key" for inactive consumers
      // (for security, don't reveal if key exists but is inactive)
      await expect(handler.handleLaunch(mockRequest)).rejects.toThrow(/unknown consumer/i);
    });
  });

  describe('Timestamp Validation', () => {
    it('should reject expired timestamps (> 5 minutes old)', async () => {
      const expiredTimestamp = (Math.floor(Date.now() / 1000) - 400).toString(); // 6+ minutes ago
      const nonce = crypto.randomBytes(16).toString('hex');

      const params: Record<string, string> = {
        oauth_consumer_key: testConsumer.consumerKey,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: expiredTimestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
      };

      params.oauth_signature = generateOAuthSignature(
        'POST',
        launchUrl,
        params,
        testConsumer.sharedSecret
      );

      const mockRequest = createMockRequest(params, launchUrl);

      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );

      await expect(handler.handleLaunch(mockRequest)).rejects.toThrow(/timestamp/i);
    });

    it('should reject future timestamps (> 5 minutes ahead)', async () => {
      const futureTimestamp = (Math.floor(Date.now() / 1000) + 400).toString(); // 6+ minutes ahead
      const nonce = crypto.randomBytes(16).toString('hex');

      const params: Record<string, string> = {
        oauth_consumer_key: testConsumer.consumerKey,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: futureTimestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
      };

      params.oauth_signature = generateOAuthSignature(
        'POST',
        launchUrl,
        params,
        testConsumer.sharedSecret
      );

      const mockRequest = createMockRequest(params, launchUrl);

      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );

      await expect(handler.handleLaunch(mockRequest)).rejects.toThrow(/timestamp/i);
    });
  });

  describe('Nonce Replay Protection', () => {
    it('should reject replayed nonce', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const replayedNonce = 'already-used-nonce';

      const params: Record<string, string> = {
        oauth_consumer_key: testConsumer.consumerKey,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_nonce: replayedNonce,
        oauth_version: '1.0',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
      };

      params.oauth_signature = generateOAuthSignature(
        'POST',
        launchUrl,
        params,
        testConsumer.sharedSecret
      );

      const mockRequest = createMockRequest(params, launchUrl);

      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );
      // Simulate nonce already exists
      (mockPrisma.lti11Nonce.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'nonce-id',
        nonce: replayedNonce,
        consumerId: testConsumer.id,
        timestamp: Number.parseInt(timestamp, 10),
      });

      await expect(handler.handleLaunch(mockRequest)).rejects.toThrow(/nonce/i);
    });

    it('should accept unique nonce and store it', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const uniqueNonce = crypto.randomBytes(16).toString('hex');

      const params: Record<string, string> = {
        oauth_consumer_key: testConsumer.consumerKey,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_nonce: uniqueNonce,
        oauth_version: '1.0',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
        user_id: 'lti-user-1',
        roles: 'Learner',
      };

      params.oauth_signature = generateOAuthSignature(
        'POST',
        launchUrl,
        params,
        testConsumer.sharedSecret
      );

      const mockRequest = createMockRequest(params, launchUrl);

      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );
      (mockPrisma.lti11Nonce.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockPrisma.lti11Nonce.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'new-nonce-id',
        nonce: uniqueNonce,
      });
      (mockPrisma.lti11LaunchLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.lti11Session.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'session-123',
        userId: 'existing-user',
      });
      (mockLtiUserService.resolveOrCreateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'existing-user',
        displayName: 'Existing User',
        role: 'learner',
        isNewUser: false,
      });

      const result = await handler.handleLaunch(mockRequest);

      expect(result.user.userId).toBe('existing-user');
      expect(mockPrisma.lti11Nonce.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            key: `${testConsumer.id}:${uniqueNonce}`,
            consumerId: testConsumer.id,
          }),
        })
      );
    });
  });

  describe('User Provisioning', () => {
    it('should create new user for first-time LTI launch', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');

      const params: Record<string, string> = {
        oauth_consumer_key: testConsumer.consumerKey,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
        user_id: 'brand-new-user',
        lis_person_name_full: 'John Doe',
        lis_person_name_given: 'John',
        lis_person_name_family: 'Doe',
        lis_person_contact_email_primary: 'johndoe@school.edu',
        roles: 'Learner',
      };

      params.oauth_signature = generateOAuthSignature(
        'POST',
        launchUrl,
        params,
        testConsumer.sharedSecret
      );

      const mockRequest = createMockRequest(params, launchUrl);

      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );
      (mockPrisma.lti11Nonce.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockPrisma.lti11Nonce.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.lti11LaunchLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.lti11Session.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'session-new-user',
        userId: 'new-aivo-user',
      });
      (mockLtiUserService.resolveOrCreateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'new-aivo-user',
        displayName: 'John Doe',
        email: 'johndoe@school.edu',
        role: 'learner',
        isNewUser: true,
      });

      const result = await handler.handleLaunch(mockRequest);

      expect(result.user.isNewUser).toBe(true);
      expect(mockLtiUserService.resolveOrCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'brand-new-user',
          email: 'johndoe@school.edu',
          givenName: 'John',
          familyName: 'Doe',
        })
      );
    });
  });

  describe('Launch Context Extraction', () => {
    it('should extract course context from launch params', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');

      const params: Record<string, string> = {
        oauth_consumer_key: testConsumer.consumerKey,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'assignment-1',
        context_id: 'course-math-101',
        context_title: 'Mathematics 101',
        context_label: 'MATH-101',
        user_id: 'student-1',
        roles: 'Learner',
      };

      params.oauth_signature = generateOAuthSignature(
        'POST',
        launchUrl,
        params,
        testConsumer.sharedSecret
      );

      const mockRequest = createMockRequest(params, launchUrl);

      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );
      (mockPrisma.lti11Nonce.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockPrisma.lti11Nonce.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.lti11LaunchLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.lti11Session.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'session-context',
        userId: 'user-id',
      });
      (mockLtiUserService.resolveOrCreateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-id',
        displayName: 'Student',
        role: 'learner',
        isNewUser: false,
      });

      const result = await handler.handleLaunch(mockRequest);

      expect(result.context).toEqual(
        expect.objectContaining({
          id: 'course-math-101',
          title: 'Mathematics 101',
          label: 'MATH-101',
        })
      );
      expect(result.resourceLinkId).toBe('assignment-1');
    });
  });

  describe('Outcomes Service Binding', () => {
    it('should store outcomes binding when present', async () => {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');

      const params: Record<string, string> = {
        oauth_consumer_key: testConsumer.consumerKey,
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: timestamp,
        oauth_nonce: nonce,
        oauth_version: '1.0',
        lti_message_type: 'basic-lti-launch-request',
        lti_version: 'LTI-1p0',
        resource_link_id: 'resource-123',
        user_id: 'user-456',
        roles: 'Learner',
        lis_outcome_service_url: 'https://lms.example.com/outcomes',
        lis_result_sourcedid: 'sourcedid-abc-123',
      };

      params.oauth_signature = generateOAuthSignature(
        'POST',
        launchUrl,
        params,
        testConsumer.sharedSecret
      );

      const mockRequest = createMockRequest(params, launchUrl);

      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );
      (mockPrisma.lti11Nonce.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);
      (mockPrisma.lti11Nonce.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.lti11LaunchLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockPrisma.lti11Session.create as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: 'session-outcomes',
        userId: 'user-id',
      });
      (mockPrisma.lti11OutcomeBinding.upsert as ReturnType<typeof vi.fn>).mockResolvedValue({});
      (mockLtiUserService.resolveOrCreateUser as ReturnType<typeof vi.fn>).mockResolvedValue({
        userId: 'user-id',
        displayName: 'User',
        role: 'learner',
        isNewUser: false,
      });

      const result = await handler.handleLaunch(mockRequest);

      expect(result.hasOutcomesService).toBe(true);
      expect(mockPrisma.lti11OutcomeBinding.upsert).toHaveBeenCalled();
    });
  });
});
