// ══════════════════════════════════════════════════════════════════════════════
// XAPI CONTROLLER INTEGRATION TESTS
// Tests for xAPI LRS endpoints
// ══════════════════════════════════════════════════════════════════════════════

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { XapiController } from './xapi.controller';
import { XapiService } from './xapi.service';
import { XapiAuthGuard } from './strategies/xapi-auth.strategy';

describe('XapiController (Integration)', () => {
  let app: INestApplication;
  let xapiService: XapiService;

  const mockXapiService = {
    storeStatement: vi.fn(),
    storeStatements: vi.fn(),
    getStatement: vi.fn(),
    getStatements: vi.fn(),
    voidStatement: vi.fn(),
    getState: vi.fn(),
    setState: vi.fn(),
    deleteState: vi.fn(),
    getActivityProfile: vi.fn(),
    setActivityProfile: vi.fn(),
    getAgentProfile: vi.fn(),
    setAgentProfile: vi.fn(),
  };

  const mockAuth = {
    clientId: 'client-123',
    permissions: ['statements/write', 'statements/read', 'state', 'profile'],
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [XapiController],
      providers: [
        { provide: XapiService, useValue: mockXapiService },
      ],
    })
      .overrideGuard(XapiAuthGuard)
      .useValue({
        canActivate: (context: any) => {
          const req = context.switchToHttp().getRequest();
          req.xapiAuth = mockAuth;
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    xapiService = moduleFixture.get<XapiService>(XapiService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Statements Resource', () => {
    describe('POST /xapi/statements', () => {
      it('should store single statement', async () => {
        const statement = {
          actor: {
            mbox: 'mailto:learner@example.com',
            name: 'John Doe',
          },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/completed',
            display: { 'en-US': 'completed' },
          },
          object: {
            id: 'https://example.com/activities/lesson-1',
            definition: {
              name: { 'en-US': 'Lesson 1' },
              type: 'http://adlnet.gov/expapi/activities/lesson',
            },
          },
        };

        mockXapiService.storeStatement.mockResolvedValue('stmt-uuid-123');

        const response = await request(app.getHttpServer())
          .post('/xapi/statements')
          .set('X-Experience-API-Version', '1.0.3')
          .send(statement)
          .expect(200);

        expect(response.body).toEqual(['stmt-uuid-123']);
      });

      it('should store multiple statements', async () => {
        const statements = [
          {
            actor: { mbox: 'mailto:user1@example.com' },
            verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
            object: { id: 'https://example.com/activity/1' },
          },
          {
            actor: { mbox: 'mailto:user2@example.com' },
            verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
            object: { id: 'https://example.com/activity/2' },
          },
        ];

        mockXapiService.storeStatements.mockResolvedValue(['stmt-1', 'stmt-2']);

        const response = await request(app.getHttpServer())
          .post('/xapi/statements')
          .set('X-Experience-API-Version', '1.0.3')
          .send(statements)
          .expect(200);

        expect(response.body).toEqual(['stmt-1', 'stmt-2']);
      });

      it('should validate statement structure', async () => {
        const invalidStatement = {
          // Missing required 'actor'
          verb: { id: 'http://example.com/verb' },
          object: { id: 'http://example.com/object' },
        };

        await request(app.getHttpServer())
          .post('/xapi/statements')
          .set('X-Experience-API-Version', '1.0.3')
          .send(invalidStatement)
          .expect(400);
      });

      it('should require xAPI version header', async () => {
        const statement = {
          actor: { mbox: 'mailto:test@example.com' },
          verb: { id: 'http://example.com/verb' },
          object: { id: 'http://example.com/object' },
        };

        await request(app.getHttpServer())
          .post('/xapi/statements')
          // Missing X-Experience-API-Version header
          .send(statement)
          .expect(400);
      });
    });

    describe('PUT /xapi/statements', () => {
      it('should store statement with specific ID', async () => {
        const statementId = 'custom-uuid-456';
        const statement = {
          actor: { mbox: 'mailto:learner@example.com' },
          verb: { id: 'http://adlnet.gov/expapi/verbs/experienced' },
          object: { id: 'https://example.com/activities/video-1' },
        };

        mockXapiService.storeStatement.mockResolvedValue(statementId);

        await request(app.getHttpServer())
          .put('/xapi/statements')
          .query({ statementId })
          .set('X-Experience-API-Version', '1.0.3')
          .send(statement)
          .expect(204);

        expect(mockXapiService.storeStatement).toHaveBeenCalledWith(
          expect.objectContaining({ id: statementId }),
          mockAuth
        );
      });

      it('should reject conflicting statement', async () => {
        const statementId = 'existing-uuid';

        mockXapiService.storeStatement.mockRejectedValue(
          new Error('Statement already exists with different content')
        );

        await request(app.getHttpServer())
          .put('/xapi/statements')
          .query({ statementId })
          .set('X-Experience-API-Version', '1.0.3')
          .send({
            actor: { mbox: 'mailto:test@example.com' },
            verb: { id: 'http://example.com/verb' },
            object: { id: 'http://example.com/object' },
          })
          .expect(409);
      });
    });

    describe('GET /xapi/statements', () => {
      it('should get statement by ID', async () => {
        const statement = {
          id: 'stmt-123',
          actor: { mbox: 'mailto:learner@example.com', name: 'John' },
          verb: { id: 'http://adlnet.gov/expapi/verbs/completed' },
          object: { id: 'https://example.com/activity' },
          stored: '2024-01-15T10:00:00Z',
        };

        mockXapiService.getStatement.mockResolvedValue(statement);

        const response = await request(app.getHttpServer())
          .get('/xapi/statements')
          .query({ statementId: 'stmt-123' })
          .set('X-Experience-API-Version', '1.0.3')
          .expect(200);

        expect(response.body.id).toBe('stmt-123');
      });

      it('should query statements with filters', async () => {
        const statements = {
          statements: [
            { id: 'stmt-1', verb: { id: 'http://adlnet.gov/expapi/verbs/completed' } },
            { id: 'stmt-2', verb: { id: 'http://adlnet.gov/expapi/verbs/completed' } },
          ],
          more: '',
        };

        mockXapiService.getStatements.mockResolvedValue(statements);

        const response = await request(app.getHttpServer())
          .get('/xapi/statements')
          .query({
            verb: 'http://adlnet.gov/expapi/verbs/completed',
            since: '2024-01-01T00:00:00Z',
            limit: 10,
          })
          .set('X-Experience-API-Version', '1.0.3')
          .expect(200);

        expect(response.body.statements).toHaveLength(2);
      });

      it('should filter by agent', async () => {
        mockXapiService.getStatements.mockResolvedValue({
          statements: [],
          more: '',
        });

        await request(app.getHttpServer())
          .get('/xapi/statements')
          .query({
            agent: JSON.stringify({ mbox: 'mailto:user@example.com' }),
          })
          .set('X-Experience-API-Version', '1.0.3')
          .expect(200);

        expect(mockXapiService.getStatements).toHaveBeenCalledWith(
          expect.objectContaining({
            agent: { mbox: 'mailto:user@example.com' },
          }),
          mockAuth
        );
      });

      it('should filter by activity', async () => {
        mockXapiService.getStatements.mockResolvedValue({
          statements: [],
          more: '',
        });

        await request(app.getHttpServer())
          .get('/xapi/statements')
          .query({
            activity: 'https://example.com/activities/course-1',
            related_activities: true,
          })
          .set('X-Experience-API-Version', '1.0.3')
          .expect(200);

        expect(mockXapiService.getStatements).toHaveBeenCalledWith(
          expect.objectContaining({
            activity: 'https://example.com/activities/course-1',
            relatedActivities: true,
          }),
          mockAuth
        );
      });

      it('should support pagination', async () => {
        mockXapiService.getStatements.mockResolvedValue({
          statements: Array(10).fill({ id: 'stmt' }),
          more: '/xapi/statements?cursor=abc123',
        });

        const response = await request(app.getHttpServer())
          .get('/xapi/statements')
          .query({ limit: 10 })
          .set('X-Experience-API-Version', '1.0.3')
          .expect(200);

        expect(response.body.more).toContain('cursor');
      });
    });
  });

  describe('Voiding Statements', () => {
    describe('POST /xapi/statements (voiding)', () => {
      it('should void existing statement', async () => {
        const voidingStatement = {
          actor: { mbox: 'mailto:admin@example.com' },
          verb: {
            id: 'http://adlnet.gov/expapi/verbs/voided',
          },
          object: {
            objectType: 'StatementRef',
            id: 'stmt-to-void',
          },
        };

        mockXapiService.voidStatement.mockResolvedValue('voiding-stmt-id');

        const response = await request(app.getHttpServer())
          .post('/xapi/statements')
          .set('X-Experience-API-Version', '1.0.3')
          .send(voidingStatement)
          .expect(200);

        expect(response.body).toEqual(['voiding-stmt-id']);
      });

      it('should reject voiding of non-existent statement', async () => {
        const voidingStatement = {
          actor: { mbox: 'mailto:admin@example.com' },
          verb: { id: 'http://adlnet.gov/expapi/verbs/voided' },
          object: { objectType: 'StatementRef', id: 'non-existent' },
        };

        mockXapiService.voidStatement.mockRejectedValue(
          new Error('Statement not found')
        );

        await request(app.getHttpServer())
          .post('/xapi/statements')
          .set('X-Experience-API-Version', '1.0.3')
          .send(voidingStatement)
          .expect(404);
      });
    });
  });

  describe('State Resource', () => {
    describe('GET /xapi/activities/state', () => {
      it('should get state document', async () => {
        const stateData = { progress: 50, bookmark: 'page-5' };
        mockXapiService.getState.mockResolvedValue(stateData);

        const response = await request(app.getHttpServer())
          .get('/xapi/activities/state')
          .query({
            activityId: 'https://example.com/activity/1',
            agent: JSON.stringify({ mbox: 'mailto:user@example.com' }),
            stateId: 'progress',
          })
          .set('X-Experience-API-Version', '1.0.3')
          .expect(200);

        expect(response.body).toEqual(stateData);
      });

      it('should list state IDs', async () => {
        mockXapiService.getState.mockResolvedValue(['state1', 'state2']);

        const response = await request(app.getHttpServer())
          .get('/xapi/activities/state')
          .query({
            activityId: 'https://example.com/activity/1',
            agent: JSON.stringify({ mbox: 'mailto:user@example.com' }),
          })
          .set('X-Experience-API-Version', '1.0.3')
          .expect(200);

        expect(response.body).toEqual(['state1', 'state2']);
      });
    });

    describe('PUT /xapi/activities/state', () => {
      it('should store state document', async () => {
        const stateData = { progress: 75 };

        await request(app.getHttpServer())
          .put('/xapi/activities/state')
          .query({
            activityId: 'https://example.com/activity/1',
            agent: JSON.stringify({ mbox: 'mailto:user@example.com' }),
            stateId: 'progress',
          })
          .set('X-Experience-API-Version', '1.0.3')
          .set('Content-Type', 'application/json')
          .send(stateData)
          .expect(204);

        expect(mockXapiService.setState).toHaveBeenCalled();
      });
    });

    describe('DELETE /xapi/activities/state', () => {
      it('should delete state document', async () => {
        await request(app.getHttpServer())
          .delete('/xapi/activities/state')
          .query({
            activityId: 'https://example.com/activity/1',
            agent: JSON.stringify({ mbox: 'mailto:user@example.com' }),
            stateId: 'progress',
          })
          .set('X-Experience-API-Version', '1.0.3')
          .expect(204);

        expect(mockXapiService.deleteState).toHaveBeenCalled();
      });
    });
  });

  describe('Activity Profile Resource', () => {
    describe('GET /xapi/activities/profile', () => {
      it('should get activity profile', async () => {
        const profile = { metadata: { version: '1.0' } };
        mockXapiService.getActivityProfile.mockResolvedValue(profile);

        const response = await request(app.getHttpServer())
          .get('/xapi/activities/profile')
          .query({
            activityId: 'https://example.com/activity/1',
            profileId: 'metadata',
          })
          .set('X-Experience-API-Version', '1.0.3')
          .expect(200);

        expect(response.body).toEqual(profile);
      });
    });

    describe('PUT /xapi/activities/profile', () => {
      it('should store activity profile', async () => {
        const profile = { settings: { difficulty: 'hard' } };

        await request(app.getHttpServer())
          .put('/xapi/activities/profile')
          .query({
            activityId: 'https://example.com/activity/1',
            profileId: 'settings',
          })
          .set('X-Experience-API-Version', '1.0.3')
          .send(profile)
          .expect(204);

        expect(mockXapiService.setActivityProfile).toHaveBeenCalled();
      });
    });
  });

  describe('Agent Profile Resource', () => {
    describe('GET /xapi/agents/profile', () => {
      it('should get agent profile', async () => {
        const profile = { preferences: { language: 'en' } };
        mockXapiService.getAgentProfile.mockResolvedValue(profile);

        const response = await request(app.getHttpServer())
          .get('/xapi/agents/profile')
          .query({
            agent: JSON.stringify({ mbox: 'mailto:user@example.com' }),
            profileId: 'preferences',
          })
          .set('X-Experience-API-Version', '1.0.3')
          .expect(200);

        expect(response.body).toEqual(profile);
      });
    });

    describe('PUT /xapi/agents/profile', () => {
      it('should store agent profile', async () => {
        const profile = { preferences: { theme: 'dark' } };

        await request(app.getHttpServer())
          .put('/xapi/agents/profile')
          .query({
            agent: JSON.stringify({ mbox: 'mailto:user@example.com' }),
            profileId: 'preferences',
          })
          .set('X-Experience-API-Version', '1.0.3')
          .send(profile)
          .expect(204);

        expect(mockXapiService.setAgentProfile).toHaveBeenCalled();
      });
    });
  });

  describe('About Resource', () => {
    describe('GET /xapi/about', () => {
      it('should return LRS information', async () => {
        const response = await request(app.getHttpServer())
          .get('/xapi/about')
          .expect(200);

        expect(response.body.version).toContain('1.0.3');
        expect(response.body.extensions).toBeDefined();
      });
    });
  });
});
