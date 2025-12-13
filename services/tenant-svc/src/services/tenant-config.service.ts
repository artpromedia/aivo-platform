/**
 * Tenant Configuration Service
 *
 * Provides cached access to tenant configuration with automatic invalidation.
 * This service is critical for multi-tenancy - it determines what features,
 * AI providers, and quotas are available to each tenant.
 *
 * @module services/tenant-config.service
 */

import type { Redis } from 'ioredis';

// Types will be properly typed after prisma generate is run
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaClient = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TenantConfig = any;

// ══════════════════════════════════════════════════════════════════════════════
// Types
// ══════════════════════════════════════════════════════════════════════════════

export type AllowedAIProvider = 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'AZURE_OPENAI' | 'LOCAL';

export interface TenantConfigData {
  id: string;
  tenantId: string;

  // AI Configuration
  allowedAIProviders: AllowedAIProvider[];
  defaultAIProvider: AllowedAIProvider;
  aiModelOverrides?: Record<string, string> | null;

  // Data Residency
  dataResidencyRegion: string;
  backupRegion?: string | null;

  // Curriculum Configuration
  enabledModules: string[];
  curriculumStandards: string[];
  gradeLevels: string[];

  // Feature Flags
  enableHomeworkHelper: boolean;
  enableFocusMode: boolean;
  enableParentPortal: boolean;
  enableTeacherDashboard: boolean;

  // Usage Limits
  dailyLLMCallLimit: number;
  dailyTutorTurnLimit: number;
  maxLearnersPerTenant: number;
  storageQuotaGB: number;

  // Safety & Compliance
  contentFilterLevel: string;
  enablePIIRedaction: boolean;
  retentionDays: number;

  // Custom settings
  customSettings?: Record<string, unknown> | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface TenantConfigServiceConfig {
  redis?: Redis | null;
  prisma: PrismaClient;
  cacheTtlSeconds?: number;
}

export interface UpdateTenantConfigInput {
  allowedAIProviders?: AllowedAIProvider[];
  defaultAIProvider?: AllowedAIProvider;
  aiModelOverrides?: Record<string, string> | null;
  dataResidencyRegion?: string;
  backupRegion?: string | null;
  enabledModules?: string[];
  curriculumStandards?: string[];
  gradeLevels?: string[];
  enableHomeworkHelper?: boolean;
  enableFocusMode?: boolean;
  enableParentPortal?: boolean;
  enableTeacherDashboard?: boolean;
  dailyLLMCallLimit?: number;
  dailyTutorTurnLimit?: number;
  maxLearnersPerTenant?: number;
  storageQuotaGB?: number;
  contentFilterLevel?: string;
  enablePIIRedaction?: boolean;
  retentionDays?: number;
  customSettings?: Record<string, unknown> | null;
}

// Cache key prefix
const CACHE_PREFIX = 'tenant:config:';

// Default configuration values
const DEFAULT_CONFIG: Omit<TenantConfigData, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'> = {
  allowedAIProviders: ['OPENAI', 'ANTHROPIC'],
  defaultAIProvider: 'OPENAI',
  aiModelOverrides: null,
  dataResidencyRegion: 'us-east-1',
  backupRegion: null,
  enabledModules: ['ELA', 'MATH'],
  curriculumStandards: ['COMMON_CORE'],
  gradeLevels: ['K', '1', '2', '3', '4', '5', '6', '7', '8'],
  enableHomeworkHelper: true,
  enableFocusMode: true,
  enableParentPortal: true,
  enableTeacherDashboard: true,
  dailyLLMCallLimit: 10000,
  dailyTutorTurnLimit: 50000,
  maxLearnersPerTenant: 0, // 0 = unlimited
  storageQuotaGB: 100,
  contentFilterLevel: 'STANDARD',
  enablePIIRedaction: true,
  retentionDays: 2555, // 7 years for FERPA
  customSettings: null,
};

// ══════════════════════════════════════════════════════════════════════════════
// Service Implementation
// ══════════════════════════════════════════════════════════════════════════════

export class TenantConfigService {
  private readonly redis: Redis | null;
  private readonly prisma: PrismaClient;
  private readonly cacheTtlSeconds: number;

  // In-memory fallback cache for when Redis is unavailable
  private readonly memoryCache = new Map<string, { data: TenantConfigData; expiresAt: number }>();

  constructor(config: TenantConfigServiceConfig) {
    this.redis = config.redis ?? null;
    this.prisma = config.prisma;
    this.cacheTtlSeconds = config.cacheTtlSeconds ?? 300; // 5 minutes default
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Public API
  // ════════════════════════════════════════════════════════════════════════════

  /**
   * Get tenant configuration (with caching)
   *
   * This is the primary method services should use to access tenant config.
   * It automatically handles caching and falls back to defaults if no config exists.
   *
   * @param tenantId - The tenant ID to get configuration for
   * @returns TenantConfigData - never null, will return defaults if not configured
   */
  async getTenantConfig(tenantId: string): Promise<TenantConfigData> {
    // Validate tenantId
    if (!tenantId || typeof tenantId !== 'string') {
      throw new Error('tenantId is required');
    }

    const cacheKey = `${CACHE_PREFIX}${tenantId}`;

    // Try cache first
    const cached = await this.getFromCache(cacheKey);
    if (cached) {
      return cached;
    }

    // Query database
    const config = await this.prisma.tenantConfig.findUnique({
      where: { tenantId },
    });

    if (config) {
      const configData = this.mapToConfigData(config);
      await this.setCache(cacheKey, configData);
      return configData;
    }

    // Return defaults if no config exists (but don't cache - let them create one)
    return this.createDefaultConfig(tenantId);
  }

  /**
   * Create tenant configuration
   *
   * @param tenantId - The tenant ID to create configuration for
   * @param input - Optional initial configuration values
   * @returns Created TenantConfigData
   */
  async createTenantConfig(
    tenantId: string,
    input?: UpdateTenantConfigInput
  ): Promise<TenantConfigData> {
    const config = await this.prisma.tenantConfig.create({
      data: {
        tenantId,
        allowedAIProviders: input?.allowedAIProviders ?? DEFAULT_CONFIG.allowedAIProviders,
        defaultAIProvider: input?.defaultAIProvider ?? DEFAULT_CONFIG.defaultAIProvider,
        aiModelOverrides: input?.aiModelOverrides ?? undefined,
        dataResidencyRegion: input?.dataResidencyRegion ?? DEFAULT_CONFIG.dataResidencyRegion,
        backupRegion: input?.backupRegion ?? undefined,
        enabledModules: input?.enabledModules ?? DEFAULT_CONFIG.enabledModules,
        curriculumStandards: input?.curriculumStandards ?? DEFAULT_CONFIG.curriculumStandards,
        gradeLevels: input?.gradeLevels ?? DEFAULT_CONFIG.gradeLevels,
        enableHomeworkHelper: input?.enableHomeworkHelper ?? DEFAULT_CONFIG.enableHomeworkHelper,
        enableFocusMode: input?.enableFocusMode ?? DEFAULT_CONFIG.enableFocusMode,
        enableParentPortal: input?.enableParentPortal ?? DEFAULT_CONFIG.enableParentPortal,
        enableTeacherDashboard:
          input?.enableTeacherDashboard ?? DEFAULT_CONFIG.enableTeacherDashboard,
        dailyLLMCallLimit: input?.dailyLLMCallLimit ?? DEFAULT_CONFIG.dailyLLMCallLimit,
        dailyTutorTurnLimit: input?.dailyTutorTurnLimit ?? DEFAULT_CONFIG.dailyTutorTurnLimit,
        maxLearnersPerTenant: input?.maxLearnersPerTenant ?? DEFAULT_CONFIG.maxLearnersPerTenant,
        storageQuotaGB: input?.storageQuotaGB ?? DEFAULT_CONFIG.storageQuotaGB,
        contentFilterLevel: input?.contentFilterLevel ?? DEFAULT_CONFIG.contentFilterLevel,
        enablePIIRedaction: input?.enablePIIRedaction ?? DEFAULT_CONFIG.enablePIIRedaction,
        retentionDays: input?.retentionDays ?? DEFAULT_CONFIG.retentionDays,
        customSettings: input?.customSettings ?? undefined,
      },
    });

    const configData = this.mapToConfigData(config);
    const cacheKey = `${CACHE_PREFIX}${tenantId}`;
    await this.setCache(cacheKey, configData);

    return configData;
  }

  /**
   * Update tenant configuration
   *
   * @param tenantId - The tenant ID to update configuration for
   * @param input - Configuration values to update
   * @returns Updated TenantConfigData
   */
  async updateTenantConfig(
    tenantId: string,
    input: UpdateTenantConfigInput
  ): Promise<TenantConfigData> {
    // Build update data, only including defined values
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: Record<string, any> = {};

    if (input.allowedAIProviders !== undefined) {
      updateData.allowedAIProviders = input.allowedAIProviders;
    }
    if (input.defaultAIProvider !== undefined) {
      updateData.defaultAIProvider = input.defaultAIProvider;
    }
    if (input.aiModelOverrides !== undefined) {
      updateData.aiModelOverrides = input.aiModelOverrides;
    }
    if (input.dataResidencyRegion !== undefined) {
      updateData.dataResidencyRegion = input.dataResidencyRegion;
    }
    if (input.backupRegion !== undefined) {
      updateData.backupRegion = input.backupRegion;
    }
    if (input.enabledModules !== undefined) {
      updateData.enabledModules = input.enabledModules;
    }
    if (input.curriculumStandards !== undefined) {
      updateData.curriculumStandards = input.curriculumStandards;
    }
    if (input.gradeLevels !== undefined) {
      updateData.gradeLevels = input.gradeLevels;
    }
    if (input.enableHomeworkHelper !== undefined) {
      updateData.enableHomeworkHelper = input.enableHomeworkHelper;
    }
    if (input.enableFocusMode !== undefined) {
      updateData.enableFocusMode = input.enableFocusMode;
    }
    if (input.enableParentPortal !== undefined) {
      updateData.enableParentPortal = input.enableParentPortal;
    }
    if (input.enableTeacherDashboard !== undefined) {
      updateData.enableTeacherDashboard = input.enableTeacherDashboard;
    }
    if (input.dailyLLMCallLimit !== undefined) {
      updateData.dailyLLMCallLimit = input.dailyLLMCallLimit;
    }
    if (input.dailyTutorTurnLimit !== undefined) {
      updateData.dailyTutorTurnLimit = input.dailyTutorTurnLimit;
    }
    if (input.maxLearnersPerTenant !== undefined) {
      updateData.maxLearnersPerTenant = input.maxLearnersPerTenant;
    }
    if (input.storageQuotaGB !== undefined) {
      updateData.storageQuotaGB = input.storageQuotaGB;
    }
    if (input.contentFilterLevel !== undefined) {
      updateData.contentFilterLevel = input.contentFilterLevel;
    }
    if (input.enablePIIRedaction !== undefined) {
      updateData.enablePIIRedaction = input.enablePIIRedaction;
    }
    if (input.retentionDays !== undefined) {
      updateData.retentionDays = input.retentionDays;
    }
    if (input.customSettings !== undefined) {
      updateData.customSettings = input.customSettings;
    }

    const config = await this.prisma.tenantConfig.update({
      where: { tenantId },
      data: updateData,
    });

    const configData = this.mapToConfigData(config);

    // Invalidate cache
    await this.invalidateCache(tenantId);

    // Re-cache updated config
    const cacheKey = `${CACHE_PREFIX}${tenantId}`;
    await this.setCache(cacheKey, configData);

    return configData;
  }

  /**
   * Upsert tenant configuration (create if not exists, update if exists)
   */
  async upsertTenantConfig(
    tenantId: string,
    input: UpdateTenantConfigInput
  ): Promise<TenantConfigData> {
    const existing = await this.prisma.tenantConfig.findUnique({
      where: { tenantId },
    });

    if (existing) {
      return this.updateTenantConfig(tenantId, input);
    } else {
      return this.createTenantConfig(tenantId, input);
    }
  }

  /**
   * Delete tenant configuration
   */
  async deleteTenantConfig(tenantId: string): Promise<void> {
    await this.prisma.tenantConfig.delete({
      where: { tenantId },
    });

    await this.invalidateCache(tenantId);
  }

  /**
   * Invalidate cache for a tenant
   */
  async invalidateCache(tenantId: string): Promise<void> {
    const cacheKey = `${CACHE_PREFIX}${tenantId}`;

    // Clear from Redis
    if (this.redis) {
      try {
        await this.redis.del(cacheKey);
      } catch {
        // Redis error - continue
      }
    }

    // Clear from memory cache
    this.memoryCache.delete(cacheKey);
  }

  /**
   * Check if a feature is enabled for a tenant
   */
  async isFeatureEnabled(
    tenantId: string,
    feature: 'homeworkHelper' | 'focusMode' | 'parentPortal' | 'teacherDashboard'
  ): Promise<boolean> {
    const config = await this.getTenantConfig(tenantId);

    switch (feature) {
      case 'homeworkHelper':
        return config.enableHomeworkHelper;
      case 'focusMode':
        return config.enableFocusMode;
      case 'parentPortal':
        return config.enableParentPortal;
      case 'teacherDashboard':
        return config.enableTeacherDashboard;
      default:
        return false;
    }
  }

  /**
   * Check if an AI provider is allowed for a tenant
   */
  async isAIProviderAllowed(tenantId: string, provider: AllowedAIProvider): Promise<boolean> {
    const config = await this.getTenantConfig(tenantId);
    return config.allowedAIProviders.includes(provider);
  }

  /**
   * Get AI model override for a specific use case
   */
  async getAIModelOverride(tenantId: string, useCase: string): Promise<string | null> {
    const config = await this.getTenantConfig(tenantId);
    return config.aiModelOverrides?.[useCase] ?? null;
  }

  // ════════════════════════════════════════════════════════════════════════════
  // Private Helpers
  // ════════════════════════════════════════════════════════════════════════════

  private async getFromCache(key: string): Promise<TenantConfigData | null> {
    // Try Redis first
    if (this.redis) {
      try {
        const cached = await this.redis.get(key);
        if (cached) {
          return JSON.parse(cached) as TenantConfigData;
        }
      } catch {
        // Redis error - fall through to memory cache
      }
    }

    // Try memory cache
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached && memoryCached.expiresAt > Date.now()) {
      return memoryCached.data;
    }

    // Clear expired memory cache entry
    if (memoryCached) {
      this.memoryCache.delete(key);
    }

    return null;
  }

  private async setCache(key: string, data: TenantConfigData): Promise<void> {
    // Set in Redis
    if (this.redis) {
      try {
        await this.redis.setex(key, this.cacheTtlSeconds, JSON.stringify(data));
      } catch {
        // Redis error - continue to memory cache
      }
    }

    // Set in memory cache as fallback
    this.memoryCache.set(key, {
      data,
      expiresAt: Date.now() + this.cacheTtlSeconds * 1000,
    });
  }

  private mapToConfigData(config: TenantConfig): TenantConfigData {
    return {
      id: config.id,
      tenantId: config.tenantId,
      allowedAIProviders: config.allowedAIProviders,
      defaultAIProvider: config.defaultAIProvider,
      aiModelOverrides: config.aiModelOverrides as Record<string, string> | null,
      dataResidencyRegion: config.dataResidencyRegion,
      backupRegion: config.backupRegion,
      enabledModules: config.enabledModules,
      curriculumStandards: config.curriculumStandards,
      gradeLevels: config.gradeLevels,
      enableHomeworkHelper: config.enableHomeworkHelper,
      enableFocusMode: config.enableFocusMode,
      enableParentPortal: config.enableParentPortal,
      enableTeacherDashboard: config.enableTeacherDashboard,
      dailyLLMCallLimit: config.dailyLLMCallLimit,
      dailyTutorTurnLimit: config.dailyTutorTurnLimit,
      maxLearnersPerTenant: config.maxLearnersPerTenant,
      storageQuotaGB: config.storageQuotaGB,
      contentFilterLevel: config.contentFilterLevel,
      enablePIIRedaction: config.enablePIIRedaction,
      retentionDays: config.retentionDays,
      customSettings: config.customSettings as Record<string, unknown> | null,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
  }

  private createDefaultConfig(tenantId: string): TenantConfigData {
    const now = new Date();
    return {
      id: 'default',
      tenantId,
      ...DEFAULT_CONFIG,
      createdAt: now,
      updatedAt: now,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Singleton Helper
// ══════════════════════════════════════════════════════════════════════════════

let _tenantConfigService: TenantConfigService | null = null;

/**
 * Get the singleton TenantConfigService instance
 */
export function getTenantConfigService(config?: TenantConfigServiceConfig): TenantConfigService {
  if (!_tenantConfigService) {
    if (!config) {
      throw new Error(
        'TenantConfigService not initialized. Call getTenantConfigService(config) first.'
      );
    }
    _tenantConfigService = new TenantConfigService(config);
  }
  return _tenantConfigService;
}

/**
 * Convenience function to get tenant config (uses singleton)
 */
export async function getTenantConfig(tenantId: string): Promise<TenantConfigData> {
  return getTenantConfigService().getTenantConfig(tenantId);
}
