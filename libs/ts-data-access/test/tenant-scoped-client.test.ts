import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  createTenantScopedClient,
  getCachedTenantClient,
  CrossTenantAccessError,
  RawQueryBlockedError,
  isTenantScopedModel,
  TENANT_SCOPED_MODELS,
  type TenantScopeLogger,
} from '../src/tenant-scoped-client.js';

// Mock Prisma client that properly simulates $extends
function createMockPrismaClient() {
  const executedQueries: Array<{ model: string; operation: string; args: unknown }> = [];

  // Create a function that generates a proper $extends implementation
  const createPrismaBase = () => {
    const prisma = {
      user: {
        findMany: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'User', operation: 'findMany', args });
          return [];
        }),
        findFirst: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'User', operation: 'findFirst', args });
          return null;
        }),
        findUnique: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'User', operation: 'findUnique', args });
          return null;
        }),
        create: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'User', operation: 'create', args });
          return { id: 'new-id' };
        }),
        createMany: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'User', operation: 'createMany', args });
          return { count: 0 };
        }),
        update: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'User', operation: 'update', args });
          return { id: 'updated-id' };
        }),
        updateMany: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'User', operation: 'updateMany', args });
          return { count: 0 };
        }),
        upsert: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'User', operation: 'upsert', args });
          return { id: 'upserted-id' };
        }),
        delete: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'User', operation: 'delete', args });
          return { id: 'deleted-id' };
        }),
        deleteMany: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'User', operation: 'deleteMany', args });
          return { count: 0 };
        }),
        count: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'User', operation: 'count', args });
          return 0;
        }),
      },
      learner: {
        findMany: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'Learner', operation: 'findMany', args });
          return [];
        }),
      },
      session: {
        findMany: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'Session', operation: 'findMany', args });
          return [];
        }),
      },
      tenant: {
        findMany: vi.fn(async (args?: unknown) => {
          executedQueries.push({ model: 'Tenant', operation: 'findMany', args });
          return [];
        }),
      },
      $queryRaw: vi.fn(),
      $queryRawUnsafe: vi.fn(),
      $executeRaw: vi.fn(),
      $executeRawUnsafe: vi.fn(),
      $extends: (extension: any) => {
        // Create a new extended client object
        const extendedClient: any = {};

        // Copy over base methods
        for (const modelName of ['user', 'learner', 'session', 'tenant']) {
          const originalModel = (prisma as any)[modelName];
          extendedClient[modelName] = {};

          for (const opName of Object.keys(originalModel)) {
            if (typeof originalModel[opName] === 'function') {
              extendedClient[modelName][opName] = async (args: unknown) => {
                const capitalizedModel = modelName.charAt(0).toUpperCase() + modelName.slice(1);

                // If there's a query middleware, apply it
                if (extension.query?.$allModels?.$allOperations) {
                  const middleware = extension.query.$allModels.$allOperations;
                  return middleware({
                    model: capitalizedModel,
                    operation: opName,
                    args: args ?? {},
                    query: async (modifiedArgs: unknown) => {
                      // Call the ORIGINAL mock, not the wrapped version
                      return originalModel[opName](modifiedArgs);
                    },
                  });
                }
                return originalModel[opName](args);
              };
            }
          }
        }

        // Apply client extensions
        if (extension.client) {
          for (const [key, value] of Object.entries(extension.client)) {
            extendedClient[key] = value;
          }
        }

        // Copy over raw methods if not overridden
        if (!extension.client?.$queryRaw) {
          extendedClient.$queryRaw = prisma.$queryRaw;
        }
        if (!extension.client?.$queryRawUnsafe) {
          extendedClient.$queryRawUnsafe = prisma.$queryRawUnsafe;
        }
        if (!extension.client?.$executeRaw) {
          extendedClient.$executeRaw = prisma.$executeRaw;
        }
        if (!extension.client?.$executeRawUnsafe) {
          extendedClient.$executeRawUnsafe = prisma.$executeRawUnsafe;
        }

        return extendedClient;
      },
    };
    return prisma;
  };

  const prisma = createPrismaBase();

  return Object.assign(prisma, {
    _executedQueries: executedQueries,
    _clearQueries: () => (executedQueries.length = 0),
  });
}

describe('TenantScopedClient', () => {
  const TENANT_ID = 'tenant-123';
  const OTHER_TENANT_ID = 'tenant-456';

  let mockPrisma: ReturnType<typeof createMockPrismaClient>;
  let mockLogger: TenantScopeLogger;
  let crossTenantLogs: Array<{
    scopedTenantId: string;
    attemptedTenantId: string | undefined;
    operation: string;
    model: string;
  }>;

  beforeEach(() => {
    mockPrisma = createMockPrismaClient();
    crossTenantLogs = [];
    mockLogger = {
      logCrossTenantAccess: vi.fn((entry) => {
        crossTenantLogs.push({
          scopedTenantId: entry.scopedTenantId,
          attemptedTenantId: entry.attemptedTenantId,
          operation: entry.operation,
          model: entry.model,
        });
      }),
      logQuery: vi.fn(),
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('isTenantScopedModel', () => {
    it('should return true for tenant-scoped models', () => {
      expect(isTenantScopedModel('user')).toBe(true);
      expect(isTenantScopedModel('learner')).toBe(true);
      expect(isTenantScopedModel('session')).toBe(true);
      expect(isTenantScopedModel('User')).toBe(true); // Case insensitive
    });

    it('should return false for non-tenant-scoped models', () => {
      expect(isTenantScopedModel('tenant')).toBe(false);
      expect(isTenantScopedModel('Tenant')).toBe(false);
      expect(isTenantScopedModel('unknown')).toBe(false);
    });

    it('should include all defined tenant-scoped models', () => {
      for (const model of TENANT_SCOPED_MODELS) {
        expect(isTenantScopedModel(model)).toBe(true);
      }
    });
  });

  describe('createTenantScopedClient', () => {
    it('should throw error if tenantId is missing', () => {
      expect(() =>
        createTenantScopedClient(mockPrisma as any, { tenantId: '' })
      ).toThrow('tenantId is required and must be a non-empty string');
    });

    it('should throw error if tenantId is whitespace only', () => {
      expect(() =>
        createTenantScopedClient(mockPrisma as any, { tenantId: '   ' })
      ).toThrow('tenantId is required and must be a non-empty string');
    });

    it('should create a scoped client with valid tenantId', () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
      });
      expect(client).toBeDefined();
    });
  });

  describe('Query Filtering', () => {
    it('should automatically add tenantId to findMany queries', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await client.user.findMany({ where: { email: 'test@example.com' } });

      expect(mockPrisma._executedQueries).toContainEqual(
        expect.objectContaining({
          model: 'User',
          operation: 'findMany',
          args: expect.objectContaining({
            where: { email: 'test@example.com', tenantId: TENANT_ID },
          }),
        })
      );
    });

    it('should automatically add tenantId to findFirst queries', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await client.user.findFirst({ where: { email: 'test@example.com' } });

      expect(mockPrisma._executedQueries).toContainEqual(
        expect.objectContaining({
          model: 'User',
          operation: 'findFirst',
          args: expect.objectContaining({
            where: { email: 'test@example.com', tenantId: TENANT_ID },
          }),
        })
      );
    });

    it('should automatically add tenantId to findUnique queries', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await client.user.findUnique({ where: { id: 'user-1' } });

      expect(mockPrisma._executedQueries).toContainEqual(
        expect.objectContaining({
          model: 'User',
          operation: 'findUnique',
          args: expect.objectContaining({
            where: { id: 'user-1', tenantId: TENANT_ID },
          }),
        })
      );
    });

    it('should automatically add tenantId to create operations', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await client.user.create({
        data: { email: 'new@example.com', name: 'New User' },
      });

      expect(mockPrisma._executedQueries).toContainEqual(
        expect.objectContaining({
          model: 'User',
          operation: 'create',
          args: expect.objectContaining({
            data: { email: 'new@example.com', name: 'New User', tenantId: TENANT_ID },
          }),
        })
      );
    });

    it('should automatically add tenantId to update operations', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await client.user.update({
        where: { id: 'user-1' },
        data: { name: 'Updated Name' },
      });

      expect(mockPrisma._executedQueries).toContainEqual(
        expect.objectContaining({
          model: 'User',
          operation: 'update',
          args: expect.objectContaining({
            where: { id: 'user-1', tenantId: TENANT_ID },
            data: { name: 'Updated Name' },
          }),
        })
      );
    });

    it('should automatically add tenantId to delete operations', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await client.user.delete({ where: { id: 'user-1' } });

      expect(mockPrisma._executedQueries).toContainEqual(
        expect.objectContaining({
          model: 'User',
          operation: 'delete',
          args: expect.objectContaining({
            where: { id: 'user-1', tenantId: TENANT_ID },
          }),
        })
      );
    });

    it('should handle nested relations correctly in upsert', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await client.user.upsert({
        where: { id: 'user-1' },
        create: { email: 'new@example.com', name: 'New' },
        update: { name: 'Updated' },
      });

      expect(mockPrisma._executedQueries).toContainEqual(
        expect.objectContaining({
          model: 'User',
          operation: 'upsert',
          args: expect.objectContaining({
            where: { id: 'user-1', tenantId: TENANT_ID },
            create: { email: 'new@example.com', name: 'New', tenantId: TENANT_ID },
          }),
        })
      );
    });

    it('should add tenantId to all items in createMany', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await client.user.createMany({
        data: [
          { email: 'user1@example.com', name: 'User 1' },
          { email: 'user2@example.com', name: 'User 2' },
        ],
      });

      expect(mockPrisma._executedQueries).toContainEqual(
        expect.objectContaining({
          model: 'User',
          operation: 'createMany',
          args: expect.objectContaining({
            data: [
              { email: 'user1@example.com', name: 'User 1', tenantId: TENANT_ID },
              { email: 'user2@example.com', name: 'User 2', tenantId: TENANT_ID },
            ],
          }),
        })
      );
    });
  });

  describe('Security', () => {
    it('should throw error if query tries to override tenantId', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
        throwOnCrossTenantAccess: true,
      });

      await expect(
        client.user.findMany({ where: { tenantId: OTHER_TENANT_ID } })
      ).rejects.toThrow(CrossTenantAccessError);
    });

    it('should prevent access to data from other tenants in create', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
        throwOnCrossTenantAccess: true,
      });

      await expect(
        client.user.create({
          data: { email: 'test@example.com', tenantId: OTHER_TENANT_ID },
        })
      ).rejects.toThrow(CrossTenantAccessError);
    });

    it('should log attempted cross-tenant access', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
        throwOnCrossTenantAccess: true,
      });

      try {
        await client.user.findMany({ where: { tenantId: OTHER_TENANT_ID } });
      } catch {
        // Expected error
      }

      expect(mockLogger.logCrossTenantAccess).toHaveBeenCalledWith(
        expect.objectContaining({
          scopedTenantId: TENANT_ID,
          attemptedTenantId: OTHER_TENANT_ID,
          operation: 'findMany',
          model: 'User',
        })
      );
    });

    it('should silently filter when throwOnCrossTenantAccess is false', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
        throwOnCrossTenantAccess: false,
      });

      // Should not throw, just override the tenantId
      await client.user.findMany({ where: { tenantId: OTHER_TENANT_ID } });

      // Should still log the attempt
      expect(mockLogger.logCrossTenantAccess).toHaveBeenCalled();

      // But query should execute with correct tenant
      expect(mockPrisma._executedQueries).toContainEqual(
        expect.objectContaining({
          model: 'User',
          operation: 'findMany',
          args: expect.objectContaining({
            where: expect.objectContaining({ tenantId: TENANT_ID }),
          }),
        })
      );
    });

    it('should prevent changing tenantId in update data', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await expect(
        client.user.update({
          where: { id: 'user-1' },
          data: { tenantId: OTHER_TENANT_ID },
        })
      ).rejects.toThrow(CrossTenantAccessError);
    });

    it('should prevent changing tenantId in updateMany data', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await expect(
        client.user.updateMany({
          where: { email: { contains: 'example' } },
          data: { tenantId: OTHER_TENANT_ID },
        })
      ).rejects.toThrow('Cannot modify tenantId in updateMany operation');
    });
  });

  describe('Raw Query Blocking', () => {
    it('should block $queryRaw by default', () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      expect(() => (client as any).$queryRaw`SELECT * FROM users`).toThrow(
        RawQueryBlockedError
      );
    });

    it('should block $queryRawUnsafe by default', () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      expect(() =>
        (client as any).$queryRawUnsafe('SELECT * FROM users')
      ).toThrow(RawQueryBlockedError);
    });

    it('should block $executeRaw by default', () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      expect(() =>
        (client as any).$executeRaw`DELETE FROM users WHERE 1=1`
      ).toThrow(RawQueryBlockedError);
    });

    it('should allow raw queries when blockRawQueries is false', () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
        blockRawQueries: false,
      });

      // Should not throw
      expect(() =>
        (client as any).$queryRaw`SELECT * FROM users`
      ).not.toThrow();
    });
  });

  describe('Non-Tenant Models', () => {
    it('should not filter models without tenantId', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await client.tenant.findMany({ where: { type: 'district' } });

      // Tenant model should not have tenantId filter applied
      expect(mockPrisma._executedQueries).toContainEqual(
        expect.objectContaining({
          model: 'Tenant',
          operation: 'findMany',
          args: expect.objectContaining({
            where: { type: 'district' },
          }),
        })
      );

      // Verify tenantId was NOT added
      const tenantQuery = mockPrisma._executedQueries.find(
        (q) => q.model === 'Tenant' && q.operation === 'findMany'
      );
      expect((tenantQuery?.args as any)?.where?.tenantId).toBeUndefined();
    });
  });

  describe('$getTenantId', () => {
    it('should return the scoped tenantId', () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      expect((client as any).$getTenantId()).toBe(TENANT_ID);
    });
  });

  describe('getCachedTenantClient', () => {
    it('should return the same client for same tenant', () => {
      const client1 = getCachedTenantClient(mockPrisma as any, { tenantId: TENANT_ID });
      const client2 = getCachedTenantClient(mockPrisma as any, { tenantId: TENANT_ID });

      expect(client1).toBe(client2);
    });

    it('should return different clients for different tenants', () => {
      const client1 = getCachedTenantClient(mockPrisma as any, { tenantId: TENANT_ID });
      const client2 = getCachedTenantClient(mockPrisma as any, {
        tenantId: OTHER_TENANT_ID,
      });

      expect(client1).not.toBe(client2);
    });

    it('should return different clients for different options', () => {
      const client1 = getCachedTenantClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        blockRawQueries: true,
      });
      const client2 = getCachedTenantClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        blockRawQueries: false,
      });

      expect(client1).not.toBe(client2);
    });
  });

  describe('Query Logging', () => {
    it('should log query execution time', async () => {
      const client = createTenantScopedClient(mockPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await client.user.findMany({});

      expect(mockLogger.logQuery).toHaveBeenCalledWith(
        TENANT_ID,
        'User',
        'findMany',
        expect.any(Number)
      );
    });

    it('should log errors with :error suffix', async () => {
      // Create a mock that throws an error in the $extends callback
      const errorPrisma = {
        user: {
          findMany: vi.fn().mockRejectedValue(new Error('Database error')),
        },
        $queryRaw: vi.fn(),
        $queryRawUnsafe: vi.fn(),
        $executeRaw: vi.fn(),
        $executeRawUnsafe: vi.fn(),
        $extends: (extension: any) => {
          const extendedClient: any = {};
          extendedClient.user = {
            findMany: async (args: unknown) => {
              if (extension.query?.$allModels?.$allOperations) {
                const middleware = extension.query.$allModels.$allOperations;
                return middleware({
                  model: 'User',
                  operation: 'findMany',
                  args: args ?? {},
                  query: async () => {
                    throw new Error('Database error');
                  },
                });
              }
              throw new Error('Database error');
            },
          };
          if (extension.client) {
            for (const [key, value] of Object.entries(extension.client)) {
              extendedClient[key] = value;
            }
          }
          return extendedClient;
        },
      };

      const client = createTenantScopedClient(errorPrisma as any, {
        tenantId: TENANT_ID,
        logger: mockLogger,
      });

      await expect(client.user.findMany({})).rejects.toThrow('Database error');

      expect(mockLogger.logQuery).toHaveBeenCalledWith(
        TENANT_ID,
        'User',
        'findMany:error',
        expect.any(Number)
      );
    });
  });
});

describe('CrossTenantAccessError', () => {
  it('should include all relevant information', () => {
    const error = new CrossTenantAccessError(
      'tenant-456',
      'tenant-123',
      'findMany',
      'User'
    );

    expect(error.name).toBe('CrossTenantAccessError');
    expect(error.attemptedTenantId).toBe('tenant-456');
    expect(error.scopedTenantId).toBe('tenant-123');
    expect(error.operation).toBe('findMany');
    expect(error.model).toBe('User');
    expect(error.message).toContain('tenant-456');
    expect(error.message).toContain('tenant-123');
  });
});

describe('RawQueryBlockedError', () => {
  it('should include tenant information', () => {
    const error = new RawQueryBlockedError('tenant-123');

    expect(error.name).toBe('RawQueryBlockedError');
    expect(error.scopedTenantId).toBe('tenant-123');
    expect(error.message).toContain('Raw SQL queries are blocked');
  });
});
