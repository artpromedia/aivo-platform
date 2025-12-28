// ══════════════════════════════════════════════════════════════════════════════
// LTI PROVIDER SERVICE UNIT TESTS
// Tests for LTI 1.3 Tool Provider functionality
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LtiProviderService } from './lti-provider.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as jose from 'jose';

vi.mock('jose');

describe('LtiProviderService', () => {
  let service: LtiProviderService;
  let prisma: PrismaService;

  const mockPrisma = {
    ltiTool: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    ltiLaunch: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    ltiNonce: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  };

  const mockConfigService = {
    get: vi.fn((key: string) => {
      const config: Record<string, string> = {
        'LTI_ISSUER': 'https://platform.example.com',
        'LTI_PRIVATE_KEY': 'mock-private-key',
        'LTI_PUBLIC_KEY': 'mock-public-key',
        'LTI_KEY_ID': 'key-1',
        'BASE_URL': 'https://api.example.com',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LtiProviderService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<LtiProviderService>(LtiProviderService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('handleOidcLogin', () => {
    it('should validate OIDC login request and return redirect URL', async () => {
      const loginRequest = {
        iss: 'https://platform.example.com',
        login_hint: 'user-123',
        target_link_uri: 'https://tool.example.com/launch',
        lti_message_hint: 'hint-456',
        client_id: 'client-abc',
      };

      const tool = {
        id: 'tool-1',
        clientId: 'client-abc',
        deploymentId: 'deploy-1',
        oidcAuthUrl: 'https://platform.example.com/auth',
        publicKey: 'platform-public-key',
      };

      mockPrisma.ltiTool.findFirst.mockResolvedValue(tool);

      const result = await service.handleOidcLogin(loginRequest);

      expect(result).toContain('https://platform.example.com/auth');
      expect(result).toContain('response_type=id_token');
      expect(result).toContain('scope=openid');
      expect(result).toContain('state=');
      expect(result).toContain('nonce=');
    });

    it('should reject login from unknown platform', async () => {
      const loginRequest = {
        iss: 'https://unknown-platform.com',
        login_hint: 'user-123',
        target_link_uri: 'https://tool.example.com/launch',
        client_id: 'unknown-client',
      };

      mockPrisma.ltiTool.findFirst.mockResolvedValue(null);

      await expect(service.handleOidcLogin(loginRequest)).rejects.toThrow(
        'Unknown platform'
      );
    });
  });

  describe('validateLaunch', () => {
    it('should validate and decode ID token', async () => {
      const idToken = 'valid.jwt.token';
      const state = 'state-123';

      const decodedPayload = {
        iss: 'https://platform.example.com',
        aud: 'client-abc',
        sub: 'user-123',
        nonce: 'nonce-456',
        'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
        'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
        'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deploy-1',
        'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://tool.example.com/launch',
        'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
          id: 'resource-1',
          title: 'Test Resource',
        },
        'https://purl.imsglobal.org/spec/lti/claim/roles': [
          'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
        ],
        'https://purl.imsglobal.org/spec/lti/claim/context': {
          id: 'course-1',
          title: 'Test Course',
        },
      };

      const tool = {
        id: 'tool-1',
        clientId: 'client-abc',
        deploymentId: 'deploy-1',
        publicKey: 'platform-public-key',
        jwksUrl: 'https://platform.example.com/.well-known/jwks.json',
      };

      mockPrisma.ltiTool.findFirst.mockResolvedValue(tool);
      mockPrisma.ltiNonce.findUnique.mockResolvedValue(null);
      mockPrisma.ltiNonce.create.mockResolvedValue({ nonce: 'nonce-456' });

      vi.mocked(jose.jwtVerify).mockResolvedValue({
        payload: decodedPayload,
        protectedHeader: { alg: 'RS256', kid: 'key-1' },
      } as any);

      const result = await service.validateLaunch(idToken, state);

      expect(result.valid).toBe(true);
      expect(result.claims.sub).toBe('user-123');
      expect(result.claims.messageType).toBe('LtiResourceLinkRequest');
    });

    it('should reject expired token', async () => {
      const idToken = 'expired.jwt.token';
      const state = 'state-123';

      vi.mocked(jose.jwtVerify).mockRejectedValue(
        new jose.errors.JWTExpired('Token expired')
      );

      const result = await service.validateLaunch(idToken, state);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject replayed nonce', async () => {
      const idToken = 'valid.jwt.token';
      const state = 'state-123';

      const decodedPayload = {
        iss: 'https://platform.example.com',
        aud: 'client-abc',
        nonce: 'used-nonce',
      };

      mockPrisma.ltiNonce.findUnique.mockResolvedValue({ nonce: 'used-nonce' });

      vi.mocked(jose.jwtVerify).mockResolvedValue({
        payload: decodedPayload,
        protectedHeader: { alg: 'RS256' },
      } as any);

      const result = await service.validateLaunch(idToken, state);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('nonce');
    });
  });

  describe('createLaunchSession', () => {
    it('should create launch session and return session data', async () => {
      const claims = {
        sub: 'user-123',
        iss: 'https://platform.example.com',
        aud: 'client-abc',
        deploymentId: 'deploy-1',
        messageType: 'LtiResourceLinkRequest',
        version: '1.3.0',
        resourceLink: { id: 'resource-1', title: 'Resource' },
        context: { id: 'course-1', title: 'Course' },
        roles: ['Learner'],
        custom: { user_id: 'internal-user-1' },
      };

      mockPrisma.ltiLaunch.create.mockResolvedValue({
        id: 'launch-1',
        userId: 'user-123',
        contextId: 'course-1',
        resourceLinkId: 'resource-1',
        createdAt: new Date(),
      });

      const result = await service.createLaunchSession(claims);

      expect(result.launchId).toBe('launch-1');
      expect(result.userId).toBe('user-123');
      expect(mockPrisma.ltiLaunch.create).toHaveBeenCalled();
    });
  });

  describe('handleDeepLinking', () => {
    it('should process deep linking request', async () => {
      const claims = {
        sub: 'user-123',
        iss: 'https://platform.example.com',
        messageType: 'LtiDeepLinkingRequest',
        'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings': {
          accept_types: ['ltiResourceLink'],
          accept_presentation_document_targets: ['iframe'],
          deep_link_return_url: 'https://platform.example.com/deep-link/return',
        },
      };

      const result = await service.handleDeepLinking(claims);

      expect(result.acceptTypes).toContain('ltiResourceLink');
      expect(result.returnUrl).toBe('https://platform.example.com/deep-link/return');
    });

    it('should generate deep linking response JWT', async () => {
      const launchId = 'launch-1';
      const contentItems = [
        {
          type: 'ltiResourceLink',
          title: 'My Resource',
          url: 'https://tool.example.com/resources/1',
        },
      ];

      const launch = {
        id: launchId,
        toolId: 'tool-1',
        claims: {
          'https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings': {
            deep_link_return_url: 'https://platform.example.com/return',
            data: 'context-data',
          },
        },
      };

      const tool = {
        id: 'tool-1',
        clientId: 'client-abc',
        deploymentId: 'deploy-1',
      };

      mockPrisma.ltiLaunch.findUnique.mockResolvedValue(launch);
      mockPrisma.ltiTool.findUnique.mockResolvedValue(tool);

      vi.mocked(jose.SignJWT.prototype.sign).mockResolvedValue('signed.jwt.token');

      const result = await service.createDeepLinkingResponse(launchId, contentItems);

      expect(result.jwt).toBeDefined();
      expect(result.returnUrl).toBe('https://platform.example.com/return');
    });
  });

  describe('Assignment and Grade Services (AGS)', () => {
    it('should create line item', async () => {
      const launchId = 'launch-1';
      const lineItem = {
        label: 'Quiz 1',
        scoreMaximum: 100,
        resourceId: 'quiz-1',
      };

      const launch = {
        id: launchId,
        toolId: 'tool-1',
        claims: {
          'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
            lineitems: 'https://platform.example.com/api/lti/lineitems',
            scope: [
              'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
              'https://purl.imsglobal.org/spec/lti-ags/scope/score',
            ],
          },
        },
      };

      mockPrisma.ltiLaunch.findUnique.mockResolvedValue(launch);

      // Mock fetch for AGS API call
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          id: 'https://platform.example.com/api/lti/lineitems/1',
          ...lineItem,
        }),
      });

      const result = await service.createLineItem(launchId, lineItem);

      expect(result.id).toContain('lineitems');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://platform.example.com/api/lti/lineitems',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/vnd.ims.lis.v2.lineitem+json',
          }),
        })
      );
    });

    it('should submit score', async () => {
      const launchId = 'launch-1';
      const lineItemId = 'https://platform.example.com/api/lti/lineitems/1';
      const score = {
        userId: 'user-123',
        scoreGiven: 85,
        scoreMaximum: 100,
        activityProgress: 'Completed',
        gradingProgress: 'FullyGraded',
      };

      const launch = {
        id: launchId,
        toolId: 'tool-1',
        claims: {
          'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
            scope: ['https://purl.imsglobal.org/spec/lti-ags/scope/score'],
          },
        },
      };

      mockPrisma.ltiLaunch.findUnique.mockResolvedValue(launch);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      await service.submitScore(launchId, lineItemId, score);

      expect(global.fetch).toHaveBeenCalledWith(
        `${lineItemId}/scores`,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/vnd.ims.lis.v1.score+json',
          }),
        })
      );
    });
  });

  describe('Names and Role Provisioning Services (NRPS)', () => {
    it('should retrieve course membership', async () => {
      const launchId = 'launch-1';

      const launch = {
        id: launchId,
        toolId: 'tool-1',
        claims: {
          'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice': {
            context_memberships_url: 'https://platform.example.com/api/lti/memberships',
            service_versions: ['2.0'],
          },
        },
      };

      const memberships = {
        members: [
          {
            user_id: 'user-1',
            name: 'John Doe',
            roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
          },
          {
            user_id: 'user-2',
            name: 'Jane Smith',
            roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'],
          },
        ],
      };

      mockPrisma.ltiLaunch.findUnique.mockResolvedValue(launch);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(memberships),
      });

      const result = await service.getMembership(launchId);

      expect(result.members).toHaveLength(2);
      expect(global.fetch).toHaveBeenCalledWith(
        'https://platform.example.com/api/lti/memberships',
        expect.objectContaining({
          headers: expect.objectContaining({
            Accept: 'application/vnd.ims.lti-nrps.v2.membershipcontainer+json',
          }),
        })
      );
    });
  });

  describe('getAccessToken', () => {
    it('should request and cache access token', async () => {
      const tool = {
        id: 'tool-1',
        clientId: 'client-abc',
        tokenUrl: 'https://platform.example.com/oauth2/token',
      };

      const tokenResponse = {
        access_token: 'access-token-123',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockPrisma.ltiTool.findUnique.mockResolvedValue(tool);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(tokenResponse),
      });

      vi.mocked(jose.SignJWT.prototype.sign).mockResolvedValue('client-assertion');

      const result = await service['getAccessToken']('tool-1', ['scope1']);

      expect(result).toBe('access-token-123');
      expect(global.fetch).toHaveBeenCalledWith(
        'https://platform.example.com/oauth2/token',
        expect.objectContaining({
          method: 'POST',
          body: expect.any(String),
        })
      );
    });
  });

  describe('JWKS endpoint', () => {
    it('should return public keys in JWKS format', async () => {
      const result = await service.getJwks();

      expect(result.keys).toBeDefined();
      expect(Array.isArray(result.keys)).toBe(true);
    });
  });
});
