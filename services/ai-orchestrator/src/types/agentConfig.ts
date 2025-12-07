export const AGENT_TYPES = [
  'BASELINE',
  'VIRTUAL_BRAIN',
  'LESSON_PLANNER',
  'TUTOR',
  'FOCUS',
  'HOMEWORK_HELPER',
  'PROGRESS',
  'SAFETY',
] as const;

export type AgentType = (typeof AGENT_TYPES)[number];

export const PROVIDER_TYPES = ['OPENAI', 'ANTHROPIC', 'GEMINI', 'MOCK'] as const;

export type ProviderType = (typeof PROVIDER_TYPES)[number];

export interface AgentConfig {
  id: string;
  agentType: AgentType;
  modelName: string;
  provider: ProviderType;
  promptTemplate: string;
  hyperparameters: Record<string, unknown>;
  version: string;
  rolloutPercentage: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentConfigFilters {
  agentType?: AgentType;
  isActive?: boolean;
}

export interface AgentConfigInput {
  id?: string;
  agentType: AgentType;
  modelName: string;
  provider: ProviderType;
  promptTemplate: string;
  hyperparameters?: Record<string, unknown>;
  version: string;
  rolloutPercentage?: number;
  isActive?: boolean;
}

export type AgentConfigPatch = Partial<
  Pick<
    AgentConfig,
    | 'agentType'
    | 'modelName'
    | 'provider'
    | 'promptTemplate'
    | 'hyperparameters'
    | 'version'
    | 'rolloutPercentage'
    | 'isActive'
  >
>;
