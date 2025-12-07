import { getProvider } from '../providers/index.js';
import type { AgentConfigRegistry } from '../registry/AgentConfigRegistry.js';
import { evaluateSafety, type SafetyResult, type SafetyStatus } from '../safety/SafetyAgent.js';
import type { AgentType } from '../types/agentConfig.js';

export interface AiCallContext {
  tenantId: string;
  agentType: AgentType;
  userRole?: string;
  learnerId?: string;
  metadata?: Record<string, unknown>;
}

export interface AiCallInput {
  payload?: unknown;
  rawPrompt?: string;
  metadata?: Record<string, unknown>;
}

export interface AiCallOutput {
  content: string;
  tokensUsed: number;
  safetyStatus: SafetyStatus;
  safetyReason?: string;
  error?: string;
  metadata?: Record<string, unknown>;
}

// Unified AI call pipeline. Future extensions: support message arrays, tool calls, and streaming.
export async function runAiCall(
  registry: AgentConfigRegistry,
  context: AiCallContext,
  input: AiCallInput
): Promise<AiCallOutput> {
  const config = await registry.getActiveConfig(context.agentType);
  const provider = getProvider(config.provider);

  const prompt =
    input.rawPrompt ??
    renderPrompt(config.promptTemplate, {
      payload: input.payload,
      tenantId: context.tenantId,
      agentType: context.agentType,
      learnerId: context.learnerId,
      userRole: context.userRole,
    });

  const providerResult = await provider.generateCompletion({
    prompt,
    promptTemplate: config.promptTemplate,
    modelName: config.modelName,
    hyperparameters: config.hyperparameters,
    metadata: {
      ...context.metadata,
      ...input.metadata,
      agentType: context.agentType,
      configVersion: config.version,
      configId: config.id,
    },
  });

  const safetyResult: SafetyResult = evaluateSafety(context, {
    content: providerResult.content,
  });

  const content = safetyResult.transformedContent ?? providerResult.content;
  const output: AiCallOutput = {
    content,
    tokensUsed: providerResult.tokensUsed,
    safetyStatus: safetyResult.status,
    safetyReason: safetyResult.reason,
    metadata: {
      ...providerResult.metadata,
      configVersion: config.version,
      configId: config.id,
      tenantId: context.tenantId,
      agentType: context.agentType,
    },
  };

  logCall(context, output, providerResult.content);

  return output;
}

function renderPrompt(template: string, context: Record<string, unknown>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, key: string) => {
    const value = context[key];
    if (value === undefined || value === null) return '';
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  });
}

function logCall(context: AiCallContext, output: AiCallOutput, rawContent: string) {
  const preview = rawContent.slice(0, 120);
  console.log(
    JSON.stringify({
      event: 'ai_call',
      agentType: context.agentType,
      tenantId: context.tenantId,
      safetyStatus: output.safetyStatus,
      safetyReason: output.safetyReason,
      tokensUsed: output.tokensUsed,
      contentPreview: `${preview}${rawContent.length > preview.length ? '…' : ''}`,
    })
  );
}
