export interface IAgentRequest<Payload = unknown> {
  tenantId: string;
  agentType: string;
  payload: Payload;
  metadata?: Record<string, unknown> | undefined;
}

export interface IAgentResponse<Content = unknown> {
  content: Content;
  tokensUsed: number;
  tokensPrompt?: number | undefined;
  tokensCompletion?: number | undefined;
  metadata?: Record<string, unknown>;
}

export interface GenerateParams {
  prompt: string;
  promptTemplate?: string;
  modelName?: string;
  hyperparameters?: Record<string, unknown>;
  metadata?: Record<string, unknown> | undefined;
}

export interface LLMProvider {
  name: string;
  generateCompletion(params: GenerateParams): Promise<IAgentResponse<string>>;
  moderateContent?(params: { text: string }): Promise<{ flagged: boolean; reasons?: string[] }>;
}
