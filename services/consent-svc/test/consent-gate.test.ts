/**
 * Tests for Consent Gating Middleware
 * Tests HTTP 451 (Unavailable for Legal Reasons) responses
 */

import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import type { Pool, QueryResult } from 'pg';

import {
  createConsentGate,
  checkConsentsNonBlocking,
  BASELINE_CONSENT_CONFIG,
  AI_PERSONALIZATION_CONSENT_CONFIG,
  AI_TUTOR_CONSENT_CONFIG,
  type ConsentGateConfig,
} from '../src/consent-gate.js';

// Mock Fastify request/reply
function createMockRequest(auth: { tenantId: string; userId: string; learnerId?: string }) {
  return {
    auth,
    query: { learnerId: auth.learnerId },
    params: {},
  };
}

function createMockReply() {
  const reply: any = {
    code: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
}

// Mock Pool
function createMockPool(queryResponses: Map<string, Partial<QueryResult<any>>>): Pool {
  const query: Mock = vi.fn().mockImplementation((sql: string, params?: any[]) => {
    // Find matching response based on SQL pattern
    for (const [pattern, response] of queryResponses) {
      if (sql.includes(pattern)) {
        return Promise.resolve({
          rows: response.rows ?? [],
          rowCount: response.rowCount ?? (response.rows?.length ?? 0),
        });
      }
    }
    return Promise.resolve({ rows: [], rowCount: 0 });
  });

  return { query } as unknown as Pool;
}

describe('Consent Gate Middleware', () => {
  describe('createConsentGate', () => {
    it('should allow request when all required consents are granted', async () => {
      const mockPool = createMockPool(
        new Map([
          [
            'consent_status_cache',
            {
              rows: [
                {
                  consent_type: 'BASELINE_ASSESSMENT',
                  has_active_consent: true,
                },
              ],
            },
          ],
        ])
      );

      const config: ConsentGateConfig = {
        requiredConsents: ['BASELINE_ASSESSMENT'],
        learnerIdSource: 'query',
        learnerIdParam: 'learnerId',
        errorMessage: 'Consent required',
      };

      const middleware = createConsentGate(mockPool, config);
      const request = createMockRequest({
        tenantId: 'tenant-1',
        userId: 'user-1',
        learnerId: 'learner-1',
      });
      const reply = createMockReply();
      const done = vi.fn();

      await middleware(request as any, reply, done);

      // Should call done() to continue to next handler
      expect(done).toHaveBeenCalled();
      expect(reply.code).not.toHaveBeenCalled();
    });

    it('should return HTTP 451 when consent is missing', async () => {
      const mockPool = createMockPool(
        new Map([
          [
            'consent_status_cache',
            {
              rows: [
                {
                  consent_type: 'BASELINE_ASSESSMENT',
                  has_active_consent: false,
                },
              ],
            },
          ],
        ])
      );

      const config: ConsentGateConfig = {
        requiredConsents: ['BASELINE_ASSESSMENT'],
        learnerIdSource: 'query',
        learnerIdParam: 'learnerId',
        errorMessage: 'Baseline assessment consent required',
      };

      const middleware = createConsentGate(mockPool, config);
      const request = createMockRequest({
        tenantId: 'tenant-1',
        userId: 'user-1',
        learnerId: 'learner-1',
      });
      const reply = createMockReply();
      const done = vi.fn();

      await middleware(request as any, reply, done);

      expect(reply.code).toHaveBeenCalledWith(451);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'ConsentRequired',
          statusCode: 451,
          missingConsents: ['BASELINE_ASSESSMENT'],
        })
      );
      expect(done).not.toHaveBeenCalled();
    });

    it('should return HTTP 451 with all missing consents when multiple are missing', async () => {
      const mockPool = createMockPool(
        new Map([
          [
            'consent_status_cache',
            {
              rows: [
                { consent_type: 'AI_TUTOR', has_active_consent: false },
                { consent_type: 'AI_PERSONALIZATION', has_active_consent: true },
              ],
            },
          ],
        ])
      );

      const config: ConsentGateConfig = {
        requiredConsents: ['AI_TUTOR', 'AI_PERSONALIZATION'],
        learnerIdSource: 'query',
        learnerIdParam: 'learnerId',
        errorMessage: 'AI consent required',
      };

      const middleware = createConsentGate(mockPool, config);
      const request = createMockRequest({
        tenantId: 'tenant-1',
        userId: 'user-1',
        learnerId: 'learner-1',
      });
      const reply = createMockReply();
      const done = vi.fn();

      await middleware(request as any, reply, done);

      expect(reply.code).toHaveBeenCalledWith(451);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          missingConsents: ['AI_TUTOR'],
        })
      );
    });

    it('should include consent URL in 451 response', async () => {
      const mockPool = createMockPool(
        new Map([['consent_status_cache', { rows: [] }]])
      );

      const config: ConsentGateConfig = {
        requiredConsents: ['DATA_COLLECTION'],
        learnerIdSource: 'query',
        learnerIdParam: 'learnerId',
        errorMessage: 'Data collection consent required',
        consentUrl: '/consent/data-collection',
      };

      const middleware = createConsentGate(mockPool, config);
      const request = createMockRequest({
        tenantId: 'tenant-1',
        userId: 'user-1',
        learnerId: 'learner-1',
      });
      const reply = createMockReply();
      const done = vi.fn();

      await middleware(request as any, reply, done);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          consentUrl: '/consent/data-collection',
        })
      );
    });

    it('should extract learnerId from params when configured', async () => {
      const mockPool = createMockPool(
        new Map([
          [
            'consent_status_cache',
            {
              rows: [
                { consent_type: 'AI_TUTOR', has_active_consent: true },
              ],
            },
          ],
        ])
      );

      const config: ConsentGateConfig = {
        requiredConsents: ['AI_TUTOR'],
        learnerIdSource: 'param',
        learnerIdParam: 'id',
        errorMessage: 'Consent required',
      };

      const middleware = createConsentGate(mockPool, config);
      const request = {
        auth: { tenantId: 'tenant-1', userId: 'user-1' },
        params: { id: 'learner-from-params' },
        query: {},
      };
      const reply = createMockReply();
      const done = vi.fn();

      await middleware(request as any, reply, done);

      expect(done).toHaveBeenCalled();
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining(['tenant-1', 'learner-from-params'])
      );
    });
  });

  describe('Pre-defined configs', () => {
    it('BASELINE_CONSENT_CONFIG should require BASELINE_ASSESSMENT', () => {
      expect(BASELINE_CONSENT_CONFIG.requiredConsents).toContain('BASELINE_ASSESSMENT');
    });

    it('AI_PERSONALIZATION_CONSENT_CONFIG should require AI_PERSONALIZATION', () => {
      expect(AI_PERSONALIZATION_CONSENT_CONFIG.requiredConsents).toContain('AI_PERSONALIZATION');
    });

    it('AI_TUTOR_CONSENT_CONFIG should require AI_TUTOR', () => {
      expect(AI_TUTOR_CONSENT_CONFIG.requiredConsents).toContain('AI_TUTOR');
    });
  });

  describe('checkConsentsNonBlocking', () => {
    it('should return result without blocking', async () => {
      const mockPool = createMockPool(
        new Map([
          [
            'consent_status_cache',
            {
              rows: [
                { consent_type: 'AI_TUTOR', has_active_consent: true },
              ],
            },
          ],
        ])
      );

      const result = await checkConsentsNonBlocking(
        mockPool,
        'tenant-1',
        'learner-1',
        ['AI_TUTOR']
      );

      expect(result.hasAllConsents).toBe(true);
      expect(result.missingConsents).toHaveLength(0);
    });

    it('should return missing consents list', async () => {
      const mockPool = createMockPool(
        new Map([
          [
            'consent_status_cache',
            {
              rows: [
                { consent_type: 'AI_TUTOR', has_active_consent: false },
                { consent_type: 'DATA_COLLECTION', has_active_consent: false },
              ],
            },
          ],
        ])
      );

      const result = await checkConsentsNonBlocking(
        mockPool,
        'tenant-1',
        'learner-1',
        ['AI_TUTOR', 'DATA_COLLECTION']
      );

      expect(result.hasAllConsents).toBe(false);
      expect(result.missingConsents).toContain('AI_TUTOR');
      expect(result.missingConsents).toContain('DATA_COLLECTION');
    });

    it('should handle consents not in cache as missing', async () => {
      const mockPool = createMockPool(
        new Map([['consent_status_cache', { rows: [] }]])
      );

      const result = await checkConsentsNonBlocking(
        mockPool,
        'tenant-1',
        'learner-1',
        ['SOME_NEW_CONSENT']
      );

      expect(result.hasAllConsents).toBe(false);
      expect(result.missingConsents).toContain('SOME_NEW_CONSENT');
    });
  });
});

describe('HTTP 451 Compliance', () => {
  it('should set Link header for blocked-by reference (RFC 7725)', async () => {
    const mockPool = createMockPool(
      new Map([['consent_status_cache', { rows: [] }]])
    );

    const config: ConsentGateConfig = {
      requiredConsents: ['DATA_COLLECTION'],
      learnerIdSource: 'query',
      learnerIdParam: 'learnerId',
      errorMessage: 'Consent required',
      blockedByUrl: 'https://example.com/privacy-policy',
    };

    const middleware = createConsentGate(mockPool, config);
    const request = createMockRequest({
      tenantId: 'tenant-1',
      userId: 'user-1',
      learnerId: 'learner-1',
    });
    const reply = createMockReply();
    const done = vi.fn();

    await middleware(request as any, reply, done);

    // RFC 7725 recommends Link header with rel="blocked-by"
    expect(reply.header).toHaveBeenCalledWith(
      'Link',
      '<https://example.com/privacy-policy>; rel="blocked-by"'
    );
  });
});
