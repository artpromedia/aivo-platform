/**
 * Tests for Consent Gating Middleware
 * Tests HTTP 451 (Unavailable for Legal Reasons) responses
 */

import { describe, it, expect, vi, type Mock } from 'vitest';
import type { Pool } from 'pg';

import {
  createConsentGate,
  checkConsentsNonBlocking,
  BASELINE_CONSENT_CONFIG,
  AI_PERSONALIZATION_CONSENT_CONFIG,
  AI_TUTOR_CONSENT_CONFIG,
  type ConsentGateOptions,
} from '../src/consent-gate.js';

// Mock Fastify request/reply
function createMockRequest(options: {
  tenantId: string;
  userId: string;
  learnerId?: string;
  body?: Record<string, unknown>;
  params?: Record<string, unknown>;
  query?: Record<string, unknown>;
}) {
  return {
    auth: { tenantId: options.tenantId, userId: options.userId },
    body: options.body ?? {},
    params: options.params ?? {},
    query: options.query ?? { learnerId: options.learnerId },
  };
}

function createMockReply() {
  const reply = {
    code: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
  };
  return reply;
}

// Mock Pool - returns consent records from consent_status_cache
function createMockPool(
  consentRecords: Array<{
    consent_type: string;
    status: 'GRANTED' | 'REVOKED' | 'PENDING';
    expires_at?: Date | null;
  }>
): Pool {
  const query: Mock = vi.fn().mockImplementation(() => {
    // Map records to what checkMultipleConsents expects
    return Promise.resolve({
      rows: consentRecords.map((r) => ({
        consent_type: r.consent_type,
        status: r.status,
        expires_at: r.expires_at ?? null,
      })),
      rowCount: consentRecords.length,
    });
  });

  return { query } as unknown as Pool;
}

describe('Consent Gate Middleware', () => {
  describe('createConsentGate', () => {
    it('should allow request when all required consents are granted', async () => {
      const mockPool = createMockPool([{ consent_type: 'BASELINE_ASSESSMENT', status: 'GRANTED' }]);

      const options: ConsentGateOptions = {
        pool: mockPool,
        consentBaseUrl: 'https://app.aivo.com',
      };
      const consentGate = createConsentGate(options);
      const middleware = consentGate({ requiredConsents: ['BASELINE_ASSESSMENT'] });

      const request = createMockRequest({
        tenantId: 'tenant-1',
        userId: 'user-1',
        learnerId: 'learner-1',
      });
      const reply = createMockReply();

      await middleware(request as any, reply as any);

      // Should NOT call reply.code(451)
      expect(reply.code).not.toHaveBeenCalledWith(451);
    });

    it('should return HTTP 451 when consent is missing', async () => {
      const mockPool = createMockPool([{ consent_type: 'BASELINE_ASSESSMENT', status: 'REVOKED' }]);

      const options: ConsentGateOptions = {
        pool: mockPool,
        consentBaseUrl: 'https://app.aivo.com',
      };
      const consentGate = createConsentGate(options);
      const middleware = consentGate({ requiredConsents: ['BASELINE_ASSESSMENT'] });

      const request = createMockRequest({
        tenantId: 'tenant-1',
        userId: 'user-1',
        learnerId: 'learner-1',
      });
      const reply = createMockReply();

      await middleware(request as any, reply as any);

      expect(reply.code).toHaveBeenCalledWith(451);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'CONSENT_REQUIRED',
          code: 451,
          requiredConsents: expect.arrayContaining(['BASELINE_ASSESSMENT']),
        })
      );
    });

    it('should return HTTP 451 with all missing consents when multiple are missing', async () => {
      const mockPool = createMockPool([
        { consent_type: 'AI_TUTOR', status: 'REVOKED' },
        { consent_type: 'AI_PERSONALIZATION', status: 'GRANTED' },
      ]);

      const options: ConsentGateOptions = {
        pool: mockPool,
        consentBaseUrl: 'https://app.aivo.com',
      };
      const consentGate = createConsentGate(options);
      const middleware = consentGate({
        requiredConsents: ['AI_TUTOR', 'AI_PERSONALIZATION'],
        requireAll: true,
      });

      const request = createMockRequest({
        tenantId: 'tenant-1',
        userId: 'user-1',
        learnerId: 'learner-1',
      });
      const reply = createMockReply();

      await middleware(request as any, reply as any);

      expect(reply.code).toHaveBeenCalledWith(451);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          requiredConsents: expect.arrayContaining(['AI_TUTOR']),
        })
      );
    });

    it('should include consent URL in 451 response', async () => {
      const mockPool = createMockPool([]); // No consents

      const options: ConsentGateOptions = {
        pool: mockPool,
        consentBaseUrl: 'https://app.aivo.com',
      };
      const consentGate = createConsentGate(options);
      const middleware = consentGate({ requiredConsents: ['BASELINE_ASSESSMENT'] });

      const request = createMockRequest({
        tenantId: 'tenant-1',
        userId: 'user-1',
        learnerId: 'learner-1',
      });
      const reply = createMockReply();

      await middleware(request as any, reply as any);

      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          consentUrl: expect.stringContaining('https://app.aivo.com/consent'),
        })
      );
    });

    it('should extract learnerId from body', async () => {
      const mockPool = createMockPool([{ consent_type: 'AI_TUTOR', status: 'GRANTED' }]);

      const options: ConsentGateOptions = {
        pool: mockPool,
        consentBaseUrl: 'https://app.aivo.com',
      };
      const consentGate = createConsentGate(options);
      const middleware = consentGate({ requiredConsents: ['AI_TUTOR'] });

      const request = createMockRequest({
        tenantId: 'tenant-1',
        userId: 'user-1',
        body: { learnerId: 'learner-from-body' },
        query: {},
      });
      const reply = createMockReply();

      await middleware(request as any, reply as any);

      // Should succeed (not block) when consent is granted
      expect(reply.code).not.toHaveBeenCalledWith(451);
    });

    it('should extract learnerId from params', async () => {
      const mockPool = createMockPool([{ consent_type: 'AI_TUTOR', status: 'GRANTED' }]);

      const options: ConsentGateOptions = {
        pool: mockPool,
        consentBaseUrl: 'https://app.aivo.com',
      };
      const consentGate = createConsentGate(options);
      const middleware = consentGate({ requiredConsents: ['AI_TUTOR'] });

      const request = createMockRequest({
        tenantId: 'tenant-1',
        userId: 'user-1',
        params: { learnerId: 'learner-from-params' },
        query: {},
      });
      const reply = createMockReply();

      await middleware(request as any, reply as any);

      // Should succeed (not block) when consent is granted
      expect(reply.code).not.toHaveBeenCalledWith(451);
    });

    it('should return 400 when learner or tenant cannot be determined', async () => {
      const mockPool = createMockPool([]);

      const options: ConsentGateOptions = {
        pool: mockPool,
        consentBaseUrl: 'https://app.aivo.com',
      };
      const consentGate = createConsentGate(options);
      const middleware = consentGate({ requiredConsents: ['AI_TUTOR'] });

      // Request with no learnerId anywhere
      const request = {
        auth: { tenantId: 'tenant-1', userId: 'user-1' },
        body: {},
        params: {},
        query: {},
      };
      const reply = createMockReply();

      await middleware(request as any, reply as any);

      expect(reply.code).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'MISSING_CONTEXT',
        })
      );
    });

    it('should allow request when requireAll=false and at least one consent is granted', async () => {
      const mockPool = createMockPool([
        { consent_type: 'AI_TUTOR', status: 'REVOKED' },
        { consent_type: 'AI_PERSONALIZATION', status: 'GRANTED' },
      ]);

      const options: ConsentGateOptions = {
        pool: mockPool,
        consentBaseUrl: 'https://app.aivo.com',
      };
      const consentGate = createConsentGate(options);
      const middleware = consentGate({
        requiredConsents: ['AI_TUTOR', 'AI_PERSONALIZATION'],
        requireAll: false,
      });

      const request = createMockRequest({
        tenantId: 'tenant-1',
        userId: 'user-1',
        learnerId: 'learner-1',
      });
      const reply = createMockReply();

      await middleware(request as any, reply as any);

      // Should NOT block when at least one consent is granted
      expect(reply.code).not.toHaveBeenCalledWith(451);
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
    it('should return allowed=true when all consents are granted', async () => {
      const mockPool = createMockPool([{ consent_type: 'AI_TUTOR', status: 'GRANTED' }]);

      const result = await checkConsentsNonBlocking(mockPool, 'tenant-1', 'learner-1', [
        'AI_TUTOR',
      ]);

      expect(result.allowed).toBe(true);
      expect(result.missingConsents).toHaveLength(0);
      expect(result.grantedConsents).toContain('AI_TUTOR');
    });

    it('should return missing consents list', async () => {
      const mockPool = createMockPool([
        { consent_type: 'AI_TUTOR', status: 'REVOKED' },
        { consent_type: 'AI_PERSONALIZATION', status: 'REVOKED' },
      ]);

      const result = await checkConsentsNonBlocking(mockPool, 'tenant-1', 'learner-1', [
        'AI_TUTOR',
        'AI_PERSONALIZATION',
      ]);

      expect(result.allowed).toBe(false);
      expect(result.missingConsents).toContain('AI_TUTOR');
      expect(result.missingConsents).toContain('AI_PERSONALIZATION');
    });

    it('should handle consents not in cache as missing', async () => {
      const mockPool = createMockPool([]); // No records

      const result = await checkConsentsNonBlocking(mockPool, 'tenant-1', 'learner-1', [
        'BASELINE_ASSESSMENT',
      ]);

      expect(result.allowed).toBe(false);
      expect(result.missingConsents).toContain('BASELINE_ASSESSMENT');
    });

    it('should handle expired consents as missing', async () => {
      const mockPool = createMockPool([
        { consent_type: 'AI_TUTOR', status: 'GRANTED', expires_at: new Date('2020-01-01') },
      ]);

      const result = await checkConsentsNonBlocking(mockPool, 'tenant-1', 'learner-1', [
        'AI_TUTOR',
      ]);

      expect(result.allowed).toBe(false);
      expect(result.missingConsents).toContain('AI_TUTOR');
    });
  });
});
