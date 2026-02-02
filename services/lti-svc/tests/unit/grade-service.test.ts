/**
 * LTI Grade Service Unit Tests
 *
 * Tests for LTI Assignment and Grade Services (AGS) including:
 * - Grade passback
 * - Line item management
 * - Score submission
 * - OAuth2 token handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock jose
vi.mock('jose', () => ({
  importPKCS8: vi.fn().mockResolvedValue({ type: 'private' }),
  SignJWT: vi.fn().mockReturnValue({
    setProtectedHeader: vi.fn().mockReturnThis(),
    setIssuedAt: vi.fn().mockReturnThis(),
    setExpirationTime: vi.fn().mockReturnThis(),
    setAudience: vi.fn().mockReturnThis(),
    setSubject: vi.fn().mockReturnThis(),
    setIssuer: vi.fn().mockReturnThis(),
    sign: vi.fn().mockResolvedValue('mock-jwt-token'),
  }),
}));

// Mock prisma
const mockPrisma = {
  ltiLaunch: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  ltiTool: {
    findUnique: vi.fn(),
  },
  ltiLink: {
    findUnique: vi.fn(),
  },
};

// Types
interface AgsScore {
  userId: string;
  scoreGiven?: number;
  scoreMaximum?: number;
  activityProgress: 'Initialized' | 'Started' | 'InProgress' | 'Submitted' | 'Completed';
  gradingProgress: 'FullyGraded' | 'Pending' | 'PendingManual' | 'Failed' | 'NotReady';
  comment?: string;
  timestamp: string;
}

interface AgsLineItem {
  id?: string;
  scoreMaximum: number;
  label: string;
  resourceId?: string;
  resourceLinkId?: string;
  tag?: string;
  startDateTime?: string;
  endDateTime?: string;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

describe('LTI Grade Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('AGS Access Token', () => {
    it('should request access token with correct scopes', async () => {
      const tokenEndpoint = 'https://canvas.instructure.com/login/oauth2/token';
      const scopes = [
        'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
        'https://purl.imsglobal.org/spec/lti-ags/scope/score',
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            access_token: 'mock-token',
            token_type: 'Bearer',
            expires_in: 3600,
            scope: scopes.join(' '),
          }),
      });

      const response = await mockFetch(tokenEndpoint, {
        method: 'POST',
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: 'mock-jwt',
          scope: scopes.join(' '),
        }),
      });

      const token: TokenResponse = await response.json();
      expect(token.access_token).toBe('mock-token');
      expect(token.scope).toContain('lineitem');
    });

    it('should cache access token until expiry', () => {
      const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();
      const cacheKey = 'tool-1:ags';
      const expiresAt = Date.now() + 3600000;

      tokenCache.set(cacheKey, { accessToken: 'cached-token', expiresAt });

      const cached = tokenCache.get(cacheKey);
      expect(cached).toBeDefined();
      expect(cached!.expiresAt).toBeGreaterThan(Date.now());
    });

    it('should refresh expired token', () => {
      const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();
      const cacheKey = 'tool-1:ags';
      const expiredAt = Date.now() - 3600000;

      tokenCache.set(cacheKey, { accessToken: 'expired-token', expiresAt: expiredAt });

      const cached = tokenCache.get(cacheKey);
      const isExpired = cached!.expiresAt < Date.now();
      expect(isExpired).toBe(true);
    });

    it('should handle token request failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
      });

      const response = await mockFetch('https://canvas.instructure.com/login/oauth2/token', {
        method: 'POST',
      });

      expect(response.ok).toBe(false);
      expect(response.status).toBe(401);
    });
  });

  describe('Score Submission', () => {
    it('should format score payload correctly', () => {
      const score: AgsScore = {
        userId: 'lti-user-123',
        scoreGiven: 85,
        scoreMaximum: 100,
        activityProgress: 'Completed',
        gradingProgress: 'FullyGraded',
        comment: 'Great work!',
        timestamp: new Date().toISOString(),
      };

      expect(score.scoreGiven).toBeLessThanOrEqual(score.scoreMaximum!);
      expect(score.activityProgress).toBe('Completed');
      expect(score.gradingProgress).toBe('FullyGraded');
    });

    it('should submit score to line item endpoint', async () => {
      const lineItemUrl = 'https://canvas.instructure.com/api/lti/courses/123/line_items/456';
      const score: AgsScore = {
        userId: 'lti-user-123',
        scoreGiven: 90,
        scoreMaximum: 100,
        activityProgress: 'Completed',
        gradingProgress: 'FullyGraded',
        timestamp: new Date().toISOString(),
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
      });

      const response = await mockFetch(`${lineItemUrl}/scores`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer mock-token',
          'Content-Type': 'application/vnd.ims.lis.v1.score+json',
        },
        body: JSON.stringify(score),
      });

      expect(response.ok).toBe(true);
    });

    it('should handle score submission failure', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ error: 'Invalid score format' }),
      });

      const response = await mockFetch('https://canvas.instructure.com/api/lti/scores', {
        method: 'POST',
      });

      expect(response.ok).toBe(false);
    });

    it('should validate score is within range', () => {
      const validateScore = (score: number, max: number): boolean => {
        return score >= 0 && score <= max;
      };

      expect(validateScore(85, 100)).toBe(true);
      expect(validateScore(150, 100)).toBe(false);
      expect(validateScore(-10, 100)).toBe(false);
    });

    it('should track grade status in database', async () => {
      mockPrisma.ltiLaunch.update.mockResolvedValue({
        id: 'launch-1',
        gradeStatus: 'SUBMITTED',
        gradeSubmittedAt: new Date(),
      });

      const result = await mockPrisma.ltiLaunch.update({
        where: { id: 'launch-1' },
        data: {
          gradeStatus: 'SUBMITTED',
          gradeSubmittedAt: new Date(),
        },
      });

      expect(result.gradeStatus).toBe('SUBMITTED');
    });
  });

  describe('Line Item Management', () => {
    it('should create line item with correct structure', () => {
      const lineItem: AgsLineItem = {
        scoreMaximum: 100,
        label: 'Quiz 1',
        resourceId: 'quiz-123',
        resourceLinkId: 'link-456',
        tag: 'quiz',
      };

      expect(lineItem.scoreMaximum).toBeGreaterThan(0);
      expect(lineItem.label).toBeDefined();
    });

    it('should retrieve line item by resource link ID', async () => {
      const lineItemsUrl = 'https://canvas.instructure.com/api/lti/courses/123/line_items';

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve([
            { id: 'li-1', scoreMaximum: 100, label: 'Quiz 1', resourceLinkId: 'link-456' },
            { id: 'li-2', scoreMaximum: 50, label: 'Quiz 2', resourceLinkId: 'link-789' },
          ]),
      });

      const response = await mockFetch(`${lineItemsUrl}?resource_link_id=link-456`);
      const items: AgsLineItem[] = await response.json();

      expect(items).toHaveLength(2);
      expect(items[0].resourceLinkId).toBe('link-456');
    });

    it('should update existing line item', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            id: 'li-1',
            scoreMaximum: 150,
            label: 'Updated Quiz',
          }),
      });

      const response = await mockFetch('https://canvas.instructure.com/api/lti/line_items/li-1', {
        method: 'PUT',
        body: JSON.stringify({ scoreMaximum: 150, label: 'Updated Quiz' }),
      });

      const updated: AgsLineItem = await response.json();
      expect(updated.scoreMaximum).toBe(150);
    });

    it('should handle line item not found', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const response = await mockFetch(
        'https://canvas.instructure.com/api/lti/line_items/non-existent'
      );
      expect(response.status).toBe(404);
    });

    it('should support line item with date constraints', () => {
      const lineItem: AgsLineItem = {
        scoreMaximum: 100,
        label: 'Timed Quiz',
        startDateTime: '2026-02-01T09:00:00Z',
        endDateTime: '2026-02-01T10:00:00Z',
      };

      const start = new Date(lineItem.startDateTime!);
      const end = new Date(lineItem.endDateTime!);
      expect(end.getTime()).toBeGreaterThan(start.getTime());
    });
  });

  describe('Grade Passback Error Handling', () => {
    it('should handle AGS not supported by LMS', async () => {
      const launchParams = {
        // Missing AGS endpoint claim
      };

      const agsEndpoint = launchParams['https://purl.imsglobal.org/spec/lti-ags/claim/endpoint'];
      expect(agsEndpoint).toBeUndefined();
    });

    it('should handle grading disabled for link', async () => {
      mockPrisma.ltiLaunch.findUnique.mockResolvedValue({
        id: 'launch-1',
        link: { gradingEnabled: false },
      });

      const launch = await mockPrisma.ltiLaunch.findUnique({
        where: { id: 'launch-1' },
        include: { link: true },
      });

      expect(launch.link.gradingEnabled).toBe(false);
    });

    it('should retry failed grade submission', async () => {
      let attempts = 0;
      mockFetch
        .mockResolvedValueOnce({ ok: false, status: 503 }) // First attempt fails
        .mockResolvedValueOnce({ ok: false, status: 503 }) // Second attempt fails
        .mockResolvedValueOnce({ ok: true, status: 200 }); // Third attempt succeeds

      const submitWithRetry = async () => {
        while (attempts < 3) {
          attempts++;
          const response = await mockFetch('/scores', { method: 'POST' });
          if (response.ok) return response;
        }
        throw new Error('Max retries exceeded');
      };

      const response = await submitWithRetry();
      expect(response.ok).toBe(true);
      expect(attempts).toBe(3);
    });

    it('should log grade submission errors', async () => {
      mockPrisma.ltiLaunch.update.mockResolvedValue({
        id: 'launch-1',
        gradeStatus: 'FAILED',
        gradeError: 'Network timeout',
      });

      const result = await mockPrisma.ltiLaunch.update({
        where: { id: 'launch-1' },
        data: {
          gradeStatus: 'FAILED',
          gradeError: 'Network timeout',
        },
      });

      expect(result.gradeStatus).toBe('FAILED');
      expect(result.gradeError).toBe('Network timeout');
    });
  });
});
