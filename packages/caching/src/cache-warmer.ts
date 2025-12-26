import { CacheManager, CacheOptions } from './cache-manager';

/**
 * Cache Warmer - Proactively loads frequently accessed data into cache
 */
export interface WarmingStrategy {
  name: string;
  priority: number;
  interval: number; // ms
  enabled: boolean;
  loader: () => Promise<Array<{ key: string; value: any; options?: CacheOptions }>>;
}

export class CacheWarmer {
  private cache: CacheManager;
  private strategies: Map<string, WarmingStrategy> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning = false;

  constructor(cache: CacheManager) {
    this.cache = cache;
  }

  /**
   * Register a warming strategy
   */
  registerStrategy(strategy: WarmingStrategy): void {
    this.strategies.set(strategy.name, strategy);

    if (this.isRunning && strategy.enabled) {
      this.startStrategy(strategy);
    }
  }

  /**
   * Start all warming strategies
   */
  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;

    const sortedStrategies = Array.from(this.strategies.values())
      .filter((s) => s.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of sortedStrategies) {
      this.startStrategy(strategy);
    }

    console.log(
      `[CacheWarmer] Started ${sortedStrategies.length} warming strategies`
    );
  }

  /**
   * Stop all warming strategies
   */
  stop(): void {
    this.isRunning = false;

    for (const [name, interval] of this.intervals) {
      clearInterval(interval);
      this.intervals.delete(name);
    }

    console.log('[CacheWarmer] Stopped all warming strategies');
  }

  /**
   * Warm cache immediately with a specific strategy
   */
  async warmNow(strategyName: string): Promise<number> {
    const strategy = this.strategies.get(strategyName);
    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyName}`);
    }

    return this.executeStrategy(strategy);
  }

  /**
   * Warm all strategies immediately
   */
  async warmAll(): Promise<Map<string, number>> {
    const results = new Map<string, number>();

    const sortedStrategies = Array.from(this.strategies.values())
      .filter((s) => s.enabled)
      .sort((a, b) => a.priority - b.priority);

    for (const strategy of sortedStrategies) {
      try {
        const count = await this.executeStrategy(strategy);
        results.set(strategy.name, count);
      } catch (error) {
        console.error(`[CacheWarmer] Strategy ${strategy.name} failed:`, error);
        results.set(strategy.name, -1);
      }
    }

    return results;
  }

  private startStrategy(strategy: WarmingStrategy): void {
    // Execute immediately
    this.executeStrategy(strategy).catch((err) =>
      console.error(`[CacheWarmer] Initial warm failed for ${strategy.name}:`, err)
    );

    // Schedule periodic execution
    const interval = setInterval(() => {
      this.executeStrategy(strategy).catch((err) =>
        console.error(`[CacheWarmer] Warm failed for ${strategy.name}:`, err)
      );
    }, strategy.interval);

    this.intervals.set(strategy.name, interval);
  }

  private async executeStrategy(strategy: WarmingStrategy): Promise<number> {
    const startTime = Date.now();

    try {
      const entries = await strategy.loader();

      if (entries.length > 0) {
        await this.cache.warmCache(entries);
      }

      const duration = Date.now() - startTime;
      console.log(
        `[CacheWarmer] ${strategy.name}: warmed ${entries.length} entries in ${duration}ms`
      );

      return entries.length;
    } catch (error) {
      console.error(`[CacheWarmer] Strategy ${strategy.name} failed:`, error);
      throw error;
    }
  }

  /**
   * Get status of all strategies
   */
  getStatus(): Array<{
    name: string;
    enabled: boolean;
    priority: number;
    interval: number;
    isActive: boolean;
  }> {
    return Array.from(this.strategies.values()).map((s) => ({
      name: s.name,
      enabled: s.enabled,
      priority: s.priority,
      interval: s.interval,
      isActive: this.intervals.has(s.name),
    }));
  }
}

/**
 * Pre-built warming strategies for common use cases
 */
export const WarmingStrategies = {
  /**
   * Warm active tenant configurations
   */
  tenantConfigs: (
    fetchTenants: () => Promise<Array<{ id: string; config: any }>>
  ): WarmingStrategy => ({
    name: 'tenant-configs',
    priority: 1,
    interval: 5 * 60 * 1000, // 5 minutes
    enabled: true,
    loader: async () => {
      const tenants = await fetchTenants();
      return tenants.map((t) => ({
        key: `tenant:config:${t.id}`,
        value: t.config,
        options: { ttl: 600, tags: ['tenant', `tenant:${t.id}`] },
      }));
    },
  }),

  /**
   * Warm feature flags
   */
  featureFlags: (
    fetchFlags: () => Promise<Record<string, boolean>>
  ): WarmingStrategy => ({
    name: 'feature-flags',
    priority: 2,
    interval: 60 * 1000, // 1 minute
    enabled: true,
    loader: async () => {
      const flags = await fetchFlags();
      return [
        {
          key: 'features:all',
          value: flags,
          options: { ttl: 120, tags: ['features'] },
        },
      ];
    },
  }),

  /**
   * Warm popular lessons
   */
  popularLessons: (
    fetchLessons: () => Promise<Array<{ id: string; data: any }>>
  ): WarmingStrategy => ({
    name: 'popular-lessons',
    priority: 10,
    interval: 15 * 60 * 1000, // 15 minutes
    enabled: true,
    loader: async () => {
      const lessons = await fetchLessons();
      return lessons.map((l) => ({
        key: `lesson:${l.id}`,
        value: l.data,
        options: { ttl: 1800, tags: ['lesson', `lesson:${l.id}`] },
      }));
    },
  }),

  /**
   * Warm skill taxonomies
   */
  skillTaxonomy: (
    fetchSkills: () => Promise<any>
  ): WarmingStrategy => ({
    name: 'skill-taxonomy',
    priority: 5,
    interval: 60 * 60 * 1000, // 1 hour
    enabled: true,
    loader: async () => {
      const skills = await fetchSkills();
      return [
        {
          key: 'skills:taxonomy',
          value: skills,
          options: { ttl: 7200, tags: ['skills'] },
        },
      ];
    },
  }),

  /**
   * Warm class rosters
   */
  classRosters: (
    fetchClasses: () => Promise<Array<{ id: string; roster: any }>>
  ): WarmingStrategy => ({
    name: 'class-rosters',
    priority: 8,
    interval: 10 * 60 * 1000, // 10 minutes
    enabled: true,
    loader: async () => {
      const classes = await fetchClasses();
      return classes.map((c) => ({
        key: `class:roster:${c.id}`,
        value: c.roster,
        options: { ttl: 900, tags: ['class', `class:${c.id}`] },
      }));
    },
  }),
};
