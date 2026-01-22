import type { FastifyInstance } from 'fastify';

import * as searchService from '../services/searchService.js';

export default async function routes(app: FastifyInstance) {
  // Index Management
  app.post('/indexes', async (request, reply) => {
    const data = request.body as any;
    const index = await searchService.createIndex(request.tenantId!, data);
    return reply.status(201).send(index);
  });

  app.get('/indexes', async (request) => {
    const { status, engine } = request.query as any;
    return searchService.listIndexes(request.tenantId!, { status, engine });
  });

  app.get('/indexes/:indexId', async (request, reply) => {
    const { indexId } = request.params as { indexId: string };
    const index = await searchService.getIndex(request.tenantId!, indexId);
    if (!index) return reply.status(404).send({ error: 'Index not found' });
    return index;
  });

  app.patch('/indexes/:indexId', async (request, reply) => {
    const { indexId } = request.params as { indexId: string };
    const data = request.body as any;
    const index = await searchService.updateIndex(request.tenantId!, indexId, data);
    return index;
  });

  app.delete('/indexes/:indexId', async (request, reply) => {
    const { indexId } = request.params as { indexId: string };
    await searchService.deleteIndex(request.tenantId!, indexId);
    return reply.status(204).send();
  });

  // Document Indexing
  app.post('/indexes/:indexId/documents', async (request, reply) => {
    const { indexId } = request.params as { indexId: string };
    const data = request.body as any;
    const doc = await searchService.indexDocument(request.tenantId!, indexId, data);
    return reply.status(201).send(doc);
  });

  app.post('/indexes/:indexId/documents/_bulk', async (request, reply) => {
    const { indexId } = request.params as { indexId: string };
    const { documents } = request.body as { documents: any[] };
    const result = await searchService.bulkIndexDocuments(request.tenantId!, indexId, documents);
    return result;
  });

  app.delete('/indexes/:indexId/documents/:sourceId', async (request, reply) => {
    const { indexId, sourceId } = request.params as { indexId: string; sourceId: string };
    await searchService.deleteDocument(request.tenantId!, indexId, sourceId);
    return reply.status(204).send();
  });

  // Search Operations
  app.post('/search', async (request) => {
    const params = request.body as any;
    return searchService.search(request.tenantId!, params);
  });

  app.get('/search/:indexName', async (request) => {
    const { indexName } = request.params as { indexName: string };
    const { q, page, pageSize, sortBy, sortOrder, highlight, facets } = request.query as any;

    return searchService.search(request.tenantId!, {
      indexName,
      query: q || '',
      page: page ? Number.parseInt(page) : 1,
      pageSize: pageSize ? Number.parseInt(pageSize) : 20,
      sortBy,
      sortOrder,
      highlight: highlight === 'true',
      facets: facets ? facets.split(',') : undefined,
    });
  });

  app.get('/suggest/:indexName', async (request) => {
    const { indexName } = request.params as { indexName: string };
    const { prefix, limit } = request.query as { prefix: string; limit?: string };
    return searchService.getSuggestions(
      request.tenantId!,
      indexName,
      prefix,
      limit ? Number.parseInt(limit) : 10
    );
  });

  // Synonym Management
  app.post('/indexes/:indexId/synonyms', async (request, reply) => {
    const { indexId } = request.params as { indexId: string };
    const { term, synonyms } = request.body as { term: string; synonyms: string[] };
    const rule = await searchService.addSynonym(request.tenantId!, indexId, term, synonyms);
    return reply.status(201).send(rule);
  });

  app.delete('/indexes/:indexId/synonyms/:term', async (request, reply) => {
    const { indexId, term } = request.params as { indexId: string; term: string };
    await searchService.removeSynonym(request.tenantId!, indexId, term);
    return reply.status(204).send();
  });

  // Boost Rules
  app.post('/indexes/:indexId/boost-rules', async (request, reply) => {
    const { indexId } = request.params as { indexId: string };
    const data = request.body as any;
    const rule = await searchService.addBoostRule(request.tenantId!, indexId, data);
    return reply.status(201).send(rule);
  });

  // Facet Configuration
  app.post('/indexes/:indexName/facets', async (request, reply) => {
    const { indexName } = request.params as { indexName: string };
    const data = request.body as any;
    const config = await searchService.configureFacet(request.tenantId!, indexName, data);
    return reply.status(201).send(config);
  });

  // Reindex Operations
  app.post('/indexes/:indexId/reindex', async (request, reply) => {
    const { indexId } = request.params as { indexId: string };
    const job = await searchService.triggerReindex(request.tenantId!, indexId);
    return reply.status(202).send(job);
  });

  app.get('/reindex-jobs/:jobId', async (request, reply) => {
    const { jobId } = request.params as { jobId: string };
    const job = await searchService.getReindexStatus(request.tenantId!, jobId);
    if (!job) return reply.status(404).send({ error: 'Reindex job not found' });
    return job;
  });

  // Analytics
  app.get('/analytics', async (request) => {
    const { indexName, startDate, endDate } = request.query as any;
    return searchService.getSearchAnalytics(request.tenantId!, {
      indexName,
      startDate: new Date(startDate || Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(endDate || Date.now()),
    });
  });
}
