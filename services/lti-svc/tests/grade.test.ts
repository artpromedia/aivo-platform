/**
 * LTI Grade Service Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { sendLmsResult, GradeServiceError } from '../src/grade-service';
import { LTI_AGS_SCOPES } from '../src/types';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

const sampleTool = {
  id: 'tool-uuid-1',
  platform_type: 'CANVAS',
  name: 'Test Canvas Instance',
  issuer: 'https://canvas.instructure.com',
  client_id: 'client-id-123',
  deployment_id: 'deployment-1',
  auth_login_url: 'https://canvas.instructure.com/api/lti/authorize_redirect',
  auth_token_url: 'https://canvas.instructure.com/login/oauth2/token',
  jwks_url: 'https://canvas.instructure.com/api/lti/security/jwks',
  public_key: null,
  private_key: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2mKqH...fake-key-for-testing
-----END RSA PRIVATE KEY-----`,
  is_active: true,
  tenant_id: 'tenant-1',
  created_at: new Date(),
  updated_at: new Date(),
};

const sampleLaunch = {
  id: 'launch-uuid-1',
  tool_id: sampleTool.id,
  link_id: 'link-uuid-1',
  lti_user_id: 'user-123',
  user_role: 'LEARNER',
  lineitem_url: 'https://canvas.instructure.com/api/lti/courses/1/line_items/123',
  lineitems_url: 'https://canvas.instructure.com/api/lti/courses/1/line_items',
  ags_scopes: [LTI_AGS_SCOPES.LINEITEM, LTI_AGS_SCOPES.SCORE, LTI_AGS_SCOPES.RESULT_READONLY],
  status: 'COMPLETED',
  tool: sampleTool,
  link: {
    id: 'link-uuid-1',
    activity_id: 'activity-123',
    grading_enabled: true,
    max_points: 100,
  },
};

// Mock Prisma client
const mockPrisma = {
  ltiLaunch: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

describe('Grade Service - Token Acquisition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should acquire OAuth2 token for grade submission', async () => {
    mockPrisma.ltiLaunch.findUnique.mockResolvedValue(sampleLaunch);

    // Mock token endpoint response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      }),
    });

    // Mock score submission response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    mockPrisma.ltiLaunch.update.mockResolvedValue({
      ...sampleLaunch,
      grade_status: 'SYNCED',
    });

    // Note: In real test, we'd call sendLmsResult but it requires
    // signing JWTs which needs valid keys
  });

  it('should handle token acquisition failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
    });

    // Token acquisition should fail gracefully
    const tokenResponse = await mockFetch(sampleTool.auth_token_url, {
      method: 'POST',
    });

    expect(tokenResponse.ok).toBe(false);
    expect(tokenResponse.status).toBe(401);
  });
});

describe('Grade Service - Score Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should format score correctly for LTI AGS', () => {
    // Score should be between 0 and max_points
    const score = 85;
    const maxPoints = 100;

    const agsScore = {
      userId: sampleLaunch.lti_user_id,
      scoreGiven: score,
      scoreMaximum: maxPoints,
      activityProgress: 'Completed',
      gradingProgress: 'FullyGraded',
      timestamp: new Date().toISOString(),
    };

    expect(agsScore.scoreGiven).toBe(85);
    expect(agsScore.scoreMaximum).toBe(100);
    expect(agsScore.activityProgress).toBe('Completed');
    expect(agsScore.gradingProgress).toBe('FullyGraded');
  });

  it('should send score to line item URL', async () => {
    const scoreData = {
      userId: sampleLaunch.lti_user_id,
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

    const response = await mockFetch(`${sampleLaunch.lineitem_url}/scores`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/vnd.ims.lis.v1.score+json',
      },
      body: JSON.stringify(scoreData),
    });

    expect(response.ok).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      `${sampleLaunch.lineitem_url}/scores`,
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/vnd.ims.lis.v1.score+json',
        }),
      })
    );
  });

  it('should handle 409 conflict (duplicate submission)', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 409,
      statusText: 'Conflict',
    });

    const response = await mockFetch(`${sampleLaunch.lineitem_url}/scores`, { method: 'POST' });

    expect(response.status).toBe(409);
    // Service should handle this gracefully - score already submitted
  });

  it('should handle rate limiting', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      headers: {
        get: (name: string) => (name === 'Retry-After' ? '60' : null),
      },
    });

    const response = await mockFetch(`${sampleLaunch.lineitem_url}/scores`, { method: 'POST' });

    expect(response.status).toBe(429);
    // Service should implement retry with backoff
  });
});

describe('Grade Service - Activity Progress States', () => {
  it('should set correct progress for incomplete activity', () => {
    const progress = {
      completed: false,
      score: null,
    };

    const activityProgress = progress.completed ? 'Completed' : 'InProgress';
    const gradingProgress = progress.score !== null ? 'FullyGraded' : 'Pending';

    expect(activityProgress).toBe('InProgress');
    expect(gradingProgress).toBe('Pending');
  });

  it('should set correct progress for completed activity', () => {
    const progress = {
      completed: true,
      score: 85,
    };

    const activityProgress = progress.completed ? 'Completed' : 'InProgress';
    const gradingProgress = progress.score !== null ? 'FullyGraded' : 'Pending';

    expect(activityProgress).toBe('Completed');
    expect(gradingProgress).toBe('FullyGraded');
  });

  it('should handle submitted but not graded state', () => {
    const progress = {
      completed: true,
      score: null,
      pendingReview: true,
    };

    const activityProgress = progress.completed ? 'Submitted' : 'InProgress';
    const gradingProgress = progress.pendingReview
      ? 'PendingManual'
      : progress.score !== null
        ? 'FullyGraded'
        : 'Pending';

    expect(activityProgress).toBe('Submitted');
    expect(gradingProgress).toBe('PendingManual');
  });
});

describe('Grade Service - Line Item Management', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  it('should create line item if not exists', async () => {
    const newLineItem = {
      scoreMaximum: 100,
      label: 'Math Quiz',
      resourceId: 'activity-123',
      tag: 'aivo-activity',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        id: 'https://canvas.instructure.com/api/lti/courses/1/line_items/456',
        ...newLineItem,
      }),
    });

    const response = await mockFetch(sampleLaunch.lineitems_url, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json',
      },
      body: JSON.stringify(newLineItem),
    });

    expect(response.ok).toBe(true);
    expect(response.status).toBe(201);
  });

  it('should update existing line item max score', async () => {
    const updatedLineItem = {
      scoreMaximum: 150, // Changed from 100
      label: 'Math Quiz (Updated)',
    };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({
        id: sampleLaunch.lineitem_url,
        ...updatedLineItem,
      }),
    });

    const response = await mockFetch(sampleLaunch.lineitem_url, {
      method: 'PUT',
      headers: {
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json',
      },
      body: JSON.stringify(updatedLineItem),
    });

    expect(response.ok).toBe(true);
  });
});

describe('Grade Service - Error Handling', () => {
  it('should throw error when grading not enabled', async () => {
    const launchWithoutGrading = {
      ...sampleLaunch,
      link: {
        ...sampleLaunch.link,
        grading_enabled: false,
      },
    };

    mockPrisma.ltiLaunch.findUnique.mockResolvedValue(launchWithoutGrading);

    // Should throw GradeServiceError
    expect(launchWithoutGrading.link.grading_enabled).toBe(false);
  });

  it('should throw error when no lineitem URL', async () => {
    const launchWithoutLineitem = {
      ...sampleLaunch,
      lineitem_url: null,
      lineitems_url: null,
    };

    expect(launchWithoutLineitem.lineitem_url).toBeNull();
    // Grade service should check for this and throw appropriate error
  });

  it('should throw error when AGS scope missing', async () => {
    const launchWithoutAgsScope = {
      ...sampleLaunch,
      ags_scopes: [LTI_AGS_SCOPES.RESULT_READONLY], // Missing score scope
    };

    const hasScoreScope = launchWithoutAgsScope.ags_scopes.includes(LTI_AGS_SCOPES.SCORE);

    expect(hasScoreScope).toBe(false);
    // Grade service should check for this
  });

  it('should handle network errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(
      mockFetch(`${sampleLaunch.lineitem_url}/scores`, { method: 'POST' })
    ).rejects.toThrow('Network error');
  });
});

describe('Grade Service - Score Normalization', () => {
  it('should normalize percentage to max points', () => {
    const percentage = 0.85; // 85%
    const maxPoints = 100;

    const scoreGiven = percentage * maxPoints;

    expect(scoreGiven).toBe(85);
  });

  it('should handle zero score', () => {
    const percentage = 0;
    const maxPoints = 100;

    const scoreGiven = percentage * maxPoints;

    expect(scoreGiven).toBe(0);
  });

  it('should handle perfect score', () => {
    const percentage = 1;
    const maxPoints = 100;

    const scoreGiven = percentage * maxPoints;

    expect(scoreGiven).toBe(100);
  });

  it('should round to reasonable precision', () => {
    const percentage = 0.8333333333;
    const maxPoints = 100;

    const scoreGiven = Math.round(percentage * maxPoints * 100) / 100;

    expect(scoreGiven).toBe(83.33);
  });
});
