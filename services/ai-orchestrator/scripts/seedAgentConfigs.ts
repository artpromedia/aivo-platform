import { config } from '../src/config.js';
import { createAgentConfigStore } from '../src/registry/store.js';
import { AGENT_TYPES } from '../src/types/agentConfig.js';
import { DOMAIN_EXPERTS, type DomainExpertConfig } from '../src/agents/domain-experts.js';

/**
 * Domain expert configurations indexed by agent type
 */
const domainExpertsByAgentType: Record<string, DomainExpertConfig> = {};
Object.values(DOMAIN_EXPERTS).forEach((expert) => {
  domainExpertsByAgentType[expert.agentType] = expert;
});

/**
 * Get configuration for a domain-specific agent
 */
function getDomainAgentConfig(agentType: string): {
  promptTemplate: string;
  hyperparameters: { temperature: number; maxTokens?: number; topP?: number };
} | null {
  const expert = domainExpertsByAgentType[agentType];
  if (!expert) return null;

  return {
    promptTemplate: expert.systemPrompt,
    hyperparameters: {
      temperature: expert.hyperparameters.temperature,
      maxTokens: expert.hyperparameters.maxTokens,
      topP: expert.hyperparameters.topP,
    },
  };
}

/**
 * Default configurations for non-domain agents
 */
const DEFAULT_AGENT_PROMPTS: Record<string, string> = {
  BASELINE: `You are an expert educational assessment specialist. Generate high-quality, grade-appropriate questions based on the provided context. Payload: {{payload}}`,
  TUTOR: `You are an expert tutor who adapts to each student's learning style and needs. Provide clear explanations and guide students through problems step-by-step. Payload: {{payload}}`,
  VIRTUAL_BRAIN: `You are an intelligent educational assistant that helps students understand concepts and navigate their learning journey. Payload: {{payload}}`,
  LESSON_PLANNER: `You are an expert curriculum designer. Create engaging, standards-aligned lesson plans tailored to student needs. Payload: {{payload}}`,
  FOCUS: `You are a focus and attention coach. Help students maintain concentration and develop productive study habits. Payload: {{payload}}`,
  HOMEWORK_HELPER: `You are a patient homework assistant. Guide students through problems without giving away answers, fostering independent thinking. Payload: {{payload}}`,
  PROGRESS: `You are a progress tracking specialist. Analyze student performance data and provide actionable insights for improvement. Payload: {{payload}}`,
  SAFETY: `You are a content safety specialist. Ensure all educational content is age-appropriate and safe for students. Payload: {{payload}}`,
};

async function main() {
  const store = createAgentConfigStore(config.databaseUrl);

  // Build seeds for all agent types
  const seeds = AGENT_TYPES.map((agentType) => {
    // Check if this is a domain-specific agent
    const domainConfig = getDomainAgentConfig(agentType);

    if (domainConfig) {
      // Domain-specific agent with expert configuration
      return {
        agentType,
        modelName: 'llama3.2:3b',
        provider: 'MOCK' as const,
        promptTemplate: domainConfig.promptTemplate,
        hyperparameters: domainConfig.hyperparameters,
        version: 'v2-domain',
        rolloutPercentage: 100,
        isActive: true,
      };
    }

    // Default agent configuration
    const defaultPrompt = DEFAULT_AGENT_PROMPTS[agentType] || `You are ${agentType}. Payload: {{payload}}`;
    return {
      agentType,
      modelName: 'llama3.2:3b',
      provider: 'MOCK' as const,
      promptTemplate: defaultPrompt,
      hyperparameters: { temperature: 0.7 },
      version: 'v2-domain',
      rolloutPercentage: 100,
      isActive: true,
    };
  });

  const createdIds: string[] = [];

  try {
    for (const seed of seeds) {
      const existing = await store.list({ agentType: seed.agentType, isActive: true });
      const duplicate = existing.find(
        (cfg) => cfg.version === seed.version && cfg.modelName === seed.modelName
      );
      if (duplicate) continue;
      const created = await store.create(seed);
      createdIds.push(created.id);
    }
  } finally {
    if (typeof store.dispose === 'function') {
      await store.dispose();
    }
  }

  if (!config.databaseUrl) {
    console.warn('DATABASE_URL is not set; seed ran against in-memory store only.');
  }

  console.log(`Seed complete. Inserted ${createdIds.length} configs.`);
}

void main();
