import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';

import type {
  AgentConfig,
  AgentConfigFilters,
  AgentConfigInput,
  AgentConfigPatch,
  AgentType,
  ProviderType,
} from '../types/agentConfig.js';

export interface AgentConfigStore {
  list(filters?: AgentConfigFilters): Promise<AgentConfig[]>;
  getById(id: string): Promise<AgentConfig | null>;
  create(input: AgentConfigInput): Promise<AgentConfig>;
  update(id: string, patch: AgentConfigPatch): Promise<AgentConfig | null>;
  dispose?(): Promise<void>;
}

const DEFAULT_ROLLOUT = 100;

interface AgentConfigRow {
  id: string;
  agent_type: AgentType;
  model_name: string;
  provider: ProviderType;
  prompt_template: string;
  hyperparameters_json: Record<string, unknown> | null;
  version: string;
  rollout_percentage: number;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

function normalizeInput(input: AgentConfigInput): AgentConfigInput {
  return {
    ...input,
    hyperparameters: input.hyperparameters ?? {},
    rolloutPercentage: input.rolloutPercentage ?? DEFAULT_ROLLOUT,
    isActive: input.isActive ?? true,
  };
}

function rowToConfig(row: AgentConfigRow): AgentConfig {
  return {
    id: row.id,
    agentType: row.agent_type,
    modelName: row.model_name,
    provider: row.provider,
    promptTemplate: row.prompt_template,
    hyperparameters: row.hyperparameters_json ?? {},
    version: row.version,
    rolloutPercentage: row.rollout_percentage,
    isActive: row.is_active,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

export class InMemoryAgentConfigStore implements AgentConfigStore {
  private configs: AgentConfig[] = [];

  constructor(seed: AgentConfigInput[] = []) {
    this.configs = seed.map((input) => this.toConfig(input));
  }

  async list(filters?: AgentConfigFilters): Promise<AgentConfig[]> {
    return this.configs.filter((config) => {
      if (filters?.agentType && config.agentType !== filters.agentType) return false;
      if (filters?.isActive !== undefined && config.isActive !== filters.isActive) return false;
      return true;
    });
  }

  async getById(id: string): Promise<AgentConfig | null> {
    return this.configs.find((c) => c.id === id) ?? null;
  }

  async create(input: AgentConfigInput): Promise<AgentConfig> {
    const config = this.toConfig(input);
    this.configs.push(config);
    return config;
  }

  async update(id: string, patch: AgentConfigPatch): Promise<AgentConfig | null> {
    const idx = this.configs.findIndex((c) => c.id === id);
    if (idx === -1) return null;
    const current = this.configs[idx];
    if (!current) return null;

    const updated: AgentConfig = {
      ...current,
      updatedAt: new Date(),
    };

    if (patch.agentType !== undefined) updated.agentType = patch.agentType;
    if (patch.modelName !== undefined) updated.modelName = patch.modelName;
    if (patch.provider !== undefined) updated.provider = patch.provider;
    if (patch.promptTemplate !== undefined) updated.promptTemplate = patch.promptTemplate;
    if (patch.hyperparameters !== undefined) updated.hyperparameters = patch.hyperparameters;
    if (patch.version !== undefined) updated.version = patch.version;
    if (patch.rolloutPercentage !== undefined) updated.rolloutPercentage = patch.rolloutPercentage;
    if (patch.isActive !== undefined) updated.isActive = patch.isActive;

    this.configs[idx] = updated;
    return updated;
  }

  private toConfig(input: AgentConfigInput): AgentConfig {
    const normalized = normalizeInput(input);
    return {
      id: normalized.id ?? randomUUID(),
      agentType: normalized.agentType,
      modelName: normalized.modelName,
      provider: normalized.provider,
      promptTemplate: normalized.promptTemplate,
      hyperparameters: normalized.hyperparameters ?? {},
      version: normalized.version,
      rolloutPercentage: normalized.rolloutPercentage ?? DEFAULT_ROLLOUT,
      isActive: normalized.isActive ?? true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

export class PgAgentConfigStore implements AgentConfigStore {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async list(filters?: AgentConfigFilters): Promise<AgentConfig[]> {
    const clauses: string[] = [];
    const values: unknown[] = [];

    if (filters?.agentType) {
      values.push(filters.agentType);
      clauses.push(`agent_type = $${values.length}`);
    }

    if (filters?.isActive !== undefined) {
      values.push(filters.isActive);
      clauses.push(`is_active = $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const res = await this.pool.query<AgentConfigRow>(
      `SELECT * FROM ai_agent_configs ${where} ORDER BY created_at DESC`,
      values
    );
    return res.rows.map(rowToConfig);
  }

  async getById(id: string): Promise<AgentConfig | null> {
    const res = await this.pool.query<AgentConfigRow>(
      'SELECT * FROM ai_agent_configs WHERE id = $1',
      [id]
    );
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    if (!row) return null;
    return rowToConfig(row);
  }

  async create(input: AgentConfigInput): Promise<AgentConfig> {
    const normalized = normalizeInput(input);
    const res = await this.pool.query<AgentConfigRow>(
      `INSERT INTO ai_agent_configs (
        id, agent_type, model_name, provider, prompt_template, hyperparameters_json, version, rollout_percentage, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9
      ) RETURNING *`,
      [
        normalized.id ?? randomUUID(),
        normalized.agentType,
        normalized.modelName,
        normalized.provider,
        normalized.promptTemplate,
        JSON.stringify(normalized.hyperparameters ?? {}),
        normalized.version,
        normalized.rolloutPercentage ?? DEFAULT_ROLLOUT,
        normalized.isActive ?? true,
      ]
    );
    const row = res.rows[0];
    if (!row) {
      throw new Error('Failed to insert agent config');
    }
    return rowToConfig(row);
  }

  async update(id: string, patch: AgentConfigPatch): Promise<AgentConfig | null> {
    const sets: string[] = [];
    const values: unknown[] = [];

    const setters: [keyof AgentConfigPatch, string][] = [
      ['agentType', 'agent_type'],
      ['modelName', 'model_name'],
      ['provider', 'provider'],
      ['promptTemplate', 'prompt_template'],
      ['hyperparameters', 'hyperparameters_json'],
      ['version', 'version'],
      ['rolloutPercentage', 'rollout_percentage'],
      ['isActive', 'is_active'],
    ];

    for (const [field, column] of setters) {
      if (patch[field] !== undefined) {
        const value = field === 'hyperparameters' ? JSON.stringify(patch[field]) : patch[field];
        values.push(value);
        sets.push(`${column} = $${values.length}`);
      }
    }

    if (!sets.length) {
      return this.getById(id);
    }

    values.push(id);
    const res = await this.pool.query<AgentConfigRow>(
      `UPDATE ai_agent_configs SET ${sets.join(', ')}, updated_at = now() WHERE id = $${values.length} RETURNING *`,
      values
    );
    if (res.rowCount === 0) return null;
    const row = res.rows[0];
    if (!row) return null;
    return rowToConfig(row);
  }

  async dispose(): Promise<void> {
    await this.pool.end();
  }
}

export function createAgentConfigStore(
  databaseUrl?: string,
  seed: AgentConfigInput[] = []
): AgentConfigStore {
  if (databaseUrl) {
    return new PgAgentConfigStore(new Pool({ connectionString: databaseUrl }));
  }
  return new InMemoryAgentConfigStore(seed);
}
