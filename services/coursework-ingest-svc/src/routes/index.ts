import { FastifyInstance } from 'fastify';
import * as ingestService from '../services/ingestService.js';

export default async function routes(app: FastifyInstance) {
  // Job Management
  app.post('/jobs', async (request, reply) => {
    const data = request.body as any;
    const job = await ingestService.createJob(request.tenantId!, {
      ...data,
      createdBy: request.user!.sub,
    });
    return reply.status(201).send(job);
  });

  app.get('/jobs', async (request) => {
    const { status, createdBy, limit } = request.query as any;
    return ingestService.listJobs(request.tenantId!, {
      status,
      createdBy,
      limit: limit ? Number.parseInt(limit) : 50,
    });
  });

  app.get('/jobs/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = await ingestService.getJob(request.tenantId!, jobId);
    if (!job) return reply.notFound('Job not found');
    return job;
  });

  app.post('/jobs/:jobId/cancel', async (request) => {
    const { jobId } = request.params as { jobId: string };
    return ingestService.cancelJob(request.tenantId!, jobId);
  });

  app.post('/jobs/:jobId/start', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    // Start processing in background
    ingestService.startProcessing(request.tenantId!, jobId).catch(console.error);
    return reply.status(202).send({ message: 'Processing started' });
  });

  app.get('/jobs/:jobId/logs', async (request) => {
    const { jobId } = request.params as { jobId: string };
    const { limit } = request.query as { limit?: string };
    return ingestService.getJobLogs(request.tenantId!, jobId, limit ? Number.parseInt(limit) : 100);
  });

  // Item Management
  app.post('/jobs/:jobId/items', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const data = request.body as any;
    const item = await ingestService.addItem(request.tenantId!, jobId, data);
    return reply.status(201).send(item);
  });

  app.get('/items/:itemId', async (request, reply) => {
    const { itemId } = request.params as { itemId: string };
    const item = await ingestService.getItem(request.tenantId!, itemId);
    if (!item) return reply.notFound('Item not found');
    return item;
  });

  // Templates
  app.post('/templates', async (request, reply) => {
    const data = request.body as any;
    const template = await ingestService.createTemplate(request.tenantId!, {
      ...data,
      createdBy: request.user!.sub,
    });
    return reply.status(201).send(template);
  });

  app.get('/templates', async (request) => {
    const { contentType } = request.query as { contentType?: any };
    return ingestService.listTemplates(request.tenantId!, contentType);
  });

  // Import Mappings
  app.post('/import-mappings', async (request, reply) => {
    const data = request.body as any;
    const mapping = await ingestService.createImportMapping(request.tenantId!, data);
    return reply.status(201).send(mapping);
  });

  app.get('/import-mappings', async (request) => {
    const { sourceSystem } = request.query as { sourceSystem?: string };
    return ingestService.getImportMappings(request.tenantId!, sourceSystem);
  });

  // Quota
  app.get('/quota', async (request) => {
    return ingestService.getQuota(request.tenantId!);
  });

  app.patch('/quota', async (request) => {
    const data = request.body as any;
    return ingestService.updateQuota(request.tenantId!, data);
  });

  // Webhooks
  app.post('/webhooks', async (request, reply) => {
    const data = request.body as any;
    const webhook = await ingestService.createWebhook(request.tenantId!, data);
    return reply.status(201).send(webhook);
  });

  app.get('/webhooks', async (request) => {
    return ingestService.listWebhooks(request.tenantId!);
  });
}
