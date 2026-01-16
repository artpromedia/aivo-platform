/**
 * AIVO Legal Hold Service - Data Source Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

import * as dataSourceService from '../services/dataSourceService.js';

const DataSourceTypeSchema = z.enum([
  'EMAIL', 'FILE_SHARE', 'SHAREPOINT', 'ONEDRIVE', 'GOOGLE_DRIVE',
  'SLACK', 'TEAMS', 'DATABASE', 'APPLICATION', 'ARCHIVE', 'BACKUP', 'OTHER'
]);

const CreateDataSourceSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  sourceType: DataSourceTypeSchema,
  connectionInfo: z.record(z.unknown()).optional(),
  canPreserve: z.boolean().optional(),
  canExport: z.boolean().optional(),
  canSearch: z.boolean().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const UpdateDataSourceSchema = CreateDataSourceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export default async function dataSourceRoutes(fastify: FastifyInstance): Promise<void> {
  // List data sources
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { sourceType, isActive, page, pageSize } = request.query as any;

    const result = await dataSourceService.listDataSources(tenantId, {
      sourceType,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page,
      pageSize,
    });
    return reply.send(result);
  });

  // Get data source types
  fastify.get('/types', async (_request: FastifyRequest, reply: FastifyReply) => {
    const types = dataSourceService.getDataSourceTypes();
    return reply.send(types);
  });

  // Create data source
  fastify.post('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;

    const parsed = CreateDataSourceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    try {
      const dataSource = await dataSourceService.createDataSource(tenantId, parsed.data);
      return reply.status(201).send(dataSource);
    } catch (error: any) {
      if (error.code === 'P2002') {
        return reply.status(409).send({ error: 'Data source with this name already exists' });
      }
      throw error;
    }
  });

  // Get data source
  fastify.get('/:dataSourceId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { dataSourceId } = request.params as { dataSourceId: string };

    const dataSource = await dataSourceService.getDataSource(tenantId, dataSourceId);
    if (!dataSource) {
      return reply.status(404).send({ error: 'Data source not found' });
    }
    return reply.send(dataSource);
  });

  // Update data source
  fastify.put('/:dataSourceId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { dataSourceId } = request.params as { dataSourceId: string };

    const parsed = UpdateDataSourceSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Validation failed', details: parsed.error.errors });
    }

    try {
      const dataSource = await dataSourceService.updateDataSource(tenantId, dataSourceId, parsed.data);
      return reply.send(dataSource);
    } catch (error: any) {
      if (error.message === 'Data source not found') {
        return reply.status(404).send({ error: error.message });
      }
      throw error;
    }
  });

  // Delete data source
  fastify.delete('/:dataSourceId', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = (request as any).tenantId;
    const { dataSourceId } = request.params as { dataSourceId: string };

    try {
      await dataSourceService.deleteDataSource(tenantId, dataSourceId);
      return reply.status(204).send();
    } catch (error: any) {
      if (error.message === 'Data source not found') {
        return reply.status(404).send({ error: error.message });
      }
      if (error.message.includes('active holds')) {
        return reply.status(409).send({ error: error.message });
      }
      throw error;
    }
  });
}
