/**
 * Document Sync Service with Y.js CRDT
 *
 * Handles real-time document synchronization using Y.js CRDTs for:
 * - Conflict-free collaborative editing
 * - Document state management
 * - Update merging and broadcasting
 * - Version history
 * - Persistence with debounced saves
 */

import * as Y from 'yjs';

import { prisma } from '../prisma.js';
import { getRedisClient } from '../redis/index.js';

/**
 * Document state in memory
 */
interface DocumentState {
  doc: Y.Doc;
  version: number;
  lastUpdate: Date;
  pendingPersist: boolean;
  clients: Set<string>;
}

/**
 * Sync update result
 */
export interface SyncResult {
  success: boolean;
  version?: number;
  mergedUpdate?: Uint8Array;
  error?: string;
}

/**
 * Diff result for syncing
 */
export interface DiffResult {
  update: Uint8Array;
  version: number;
}

/**
 * Document history entry
 */
export interface HistoryEntry {
  version: number;
  userId: string;
  timestamp: Date;
  size: number;
}

/**
 * Document Sync Service
 */
export class SyncService {
  private readonly documents = new Map<string, DocumentState>();
  private readonly persistQueue = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly PERSIST_DELAY = 5000; // 5 seconds debounce
  private readonly DOC_TTL = 3600; // 1 hour cache
  private readonly MAX_HISTORY = 100;

  /**
   * Get or create a Y.js document
   */
  async getDocument(documentId: string): Promise<DocumentState> {
    // Check memory cache
    if (this.documents.has(documentId)) {
      return this.documents.get(documentId)!;
    }

    // Try Redis cache
    const redis = getRedisClient();
    const cached = await redis.getBuffer(`doc:state:${documentId}`);

    const doc = new Y.Doc();

    if (cached) {
      try {
        Y.applyUpdate(doc, new Uint8Array(cached));
      } catch (error) {
        console.error(`[Sync] Failed to load document ${documentId} from cache:`, error);
      }
    } else {
      // Try loading from persistent storage (database)
      const stored = await this.loadFromDatabase(documentId);
      if (stored) {
        try {
          Y.applyUpdate(doc, stored.state);
        } catch (error) {
          console.error(`[Sync] Failed to load document ${documentId} from database:`, error);
        }
      }
    }

    const version = await this.getVersion(documentId);

    const state: DocumentState = {
      doc,
      version,
      lastUpdate: new Date(),
      pendingPersist: false,
      clients: new Set(),
    };

    this.documents.set(documentId, state);

    // Cache in Redis
    await this.cacheDocument(documentId, doc);

    console.log(`[Sync] Document ${documentId} loaded, version ${version}`);
    return state;
  }

  /**
   * Apply an update from a client
   */
  async applyUpdate(
    documentId: string,
    update: Uint8Array,
    userId: string,
    clientId: number
  ): Promise<SyncResult> {
    try {
      const state = await this.getDocument(documentId);

      // Apply the update
      Y.applyUpdate(state.doc, update, clientId);

      // Increment version
      state.version++;
      state.lastUpdate = new Date();
      state.pendingPersist = true;

      // Update Redis cache
      await this.cacheDocument(documentId, state.doc);
      await this.setVersion(documentId, state.version);

      // Record update for history
      await this.recordUpdate(documentId, update, userId, state.version);

      console.log(`[Sync] Update applied to ${documentId}, version ${state.version}`);

      return {
        success: true,
        version: state.version,
      };
    } catch (error) {
      console.error(`[Sync] Failed to apply update to ${documentId}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to apply update',
      };
    }
  }

  /**
   * Get diff between client state and server state
   */
  async getDiff(documentId: string, clientStateVector: Uint8Array): Promise<DiffResult> {
    const state = await this.getDocument(documentId);

    // Encode diff based on client's state vector
    const update = Y.encodeStateAsUpdate(state.doc, clientStateVector);

    return {
      update,
      version: state.version,
    };
  }

  /**
   * Get full document state
   */
  async getState(documentId: string): Promise<{ update: Uint8Array; version: number }> {
    const state = await this.getDocument(documentId);

    return {
      update: Y.encodeStateAsUpdate(state.doc),
      version: state.version,
    };
  }

  /**
   * Get state vector for a document
   */
  async getStateVector(documentId: string): Promise<Uint8Array> {
    const state = await this.getDocument(documentId);
    return Y.encodeStateVector(state.doc);
  }

  /**
   * Schedule document persistence
   */
  schedulePersist(documentId: string): void {
    // Cancel existing timeout
    const existing = this.persistQueue.get(documentId);
    if (existing) {
      clearTimeout(existing);
    }

    // Schedule new persist
    const timeout = setTimeout(async () => {
      await this.persistDocument(documentId);
      this.persistQueue.delete(documentId);
    }, this.PERSIST_DELAY);

    this.persistQueue.set(documentId, timeout);
  }

  /**
   * Persist document to database
   */
  async persistDocument(documentId: string): Promise<void> {
    const state = this.documents.get(documentId);
    if (!state?.pendingPersist) {
      return;
    }

    try {
      const update = Y.encodeStateAsUpdate(state.doc);

      await this.saveToDatabase(documentId, update, state.version);

      state.pendingPersist = false;
      console.log(`[Sync] Document ${documentId} persisted, version ${state.version}`);
    } catch (error) {
      console.error(`[Sync] Failed to persist document ${documentId}:`, error);
    }
  }

  /**
   * Force persist all pending documents
   */
  async persistAll(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (const [documentId, state] of this.documents) {
      if (state.pendingPersist) {
        promises.push(this.persistDocument(documentId));
      }
    }

    await Promise.all(promises);
  }

  /**
   * Add client to document
   */
  async addClient(documentId: string, clientId: string): Promise<void> {
    const state = await this.getDocument(documentId);
    state.clients.add(clientId);
  }

  /**
   * Remove client from document
   */
  async removeClient(documentId: string, clientId: string): Promise<void> {
    const state = this.documents.get(documentId);
    if (!state) return;

    state.clients.delete(clientId);

    // Unload document if no clients
    if (state.clients.size === 0) {
      await this.unloadDocument(documentId);
    }
  }

  /**
   * Get document history
   */
  async getHistory(documentId: string, limit = 50): Promise<HistoryEntry[]> {
    const redis = getRedisClient();
    const key = `doc:history:${documentId}`;

    const entries = await redis.lrange(key, 0, limit - 1);

    return entries.map((entry) => JSON.parse(entry));
  }

  /**
   * Restore document to a specific version
   */
  async restoreVersion(documentId: string, targetVersion: number): Promise<boolean> {
    try {
      const redis = getRedisClient();
      const key = `doc:updates:${documentId}`;

      // Get all updates up to target version
      const updateStrings = await redis.lrange(key, 0, -1);

      // Create new doc and apply updates up to target version
      const doc = new Y.Doc();

      for (const updateStr of updateStrings.reverse()) {
        const updateData = JSON.parse(updateStr);
        if (updateData.version <= targetVersion) {
          const update = Buffer.from(updateData.data, 'base64');
          Y.applyUpdate(doc, new Uint8Array(update));
        }
      }

      // Get or create document state
      const state = await this.getDocument(documentId);

      // Apply the restored state
      const restoredUpdate = Y.encodeStateAsUpdate(doc);
      Y.applyUpdate(state.doc, restoredUpdate);

      state.version++;
      state.pendingPersist = true;

      await this.persistDocument(documentId);
      await this.cacheDocument(documentId, state.doc);

      console.log(`[Sync] Document ${documentId} restored to version ${targetVersion}`);
      return true;
    } catch (error) {
      console.error(
        `[Sync] Failed to restore document ${documentId} to version ${targetVersion}:`,
        error
      );
      return false;
    }
  }

  /**
   * Unload document from memory
   */
  async unloadDocument(documentId: string): Promise<void> {
    const state = this.documents.get(documentId);

    if (state) {
      // Persist if needed
      if (state.pendingPersist) {
        await this.persistDocument(documentId);
      }

      // Destroy Y.Doc
      state.doc.destroy();

      // Remove from memory
      this.documents.delete(documentId);
    }

    // Clear persist timeout
    const timeout = this.persistQueue.get(documentId);
    if (timeout) {
      clearTimeout(timeout);
      this.persistQueue.delete(documentId);
    }

    console.log(`[Sync] Document ${documentId} unloaded from memory`);
  }

  /**
   * Get active document count
   */
  getActiveDocumentCount(): number {
    return this.documents.size;
  }

  /**
   * Get document client count
   */
  async getDocumentClientCount(documentId: string): Promise<number> {
    const state = this.documents.get(documentId);
    return state?.clients.size ?? 0;
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private async cacheDocument(documentId: string, doc: Y.Doc): Promise<void> {
    const redis = getRedisClient();
    const update = Y.encodeStateAsUpdate(doc);
    const buffer = Buffer.from(update);

    await redis.setex(`doc:state:${documentId}`, this.DOC_TTL, buffer);
  }

  private async getVersion(documentId: string): Promise<number> {
    const redis = getRedisClient();
    const version = await redis.get(`doc:version:${documentId}`);
    return version ? Number.parseInt(version, 10) : 0;
  }

  private async setVersion(documentId: string, version: number): Promise<void> {
    const redis = getRedisClient();
    await redis.setex(`doc:version:${documentId}`, this.DOC_TTL, version.toString());
  }

  private async recordUpdate(
    documentId: string,
    update: Uint8Array,
    userId: string,
    version: number
  ): Promise<void> {
    const redis = getRedisClient();
    const historyKey = `doc:history:${documentId}`;
    const updatesKey = `doc:updates:${documentId}`;

    const historyEntry: HistoryEntry = {
      version,
      userId,
      timestamp: new Date(),
      size: update.length,
    };

    const updateData = {
      version,
      userId,
      data: Buffer.from(update).toString('base64'),
      timestamp: new Date().toISOString(),
    };

    // Add to history list
    await redis.lpush(historyKey, JSON.stringify(historyEntry));
    await redis.ltrim(historyKey, 0, this.MAX_HISTORY - 1);
    await redis.expire(historyKey, this.DOC_TTL * 24);

    // Store update for version restoration
    await redis.lpush(updatesKey, JSON.stringify(updateData));
    await redis.ltrim(updatesKey, 0, this.MAX_HISTORY - 1);
    await redis.expire(updatesKey, this.DOC_TTL * 24);
  }

  private async loadFromDatabase(
    documentId: string
  ): Promise<{ state: Uint8Array; version: number } | null> {
    try {
      const docState = await prisma.documentState.findUnique({
        where: { documentId },
        select: {
          state: true,
          version: true,
        },
      });

      if (!docState) {
        return null;
      }

      return {
        state: new Uint8Array(docState.state),
        version: docState.version,
      };
    } catch (error) {
      console.error(`[Sync] Failed to load document ${documentId} from database:`, error);
      return null;
    }
  }

  private async saveToDatabase(
    documentId: string,
    state: Uint8Array,
    version: number,
    tenantId?: string,
    userId?: string
  ): Promise<void> {
    try {
      // Upsert document state to database
      await prisma.documentState.upsert({
        where: { documentId },
        create: {
          documentId,
          tenantId: tenantId || '00000000-0000-0000-0000-000000000000', // Default tenant
          state: Buffer.from(state),
          version,
          lastModifiedBy: userId,
        },
        update: {
          state: Buffer.from(state),
          version,
          lastModifiedBy: userId,
          updatedAt: new Date(),
        },
      });

      // Also record in history for version restoration
      const docState = await prisma.documentState.findUnique({
        where: { documentId },
        select: { id: true },
      });

      if (docState) {
        await prisma.documentHistory.create({
          data: {
            documentStateId: docState.id,
            version,
            userId: userId || '00000000-0000-0000-0000-000000000000',
            updateSize: state.length,
          },
        });

        // Prune old history entries (keep last 100)
        const historyCount = await prisma.documentHistory.count({
          where: { documentStateId: docState.id },
        });

        if (historyCount > this.MAX_HISTORY) {
          const oldEntries = await prisma.documentHistory.findMany({
            where: { documentStateId: docState.id },
            orderBy: { createdAt: 'asc' },
            take: historyCount - this.MAX_HISTORY,
            select: { id: true },
          });

          await prisma.documentHistory.deleteMany({
            where: {
              id: { in: oldEntries.map((e) => e.id) },
            },
          });
        }
      }

      console.log(`[Sync] Document ${documentId} persisted to database, version ${version}`);
    } catch (error) {
      console.error(`[Sync] Failed to save document ${documentId} to database:`, error);

      // Fallback: persist to Redis with longer TTL
      const redis = getRedisClient();
      await redis.setex(
        `doc:persistent:${documentId}`,
        86400 * 7, // 7 days
        JSON.stringify({
          state: Buffer.from(state).toString('base64'),
          version,
          updatedAt: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Shutdown - persist all documents
   */
  async shutdown(): Promise<void> {
    console.log('[Sync] Shutting down, persisting all documents...');

    // Clear all persist timeouts
    for (const timeout of this.persistQueue.values()) {
      clearTimeout(timeout);
    }
    this.persistQueue.clear();

    // Persist all pending documents
    await this.persistAll();

    // Destroy all Y.Docs
    for (const [_documentId, state] of this.documents) {
      state.doc.destroy();
    }
    this.documents.clear();

    console.log('[Sync] Shutdown complete');
  }
}

// Export singleton instance
export const syncService = new SyncService();
