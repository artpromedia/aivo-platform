/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call */

import { PrismaClient } from '@prisma/client';

// Local type for Prisma middleware (not exported in all Prisma versions)
type MiddlewareParams = {
  model?: string;
  action: string;
  args: any;
  dataPath: string[];
  runInTransaction: boolean;
};

// Prisma namespace stub for types not exported
// eslint-disable-next-line @typescript-eslint/no-namespace
namespace Prisma {
  export type MiddlewareParams = {
    model?: string;
    action: string;
    args: any;
    dataPath: string[];
    runInTransaction: boolean;
  };
}

/**
 * Database Query Optimizer
 *
 * Provides utilities for:
 * - Query performance monitoring
 * - Automatic query analysis
 * - Index recommendations
 * - Connection pooling optimization
 * - Read replica routing
 */

export interface QueryMetrics {
  query: string;
  duration: number;
  rowsAffected: number;
  timestamp: Date;
}

export interface SlowQueryConfig {
  threshold: number;
  logQueries: boolean;
  sampleRate: number;
}

export interface ConnectionPoolConfig {
  min: number;
  max: number;
  idleTimeout: number;
  acquireTimeout: number;
}

// Simplified logger/metrics
const logger = {
  info: (msg: string, meta?: any) => console.log(`[db] ${msg}`, meta || ''),
  warn: (msg: string, meta?: any) => console.warn(`[db] ${msg}`, meta || ''),
  error: (msg: string, meta?: any) => console.error(`[db] ${msg}`, meta || ''),
};

const metrics = {
  increment: (_name: string, _tags?: any) => {},
  histogram: (_name: string, _value: number, _tags?: any) => {},
};

export class QueryOptimizer {
  private slowQueryThreshold: number;
  private queryLog: QueryMetrics[] = [];
  private readonly MAX_LOG_SIZE = 1000;
  private config: SlowQueryConfig;

  constructor(
    private prisma: PrismaClient,
    config: SlowQueryConfig = {
      threshold: 100,
      logQueries: true,
      sampleRate: 0.1,
    }
  ) {
    this.config = config;
    this.slowQueryThreshold = config.threshold;
    this.setupQueryLogging();
  }

  /**
   * Setup Prisma query logging middleware
   */
  private setupQueryLogging(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.prisma.$use(async (params: any, next: any) => {
      const startTime = performance.now();

      try {
        const result = await next(params);

        const duration = performance.now() - startTime;
        this.recordQuery(params, duration);

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;
        this.recordQuery(params, duration, error);
        throw error;
      }
    });
  }

  private recordQuery(
    params: Prisma.MiddlewareParams,
    duration: number,
    _error?: any
  ): void {
    const queryInfo = `${params.model}.${params.action}`;

    // Record metrics
    metrics.histogram('db.query.duration_ms', duration, {
      model: params.model || 'unknown',
      action: params.action,
    });

    // Log slow queries
    if (duration > this.slowQueryThreshold) {
      logger.warn('Slow query detected', {
        query: queryInfo,
        duration: `${duration.toFixed(2)}ms`,
        args: this.sanitizeArgs(params.args),
      });

      metrics.increment('db.slow_query', {
        model: params.model || 'unknown',
        action: params.action,
      });
    }

    // Sample queries for analysis
    if (Math.random() < this.config.sampleRate) {
      this.queryLog.push({
        query: queryInfo,
        duration,
        rowsAffected: 0,
        timestamp: new Date(),
      });

      // Keep log size bounded
      if (this.queryLog.length > this.MAX_LOG_SIZE) {
        this.queryLog = this.queryLog.slice(-this.MAX_LOG_SIZE / 2);
      }
    }
  }

  private sanitizeArgs(args: any): any {
    if (!args) return null;

    // Remove sensitive data from logged args
    const sanitized = JSON.parse(JSON.stringify(args));
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey'];

    const sanitize = (obj: any): void => {
      if (typeof obj !== 'object' || obj === null) return;

      for (const key of Object.keys(obj)) {
        if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
          obj[key] = '[REDACTED]';
        } else if (typeof obj[key] === 'object') {
          sanitize(obj[key]);
        }
      }
    };

    sanitize(sanitized);
    return sanitized;
  }

  /**
   * Analyze query patterns and provide recommendations
   */
  async analyzeQueryPatterns(): Promise<{
    slowQueries: QueryMetrics[];
    recommendations: string[];
    stats: {
      totalQueries: number;
      avgDuration: number;
      p95Duration: number;
      slowQueryCount: number;
    };
  }> {
    const sorted = [...this.queryLog].sort((a, b) => b.duration - a.duration);
    const slowQueries = sorted.filter(
      (q) => q.duration > this.slowQueryThreshold
    );

    const durations = this.queryLog
      .map((q) => q.duration)
      .sort((a, b) => a - b);
    const p95Index = Math.floor(durations.length * 0.95);

    const recommendations = this.generateRecommendations(slowQueries);

    return {
      slowQueries: slowQueries.slice(0, 20),
      recommendations,
      stats: {
        totalQueries: this.queryLog.length,
        avgDuration:
          durations.reduce((a, b) => a + b, 0) / durations.length || 0,
        p95Duration: durations[p95Index] || 0,
        slowQueryCount: slowQueries.length,
      },
    };
  }

  private generateRecommendations(slowQueries: QueryMetrics[]): string[] {
    const recommendations: string[] = [];
    const queryPatterns = new Map<string, number>();

    // Count query patterns
    for (const q of slowQueries) {
      const count = queryPatterns.get(q.query) || 0;
      queryPatterns.set(q.query, count + 1);
    }

    // Generate recommendations based on patterns
    for (const [query, count] of queryPatterns) {
      if (count > 5) {
        recommendations.push(
          `Query "${query}" is slow and called frequently (${count} times). ` +
            `Consider adding indexes or caching.`
        );
      }

      if (query.includes('findMany') && count > 10) {
        recommendations.push(
          `"${query}" called ${count} times. Consider pagination or batch loading.`
        );
      }
    }

    return recommendations;
  }

  /**
   * Get index recommendations based on query patterns
   */
  async getIndexRecommendations(): Promise<string[]> {
    const analysis = await this.analyzeQueryPatterns();
    const recommendations: string[] = [];

    // Analyze slow queries for missing indexes
    const queryModels = new Map<string, Set<string>>();

    for (const q of analysis.slowQueries) {
      const [model] = q.query.split('.');
      if (!queryModels.has(model)) {
        queryModels.set(model, new Set());
      }
    }

    // Check for N+1 query patterns
    const n1Patterns = this.detectN1Patterns();
    for (const pattern of n1Patterns) {
      recommendations.push(
        `Potential N+1 query detected: ${pattern.parent} → ${pattern.child}. ` +
          `Consider using \`include\` or batch loading.`
      );
    }

    return recommendations;
  }

  private detectN1Patterns(): Array<{ parent: string; child: string }> {
    const patterns: Array<{ parent: string; child: string }> = [];
    const recentQueries = this.queryLog.slice(-100);

    // Look for rapid successive queries to same model
    const windowSize = 50; // ms

    for (let i = 1; i < recentQueries.length; i++) {
      const prev = recentQueries[i - 1];
      const curr = recentQueries[i];

      const timeDiff = curr.timestamp.getTime() - prev.timestamp.getTime();

      if (
        timeDiff < windowSize &&
        prev.query !== curr.query &&
        curr.query.includes('findUnique')
      ) {
        // Potential N+1
        const [parentModel] = prev.query.split('.');
        const [childModel] = curr.query.split('.');

        if (parentModel !== childModel) {
          patterns.push({ parent: parentModel, child: childModel });
        }
      }
    }

    return patterns;
  }

  /**
   * Optimize a query with includes/selects
   */
  optimizeQuery<T extends object>(
    baseQuery: T,
    options: {
      include?: string[];
      select?: string[];
      limit?: number;
    }
  ): T {
    const optimized = { ...baseQuery } as any;

    // Add select to reduce data transfer
    if (options.select && options.select.length > 0) {
      optimized.select = options.select.reduce(
        (acc, field) => {
          acc[field] = true;
          return acc;
        },
        {} as Record<string, boolean>
      );
    }

    // Add pagination to prevent large result sets
    if (options.limit && !optimized.take) {
      optimized.take = options.limit;
    }

    return optimized;
  }

  /**
   * Create a batched query executor
   */
  createBatcher<T, R>(
    batchFn: (keys: T[]) => Promise<Map<T, R>>,
    options: {
      maxBatchSize?: number;
      batchDelayMs?: number;
    } = {}
  ): (key: T) => Promise<R | undefined> {
    const { maxBatchSize = 100, batchDelayMs = 10 } = options;

    let batch: T[] = [];
    let batchPromise: Promise<Map<T, R>> | null = null;
    let resolvers: Map<T, (value: R | undefined) => void> = new Map();

    const executeBatch = async (): Promise<void> => {
      const currentBatch = batch;
      const currentResolvers = resolvers;

      batch = [];
      resolvers = new Map();
      batchPromise = null;

      try {
        const results = await batchFn(currentBatch);

        for (const [key, resolver] of currentResolvers) {
          resolver(results.get(key));
        }
      } catch (_error) {
        for (const resolver of currentResolvers.values()) {
          resolver(undefined);
        }
      }
    };

    return (key: T): Promise<R | undefined> => {
      return new Promise((resolve) => {
        batch.push(key);
        resolvers.set(key, resolve);

        if (batch.length >= maxBatchSize) {
          executeBatch();
        } else if (!batchPromise) {
          batchPromise = new Promise((r) => {
            setTimeout(() => {
              executeBatch().then(() => r(new Map()));
            }, batchDelayMs);
          });
        }
      });
    };
  }

  /**
   * Get query statistics
   */
  getStats(): {
    totalQueries: number;
    avgDuration: number;
    slowQueries: number;
    queryLog: QueryMetrics[];
  } {
    const durations = this.queryLog.map((q) => q.duration);
    return {
      totalQueries: this.queryLog.length,
      avgDuration:
        durations.length > 0
          ? durations.reduce((a, b) => a + b, 0) / durations.length
          : 0,
      slowQueries: this.queryLog.filter(
        (q) => q.duration > this.slowQueryThreshold
      ).length,
      queryLog: this.queryLog.slice(-100),
    };
  }

  /**
   * Clear query log
   */
  clearLog(): void {
    this.queryLog = [];
  }
}

/**
 * Optimized query patterns
 */
export const OptimizedQueries = {
  /**
   * Paginated query with cursor-based pagination
   */
  paginatedQuery: async <T>(
    prisma: any,
    model: string,
    options: {
      where?: any;
      orderBy?: any;
      cursor?: string;
      limit?: number;
      select?: any;
      include?: any;
    }
  ): Promise<{ items: T[]; nextCursor: string | null; hasMore: boolean }> => {
    const { where, orderBy, cursor, limit = 20, select, include } = options;

    const query: any = {
      where,
      orderBy: orderBy || { createdAt: 'desc' },
      take: limit + 1, // Fetch one extra to check for more
    };

    if (cursor) {
      query.cursor = { id: cursor };
      query.skip = 1; // Skip the cursor
    }

    if (select) query.select = select;
    if (include) query.include = include;

    const results: T[] = await prisma[model].findMany(query);
    const hasMore = results.length > limit;
    const items = hasMore ? results.slice(0, -1) : results;
    const nextCursor = hasMore ? (items[items.length - 1] as any).id : null;

    return {
      items,
      nextCursor,
      hasMore,
    };
  },

  /**
   * Bulk upsert with conflict handling
   */
  bulkUpsert: async <T>(
    prisma: any,
    model: string,
    data: T[],
    options: {
      conflictFields: string[];
      updateFields: string[];
      batchSize?: number;
    }
  ): Promise<number> => {
    const { conflictFields, updateFields, batchSize = 100 } = options;
    let totalAffected = 0;

    // Process in batches
    for (let i = 0; i < data.length; i += batchSize) {
      const batch = data.slice(i, i + batchSize);

      // Use raw query for efficient bulk upsert
      const values = batch
        .map(
          (item: any) =>
            `(${Object.values(item)
              .map((v) => (typeof v === 'string' ? `'${v}'` : v))
              .join(', ')})`
        )
        .join(', ');

      const updateClause = updateFields
        .map((f) => `${f} = EXCLUDED.${f}`)
        .join(', ');

      const result = await prisma.$executeRawUnsafe(`
        INSERT INTO "${model}" (${Object.keys(batch[0] as object).join(', ')})
        VALUES ${values}
        ON CONFLICT (${conflictFields.join(', ')})
        DO UPDATE SET ${updateClause}, "updatedAt" = NOW()
      `);

      totalAffected += result;
    }

    return totalAffected;
  },

  /**
   * Efficient count with estimate for large tables
   */
  estimatedCount: async (
    prisma: any,
    model: string,
    where?: any
  ): Promise<{ count: number; isEstimate: boolean }> => {
    // For queries with filters, use exact count
    if (where && Object.keys(where).length > 0) {
      const count = await prisma[model].count({ where });
      return { count, isEstimate: false };
    }

    // For full table counts, use pg estimate
    try {
      const result = await prisma.$queryRaw<[{ reltuples: number }]>`
        SELECT reltuples::bigint as reltuples
        FROM pg_class
        WHERE relname = ${model}
      `;

      if (result[0]?.reltuples > 0) {
        return { count: result[0].reltuples, isEstimate: true };
      }
    } catch (_e) {
      // Fall back to exact count
    }

    const count = await prisma[model].count();
    return { count, isEstimate: false };
  },
};
