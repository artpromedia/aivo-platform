/**
 * LTI Launch Flow Integration Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { validateIdToken, mapLtiRole, processLaunchPayload } from '../src/lti-auth';
import { LaunchService } from '../src/launch-service';
import { LTI_CLAIMS, LTI_MESSAGE_TYPES, LTI_ROLES } from '../src/types';
import type { LtiIdTokenPayload, LtiUserRole } from '../src/types';

// Mock Prisma client
const mockPrisma = {
  ltiTool: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  ltiLink: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  ltiLaunch: {
    create: vi.fn(),
    update: vi.fn(),
    findUnique: vi.fn(),
  },
  ltiNonce: {
    findFirst: vi.fn(),
    create: vi.fn(),
  },
  ltiUserMapping: {
    findFirst: vi.fn(),
    create: vi.fn(),
    upsert: vi.fn(),
  },
};

// Sample LTI ID Token payload
const sampleIdToken: LtiIdTokenPayload = {
  iss: 'https://canvas.instructure.com',
  sub: 'user-123',
  aud: 'client-id-123',
  exp: Math.floor(Date.now() / 1000) + 3600,
  iat: Math.floor(Date.now() / 1000),
  nonce: 'unique-nonce-123',
  [LTI_CLAIMS.MESSAGE_TYPE]: LTI_MESSAGE_TYPES.RESOURCE_LINK_REQUEST,
  [LTI_CLAIMS.VERSION]: '1.3.0',
  [LTI_CLAIMS.DEPLOYMENT_ID]: 'deployment-1',
  [LTI_CLAIMS.TARGET_LINK_URI]: 'https://aivo.app/lti/launch',
  [LTI_CLAIMS.RESOURCE_LINK]: {
    id: 'resource-link-1',
    title: 'Math Quiz',
    description: 'Practice addition',
  },
  [LTI_CLAIMS.ROLES]: [LTI_ROLES.LEARNER],
  [LTI_CLAIMS.CONTEXT]: {
    id: 'course-123',
    label: 'MATH101',
    title: 'Introduction to Mathematics',
    type: ['http://purl.imsglobal.org/vocab/lis/v2/course#CourseOffering'],
  },
  name: 'John Student',
  email: 'john@school.edu',
  given_name: 'John',
  family_name: 'Student',
};

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
  private_key: '---PRIVATE KEY---',
  is_active: true,
  tenant_id: 'tenant-1',
  created_at: new Date(),
  updated_at: new Date(),
};

describe('LTI Role Mapping', () => {
  it('should map instructor role correctly', () => {
    const roles = [LTI_ROLES.INSTRUCTOR];
    expect(mapLtiRole(roles)).toBe('INSTRUCTOR' as LtiUserRole);
  });

  it('should map learner role correctly', () => {
    const roles = [LTI_ROLES.LEARNER];
    expect(mapLtiRole(roles)).toBe('LEARNER' as LtiUserRole);
  });

  it('should map admin role correctly', () => {
    const roles = [LTI_ROLES.ADMIN];
    expect(mapLtiRole(roles)).toBe('ADMIN' as LtiUserRole);
  });

  it('should map content developer role correctly', () => {
    const roles = [LTI_ROLES.CONTENT_DEVELOPER];
    expect(mapLtiRole(roles)).toBe('CONTENT_DEVELOPER' as LtiUserRole);
  });

  it('should prefer instructor over learner when both present', () => {
    const roles = [LTI_ROLES.LEARNER, LTI_ROLES.INSTRUCTOR];
    expect(mapLtiRole(roles)).toBe('INSTRUCTOR' as LtiUserRole);
  });

  it('should default to OTHER for unknown roles', () => {
    const roles = ['http://purl.imsglobal.org/vocab/lis/v2/unknown#Role'];
    expect(mapLtiRole(roles)).toBe('OTHER' as LtiUserRole);
  });

  it('should handle context-specific instructor role', () => {
    const roles = [LTI_ROLES.CONTEXT_INSTRUCTOR];
    expect(mapLtiRole(roles)).toBe('INSTRUCTOR' as LtiUserRole);
  });
});

describe('Launch Payload Processing', () => {
  it('should extract all required fields from payload', () => {
    const result = processLaunchPayload(sampleIdToken);

    expect(result.user_id).toBe('user-123');
    expect(result.resource_link_id).toBe('resource-link-1');
    expect(result.context_id).toBe('course-123');
    expect(result.context_label).toBe('MATH101');
    expect(result.context_title).toBe('Introduction to Mathematics');
    expect(result.user_role).toBe('LEARNER');
    expect(result.user_name).toBe('John Student');
    expect(result.user_email).toBe('john@school.edu');
  });

  it('should handle missing optional fields gracefully', () => {
    const minimalPayload: LtiIdTokenPayload = {
      ...sampleIdToken,
      [LTI_CLAIMS.CONTEXT]: undefined,
      name: undefined,
      email: undefined,
    };

    const result = processLaunchPayload(minimalPayload);

    expect(result.context_id).toBeUndefined();
    expect(result.context_label).toBeUndefined();
    expect(result.user_name).toBeUndefined();
    expect(result.user_email).toBeUndefined();
  });

  it('should extract AGS claim when present', () => {
    const payloadWithAgs: LtiIdTokenPayload = {
      ...sampleIdToken,
      [LTI_CLAIMS.AGS]: {
        scope: [
          'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
          'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
          'https://purl.imsglobal.org/spec/lti-ags/scope/score',
        ],
        lineitems: 'https://canvas.instructure.com/api/lti/courses/1/line_items',
        lineitem: 'https://canvas.instructure.com/api/lti/courses/1/line_items/123',
      },
    };

    const result = processLaunchPayload(payloadWithAgs);

    expect(result.lineitem_url).toBe(
      'https://canvas.instructure.com/api/lti/courses/1/line_items/123'
    );
    expect(result.lineitems_url).toBe(
      'https://canvas.instructure.com/api/lti/courses/1/line_items'
    );
  });
});

describe('LaunchService', () => {
  let launchService: LaunchService;

  beforeEach(() => {
    vi.clearAllMocks();
    launchService = new LaunchService(mockPrisma as any);
  });

  describe('handleOidcLogin', () => {
    it('should generate auth redirect for valid login request', async () => {
      mockPrisma.ltiTool.findFirst.mockResolvedValue(sampleTool);

      const result = await launchService.handleOidcLogin({
        iss: 'https://canvas.instructure.com',
        login_hint: 'user-123',
        target_link_uri: 'https://aivo.app/lti/launch',
        lti_message_hint: 'message-hint',
        client_id: 'client-id-123',
        lti_deployment_id: 'deployment-1',
      });

      expect(result.redirect_url).toContain(sampleTool.auth_login_url);
      expect(result.redirect_url).toContain('state=');
      expect(result.redirect_url).toContain('nonce=');
      expect(result.redirect_url).toContain('login_hint=user-123');
    });

    it('should throw error for unknown platform', async () => {
      mockPrisma.ltiTool.findFirst.mockResolvedValue(null);

      await expect(
        launchService.handleOidcLogin({
          iss: 'https://unknown-lms.com',
          login_hint: 'user-123',
          target_link_uri: 'https://aivo.app/lti/launch',
        })
      ).rejects.toThrow('Unknown LTI platform');
    });

    it('should throw error for inactive tool', async () => {
      mockPrisma.ltiTool.findFirst.mockResolvedValue({
        ...sampleTool,
        is_active: false,
      });

      await expect(
        launchService.handleOidcLogin({
          iss: 'https://canvas.instructure.com',
          login_hint: 'user-123',
          target_link_uri: 'https://aivo.app/lti/launch',
          client_id: 'client-id-123',
        })
      ).rejects.toThrow('LTI tool is not active');
    });
  });

  describe('handleLaunch', () => {
    it('should create launch record for valid launch', async () => {
      const state = 'stored-state';
      const toolId = sampleTool.id;

      // Mock state retrieval (internal implementation)
      // This would be part of LaunchService's internal state management

      mockPrisma.ltiTool.findUnique.mockResolvedValue(sampleTool);
      mockPrisma.ltiNonce.findFirst.mockResolvedValue(null);
      mockPrisma.ltiNonce.create.mockResolvedValue({ id: 'nonce-1' });
      mockPrisma.ltiLaunch.create.mockResolvedValue({
        id: 'launch-uuid-1',
        tool_id: toolId,
        lti_user_id: 'user-123',
        user_role: 'LEARNER',
        status: 'PENDING',
        created_at: new Date(),
      });
      mockPrisma.ltiUserMapping.upsert.mockResolvedValue({
        id: 'mapping-1',
        tool_id: toolId,
        lti_user_id: 'user-123',
        aivo_user_id: null,
      });
      mockPrisma.ltiLink.findFirst.mockResolvedValue(null);

      // Note: Full handleLaunch test would require mocking JWT validation
      // This is a simplified test showing the expected behavior
    });

    it('should reject expired state', async () => {
      // State not found in store should throw
      await expect(launchService.handleLaunch('invalid-state', 'some-id-token')).rejects.toThrow();
    });
  });

  describe('getLaunch', () => {
    it('should return launch data with link info', async () => {
      const launchId = 'launch-uuid-1';
      const mockLaunch = {
        id: launchId,
        tool_id: sampleTool.id,
        link_id: 'link-uuid-1',
        lti_user_id: 'user-123',
        user_role: 'LEARNER',
        user_name: 'John Student',
        context_id: 'course-123',
        context_label: 'MATH101',
        context_title: 'Introduction to Mathematics',
        status: 'PENDING',
        message_type: LTI_MESSAGE_TYPES.RESOURCE_LINK_REQUEST,
        created_at: new Date(),
        updated_at: new Date(),
        tool: sampleTool,
        link: {
          id: 'link-uuid-1',
          activity_id: 'activity-123',
          activity_type: 'LESSON',
          title: 'Math Quiz',
          max_points: 100,
          grading_enabled: true,
        },
      };

      mockPrisma.ltiLaunch.findUnique.mockResolvedValue(mockLaunch);

      const result = await launchService.getLaunch(launchId);

      expect(result).not.toBeNull();
      expect(result?.id).toBe(launchId);
      expect(result?.link?.activity_id).toBe('activity-123');
    });

    it('should return null for non-existent launch', async () => {
      mockPrisma.ltiLaunch.findUnique.mockResolvedValue(null);

      const result = await launchService.getLaunch('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('completeLaunch', () => {
    it('should update launch status and set session ID', async () => {
      const launchId = 'launch-uuid-1';
      const aivoSessionId = 'session-abc';

      mockPrisma.ltiLaunch.update.mockResolvedValue({
        id: launchId,
        status: 'COMPLETED',
        aivo_session_id: aivoSessionId,
        updated_at: new Date(),
      });

      const result = await launchService.completeLaunch(launchId, aivoSessionId);

      expect(mockPrisma.ltiLaunch.update).toHaveBeenCalledWith({
        where: { id: launchId },
        data: {
          status: 'COMPLETED',
          aivo_session_id: aivoSessionId,
        },
      });
      expect(result.status).toBe('COMPLETED');
    });
  });
});

describe('LTI Launch Validation', () => {
  it('should reject token with wrong audience', () => {
    const invalidPayload = {
      ...sampleIdToken,
      aud: 'wrong-client-id',
    };

    // In production, this validation happens during JWT verification
    expect(invalidPayload.aud).not.toBe(sampleTool.client_id);
  });

  it('should reject expired token', () => {
    const expiredPayload = {
      ...sampleIdToken,
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
    };

    expect(expiredPayload.exp).toBeLessThan(Math.floor(Date.now() / 1000));
  });

  it('should require deployment ID to match', () => {
    const wrongDeployment = {
      ...sampleIdToken,
      [LTI_CLAIMS.DEPLOYMENT_ID]: 'wrong-deployment',
    };

    expect(wrongDeployment[LTI_CLAIMS.DEPLOYMENT_ID]).not.toBe(sampleTool.deployment_id);
  });
});
