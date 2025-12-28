// ══════════════════════════════════════════════════════════════════════════════
// LTI CONTROLLER INTEGRATION TESTS
// Tests for LTI 1.3 API endpoints
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { LtiController } from './lti.controller';
import { LtiProviderService } from './lti-provider.service';
import { LtiPlatformService } from './lti-platform.service';

describe('LtiController (Integration)', () => {
  let app: INestApplication;
  let ltiProviderService: LtiProviderService;
  let ltiPlatformService: LtiPlatformService;

  const mockLtiProviderService = {
    handleOidcLogin: vi.fn(),
    validateLaunch: vi.fn(),
    createLaunchSession: vi.fn(),
    handleDeepLinking: vi.fn(),
    createDeepLinkingResponse: vi.fn(),
    createLineItem: vi.fn(),
    getLineItems: vi.fn(),
    submitScore: vi.fn(),
    getScores: vi.fn(),
    getMembership: vi.fn(),
    getJwks: vi.fn(),
  };

  const mockLtiPlatformService = {
    initiateLaunch: vi.fn(),
    handleOidcCallback: vi.fn(),
    registerTool: vi.fn(),
    getRegisteredTools: vi.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [LtiController],
      providers: [
        { provide: LtiProviderService, useValue: mockLtiProviderService },
        { provide: LtiPlatformService, useValue: mockLtiPlatformService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    ltiProviderService = moduleFixture.get<LtiProviderService>(LtiProviderService);
    ltiPlatformService = moduleFixture.get<LtiPlatformService>(LtiPlatformService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OIDC Flow (Tool Provider)', () => {
    describe('POST /lti/oidc/login', () => {
      it('should handle OIDC login initiation', async () => {
        const loginRequest = {
          iss: 'https://platform.example.com',
          login_hint: 'user-123',
          target_link_uri: 'https://tool.example.com/launch',
          client_id: 'client-abc',
        };

        mockLtiProviderService.handleOidcLogin.mockResolvedValue(
          'https://platform.example.com/auth?response_type=id_token&state=xyz'
        );

        const response = await request(app.getHttpServer())
          .post('/lti/oidc/login')
          .send(loginRequest)
          .expect(302);

        expect(response.headers.location).toContain('platform.example.com');
      });

      it('should reject invalid OIDC request', async () => {
        const invalidRequest = {
          // Missing required fields
          iss: 'https://platform.example.com',
        };

        await request(app.getHttpServer())
          .post('/lti/oidc/login')
          .send(invalidRequest)
          .expect(400);
      });
    });

    describe('POST /lti/launch', () => {
      it('should validate and process LTI launch', async () => {
        const launchRequest = {
          id_token: 'valid.jwt.token',
          state: 'state-123',
        };

        mockLtiProviderService.validateLaunch.mockResolvedValue({
          valid: true,
          claims: {
            sub: 'user-123',
            messageType: 'LtiResourceLinkRequest',
            resourceLink: { id: 'resource-1', title: 'Resource' },
            context: { id: 'course-1', title: 'Course' },
            roles: ['Learner'],
          },
        });

        mockLtiProviderService.createLaunchSession.mockResolvedValue({
          launchId: 'launch-456',
          userId: 'user-123',
          redirectUrl: '/content/resource-1',
        });

        const response = await request(app.getHttpServer())
          .post('/lti/launch')
          .send(launchRequest)
          .expect(302);

        expect(response.headers.location).toContain('/content/');
      });

      it('should reject invalid token', async () => {
        mockLtiProviderService.validateLaunch.mockResolvedValue({
          valid: false,
          error: 'Invalid token signature',
        });

        const response = await request(app.getHttpServer())
          .post('/lti/launch')
          .send({ id_token: 'invalid.token', state: 'state' })
          .expect(401);

        expect(response.body.message).toContain('Invalid');
      });

      it('should handle deep linking request', async () => {
        mockLtiProviderService.validateLaunch.mockResolvedValue({
          valid: true,
          claims: {
            sub: 'user-123',
            messageType: 'LtiDeepLinkingRequest',
            deepLinkingSettings: {
              accept_types: ['ltiResourceLink'],
              deep_link_return_url: 'https://platform.example.com/return',
            },
          },
        });

        mockLtiProviderService.createLaunchSession.mockResolvedValue({
          launchId: 'launch-789',
          redirectUrl: '/content-picker?launchId=launch-789',
        });

        const response = await request(app.getHttpServer())
          .post('/lti/launch')
          .send({ id_token: 'valid.token', state: 'state' })
          .expect(302);

        expect(response.headers.location).toContain('content-picker');
      });
    });
  });

  describe('Deep Linking', () => {
    describe('POST /lti/deep-linking/response', () => {
      it('should create deep linking response', async () => {
        const responseRequest = {
          launchId: 'launch-123',
          contentItems: [
            {
              type: 'ltiResourceLink',
              title: 'Lesson 1',
              url: 'https://tool.example.com/lessons/1',
            },
          ],
        };

        mockLtiProviderService.createDeepLinkingResponse.mockResolvedValue({
          jwt: 'signed.response.jwt',
          returnUrl: 'https://platform.example.com/deep-link/return',
        });

        const response = await request(app.getHttpServer())
          .post('/lti/deep-linking/response')
          .send(responseRequest)
          .expect(200);

        expect(response.body.jwt).toBeDefined();
        expect(response.body.returnUrl).toBeDefined();
      });

      it('should validate content items', async () => {
        const invalidRequest = {
          launchId: 'launch-123',
          contentItems: [
            { type: 'invalid_type' }, // Invalid type
          ],
        };

        await request(app.getHttpServer())
          .post('/lti/deep-linking/response')
          .send(invalidRequest)
          .expect(400);
      });
    });
  });

  describe('Assignment and Grade Services (AGS)', () => {
    describe('GET /lti/ags/lineitems', () => {
      it('should return line items', async () => {
        mockLtiProviderService.getLineItems.mockResolvedValue([
          {
            id: 'https://platform.example.com/lineitems/1',
            label: 'Quiz 1',
            scoreMaximum: 100,
          },
          {
            id: 'https://platform.example.com/lineitems/2',
            label: 'Assignment 1',
            scoreMaximum: 50,
          },
        ]);

        const response = await request(app.getHttpServer())
          .get('/lti/ags/lineitems')
          .set('X-Launch-Id', 'launch-123')
          .expect(200);

        expect(response.body).toHaveLength(2);
        expect(response.body[0].label).toBe('Quiz 1');
      });
    });

    describe('POST /lti/ags/lineitems', () => {
      it('should create line item', async () => {
        const lineItem = {
          label: 'Final Exam',
          scoreMaximum: 100,
          resourceId: 'exam-1',
          tag: 'exam',
        };

        mockLtiProviderService.createLineItem.mockResolvedValue({
          id: 'https://platform.example.com/lineitems/3',
          ...lineItem,
        });

        const response = await request(app.getHttpServer())
          .post('/lti/ags/lineitems')
          .set('X-Launch-Id', 'launch-123')
          .send(lineItem)
          .expect(201);

        expect(response.body.id).toBeDefined();
        expect(response.body.label).toBe('Final Exam');
      });
    });

    describe('POST /lti/ags/lineitems/:id/scores', () => {
      it('should submit score', async () => {
        const score = {
          userId: 'user-456',
          scoreGiven: 85,
          scoreMaximum: 100,
          activityProgress: 'Completed',
          gradingProgress: 'FullyGraded',
        };

        mockLtiProviderService.submitScore.mockResolvedValue(undefined);

        await request(app.getHttpServer())
          .post('/lti/ags/lineitems/lineitem-1/scores')
          .set('X-Launch-Id', 'launch-123')
          .send(score)
          .expect(200);

        expect(mockLtiProviderService.submitScore).toHaveBeenCalledWith(
          'launch-123',
          'lineitem-1',
          score
        );
      });

      it('should validate score range', async () => {
        const invalidScore = {
          userId: 'user-456',
          scoreGiven: 150, // Exceeds maximum
          scoreMaximum: 100,
        };

        await request(app.getHttpServer())
          .post('/lti/ags/lineitems/lineitem-1/scores')
          .set('X-Launch-Id', 'launch-123')
          .send(invalidScore)
          .expect(400);
      });
    });

    describe('GET /lti/ags/lineitems/:id/results', () => {
      it('should return scores for line item', async () => {
        mockLtiProviderService.getScores.mockResolvedValue([
          {
            userId: 'user-1',
            scoreOf: 'https://platform.example.com/lineitems/1',
            resultScore: 0.85,
            resultMaximum: 1,
          },
        ]);

        const response = await request(app.getHttpServer())
          .get('/lti/ags/lineitems/lineitem-1/results')
          .set('X-Launch-Id', 'launch-123')
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].resultScore).toBe(0.85);
      });
    });
  });

  describe('Names and Role Provisioning Services (NRPS)', () => {
    describe('GET /lti/nrps/membership', () => {
      it('should return course membership', async () => {
        mockLtiProviderService.getMembership.mockResolvedValue({
          id: 'https://platform.example.com/memberships/course-1',
          context: { id: 'course-1', title: 'Course 1' },
          members: [
            {
              user_id: 'user-1',
              name: 'John Doe',
              email: 'john@example.com',
              roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
            },
          ],
        });

        const response = await request(app.getHttpServer())
          .get('/lti/nrps/membership')
          .set('X-Launch-Id', 'launch-123')
          .expect(200);

        expect(response.body.members).toHaveLength(1);
        expect(response.body.members[0].name).toBe('John Doe');
      });

      it('should filter by role', async () => {
        mockLtiProviderService.getMembership.mockResolvedValue({
          members: [
            { user_id: 'user-1', roles: ['Instructor'] },
          ],
        });

        await request(app.getHttpServer())
          .get('/lti/nrps/membership?role=Instructor')
          .set('X-Launch-Id', 'launch-123')
          .expect(200);

        expect(mockLtiProviderService.getMembership).toHaveBeenCalledWith(
          'launch-123',
          expect.objectContaining({ role: 'Instructor' })
        );
      });
    });
  });

  describe('Platform Mode (Launching External Tools)', () => {
    describe('POST /lti/platform/launch', () => {
      it('should initiate launch to external tool', async () => {
        const launchRequest = {
          toolId: 'tool-123',
          context: {
            courseId: 'course-456',
            resourceId: 'resource-789',
          },
        };

        mockLtiPlatformService.initiateLaunch.mockResolvedValue({
          oidcLoginUrl: 'https://tool.example.com/oidc/login',
          loginHint: 'user-abc',
          ltiMessageHint: 'context-data',
        });

        const response = await request(app.getHttpServer())
          .post('/lti/platform/launch')
          .send(launchRequest)
          .expect(200);

        expect(response.body.oidcLoginUrl).toBeDefined();
        expect(response.body.loginHint).toBeDefined();
      });
    });

    describe('POST /lti/platform/tools', () => {
      it('should register new tool', async () => {
        const toolRegistration = {
          name: 'External Quiz Tool',
          clientId: 'client-xyz',
          deploymentId: 'deploy-1',
          oidcLoginUrl: 'https://tool.example.com/oidc/login',
          launchUrl: 'https://tool.example.com/launch',
          jwksUrl: 'https://tool.example.com/.well-known/jwks.json',
        };

        mockLtiPlatformService.registerTool.mockResolvedValue({
          id: 'tool-new',
          ...toolRegistration,
          createdAt: new Date().toISOString(),
        });

        const response = await request(app.getHttpServer())
          .post('/lti/platform/tools')
          .send(toolRegistration)
          .expect(201);

        expect(response.body.id).toBe('tool-new');
      });
    });

    describe('GET /lti/platform/tools', () => {
      it('should list registered tools', async () => {
        mockLtiPlatformService.getRegisteredTools.mockResolvedValue([
          { id: 'tool-1', name: 'Tool 1' },
          { id: 'tool-2', name: 'Tool 2' },
        ]);

        const response = await request(app.getHttpServer())
          .get('/lti/platform/tools')
          .expect(200);

        expect(response.body).toHaveLength(2);
      });
    });
  });

  describe('JWKS Endpoint', () => {
    describe('GET /lti/.well-known/jwks.json', () => {
      it('should return JWKS', async () => {
        mockLtiProviderService.getJwks.mockResolvedValue({
          keys: [
            {
              kty: 'RSA',
              use: 'sig',
              alg: 'RS256',
              kid: 'key-1',
              n: 'modulus',
              e: 'AQAB',
            },
          ],
        });

        const response = await request(app.getHttpServer())
          .get('/lti/.well-known/jwks.json')
          .expect(200);

        expect(response.body.keys).toBeDefined();
        expect(response.body.keys[0].kty).toBe('RSA');
      });
    });
  });

  describe('OAuth2 Token Endpoint', () => {
    describe('POST /lti/token', () => {
      it('should issue access token for valid client assertion', async () => {
        const tokenRequest = {
          grant_type: 'client_credentials',
          client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
          client_assertion: 'valid.jwt.assertion',
          scope: 'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
        };

        // This would typically be handled by the platform service
        mockLtiPlatformService.handleOidcCallback = vi.fn().mockResolvedValue({
          access_token: 'access-token-123',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: tokenRequest.scope,
        });

        const response = await request(app.getHttpServer())
          .post('/lti/token')
          .type('form')
          .send(tokenRequest)
          .expect(200);

        expect(response.body.access_token).toBeDefined();
        expect(response.body.token_type).toBe('Bearer');
      });
    });
  });
});
