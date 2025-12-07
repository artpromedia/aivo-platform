import { createHash } from 'node:crypto';

import type {
  AgentConfig,
  AgentConfigFilters,
  AgentConfigInput,
  AgentConfigPatch,
  AgentType,
} from '../types/agentConfig.js';

import type { AgentConfigStore } from './store.js';

export interface RegistryOptions {
  cacheTtlMs?: number;
}

interface CachedEntry {
  expiresAt: number;
  configs: AgentConfig[];
}

const DEFAULT_CACHE_TTL_MS = 30_000;

export class AgentConfigRegistry {
  private cache: Map<AgentType, CachedEntry> = new Map<AgentType, CachedEntry>();
  private readonly cacheTtlMs: number;

  constructor(
    private readonly store: AgentConfigStore,
    options: RegistryOptions = {}
  ) {
    this.cacheTtlMs = options.cacheTtlMs ?? DEFAULT_CACHE_TTL_MS;
  }

  async list(filters?: AgentConfigFilters): Promise<AgentConfig[]> {
    return this.store.list(filters);
  }

  async create(input: AgentConfigInput): Promise<AgentConfig> {
    const created = await this.store.create(input);
    this.invalidate(created.agentType);
    return created;
  }

  async update(id: string, patch: AgentConfigPatch): Promise<AgentConfig | null> {
    const updated = await this.store.update(id, patch);
    if (updated) {
      this.invalidate(updated.agentType);
    }
    return updated;
  }

  async getActiveConfig(agentType: AgentType): Promise<AgentConfig> {
    const configs = await this.loadActive(agentType);
    if (!configs.length) {
      throw new Error(`No active configuration found for agent ${agentType}`);
    }
    return selectConfigForKey(configs, 'default');
  }

  async getConfigForRollout(agentType: AgentType, key: string): Promise<AgentConfig> {
    const configs = await this.loadActive(agentType);
    if (!configs.length) {
      throw new Error(`No active configuration found for agent ${agentType}`);
    }
    return selectConfigForKey(configs, key);
  }

  invalidate(agentType?: AgentType) {
    if (agentType) {
      this.cache.delete(agentType);
    } else {
      this.cache.clear();
    }
  }

  private async loadActive(agentType: AgentType): Promise<AgentConfig[]> {
    const cached = this.cache.get(agentType);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      return cached.configs;
    }
    const configs = await this.store.list({ agentType, isActive: true });
    this.cache.set(agentType, { configs, expiresAt: now + this.cacheTtlMs });
    return configs;
  }
}

function selectConfigForKey(configs: AgentConfig[], key: string): AgentConfig {
  if (!configs.length) {
    throw new Error('No configs provided');
  }
  const sorted = [...configs].sort((a, b) => {
    if (b.rolloutPercentage !== a.rolloutPercentage) {
      return b.rolloutPercentage - a.rolloutPercentage;
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
  const bucket = hashToBucket(key);
  let cumulative = 0;
  for (const config of sorted) {
    cumulative += config.rolloutPercentage;
    if (bucket < cumulative) return config;
  }
  const fallback = sorted[0];
  if (!fallback) {
    throw new Error('No configs provided');
  }
  return fallback;
}

function hashToBucket(key: string): number {
  const digest = createHash('sha256').update(key).digest();
  const int = digest.readUInt32BE(0);
  return int % 100;
}
