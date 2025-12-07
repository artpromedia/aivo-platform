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
    const tokensUsed = this.estimateTokens(params.prompt);
    return {
      content,
      tokensUsed,
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
