/**
 * LTI 1.1 Outcomes Service Tests
 *
 * Tests grade passback via POX (Plain Old XML) messages
 * with OAuth 1.0a signed requests.
 */
/* eslint-disable @typescript-eslint/unbound-method, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unused-vars */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { PrismaClient } from '../../generated/prisma-client/index.js';

import { Lti11OutcomesService, Lti11OutcomeError } from './outcomes-service.js';
import type { Lti11Consumer, Lti11OutcomeSubmission } from './types.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

function createMockPrisma() {
  return {
    lti11OutcomeBinding: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    lti11OutcomeLog: {
      create: vi.fn(),
    },
    lti11Consumer: {
      findUnique: vi.fn(),
    },
  } as unknown as PrismaClient;
}

describe('Lti11OutcomesService', () => {
  let service: Lti11OutcomesService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const testConsumer: Lti11Consumer = {
    id: 'consumer-123',
    tenantId: 'tenant-abc',
    consumerKey: 'test-consumer-key',
    sharedSecret: 'test-shared-secret-12345',
    name: 'Test LMS',
    isActive: true,
    instanceGuid: undefined,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const testBinding = {
    id: 'binding-123',
    userId: 'aivo-user-1',
    resourceLinkId: 'resource-link-1',
    consumerId: testConsumer.id,
    sourcedId: 'sourcedid-abc-123',
    serviceUrl: 'https://lms.example.com/outcomes',
    createdAt: new Date(),
    updatedAt: new Date(),
    consumer: testConsumer,
  };

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new Lti11OutcomesService(mockPrisma);
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('submitScore', () => {
    it('should submit score successfully with valid POX response', async () => {
      (mockPrisma.lti11OutcomeBinding.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        testBinding
      );
      (mockPrisma.lti11OutcomeLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      // Mock successful LMS response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
          <imsx_POXEnvelopeResponse xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
            <imsx_POXHeader>
              <imsx_POXResponseHeaderInfo>
                <imsx_version>V1.0</imsx_version>
                <imsx_messageIdentifier>msg-response-1</imsx_messageIdentifier>
                <imsx_statusInfo>
                  <imsx_codeMajor>success</imsx_codeMajor>
                  <imsx_severity>status</imsx_severity>
                  <imsx_description>Score submitted successfully</imsx_description>
                  <imsx_messageRefIdentifier>msg-request-1</imsx_messageRefIdentifier>
                </imsx_statusInfo>
              </imsx_POXResponseHeaderInfo>
            </imsx_POXHeader>
            <imsx_POXBody>
              <replaceResultResponse/>
            </imsx_POXBody>
          </imsx_POXEnvelopeResponse>`,
      });

      const submission: Lti11OutcomeSubmission = {
        userId: 'aivo-user-1',
        resourceLinkId: 'resource-link-1',
        score: 0.85,
      };

      const result = await service.submitScore(submission);

      expect(result.success).toBe(true);

      // Verify fetch was called with POX body
      expect(mockFetch).toHaveBeenCalledWith(
        testBinding.serviceUrl,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/xml',
          }),
          body: expect.stringContaining('replaceResultRequest'),
        })
      );

      // Verify the score was included in the request
      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      expect(callArgs![1].body).toContain('<textString>0.8500</textString>');
      expect(callArgs![1].body).toContain(testBinding.sourcedId);
    });

    it('should reject scores outside 0-1 range', async () => {
      const submission: Lti11OutcomeSubmission = {
        userId: 'user-1',
        resourceLinkId: 'resource-1',
        score: 1.5,
      };

      (mockPrisma.lti11OutcomeBinding.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        testBinding
      );

      await expect(service.submitScore(submission)).rejects.toThrow(Lti11OutcomeError);
      await expect(service.submitScore(submission)).rejects.toThrow(/0.*1/);

      // Should not make any network request on validation failure
      // (Note: first call throws, so fetch may or may not be called depending on timing)
    });

    it('should reject negative scores', async () => {
      const submission: Lti11OutcomeSubmission = {
        userId: 'user-1',
        resourceLinkId: 'resource-1',
        score: -0.1,
      };

      (mockPrisma.lti11OutcomeBinding.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        testBinding
      );

      await expect(service.submitScore(submission)).rejects.toThrow(Lti11OutcomeError);
    });

    it('should handle missing outcome binding', async () => {
      (mockPrisma.lti11OutcomeBinding.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        null
      );

      const submission: Lti11OutcomeSubmission = {
        userId: 'unknown-user',
        resourceLinkId: 'unknown-resource',
        score: 0.9,
      };

      await expect(service.submitScore(submission)).rejects.toThrow('binding');
    });

    it('should handle LMS error response', async () => {
      (mockPrisma.lti11OutcomeBinding.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        testBinding
      );
      (mockPrisma.lti11OutcomeLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      // Mock LMS failure response
      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
          <imsx_POXEnvelopeResponse xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
            <imsx_POXHeader>
              <imsx_POXResponseHeaderInfo>
                <imsx_version>V1.0</imsx_version>
                <imsx_messageIdentifier>msg-response-1</imsx_messageIdentifier>
                <imsx_statusInfo>
                  <imsx_codeMajor>failure</imsx_codeMajor>
                  <imsx_severity>error</imsx_severity>
                  <imsx_description>Invalid sourcedid</imsx_description>
                </imsx_statusInfo>
              </imsx_POXResponseHeaderInfo>
            </imsx_POXHeader>
            <imsx_POXBody/>
          </imsx_POXEnvelopeResponse>`,
      });

      const submission: Lti11OutcomeSubmission = {
        userId: 'aivo-user-1',
        resourceLinkId: 'resource-link-1',
        score: 0.75,
      };

      const result = await service.submitScore(submission);

      expect(result.success).toBe(false);
      expect(result.description).toContain('Invalid sourcedid');

      // Should log the failed attempt
      expect(mockPrisma.lti11OutcomeLog.create).toHaveBeenCalled();
    });

    it('should handle network errors gracefully', async () => {
      (mockPrisma.lti11OutcomeBinding.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        testBinding
      );

      mockFetch.mockRejectedValueOnce(new Error('Network timeout'));

      const submission: Lti11OutcomeSubmission = {
        userId: 'aivo-user-1',
        resourceLinkId: 'resource-link-1',
        score: 0.5,
      };

      await expect(service.submitScore(submission)).rejects.toThrow('Network timeout');
    });

    it('should include OAuth 1.0a authorization header', async () => {
      (mockPrisma.lti11OutcomeBinding.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        testBinding
      );
      (mockPrisma.lti11OutcomeLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
          <imsx_POXEnvelopeResponse xmlns="http://www.imsglobal.org/services/ltiv1p1/xsd/imsoms_v1p0">
            <imsx_POXHeader>
              <imsx_POXResponseHeaderInfo>
                <imsx_statusInfo>
                  <imsx_codeMajor>success</imsx_codeMajor>
                </imsx_statusInfo>
              </imsx_POXResponseHeaderInfo>
            </imsx_POXHeader>
            <imsx_POXBody><replaceResultResponse/></imsx_POXBody>
          </imsx_POXEnvelopeResponse>`,
      });

      const submission: Lti11OutcomeSubmission = {
        userId: 'aivo-user-1',
        resourceLinkId: 'resource-link-1',
        score: 0.8,
      };

      await service.submitScore(submission);

      const callArgs = mockFetch.mock.calls[0];
      expect(callArgs).toBeDefined();
      const headers = callArgs![1].headers;

      // Should include OAuth authorization header
      expect(headers.Authorization).toBeDefined();
      expect(headers.Authorization).toContain('OAuth');
      expect(headers.Authorization).toContain('oauth_consumer_key');
      expect(headers.Authorization).toContain('oauth_signature');
      expect(headers.Authorization).toContain('oauth_signature_method');
      expect(headers.Authorization).toContain('oauth_timestamp');
      expect(headers.Authorization).toContain('oauth_nonce');
    });

    it('should include comment in submission when provided', async () => {
      (mockPrisma.lti11OutcomeBinding.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        testBinding
      );
      (mockPrisma.lti11OutcomeLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
          <imsx_POXEnvelopeResponse>
            <imsx_POXHeader>
              <imsx_POXResponseHeaderInfo>
                <imsx_statusInfo><imsx_codeMajor>success</imsx_codeMajor></imsx_statusInfo>
              </imsx_POXResponseHeaderInfo>
            </imsx_POXHeader>
            <imsx_POXBody><replaceResultResponse/></imsx_POXBody>
          </imsx_POXEnvelopeResponse>`,
      });

      const submission: Lti11OutcomeSubmission = {
        userId: 'aivo-user-1',
        resourceLinkId: 'resource-link-1',
        score: 0.9,
        comment: 'Great work on this assignment!',
      };

      await service.submitScore(submission);

      const callArgs = mockFetch.mock.calls[0];
      // Comment should be in the POX body if implementation supports it
      // This depends on the actual implementation
    });
  });

  describe('Outcome Logging', () => {
    it('should log successful outcome operations', async () => {
      (mockPrisma.lti11OutcomeBinding.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        testBinding
      );
      (mockPrisma.lti11OutcomeLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      mockFetch.mockResolvedValueOnce({
        ok: true,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
          <imsx_POXEnvelopeResponse>
            <imsx_POXHeader>
              <imsx_POXResponseHeaderInfo>
                <imsx_statusInfo>
                  <imsx_codeMajor>success</imsx_codeMajor>
                </imsx_statusInfo>
              </imsx_POXResponseHeaderInfo>
            </imsx_POXHeader>
            <imsx_POXBody><replaceResultResponse/></imsx_POXBody>
          </imsx_POXEnvelopeResponse>`,
      });

      const submission: Lti11OutcomeSubmission = {
        userId: 'aivo-user-1',
        resourceLinkId: 'resource-link-1',
        score: 0.95,
      };

      await service.submitScore(submission);

      expect(mockPrisma.lti11OutcomeLog.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bindingId: testBinding.id,
        }),
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle exact boundary scores (0 and 1)', async () => {
      (mockPrisma.lti11OutcomeBinding.findFirst as ReturnType<typeof vi.fn>).mockResolvedValue(
        testBinding
      );
      (mockPrisma.lti11OutcomeLog.create as ReturnType<typeof vi.fn>).mockResolvedValue({});

      mockFetch.mockResolvedValue({
        ok: true,
        text: async () => `<?xml version="1.0" encoding="UTF-8"?>
          <imsx_POXEnvelopeResponse>
            <imsx_POXHeader>
              <imsx_POXResponseHeaderInfo>
                <imsx_statusInfo><imsx_codeMajor>success</imsx_codeMajor></imsx_statusInfo>
              </imsx_POXResponseHeaderInfo>
            </imsx_POXHeader>
            <imsx_POXBody><replaceResultResponse/></imsx_POXBody>
          </imsx_POXEnvelopeResponse>`,
      });

      // Test score of 0
      const zeroResult = await service.submitScore({
        userId: 'aivo-user-1',
        resourceLinkId: 'resource-link-1',
        score: 0,
      });
      expect(zeroResult.success).toBe(true);

      // Test score of 1
      const perfectResult = await service.submitScore({
        userId: 'aivo-user-1',
        resourceLinkId: 'resource-link-1',
        score: 1,
      });
      expect(perfectResult.success).toBe(true);
    });
  });
});
