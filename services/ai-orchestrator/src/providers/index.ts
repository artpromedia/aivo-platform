import { config } from '../config.js';
import type { LLMProvider } from '../types/agent.js';

import { MockLLMProvider } from './MockLLMProvider.js';

export function getProvider(providerName?: string): LLMProvider {
  const provider = (providerName ?? config.provider).toUpperCase();
  if (provider === 'MOCK') {
    return new MockLLMProvider(config.mockSeed);
  }
  // Future: add OpenAI, Anthropic, etc.
  return new MockLLMProvider(config.mockSeed);
}
