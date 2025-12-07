const RATE_MAP: Record<string, number> = {
  'OPENAI:gpt-4.5': 0.01,
  'MOCK:mock-model': 0.000001,
};

function rateKey(provider: string, model: string): string {
  return `${provider.toUpperCase()}:${model.toLowerCase()}`;
}

export function estimateCostUsd(provider: string, modelName: string, totalTokens: number): number {
  const key = rateKey(provider, modelName);
  const rate = RATE_MAP[key] ?? 0;
  const cost = (totalTokens / 1000) * rate;
  return Number(cost.toFixed(6));
}
