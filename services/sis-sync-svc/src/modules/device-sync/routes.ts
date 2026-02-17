/**
 * Device Sync Routes
 *
 * REST API endpoints for offline-first device data synchronization.
 *
 * Ported from sync-svc during Sprint 3 consolidation.
 */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import type { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { z } from 'zod';

import type { DeviceSyncService } from './sync-service.js';
import {
  PushChangesRequestSchema,
  PullChangesRequestSchema,
  DeltaRequestSchema,
  ConflictResolutionRequestSchema,
  type DeviceSyncAuthContext as AuthContext,
  EntityType,
} from './types.js';

/**
 * Register device sync routes.
 * Accepts a DeviceSyncService instance via opts for DI.
 */
export async function deviceSyncRoutes(
  fastify: FastifyInstance,
  opts: FastifyPluginOptions & { syncService: DeviceSyncService }
): Promise<void> {
  const { syncService } = opts;

  // ===========================================================================
  // Push Changes (Client -> Server)
  // ===========================================================================

  fastify.post('/push', {
    schema: {
      description: 'Push local changes to server',
      tags: ['device-sync'],
      body: PushChangesRequestSchema,
    },
    handler: async (request, reply) => {
      const ctx = request.user as AuthContext;
      const body = request.body as z.infer<typeof PushChangesRequestSchema>;

      try {
        const result = await syncService.pushChanges(ctx, body.operations);

        return reply.send({
          success: result.success,
          processedCount: result.processedCount,
          failedCount: result.failedCount,
          serverTimestamp: result.serverTimestamp,
          acceptedOperations: result.acceptedOperations,
          rejectedOperations: result.rejectedOperations,
          conflicts: result.conflicts.map((c) => ({
            id: c.id,
            entityType: c.entityType,
            entityId: c.entityId,
            clientVersion: c.clientVersion,
            serverVersion: c.serverVersion,
            suggestedResolution: c.suggestedResolution,
          })),
        });
      } catch (error) {
        request.log.error(error, 'Push changes failed');
        return reply.status(500).send({
          error: 'Failed to push changes',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // ===========================================================================
  // Pull Changes (Server -> Client)
  // ===========================================================================

  fastify.post('/pull', {
    schema: {
      description: 'Pull server changes to client',
      tags: ['device-sync'],
      body: PullChangesRequestSchema,
    },
    handler: async (request, reply) => {
      const ctx = request.user as AuthContext;
      const body = request.body as z.infer<typeof PullChangesRequestSchema>;

      try {
        const result = await syncService.pullChanges(
          ctx,
          body.lastSyncTimestamp,
          body.entityTypes,
          body.limit
        );

        return reply.send(result);
      } catch (error) {
        request.log.error(error, 'Pull changes failed');
        return reply.status(500).send({
          error: 'Failed to pull changes',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // ===========================================================================
  // Delta Sync
  // ===========================================================================

  fastify.post('/delta', {
    schema: {
      description: 'Get delta changes for a specific entity',
      tags: ['device-sync'],
      body: DeltaRequestSchema,
    },
    handler: async (request, reply) => {
      const ctx = request.user as AuthContext;
      const body = request.body as z.infer<typeof DeltaRequestSchema>;

      try {
        const result = await syncService.getDeltaChanges(
          ctx,
          body.entityType,
          body.entityId,
          body.clientVersion,
          body.clientFields
        );

        return reply.send(result);
      } catch (error) {
        request.log.error(error, 'Delta sync failed');
        return reply.status(500).send({
          error: 'Failed to get delta changes',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // ===========================================================================
  // Conflicts
  // ===========================================================================

  fastify.get('/conflicts', {
    handler: async (request, reply) => {
      const ctx = request.user as AuthContext;

      try {
        const conflicts = await syncService.getPendingConflicts(ctx);

        return reply.send({
          conflicts: conflicts.map((c) => ({
            id: c.id,
            entityType: c.entityType,
            entityId: c.entityId,
            clientData: c.clientData,
            serverData: c.serverData,
            clientVersion: c.clientVersion,
            serverVersion: c.serverVersion,
            suggestedResolution: c.suggestedResolution,
            createdAt: c.createdAt.toISOString(),
          })),
        });
      } catch (error) {
        request.log.error(error, 'Get conflicts failed');
        return reply.status(500).send({
          error: 'Failed to get conflicts',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  fastify.post('/conflicts/:conflictId/resolve', {
    schema: {
      description: 'Resolve a sync conflict',
      tags: ['device-sync'],
      params: z.object({
        conflictId: z.string().uuid(),
      }),
      body: ConflictResolutionRequestSchema,
    },
    handler: async (request, reply) => {
      const ctx = request.user as AuthContext;
      const { conflictId } = request.params as { conflictId: string };
      const body = request.body as z.infer<typeof ConflictResolutionRequestSchema>;

      try {
        await syncService.resolveConflict(
          ctx,
          conflictId,
          body.resolution,
          body.mergedData
        );

        return reply.send({
          success: true,
          message: 'Conflict resolved successfully',
        });
      } catch (error) {
        request.log.error(error, 'Resolve conflict failed');

        if (error instanceof Error && error.message === 'Conflict not found') {
          return reply.status(404).send({
            error: 'Not found',
            message: 'Conflict not found',
          });
        }

        if (
          error instanceof Error &&
          error.message === 'Unauthorized to resolve this conflict'
        ) {
          return reply.status(403).send({
            error: 'Forbidden',
            message: 'Not authorized to resolve this conflict',
          });
        }

        return reply.status(500).send({
          error: 'Failed to resolve conflict',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // ===========================================================================
  // Sync Status
  // ===========================================================================

  fastify.get('/status', {
    handler: async (request, reply) => {
      const ctx = request.user as AuthContext;

      try {
        const conflicts = await syncService.getPendingConflicts(ctx);

        return reply.send({
          pendingConflicts: conflicts.length,
          lastSyncTimestamp: new Date().toISOString(),
          syncHealth: 'healthy',
        });
      } catch (error) {
        request.log.error(error, 'Get sync status failed');
        return reply.status(500).send({
          error: 'Failed to get sync status',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });

  // ===========================================================================
  // Batch Sync
  // ===========================================================================

  fastify.post('/batch', {
    schema: {
      description: 'Perform a full bidirectional sync',
      tags: ['device-sync'],
      body: z.object({
        deviceId: z.string(),
        lastSyncTimestamp: z.string().datetime().optional(),
        pushOperations: z.array(
          z.object({
            id: z.string().uuid(),
            entityType: z.nativeEnum(EntityType),
            entityId: z.string(),
            operation: z.enum(['CREATE', 'UPDATE', 'DELETE']),
            data: z.record(z.unknown()).optional(),
            timestamp: z.string().datetime(),
            clientVersion: z.number(),
          })
        ),
        pullEntityTypes: z.array(z.nativeEnum(EntityType)).optional(),
        pullLimit: z.number().max(500).default(100),
      }),
    },
    handler: async (request, reply) => {
      const ctx = request.user as AuthContext;
      const body = request.body as {
        deviceId: string;
        lastSyncTimestamp?: string;
        pushOperations: unknown[];
        pullEntityTypes?: EntityType[];
        pullLimit: number;
      };

      try {
        const pushResult = await syncService.pushChanges(ctx, body.pushOperations);
        const pullResult = await syncService.pullChanges(
          ctx,
          body.lastSyncTimestamp,
          body.pullEntityTypes,
          body.pullLimit
        );

        return reply.send({
          push: {
            success: pushResult.success,
            acceptedCount: pushResult.acceptedOperations.length,
            rejectedCount: pushResult.rejectedOperations.length,
            conflictCount: pushResult.conflicts.length,
          },
          pull: {
            changeCount: pullResult.changes.length,
            deletionCount: pullResult.deletions.length,
            hasMore: pullResult.hasMore,
          },
          serverTimestamp: pullResult.serverTimestamp,
        });
      } catch (error) {
        request.log.error(error, 'Batch sync failed');
        return reply.status(500).send({
          error: 'Failed to perform batch sync',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },
  });
}
