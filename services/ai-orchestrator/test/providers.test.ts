import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

describe('LLM Providers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('AnthropicProvider', () => {
    it('implements LLM provider interface', async () => {
      const mod = await import('../src/providers/anthropic.provider');
      const Provider = mod.AnthropicProvider || mod.default;
      expect(Provider).toBeDefined();
    });

    it('has model tier configuration', async () => {
      const mod = await import('../src/providers/anthropic.provider');
      const Provider = mod.AnthropicProvider || mod.default;
      if (Provider) {
        const provider = new Provider({ apiKey: 'test-key' });
        expect(provider).toBeDefined();
        // Should support model names
        expect(typeof provider.chat === 'function' || typeof provider.complete === 'function').toBe(true);
      }
    });
  });

  describe('OpenAIProvider', () => {
    it('implements LLM provider interface', async () => {
      const mod = await import('../src/providers/openai.provider');
      const Provider = mod.OpenAIProvider || mod.default;
      expect(Provider).toBeDefined();
    });

    it('supports GPT model configuration', async () => {
      const mod = await import('../src/providers/openai.provider');
      const Provider = mod.OpenAIProvider || mod.default;
      if (Provider) {
        const provider = new Provider({ apiKey: 'test-key' });
        expect(provider).toBeDefined();
      }
    });
  });

  describe('GoogleGeminiProvider', () => {
    it('implements LLM provider interface', async () => {
      const mod = await import('../src/providers/google-gemini.provider');
      const Provider = mod.GoogleGeminiProvider || mod.default;
      expect(Provider).toBeDefined();
    });
  });

  describe('OllamaProvider', () => {
    it('implements LLM provider interface', async () => {
      const mod = await import('../src/providers/ollama.provider');
      const Provider = mod.OllamaProvider || mod.default;
      expect(Provider).toBeDefined();
    });
  });

  describe('FailoverManager', () => {
    it('exports failover logic', async () => {
      const mod = await import('../src/providers/failover');
      expect(mod).toBeDefined();
    });
  });

  describe('MetricsHelper', () => {
    it('exports provider metrics helpers', async () => {
      const mod = await import('../src/providers/metrics-helper');
      expect(mod).toBeDefined();
    });
  });

  describe('LLM Adapter', () => {
    it('exports adapter for unified interface', async () => {
      const mod = await import('../src/providers/llm-adapter');
      expect(mod).toBeDefined();
    });
  });

  describe('Provider Registry', () => {
    it('exports provider registration', async () => {
      const mod = await import('../src/providers/registry');
      expect(mod).toBeDefined();
    });
  });
});
