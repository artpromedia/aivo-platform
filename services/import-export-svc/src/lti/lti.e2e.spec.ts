// ══════════════════════════════════════════════════════════════════════════════
// LTI E2E TESTS
// End-to-end tests for complete LTI 1.3 flows
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import * as jose from 'jose';
import { AppModule } from '../app.module';
import { PrismaService } from '../prisma/prisma.service';

// Mock jose for JWT operations in tests
vi.mock('jose', async () => {
  const actual = await vi.importActual('jose');
  return {
    ...actual,
    jwtVerify: vi.fn(),
    SignJWT: vi.fn().mockImplementation(() => ({
      setProtectedHeader: vi.fn().mockReturnThis(),
      setIssuer: vi.fn().mockReturnThis(),
      setAudience: vi.fn().mockReturnThis(),
      setSubject: vi.fn().mockReturnThis(),
      setExpirationTime: vi.fn().mockReturnThis(),
      setIssuedAt: vi.fn().mockReturnThis(),
      setNotBefore: vi.fn().mockReturnThis(),
      sign: vi.fn().mockResolvedValue('signed.jwt.token'),
    })),
  };
});

describe('LTI 1.3 E2E Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  // Test platform configuration
  const testPlatform = {
    iss: 'https://test-platform.example.com',
    clientId: 'test-client-id',
    deploymentId: 'test-deployment-1',
    oidcAuthUrl: 'https://test-platform.example.com/auth',
    tokenUrl: 'https://test-platform.example.com/token',
    jwksUrl: 'https://test-platform.example.com/.well-known/jwks.json',
    publicKey: 'test-public-key',
  };

  // Test tool configuration
  const testTool = {
    name: 'Test Tool',
    clientId: 'tool-client-id',
    deploymentId: 'tool-deployment-1',
    oidcLoginUrl: 'https://test-tool.example.com/oidc/login',
    launchUrl: 'https://test-tool.example.com/launch',
    jwksUrl: 'https://test-tool.example.com/.well-known/jwks.json',
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = moduleFixture.get<PrismaService>(PrismaService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Register test platform as tool provider
    await prisma.ltiTool.create({
      data: {
        id: 'platform-tool-1',
        name: 'Test Platform',
        clientId: testPlatform.clientId,
        deploymentId: testPlatform.deploymentId,
        issuer: testPlatform.iss,
        oidcAuthUrl: testPlatform.oidcAuthUrl,
        tokenUrl: testPlatform.tokenUrl,
        jwksUrl: testPlatform.jwksUrl,
        publicKey: testPlatform.publicKey,
        isActive: true,
      },
    });

    // Register test tool for platform mode
    await prisma.ltiTool.create({
      data: {
        id: 'external-tool-1',
        name: testTool.name,
        clientId: testTool.clientId,
        deploymentId: testTool.deploymentId,
        oidcLoginUrl: testTool.oidcLoginUrl,
        launchUrl: testTool.launchUrl,
        jwksUrl: testTool.jwksUrl,
        isActive: true,
      },
    });
  }

  async function cleanupTestData() {
    await prisma.ltiLaunch.deleteMany({});
    await prisma.ltiNonce.deleteMany({});
    await prisma.ltiTool.deleteMany({});
  }

  describe('Tool Provider Flow (AIVO as Tool)', () => {
    describe('Complete OIDC Launch Flow', () => {
      it('should complete full OIDC login → launch flow', async () => {
        // Step 1: Platform initiates OIDC login
        const loginResponse = await request(app.getHttpServer())
          .post('/lti/oidc/login')
          .send({
            iss: testPlatform.iss,
            login_hint: 'user-12345',
            target_link_uri: 'https://aivo.example.com/lti/launch',
            client_id: testPlatform.clientId,
            lti_deployment_id: testPlatform.deploymentId,
          })
          .expect(302);

        // Verify redirect to platform auth endpoint
        expect(loginResponse.headers.location).toContain(testPlatform.oidcAuthUrl);
        expect(loginResponse.headers.location).toContain('response_type=id_token');
        expect(loginResponse.headers.location).toContain('state=');
        expect(loginResponse.headers.location).toContain('nonce=');

        // Extract state from redirect
        const redirectUrl = new URL(loginResponse.headers.location);
        const state = redirectUrl.searchParams.get('state');
        const nonce = redirectUrl.searchParams.get('nonce');

        // Step 2: Platform returns with ID token (simulated)
        const idTokenPayload = createTestIdToken({
          iss: testPlatform.iss,
          aud: testPlatform.clientId,
          sub: 'user-12345',
          nonce: nonce!,
          messageType: 'LtiResourceLinkRequest',
          deploymentId: testPlatform.deploymentId,
          resourceLink: {
            id: 'resource-abc',
            title: 'Test Resource',
          },
          context: {
            id: 'course-xyz',
            title: 'Test Course',
            type: ['CourseSection'],
          },
          roles: [
            'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
          ],
        });

        // Mock JWT verification to return our payload
        vi.mocked(jose.jwtVerify).mockResolvedValue({
          payload: idTokenPayload,
          protectedHeader: { alg: 'RS256', kid: 'key-1' },
        } as any);

        const launchResponse = await request(app.getHttpServer())
          .post('/lti/launch')
          .send({
            id_token: 'mock.jwt.token',
            state: state,
          })
          .expect(302);

        // Verify redirect to content
        expect(launchResponse.headers.location).toBeDefined();

        // Step 3: Verify launch was recorded
        const launches = await prisma.ltiLaunch.findMany({
          where: { userId: 'user-12345' },
        });
        expect(launches.length).toBeGreaterThan(0);
      });

      it('should reject login from unregistered platform', async () => {
        await request(app.getHttpServer())
          .post('/lti/oidc/login')
          .send({
            iss: 'https://unknown-platform.com',
            login_hint: 'user-123',
            target_link_uri: 'https://aivo.example.com/launch',
            client_id: 'unknown-client',
          })
          .expect(401);
      });

      it('should reject expired token', async () => {
        vi.mocked(jose.jwtVerify).mockRejectedValue(
          new jose.errors.JWTExpired('Token expired')
        );

        await request(app.getHttpServer())
          .post('/lti/launch')
          .send({
            id_token: 'expired.jwt.token',
            state: 'valid-state',
          })
          .expect(401);
      });

      it('should reject invalid signature', async () => {
        vi.mocked(jose.jwtVerify).mockRejectedValue(
          new jose.errors.JWSSignatureVerificationFailed('Invalid signature')
        );

        await request(app.getHttpServer())
          .post('/lti/launch')
          .send({
            id_token: 'tampered.jwt.token',
            state: 'valid-state',
          })
          .expect(401);
      });
    });

    describe('Deep Linking Flow', () => {
      it('should handle deep linking request and response', async () => {
        // Create launch with deep linking message type
        const idTokenPayload = createTestIdToken({
          iss: testPlatform.iss,
          aud: testPlatform.clientId,
          sub: 'instructor-123',
          nonce: 'dl-nonce',
          messageType: 'LtiDeepLinkingRequest',
          deploymentId: testPlatform.deploymentId,
          deepLinkingSettings: {
            accept_types: ['ltiResourceLink'],
            accept_presentation_document_targets: ['iframe', 'window'],
            accept_multiple: true,
            auto_create: false,
            deep_link_return_url: 'https://test-platform.example.com/deep-link/return',
            data: 'context-data-token',
          },
          roles: [
            'http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor',
          ],
        });

        vi.mocked(jose.jwtVerify).mockResolvedValue({
          payload: idTokenPayload,
          protectedHeader: { alg: 'RS256' },
        } as any);

        // Step 1: Handle deep linking launch
        const launchResponse = await request(app.getHttpServer())
          .post('/lti/launch')
          .send({
            id_token: 'dl.jwt.token',
            state: 'dl-state',
          })
          .expect(302);

        // Should redirect to content picker
        expect(launchResponse.headers.location).toContain('content-picker');

        // Extract launch ID from redirect
        const launchUrl = new URL(launchResponse.headers.location, 'http://localhost');
        const launchId = launchUrl.searchParams.get('launchId');

        // Step 2: Submit deep linking response
        const contentItems = [
          {
            type: 'ltiResourceLink',
            title: 'Lesson 1: Introduction',
            url: 'https://aivo.example.com/content/lesson-1',
            lineItem: {
              label: 'Lesson 1 Grade',
              scoreMaximum: 100,
            },
          },
          {
            type: 'ltiResourceLink',
            title: 'Quiz 1',
            url: 'https://aivo.example.com/content/quiz-1',
            lineItem: {
              label: 'Quiz 1 Score',
              scoreMaximum: 50,
            },
          },
        ];

        const dlResponse = await request(app.getHttpServer())
          .post('/lti/deep-linking/response')
          .send({
            launchId,
            contentItems,
          })
          .expect(200);

        expect(dlResponse.body.jwt).toBeDefined();
        expect(dlResponse.body.returnUrl).toBe(
          'https://test-platform.example.com/deep-link/return'
        );
      });
    });

    describe('Assignment and Grade Services (AGS)', () => {
      let launchId: string;

      beforeEach(async () => {
        // Create a launch with AGS claims
        const launch = await prisma.ltiLaunch.create({
          data: {
            id: `launch-ags-${Date.now()}`,
            toolId: 'platform-tool-1',
            userId: 'user-ags-test',
            contextId: 'course-ags',
            resourceLinkId: 'resource-ags',
            claims: {
              'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
                lineitems: 'https://test-platform.example.com/api/lti/lineitems',
                lineitem: 'https://test-platform.example.com/api/lti/lineitems/1',
                scope: [
                  'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
                  'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
                  'https://purl.imsglobal.org/spec/lti-ags/scope/score',
                  'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
                ],
              },
            },
          },
        });
        launchId = launch.id;
      });

      it('should create line item', async () => {
        // Mock external AGS API call
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'https://test-platform.example.com/api/lti/lineitems/new',
            label: 'Unit Test',
            scoreMaximum: 100,
            resourceId: 'unit-test-1',
          }),
        });

        const response = await request(app.getHttpServer())
          .post('/lti/ags/lineitems')
          .set('X-Launch-Id', launchId)
          .send({
            label: 'Unit Test',
            scoreMaximum: 100,
            resourceId: 'unit-test-1',
          })
          .expect(201);

        expect(response.body.id).toBeDefined();
        expect(response.body.label).toBe('Unit Test');
      });

      it('should submit score to line item', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          status: 200,
        });

        await request(app.getHttpServer())
          .post('/lti/ags/lineitems/lineitem-1/scores')
          .set('X-Launch-Id', launchId)
          .send({
            userId: 'student-123',
            scoreGiven: 85,
            scoreMaximum: 100,
            activityProgress: 'Completed',
            gradingProgress: 'FullyGraded',
            timestamp: new Date().toISOString(),
          })
          .expect(200);

        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/scores'),
          expect.objectContaining({ method: 'POST' })
        );
      });

      it('should get results from line item', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve([
            {
              userId: 'student-1',
              resultScore: 0.85,
              resultMaximum: 1,
              comment: 'Good work!',
            },
          ]),
        });

        const response = await request(app.getHttpServer())
          .get('/lti/ags/lineitems/lineitem-1/results')
          .set('X-Launch-Id', launchId)
          .expect(200);

        expect(response.body).toHaveLength(1);
        expect(response.body[0].resultScore).toBe(0.85);
      });
    });

    describe('Names and Role Provisioning Services (NRPS)', () => {
      let launchId: string;

      beforeEach(async () => {
        const launch = await prisma.ltiLaunch.create({
          data: {
            id: `launch-nrps-${Date.now()}`,
            toolId: 'platform-tool-1',
            userId: 'instructor-nrps',
            contextId: 'course-nrps',
            resourceLinkId: 'resource-nrps',
            claims: {
              'https://purl.imsglobal.org/spec/lti-nrps/claim/namesroleservice': {
                context_memberships_url:
                  'https://test-platform.example.com/api/lti/memberships',
                service_versions: ['2.0'],
              },
            },
          },
        });
        launchId = launch.id;
      });

      it('should retrieve course membership', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            id: 'https://test-platform.example.com/api/lti/memberships',
            context: { id: 'course-nrps', title: 'Test Course' },
            members: [
              {
                user_id: 'student-1',
                name: 'Alice Smith',
                email: 'alice@example.com',
                roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
                status: 'Active',
              },
              {
                user_id: 'student-2',
                name: 'Bob Jones',
                roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Learner'],
                status: 'Active',
              },
              {
                user_id: 'instructor-1',
                name: 'Carol Williams',
                roles: ['http://purl.imsglobal.org/vocab/lis/v2/membership#Instructor'],
                status: 'Active',
              },
            ],
          }),
        });

        const response = await request(app.getHttpServer())
          .get('/lti/nrps/membership')
          .set('X-Launch-Id', launchId)
          .expect(200);

        expect(response.body.members).toHaveLength(3);
        expect(response.body.context.id).toBe('course-nrps');
      });

      it('should filter membership by role', async () => {
        global.fetch = vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({
            members: [
              { user_id: 'instructor-1', roles: ['Instructor'] },
            ],
          }),
        });

        const response = await request(app.getHttpServer())
          .get('/lti/nrps/membership')
          .query({ role: 'Instructor' })
          .set('X-Launch-Id', launchId)
          .expect(200);

        expect(response.body.members).toHaveLength(1);
      });
    });
  });

  describe('Platform Mode (AIVO Launching External Tools)', () => {
    it('should initiate launch to external tool', async () => {
      const response = await request(app.getHttpServer())
        .post('/lti/platform/launch')
        .send({
          toolId: 'external-tool-1',
          context: {
            courseId: 'course-123',
            resourceId: 'lesson-456',
            userId: 'learner-789',
          },
          launchPresentation: {
            documentTarget: 'iframe',
            height: 600,
            width: 800,
          },
        })
        .expect(200);

      expect(response.body.oidcLoginUrl).toBe(testTool.oidcLoginUrl);
      expect(response.body.loginHint).toBeDefined();
      expect(response.body.ltiMessageHint).toBeDefined();
    });

    it('should handle tool OIDC callback', async () => {
      // Simulate tool sending OIDC auth request
      const response = await request(app.getHttpServer())
        .get('/lti/platform/auth')
        .query({
          response_type: 'id_token',
          redirect_uri: testTool.launchUrl,
          client_id: testTool.clientId,
          state: 'tool-state-123',
          nonce: 'tool-nonce-456',
          scope: 'openid',
          login_hint: 'encoded-user-hint',
          lti_message_hint: 'encoded-context-hint',
        })
        .expect(302);

      // Should redirect back to tool with id_token
      expect(response.headers.location).toContain(testTool.launchUrl);
      expect(response.headers.location).toContain('id_token=');
    });
  });

  describe('Security Tests', () => {
    it('should reject replayed nonces', async () => {
      const nonce = 'unique-nonce-12345';

      // First use of nonce should succeed
      await prisma.ltiNonce.create({
        data: {
          nonce,
          clientId: testPlatform.clientId,
          expiresAt: new Date(Date.now() + 300000),
        },
      });

      // Create token with same nonce
      vi.mocked(jose.jwtVerify).mockResolvedValue({
        payload: createTestIdToken({
          nonce,
          iss: testPlatform.iss,
          aud: testPlatform.clientId,
        }),
        protectedHeader: { alg: 'RS256' },
      } as any);

      // Second use should fail
      await request(app.getHttpServer())
        .post('/lti/launch')
        .send({
          id_token: 'token.with.replayed.nonce',
          state: 'some-state',
        })
        .expect(401);
    });

    it('should enforce scope restrictions for AGS', async () => {
      // Create launch with limited scope
      const launch = await prisma.ltiLaunch.create({
        data: {
          id: `launch-limited-${Date.now()}`,
          toolId: 'platform-tool-1',
          userId: 'user-limited',
          contextId: 'course-limited',
          resourceLinkId: 'resource-limited',
          claims: {
            'https://purl.imsglobal.org/spec/lti-ags/claim/endpoint': {
              lineitems: 'https://platform.example.com/lineitems',
              scope: [
                // Only readonly scope, no write
                'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
              ],
            },
          },
        },
      });

      // Attempt to create line item should fail
      await request(app.getHttpServer())
        .post('/lti/ags/lineitems')
        .set('X-Launch-Id', launch.id)
        .send({
          label: 'Unauthorized',
          scoreMaximum: 100,
        })
        .expect(403);
    });

    it('should validate token audience', async () => {
      vi.mocked(jose.jwtVerify).mockResolvedValue({
        payload: createTestIdToken({
          iss: testPlatform.iss,
          aud: 'wrong-client-id', // Wrong audience
          nonce: 'valid-nonce',
        }),
        protectedHeader: { alg: 'RS256' },
      } as any);

      await request(app.getHttpServer())
        .post('/lti/launch')
        .send({
          id_token: 'token.wrong.audience',
          state: 'state',
        })
        .expect(401);
    });
  });

  describe('JWKS Endpoint', () => {
    it('should serve public keys in JWKS format', async () => {
      const response = await request(app.getHttpServer())
        .get('/lti/.well-known/jwks.json')
        .expect(200);

      expect(response.body.keys).toBeDefined();
      expect(Array.isArray(response.body.keys)).toBe(true);
      
      if (response.body.keys.length > 0) {
        const key = response.body.keys[0];
        expect(key.kty).toBe('RSA');
        expect(key.use).toBe('sig');
        expect(key.alg).toBe('RS256');
        expect(key.kid).toBeDefined();
        expect(key.n).toBeDefined();
        expect(key.e).toBeDefined();
      }
    });
  });
});

// Helper function to create test ID tokens
function createTestIdToken(overrides: Partial<any> = {}): any {
  const basePayload = {
    iss: 'https://platform.example.com',
    aud: 'client-id',
    sub: 'user-123',
    exp: Math.floor(Date.now() / 1000) + 3600,
    iat: Math.floor(Date.now() / 1000),
    nonce: 'test-nonce',
    'https://purl.imsglobal.org/spec/lti/claim/message_type': 'LtiResourceLinkRequest',
    'https://purl.imsglobal.org/spec/lti/claim/version': '1.3.0',
    'https://purl.imsglobal.org/spec/lti/claim/deployment_id': 'deployment-1',
    'https://purl.imsglobal.org/spec/lti/claim/target_link_uri': 'https://tool.example.com/launch',
    'https://purl.imsglobal.org/spec/lti/claim/resource_link': {
      id: 'resource-1',
      title: 'Test Resource',
    },
    'https://purl.imsglobal.org/spec/lti/claim/roles': [
      'http://purl.imsglobal.org/vocab/lis/v2/membership#Learner',
    ],
    ...overrides,
  };

  // Map friendly names to claim URIs
  if (overrides.messageType) {
    basePayload['https://purl.imsglobal.org/spec/lti/claim/message_type'] = overrides.messageType;
  }
  if (overrides.deploymentId) {
    basePayload['https://purl.imsglobal.org/spec/lti/claim/deployment_id'] = overrides.deploymentId;
  }
  if (overrides.resourceLink) {
    basePayload['https://purl.imsglobal.org/spec/lti/claim/resource_link'] = overrides.resourceLink;
  }
  if (overrides.context) {
    basePayload['https://purl.imsglobal.org/spec/lti/claim/context'] = overrides.context;
  }
  if (overrides.roles) {
    basePayload['https://purl.imsglobal.org/spec/lti/claim/roles'] = overrides.roles;
  }
  if (overrides.deepLinkingSettings) {
    basePayload['https://purl.imsglobal.org/spec/lti-dl/claim/deep_linking_settings'] = overrides.deepLinkingSettings;
  }

  return basePayload;
}
