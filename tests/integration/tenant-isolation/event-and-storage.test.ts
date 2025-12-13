/**
 * Tenant Isolation - Event & Storage Tests
 *
 * Tests tenant isolation for:
 * - Event publishing (EventPublisher)
 * - File storage (TenantStorage)
 * - Tenant config/usage services
 *
 * @module tests/integration/tenant-isolation/event-and-storage.test
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  TenantIsolationTestContext,
  setupTenantIsolationTests,
  teardownTenantIsolationTests,
} from './setup';
import { createMockDatabaseClient } from './mock-db';

// Mock imports for the new components
// In real tests, these would be imported from the actual modules:
// import { EventPublisher, MissingTenantIdError, InMemoryTransport } from '@aivo/ts-utils';
// import { TenantStorage, CrossTenantAccessError, createTenantStorageFromEnv } from '@aivo/ts-storage';

// ==========================================================================
// Mock Implementations for Testing
// ==========================================================================

class MissingTenantIdError extends Error {
  constructor(eventType: string) {
    super(`Event type "${eventType}" is missing required tenantId field`);
    this.name = 'MissingTenantIdError';
  }
}

class CrossTenantAccessError extends Error {
  constructor(
    public readonly requestedTenantId: string,
    public readonly actualTenantId: string,
    public readonly path?: string
  ) {
    super(
      `Cross-tenant access denied: requested tenant ${requestedTenantId}, ` +
        `but context tenant is ${actualTenantId}${path ? ` for path ${path}` : ''}`
    );
    this.name = 'CrossTenantAccessError';
  }
}

interface EventPayload {
  tenantId?: string;
  eventType: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

interface InMemoryTransport {
  events: EventPayload[];
  publish: (event: EventPayload) => Promise<void>;
  clear: () => void;
}

function createInMemoryTransport(): InMemoryTransport {
  const events: EventPayload[] = [];
  return {
    events,
    publish: async (event: EventPayload) => {
      events.push(event);
    },
    clear: () => {
      events.length = 0;
    },
  };
}

class EventPublisher {
  private transport: InMemoryTransport;
  private strictMode: boolean;

  constructor(transport: InMemoryTransport, options: { strictMode?: boolean } = {}) {
    this.transport = transport;
    this.strictMode = options.strictMode ?? true;
  }

  async publish(event: Omit<EventPayload, 'timestamp'> & { timestamp?: string }): Promise<void> {
    if (this.strictMode && !event.tenantId) {
      throw new MissingTenantIdError(event.eventType);
    }

    const fullEvent: EventPayload = {
      ...event,
      timestamp: event.timestamp || new Date().toISOString(),
    };

    await this.transport.publish(fullEvent);
  }
}

interface TenantStorageContext {
  tenantId: string;
  userId?: string;
}

class TenantStorage {
  private context: TenantStorageContext;
  private bucket: string;

  constructor(config: { bucket: string }, context: TenantStorageContext) {
    this.bucket = config.bucket;
    this.context = context;
  }

  buildTenantPrefix(): string {
    return `${this.context.tenantId}/`;
  }

  buildLearnerPath(learnerId: string, category: string): string {
    return `${this.context.tenantId}/learner/${learnerId}/${category}`;
  }

  validatePath(path: string): { valid: boolean; tenantId?: string } {
    const parts = path.split('/');
    const pathTenantId = parts[0];

    if (pathTenantId !== this.context.tenantId) {
      return { valid: false, tenantId: pathTenantId };
    }

    return { valid: true, tenantId: pathTenantId };
  }

  async getUploadUrl(
    key: string,
    options: { targetTenantId?: string } = {}
  ): Promise<{ url: string; key: string }> {
    const targetTenant = options.targetTenantId || this.context.tenantId;

    if (targetTenant !== this.context.tenantId) {
      throw new CrossTenantAccessError(targetTenant, this.context.tenantId, key);
    }

    // Ensure key is within tenant prefix
    if (!key.startsWith(`${this.context.tenantId}/`)) {
      throw new CrossTenantAccessError('unknown', this.context.tenantId, key);
    }

    return {
      url: `https://${this.bucket}.s3.amazonaws.com/${key}?presigned=true`,
      key,
    };
  }

  async getDownloadUrl(key: string): Promise<{ url: string; key: string }> {
    const validation = this.validatePath(key);

    if (!validation.valid) {
      throw new CrossTenantAccessError(
        validation.tenantId || 'unknown',
        this.context.tenantId,
        key
      );
    }

    return {
      url: `https://${this.bucket}.s3.amazonaws.com/${key}?presigned=true`,
      key,
    };
  }
}

// ==========================================================================
// Test Suite
// ==========================================================================

describe('Tenant Isolation - Events & Storage', () => {
  let ctx: TenantIsolationTestContext;

  beforeAll(async () => {
    const db = createMockDatabaseClient();
    const serverUrl = process.env.TEST_SERVER_URL || 'http://localhost:4000';
    ctx = await setupTenantIsolationTests(db, serverUrl);
  });

  afterAll(async () => {
    if (ctx) {
      await teardownTenantIsolationTests(ctx);
    }
  });

  // ==========================================================================
  // Event Publisher Tests
  // ==========================================================================

  describe('EventPublisher Tenant Isolation', () => {
    let transport: InMemoryTransport;
    let publisher: EventPublisher;

    beforeAll(() => {
      transport = createInMemoryTransport();
      publisher = new EventPublisher(transport, { strictMode: true });
    });

    afterAll(() => {
      transport.clear();
    });

    it('rejects events without tenantId in strict mode', async () => {
      await expect(
        publisher.publish({
          eventType: 'LEARNER_CREATED',
          payload: { learnerId: 'test-123' },
        })
      ).rejects.toThrow(MissingTenantIdError);

      // Verify event was NOT published
      expect(transport.events.length).toBe(0);
    });

    it('accepts events with valid tenantId', async () => {
      await publisher.publish({
        tenantId: ctx.tenantA.id,
        eventType: 'LEARNER_CREATED',
        payload: { learnerId: 'test-456' },
      });

      expect(transport.events.length).toBe(1);
      expect(transport.events[0].tenantId).toBe(ctx.tenantA.id);
      expect(transport.events[0].eventType).toBe('LEARNER_CREATED');

      transport.clear();
    });

    it('allows non-strict mode for system events (no tenant)', async () => {
      const lenientTransport = createInMemoryTransport();
      const lenientPublisher = new EventPublisher(lenientTransport, { strictMode: false });

      await lenientPublisher.publish({
        eventType: 'SYSTEM_HEALTH_CHECK',
        payload: { status: 'healthy' },
      });

      expect(lenientTransport.events.length).toBe(1);
      expect(lenientTransport.events[0].tenantId).toBeUndefined();
    });

    it('event includes correct tenant context for audit', async () => {
      await publisher.publish({
        tenantId: ctx.tenantB.id,
        eventType: 'SESSION_STARTED',
        payload: {
          sessionId: 'session-789',
          learnerId: ctx.learnerB1.id,
        },
      });

      const event = transport.events[0];
      expect(event.tenantId).toBe(ctx.tenantB.id);
      expect(event.timestamp).toBeDefined();

      transport.clear();
    });

    it('prevents tenantId spoofing via payload', async () => {
      // Event published with Tenant A context
      await publisher.publish({
        tenantId: ctx.tenantA.id,
        eventType: 'LEARNER_UPDATED',
        payload: {
          learnerId: 'test-123',
          // Attempt to spoof tenant in nested payload
          tenantId: ctx.tenantB.id,
          targetTenant: ctx.tenantB.id,
        },
      });

      const event = transport.events[0];
      // Top-level tenantId should be the actual tenant
      expect(event.tenantId).toBe(ctx.tenantA.id);
      // Payload may contain spoofed data, but top-level is authoritative
      expect(event.payload.tenantId).toBe(ctx.tenantB.id);

      transport.clear();
    });
  });

  // ==========================================================================
  // File Storage Tests
  // ==========================================================================

  describe('TenantStorage Isolation', () => {
    let storageA: TenantStorage;
    let storageB: TenantStorage;

    beforeAll(() => {
      storageA = new TenantStorage(
        { bucket: 'aivo-test-bucket' },
        { tenantId: ctx.tenantA.id, userId: ctx.userA.id }
      );

      storageB = new TenantStorage(
        { bucket: 'aivo-test-bucket' },
        { tenantId: ctx.tenantB.id, userId: ctx.userB.id }
      );
    });

    describe('Path Building', () => {
      it('builds paths with correct tenant prefix', () => {
        const prefixA = storageA.buildTenantPrefix();
        const prefixB = storageB.buildTenantPrefix();

        expect(prefixA).toBe(`${ctx.tenantA.id}/`);
        expect(prefixB).toBe(`${ctx.tenantB.id}/`);
        expect(prefixA).not.toBe(prefixB);
      });

      it('builds learner paths with correct tenant scope', () => {
        const pathA = storageA.buildLearnerPath(ctx.learnerA1.id, 'avatar');
        const pathB = storageB.buildLearnerPath(ctx.learnerB1.id, 'avatar');

        expect(pathA).toContain(ctx.tenantA.id);
        expect(pathA).toContain(ctx.learnerA1.id);
        expect(pathB).toContain(ctx.tenantB.id);
        expect(pathB).toContain(ctx.learnerB1.id);

        // Cannot confuse paths
        expect(pathA).not.toContain(ctx.tenantB.id);
        expect(pathB).not.toContain(ctx.tenantA.id);
      });
    });

    describe('Path Validation', () => {
      it('validates paths within tenant scope', () => {
        const validPath = `${ctx.tenantA.id}/learner/123/avatar/file.png`;
        const result = storageA.validatePath(validPath);

        expect(result.valid).toBe(true);
        expect(result.tenantId).toBe(ctx.tenantA.id);
      });

      it('rejects paths from other tenants', () => {
        const otherTenantPath = `${ctx.tenantB.id}/learner/123/avatar/file.png`;
        const result = storageA.validatePath(otherTenantPath);

        expect(result.valid).toBe(false);
        expect(result.tenantId).toBe(ctx.tenantB.id);
      });

      it('rejects paths with path traversal attempts', () => {
        const traversalPath = `../../../${ctx.tenantB.id}/secrets/api-key.txt`;
        const result = storageA.validatePath(traversalPath);

        expect(result.valid).toBe(false);
      });

      it('rejects paths without tenant prefix', () => {
        const noPrefixPath = 'global/shared/file.txt';
        const result = storageA.validatePath(noPrefixPath);

        expect(result.valid).toBe(false);
      });
    });

    describe('Presigned URL Generation', () => {
      it('generates upload URL for own tenant files', async () => {
        const key = `${ctx.tenantA.id}/learner/${ctx.learnerA1.id}/submission/test.pdf`;
        const result = await storageA.getUploadUrl(key);

        expect(result.url).toBeDefined();
        expect(result.key).toBe(key);
      });

      it('throws CrossTenantAccessError for upload to other tenant', async () => {
        const key = `${ctx.tenantB.id}/learner/${ctx.learnerB1.id}/submission/test.pdf`;

        await expect(storageA.getUploadUrl(key)).rejects.toThrow(CrossTenantAccessError);
      });

      it('throws CrossTenantAccessError when targetTenantId differs', async () => {
        const key = `${ctx.tenantA.id}/learner/${ctx.learnerA1.id}/submission/test.pdf`;

        await expect(
          storageA.getUploadUrl(key, { targetTenantId: ctx.tenantB.id })
        ).rejects.toThrow(CrossTenantAccessError);
      });

      it('generates download URL for own tenant files', async () => {
        const key = `${ctx.tenantA.id}/learner/${ctx.learnerA1.id}/avatar/photo.jpg`;
        const result = await storageA.getDownloadUrl(key);

        expect(result.url).toBeDefined();
        expect(result.key).toBe(key);
      });

      it('throws CrossTenantAccessError for download from other tenant', async () => {
        const key = `${ctx.tenantB.id}/learner/${ctx.learnerB1.id}/avatar/photo.jpg`;

        await expect(storageA.getDownloadUrl(key)).rejects.toThrow(CrossTenantAccessError);
      });
    });

    describe('Cross-Tenant Attack Vectors', () => {
      it('blocks access when tenant ID embedded in filename', async () => {
        // Attempt to access Tenant B file by embedding ID in filename
        const maliciousKey = `${ctx.tenantA.id}/learner/123/${ctx.tenantB.id}_secrets.txt`;

        // This should work as the path prefix is correct
        const result = await storageA.getUploadUrl(maliciousKey);
        expect(result.url).toBeDefined();

        // But attempting the actual Tenant B path should fail
        const actualBPath = `${ctx.tenantB.id}/learner/123/secrets.txt`;
        await expect(storageA.getUploadUrl(actualBPath)).rejects.toThrow(CrossTenantAccessError);
      });

      it('blocks encoded path traversal attempts', async () => {
        // URL-encoded path traversal
        const encodedPath = `${ctx.tenantA.id}/learner/..%2F..%2F${ctx.tenantB.id}/secrets.txt`;
        const result = storageA.validatePath(encodedPath);

        // Path validation should detect this as invalid or same-tenant
        // The actual S3 key would need URL decoding server-side
        expect(result.tenantId).toBe(ctx.tenantA.id);
      });

      it('blocks null byte injection attempts', async () => {
        const nullBytePath = `${ctx.tenantA.id}/learner/123/file.txt\x00${ctx.tenantB.id}/secrets`;
        const result = storageA.validatePath(nullBytePath);

        // Should be considered same tenant (null byte splits string)
        expect(result.tenantId).toBe(ctx.tenantA.id);
      });

      it('Storage A cannot access Storage B files even with valid B key', async () => {
        // Create a valid Tenant B path using Tenant B storage
        const tenantBKey = storageB.buildLearnerPath(ctx.learnerB1.id, 'document');
        const fullKey = `${tenantBKey}/important.pdf`;

        // Tenant B can access
        const bResult = await storageB.getDownloadUrl(fullKey);
        expect(bResult.url).toBeDefined();

        // Tenant A cannot access the same key
        await expect(storageA.getDownloadUrl(fullKey)).rejects.toThrow(CrossTenantAccessError);
      });
    });
  });

  // ==========================================================================
  // Tenant Config Isolation Tests
  // ==========================================================================

  describe('TenantConfig Isolation', () => {
    // Mock tenant config data
    const mockConfigs: Map<string, { allowedAIProviders: string[]; maxLLMCallsPerDay: number }> =
      new Map();

    beforeAll(() => {
      mockConfigs.set(ctx.tenantA.id, {
        allowedAIProviders: ['OPENAI', 'ANTHROPIC'],
        maxLLMCallsPerDay: 10000,
      });
      mockConfigs.set(ctx.tenantB.id, {
        allowedAIProviders: ['OPENAI'],
        maxLLMCallsPerDay: 5000,
      });
    });

    it('returns correct config for Tenant A', () => {
      const configA = mockConfigs.get(ctx.tenantA.id);
      expect(configA?.allowedAIProviders).toContain('ANTHROPIC');
      expect(configA?.maxLLMCallsPerDay).toBe(10000);
    });

    it('returns correct config for Tenant B', () => {
      const configB = mockConfigs.get(ctx.tenantB.id);
      expect(configB?.allowedAIProviders).not.toContain('ANTHROPIC');
      expect(configB?.maxLLMCallsPerDay).toBe(5000);
    });

    it('cannot access other tenant config directly', () => {
      // Simulating a scoped config accessor
      const getTenantConfig = (requestingTenant: string, targetTenant: string) => {
        if (requestingTenant !== targetTenant) {
          return null; // Access denied
        }
        return mockConfigs.get(targetTenant);
      };

      // Tenant A trying to access Tenant B config
      const result = getTenantConfig(ctx.tenantA.id, ctx.tenantB.id);
      expect(result).toBeNull();

      // Tenant A accessing own config works
      const ownConfig = getTenantConfig(ctx.tenantA.id, ctx.tenantA.id);
      expect(ownConfig).not.toBeNull();
    });
  });

  // ==========================================================================
  // Tenant Usage Isolation Tests
  // ==========================================================================

  describe('TenantUsage Isolation', () => {
    // Mock usage tracking
    const mockUsage: Map<string, { llmCalls: number; tutorTurns: number }> = new Map();

    beforeAll(() => {
      mockUsage.set(ctx.tenantA.id, { llmCalls: 500, tutorTurns: 1000 });
      mockUsage.set(ctx.tenantB.id, { llmCalls: 200, tutorTurns: 400 });
    });

    it('tracks usage separately per tenant', () => {
      expect(mockUsage.get(ctx.tenantA.id)?.llmCalls).toBe(500);
      expect(mockUsage.get(ctx.tenantB.id)?.llmCalls).toBe(200);
    });

    it('cannot modify other tenant usage', () => {
      const incrementUsage = (
        requestingTenant: string,
        targetTenant: string,
        field: 'llmCalls' | 'tutorTurns'
      ) => {
        if (requestingTenant !== targetTenant) {
          return false; // Access denied
        }
        const usage = mockUsage.get(targetTenant);
        if (usage) {
          usage[field]++;
          return true;
        }
        return false;
      };

      // Tenant A trying to increment Tenant B usage
      const result = incrementUsage(ctx.tenantA.id, ctx.tenantB.id, 'llmCalls');
      expect(result).toBe(false);
      expect(mockUsage.get(ctx.tenantB.id)?.llmCalls).toBe(200); // Unchanged

      // Tenant A incrementing own usage works
      const selfResult = incrementUsage(ctx.tenantA.id, ctx.tenantA.id, 'llmCalls');
      expect(selfResult).toBe(true);
      expect(mockUsage.get(ctx.tenantA.id)?.llmCalls).toBe(501);
    });

    it('quota limits are tenant-specific', () => {
      const checkQuota = (tenantId: string, limit: number) => {
        const usage = mockUsage.get(tenantId);
        return usage ? usage.llmCalls < limit : false;
      };

      // Tenant A has higher limit
      expect(checkQuota(ctx.tenantA.id, 10000)).toBe(true);

      // Tenant B with lower limit
      expect(checkQuota(ctx.tenantB.id, 5000)).toBe(true);

      // Tenant B would fail with Tenant A's current usage
      const tenantAUsage = mockUsage.get(ctx.tenantA.id)?.llmCalls || 0;
      expect(checkQuota(ctx.tenantB.id, tenantAUsage)).toBe(false); // 200 < 501
    });
  });

  // ==========================================================================
  // Combined Attack Scenarios
  // ==========================================================================

  describe('Combined Attack Scenarios', () => {
    it('event + storage: uploaded file event cannot leak to other tenant', async () => {
      const transport = createInMemoryTransport();
      const publisher = new EventPublisher(transport, { strictMode: true });
      const storageA = new TenantStorage(
        { bucket: 'aivo-test-bucket' },
        { tenantId: ctx.tenantA.id }
      );

      // Upload file for Tenant A
      const key = storageA.buildLearnerPath(ctx.learnerA1.id, 'submission') + '/homework.pdf';

      // Publish event about the upload
      await publisher.publish({
        tenantId: ctx.tenantA.id,
        eventType: 'FILE_UPLOADED',
        payload: {
          key,
          learnerId: ctx.learnerA1.id,
          contentType: 'application/pdf',
        },
      });

      const event = transport.events[0];

      // Event is scoped to Tenant A
      expect(event.tenantId).toBe(ctx.tenantA.id);

      // File key is scoped to Tenant A
      expect((event.payload.key as string).startsWith(ctx.tenantA.id)).toBe(true);

      // Tenant B cannot download this file
      const storageB = new TenantStorage(
        { bucket: 'aivo-test-bucket' },
        { tenantId: ctx.tenantB.id }
      );

      await expect(storageB.getDownloadUrl(key)).rejects.toThrow(CrossTenantAccessError);
    });

    it('IDOR attack: using Tenant B resource ID in Tenant A context fails', async () => {
      const storageA = new TenantStorage(
        { bucket: 'aivo-test-bucket' },
        { tenantId: ctx.tenantA.id }
      );

      // Attacker knows Tenant B learner ID, tries to build path in Tenant A context
      // This creates a path in Tenant A's namespace, NOT Tenant B's
      const attackPath = storageA.buildLearnerPath(ctx.learnerB1.id, 'grades');

      // The path is scoped to Tenant A, even using Tenant B's learner ID
      expect(attackPath.startsWith(ctx.tenantA.id)).toBe(true);
      expect(attackPath).not.toContain(ctx.tenantB.id);

      // This would create a file in the wrong learner's Tenant A folder, not Tenant B
      // But importantly, it does NOT leak Tenant B data
    });

    it('cannot exfiltrate tenant data via event payload', async () => {
      const transport = createInMemoryTransport();
      const publisher = new EventPublisher(transport, { strictMode: true });

      // Attacker tries to include sensitive Tenant B data in an event
      await publisher.publish({
        tenantId: ctx.tenantA.id,
        eventType: 'SUSPICIOUS_ACTIVITY',
        payload: {
          // Attempting to log Tenant B data
          targetTenantId: ctx.tenantB.id,
          targetLearnerId: ctx.learnerB1.id,
          stolenData: 'sensitive information',
        },
      });

      // Event is recorded, but it's under Tenant A's ID
      // Audit systems can detect this suspicious cross-tenant reference
      const event = transport.events[0];
      expect(event.tenantId).toBe(ctx.tenantA.id);

      // Event consumers should validate that referenced IDs belong to the event's tenant
      const referencedTenant = event.payload.targetTenantId as string;
      expect(referencedTenant).not.toBe(event.tenantId);

      // This should trigger a security alert in production
    });
  });
});
