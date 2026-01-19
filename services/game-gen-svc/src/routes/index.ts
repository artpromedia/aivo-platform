import { FastifyInstance } from 'fastify';
import * as gameGenService from '../services/gameGenService.js';

export default async function routes(app: FastifyInstance) {
  // Template Management
  app.post('/templates', async (request, reply) => {
    const data = request.body as any;
    const template = await gameGenService.createTemplate(request.tenantId!, {
      ...data,
      createdBy: request.user!.sub,
    });
    return reply.status(201).send(template);
  });

  app.get('/templates', async (request) => {
    const { gameType, category, includePublic } = request.query as any;
    return gameGenService.listTemplates(request.tenantId!, {
      gameType,
      category,
      includePublic: includePublic !== 'false',
    });
  });

  app.get('/templates/:templateId', async (request, reply) => {
    const { templateId } = request.params as { templateId: string };
    const template = await gameGenService.getTemplate(request.tenantId!, templateId);
    if (!template) return reply.notFound('Template not found');
    return template;
  });

  // Game Generation
  app.post('/generate', async (request, reply) => {
    const data = request.body as any;
    const generation = await gameGenService.startGeneration(request.tenantId!, {
      ...data,
      generatedBy: request.user!.sub,
    });
    return reply.status(202).send(generation);
  });

  app.get('/generations', async (request) => {
    const { status, gameType, limit } = request.query as any;
    return gameGenService.listGenerations(request.tenantId!, {
      status,
      gameType,
      limit: limit ? Number.parseInt(limit) : 50,
    });
  });

  app.get('/generations/:generationId', async (request, reply) => {
    const { generationId } = request.params as { generationId: string };
    const generation = await gameGenService.getGeneration(request.tenantId!, generationId);
    if (!generation) return reply.notFound('Generation not found');
    return generation;
  });

  // Game Management
  app.get('/games', async (request) => {
    const { gameType, isPublished, tags, limit } = request.query as any;
    return gameGenService.listGames(request.tenantId!, {
      gameType,
      isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
      tags: tags ? tags.split(',') : undefined,
      limit: limit ? Number.parseInt(limit) : 50,
    });
  });

  app.get('/games/:gameId', async (request, reply) => {
    const { gameId } = request.params as { gameId: string };
    const game = await gameGenService.getGame(request.tenantId!, gameId);
    if (!game) return reply.notFound('Game not found');
    return game;
  });

  app.patch('/games/:gameId', async (request) => {
    const { gameId } = request.params as { gameId: string };
    const data = request.body as any;
    return gameGenService.updateGame(request.tenantId!, gameId, data);
  });

  app.post('/games/:gameId/publish', async (request) => {
    const { gameId } = request.params as { gameId: string };
    return gameGenService.publishGame(request.tenantId!, gameId);
  });

  // Game Sessions
  app.post('/games/:gameId/sessions', async (request, reply) => {
    const { gameId } = request.params as { gameId: string };
    const { learnerId } = request.body as { learnerId: string };
    const session = await gameGenService.startSession(request.tenantId!, gameId, learnerId);
    return reply.status(201).send(session);
  });

  app.patch('/sessions/:sessionId', async (request) => {
    const { sessionId } = request.params as { sessionId: string };
    const data = request.body as any;
    return gameGenService.updateSession(request.tenantId!, sessionId, data);
  });

  app.post('/sessions/:sessionId/complete', async (request) => {
    const { sessionId } = request.params as { sessionId: string };
    const data = request.body as any;
    return gameGenService.completeSession(request.tenantId!, sessionId, data);
  });

  app.get('/learners/:learnerId/sessions', async (request) => {
    const { learnerId } = request.params as { learnerId: string };
    const { gameId } = request.query as { gameId?: string };
    return gameGenService.getSessionHistory(request.tenantId!, learnerId, gameId);
  });

  // Question Bank
  app.post('/question-bank', async (request, reply) => {
    const data = request.body as any;
    const question = await gameGenService.addToQuestionBank(request.tenantId!, {
      ...data,
      createdBy: request.user!.sub,
    });
    return reply.status(201).send(question);
  });

  app.get('/question-bank', async (request) => {
    const { subject, topic, difficulty, questionType, count, excludeIds } = request.query as any;
    return gameGenService.getQuestionsFromBank(request.tenantId!, {
      subject,
      topic,
      difficulty,
      questionType,
      count: count ? Number.parseInt(count) : 10,
      excludeIds: excludeIds ? excludeIds.split(',') : undefined,
    });
  });

  // Feedback
  app.post('/games/:gameId/feedback', async (request, reply) => {
    const { gameId } = request.params as { gameId: string };
    const data = request.body as any;
    const feedback = await gameGenService.submitFeedback(request.tenantId!, gameId, data);
    return reply.status(201).send(feedback);
  });

  // Analytics
  app.get('/games/:gameId/analytics', async (request) => {
    const { gameId } = request.params as { gameId: string };
    const { startDate, endDate } = request.query as any;
    return gameGenService.getGameAnalytics(
      request.tenantId!,
      gameId,
      new Date(startDate || Date.now() - 30 * 24 * 60 * 60 * 1000),
      new Date(endDate || Date.now())
    );
  });
}
