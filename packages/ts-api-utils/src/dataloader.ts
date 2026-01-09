/**
 * DataLoader - N+1 Query Prevention
 *
 * Provides batching and caching for database queries to prevent the N+1 query problem.
 * This is essential for GraphQL resolvers and any code that loads related entities.
 *
 * CRITICAL: Addresses HIGH-005 - N+1 Query Prevention
 *
 * The N+1 problem occurs when:
 * 1. You fetch N items (1 query)
 * 2. For each item, you fetch related data (N queries)
 *
 * DataLoader solves this by:
 * 1. Batching: Collecting all IDs requested in a single tick
 * 2. Caching: Storing results to avoid duplicate queries
 *
 * Usage:
 * ```typescript
 * import { createDataLoader, DataLoaderCache } from '@aivo/ts-api-utils/dataloader';
 *
 * // Create a loader with a batch function
 * const userLoader = createDataLoader(async (ids: string[]) => {
 *   const users = await db.users.findMany({ where: { id: { in: ids } } });
 *   return ids.map(id => users.find(u => u.id === id) ?? null);
 * });
 *
 * // Use the loader - requests are batched automatically
 * const user1 = await userLoader.load('user-1');
 * const user2 = await userLoader.load('user-2');
 *
 * // Load multiple at once
 * const users = await userLoader.loadMany(['user-3', 'user-4']);
 * ```
 */

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Batch loading function that takes an array of keys and returns values in the same order.
 * Must return exactly one value per key (null for missing items).
 */
export type BatchLoadFn<K, V> = (keys: K[]) => Promise<(V | null | Error)[]>;

/**
 * DataLoader configuration options
 */
export interface DataLoaderOptions<K, V> {
  /** Enable caching (default: true) */
  cache?: boolean;
  /** Maximum batch size (default: 1000) */
  maxBatchSize?: number;
  /** Custom cache instance */
  cacheMap?: DataLoaderCache<K, V>;
  /** Custom key function for complex keys */
  cacheKeyFn?: (key: K) => string;
  /** Batch scheduling function (default: process.nextTick) */
  batchScheduleFn?: (callback: () => void) => void;
  /** Name for debugging/metrics */
  name?: string;
}

/**
 * Cache interface for DataLoader
 */
export interface DataLoaderCache<K, V> {
  get(key: K): Promise<V> | undefined;
  set(key: K, value: Promise<V>): void;
  delete(key: K): void;
  clear(): void;
}

/**
 * DataLoader interface
 */
export interface DataLoader<K, V> {
  /** Load a single value by key */
  load(key: K): Promise<V | null>;
  /** Load multiple values by keys */
  loadMany(keys: K[]): Promise<(V | null | Error)[]>;
  /** Clear a single cached value */
  clear(key: K): this;
  /** Clear all cached values */
  clearAll(): this;
  /** Prime the cache with a value */
  prime(key: K, value: V | Error): this;
  /** Get loader name */
  readonly name: string;
}

// ══════════════════════════════════════════════════════════════════════════════
// CACHE IMPLEMENTATIONS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Simple Map-based cache (default)
 */
export class MapCache<K, V> implements DataLoaderCache<K, V> {
  private cache = new Map<K, Promise<V>>();

  get(key: K): Promise<V> | undefined {
    return this.cache.get(key);
  }

  set(key: K, value: Promise<V>): void {
    this.cache.set(key, value);
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * LRU (Least Recently Used) cache with size limit
 */
export class LRUCache<K, V> implements DataLoaderCache<K, V> {
  private cache = new Map<K, Promise<V>>();
  private maxSize: number;

  constructor(maxSize = 1000) {
    this.maxSize = maxSize;
  }

  get(key: K): Promise<V> | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: Promise<V>): void {
    // Delete if exists (to update position)
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    // Evict oldest if at capacity
    else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

/**
 * TTL (Time To Live) cache that expires entries after a duration
 */
export class TTLCache<K, V> implements DataLoaderCache<K, V> {
  private cache = new Map<K, { value: Promise<V>; expiresAt: number }>();
  private ttlMs: number;

  constructor(ttlMs = 60000) {
    this.ttlMs = ttlMs;
  }

  get(key: K): Promise<V> | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  set(key: K, value: Promise<V>): void {
    this.cache.set(key, {
      value,
      expiresAt: Date.now() + this.ttlMs,
    });
  }

  delete(key: K): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// DATALOADER IMPLEMENTATION
// ══════════════════════════════════════════════════════════════════════════════

interface BatchItem<K, V> {
  key: K;
  resolve: (value: V | null) => void;
  reject: (error: Error) => void;
}

/**
 * Create a new DataLoader instance
 */
export function createDataLoader<K, V>(
  batchFn: BatchLoadFn<K, V>,
  options: DataLoaderOptions<K, V> = {}
): DataLoader<K, V> {
  const {
    cache = true,
    maxBatchSize = 1000,
    cacheMap = new MapCache<K, V>(),
    cacheKeyFn,
    batchScheduleFn = (cb) => process.nextTick(cb),
    name = 'DataLoader',
  } = options;

  let batch: BatchItem<K, V>[] | null = null;
  let batchScheduled = false;

  /**
   * Get cache key for a given key
   */
  function getCacheKey(key: K): K {
    // If cacheKeyFn is provided, use string keys internally
    // For simplicity, we use the key directly here
    return cacheKeyFn ? (cacheKeyFn(key) as unknown as K) : key;
  }

  /**
   * Schedule batch execution
   */
  function scheduleBatch(): void {
    if (batchScheduled) return;
    batchScheduled = true;

    batchScheduleFn(() => {
      batchScheduled = false;
      executeBatch();
    });
  }

  /**
   * Execute the current batch
   */
  async function executeBatch(): Promise<void> {
    const currentBatch = batch;
    batch = null;

    if (!currentBatch || currentBatch.length === 0) return;

    const keys = currentBatch.map((item) => item.key);

    try {
      const values = await batchFn(keys);

      // Validate response length
      if (values.length !== keys.length) {
        const error = new Error(
          `${name}: Batch function returned ${values.length} results for ${keys.length} keys`
        );
        currentBatch.forEach((item) => item.reject(error));
        return;
      }

      // Resolve each item
      currentBatch.forEach((item, index) => {
        const value = values[index];
        if (value instanceof Error) {
          item.reject(value);
        } else {
          item.resolve(value);
        }
      });
    } catch (error) {
      // Reject all items on batch failure
      const err = error instanceof Error ? error : new Error(String(error));
      currentBatch.forEach((item) => item.reject(err));
    }
  }

  /**
   * Load a single value
   */
  function load(key: K): Promise<V | null> {
    const cacheKey = getCacheKey(key);

    // Check cache first
    if (cache) {
      const cached = cacheMap.get(cacheKey);
      if (cached !== undefined) {
        return cached as Promise<V | null>;
      }
    }

    // Create promise for this load
    const promise = new Promise<V | null>((resolve, reject) => {
      // Initialize batch if needed
      if (!batch) {
        batch = [];
      }

      // Add to batch
      batch.push({ key, resolve, reject });

      // Split batch if at max size
      if (batch.length >= maxBatchSize) {
        executeBatch();
      } else {
        scheduleBatch();
      }
    });

    // Cache the promise
    if (cache) {
      cacheMap.set(cacheKey, promise as Promise<V>);
    }

    return promise;
  }

  /**
   * Load multiple values
   */
  async function loadMany(keys: K[]): Promise<(V | null | Error)[]> {
    const results: (V | null | Error)[] = [];

    for (const key of keys) {
      try {
        results.push(await load(key));
      } catch (error) {
        results.push(error instanceof Error ? error : new Error(String(error)));
      }
    }

    return results;
  }

  /**
   * Clear a cached value
   */
  function clear(key: K): DataLoader<K, V> {
    const cacheKey = getCacheKey(key);
    cacheMap.delete(cacheKey);
    return loader;
  }

  /**
   * Clear all cached values
   */
  function clearAll(): DataLoader<K, V> {
    cacheMap.clear();
    return loader;
  }

  /**
   * Prime the cache with a value
   */
  function prime(key: K, value: V | Error): DataLoader<K, V> {
    const cacheKey = getCacheKey(key);

    // Only prime if not already cached
    if (cacheMap.get(cacheKey) === undefined) {
      const promise =
        value instanceof Error
          ? Promise.reject(value)
          : Promise.resolve(value);
      cacheMap.set(cacheKey, promise as Promise<V>);
    }

    return loader;
  }

  const loader: DataLoader<K, V> = {
    load,
    loadMany,
    clear,
    clearAll,
    prime,
    name,
  };

  return loader;
}

// ══════════════════════════════════════════════════════════════════════════════
// FACTORY HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Create a DataLoader for loading records by ID from a database
 */
export function createIdLoader<T extends { id: string }>(
  fetchByIds: (ids: string[]) => Promise<T[]>,
  options?: Omit<DataLoaderOptions<string, T>, 'cacheKeyFn'>
): DataLoader<string, T> {
  return createDataLoader<string, T>(
    async (ids) => {
      const records = await fetchByIds(ids);
      const recordMap = new Map(records.map((r) => [r.id, r]));
      return ids.map((id) => recordMap.get(id) ?? null);
    },
    options
  );
}

/**
 * Create a DataLoader for loading related records (one-to-many)
 */
export function createRelationLoader<T>(
  fetchByForeignKeys: (foreignKeys: string[]) => Promise<T[]>,
  foreignKeyAccessor: (item: T) => string,
  options?: DataLoaderOptions<string, T[]>
): DataLoader<string, T[]> {
  return createDataLoader<string, T[]>(
    async (foreignKeys) => {
      const records = await fetchByForeignKeys(foreignKeys);

      // Group by foreign key
      const grouped = new Map<string, T[]>();
      for (const record of records) {
        const fk = foreignKeyAccessor(record);
        const existing = grouped.get(fk) ?? [];
        existing.push(record);
        grouped.set(fk, existing);
      }

      return foreignKeys.map((fk) => grouped.get(fk) ?? []);
    },
    {
      ...options,
      // Relations should return empty arrays, not null
    }
  ) as unknown as DataLoader<string, T[]>;
}

/**
 * Create a DataLoader that groups results by a compound key
 */
export function createCompoundKeyLoader<T>(
  fetchByKeys: (keys: Array<{ tenantId: string; id: string }>) => Promise<T[]>,
  keyAccessor: (item: T) => { tenantId: string; id: string },
  options?: Omit<DataLoaderOptions<{ tenantId: string; id: string }, T>, 'cacheKeyFn'>
): DataLoader<{ tenantId: string; id: string }, T> {
  return createDataLoader<{ tenantId: string; id: string }, T>(
    async (keys) => {
      const records = await fetchByKeys(keys);
      const recordMap = new Map<string, T>();

      for (const record of records) {
        const key = keyAccessor(record);
        recordMap.set(`${key.tenantId}:${key.id}`, record);
      }

      return keys.map((key) => recordMap.get(`${key.tenantId}:${key.id}`) ?? null);
    },
    {
      ...options,
      cacheKeyFn: (key) => `${key.tenantId}:${key.id}`,
    }
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// REQUEST-SCOPED LOADER FACTORY
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Factory for creating request-scoped DataLoaders.
 * Creates fresh loaders for each request to avoid cache leaks between requests.
 */
export class DataLoaderFactory {
  private factories = new Map<string, () => DataLoader<unknown, unknown>>();

  /**
   * Register a loader factory
   */
  register<K, V>(
    name: string,
    factory: () => DataLoader<K, V>
  ): void {
    this.factories.set(name, factory as () => DataLoader<unknown, unknown>);
  }

  /**
   * Create a fresh set of loaders for a request
   */
  createLoaders(): Map<string, DataLoader<unknown, unknown>> {
    const loaders = new Map<string, DataLoader<unknown, unknown>>();

    for (const [name, factory] of this.factories) {
      loaders.set(name, factory());
    }

    return loaders;
  }

  /**
   * Create a context object with typed loaders
   */
  createContext<T extends Record<string, DataLoader<unknown, unknown>>>(): T {
    const loaders = this.createLoaders();
    return Object.fromEntries(loaders) as T;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONVENIENCE EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

export const DataLoaders = {
  create: createDataLoader,
  createIdLoader,
  createRelationLoader,
  createCompoundKeyLoader,
  Factory: DataLoaderFactory,
  Cache: {
    Map: MapCache,
    LRU: LRUCache,
    TTL: TTLCache,
  },
};
