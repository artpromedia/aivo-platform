import { createHash } from 'node:crypto';

import type { GenerateParams, IAgentResponse, LLMProvider } from '../types/agent.js';

export class MockLLMProvider implements LLMProvider {
  public readonly name = 'MOCK';
  private readonly seed: string;

  constructor(seed: string) {
    this.seed = seed;
  }

  async generateCompletion(params: GenerateParams): Promise<IAgentResponse<string>> {
    const digest = createHash('sha256')
      .update(this.seed + params.prompt)
      .digest('hex')
      .slice(0, 8);
    const content = `[mock-response:${digest}] ${params.prompt}`;
    const tokensPrompt = this.estimateTokens(params.prompt);
    const tokensCompletion = Math.max(4, Math.round(tokensPrompt * 0.2));
    const tokensUsed = tokensPrompt + tokensCompletion;
    return {
      content,
      tokensUsed,
      tokensPrompt,
      tokensCompletion,
      metadata: {
        provider: this.name,
        seed: this.seed,
        promptTemplate: params.promptTemplate,
        modelName: params.modelName,
        hyperparameters: params.hyperparameters,
      },
    };
  }

  private estimateTokens(text: string): number {
    // naive token estimation: split on whitespace
    return text.trim().length === 0 ? 0 : text.trim().split(/\s+/).length;
  }
}
