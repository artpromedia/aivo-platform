/**
 * Google Gemini Provider Adapter
 *
 * Adapter implementation for Google's Gemini API supporting:
 * - Gemini Pro, Gemini Ultra, Gemini Flash models
 * - Multi-modal support (text, images, video)
 * - Function calling
 * - Streaming responses
 */

import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import type {
  GenerativeModel,
  Content,
  Part,
  GenerateContentResult,
  FunctionDeclaration,
  Tool,
} from '@google/generative-ai';

import type { AIModel, AIProvider, ModelStatus } from '../registry.js';
import {
  BaseProviderAdapter,
  type BaseAdapterConfig,
  type ChatRequest,
  type ChatResponse,
  type ChatChunk,
  type EmbedRequest,
  type EmbedResponse,
  RateLimitError,
  AuthenticationError,
  ContextLengthError,
  ContentFilterError,
  ServiceUnavailableError,
  TimeoutError,
  ProviderRequestError,
  registerAdapterFactory,
} from './base.adapter.js';

// ============================================================================
// Google Adapter Configuration
// ============================================================================

export interface GoogleAdapterConfig extends BaseAdapterConfig {
  projectId?: string;
  location?: string;
}

// ============================================================================
// Google Model Definitions
// ============================================================================

const GOOGLE_MODELS: AIModel[] = [
  {
    id: 'gemini-1.5-pro',
    providerId: 'google',
    name: 'gemini-1.5-pro',
    displayName: 'Gemini 1.5 Pro',
    contextWindow: 2000000,
    maxOutputTokens: 8192,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: true,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputPer1kTokens: 0.00125,
      outputPer1kTokens: 0.005,
      currency: 'USD',
    },
    priority: 1,
    isEnabled: true,
    status: 'available',
    tags: ['multimodal', 'long-context', 'flagship'],
  },
  {
    id: 'gemini-1.5-flash',
    providerId: 'google',
    name: 'gemini-1.5-flash',
    displayName: 'Gemini 1.5 Flash',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: true,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputPer1kTokens: 0.000075,
      outputPer1kTokens: 0.0003,
      currency: 'USD',
    },
    priority: 2,
    isEnabled: true,
    status: 'available',
    tags: ['fast', 'affordable', 'multimodal'],
  },
  {
    id: 'gemini-1.5-flash-8b',
    providerId: 'google',
    name: 'gemini-1.5-flash-8b',
    displayName: 'Gemini 1.5 Flash 8B',
    contextWindow: 1000000,
    maxOutputTokens: 8192,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: true,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputPer1kTokens: 0.0000375,
      outputPer1kTokens: 0.00015,
      currency: 'USD',
    },
    priority: 3,
    isEnabled: true,
    status: 'available',
    tags: ['fastest', 'most-affordable'],
  },
  {
    id: 'gemini-pro',
    providerId: 'google',
    name: 'gemini-pro',
    displayName: 'Gemini Pro',
    contextWindow: 32768,
    maxOutputTokens: 8192,
    capabilities: {
      chat: true,
      completion: true,
      embedding: false,
      imageGeneration: false,
      imageAnalysis: false,
      functionCalling: true,
      streaming: true,
      jsonMode: true,
    },
    pricing: {
      inputPer1kTokens: 0.0005,
      outputPer1kTokens: 0.0015,
      currency: 'USD',
    },
    priority: 10,
    isEnabled: true,
    status: 'available',
    tags: ['legacy'],
  },
  {
    id: 'text-embedding-004',
    providerId: 'google',
    name: 'text-embedding-004',
    displayName: 'Text Embedding 004',
    contextWindow: 2048,
    maxOutputTokens: 0,
    capabilities: {
      chat: false,
      completion: false,
      embedding: true,
      imageGeneration: false,
      imageAnalysis: false,
      functionCalling: false,
      streaming: false,
      jsonMode: false,
    },
    pricing: {
      inputPer1kTokens: 0.00001,
      outputPer1kTokens: 0,
      currency: 'USD',
      embeddingPer1kTokens: 0.00001,
    },
    priority: 1,
    isEnabled: true,
    status: 'available',
    tags: ['embedding'],
  },
];

// ============================================================================
// Google Adapter Implementation
// ============================================================================

export class GoogleAdapter extends BaseProviderAdapter {
  private genAI: GoogleGenerativeAI;

  constructor(config: GoogleAdapterConfig) {
    super('google', config);
    this.genAI = new GoogleGenerativeAI(config.apiKey);
  }

  async isHealthy(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('Hi');
      return true;
    } catch {
      return false;
    }
  }

  async getHealthStatus(): Promise<{
    healthy: boolean;
    latencyMs: number;
    status: ModelStatus;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      await model.generateContent('Hi');
      return {
        healthy: true,
        latencyMs: Date.now() - startTime,
        status: 'available',
      };
    } catch (error) {
      return {
        healthy: false,
        latencyMs: Date.now() - startTime,
        status: 'unavailable',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const startTime = Date.now();
    const modelName = request.model ?? this.config.defaultModel ?? 'gemini-1.5-pro';

    try {
      const model = this.getModel(modelName, request);
      const { history, prompt } = this.transformRequest(request);

      let response: GenerateContentResult;

      if (history.length > 0) {
        // Use chat for multi-turn conversations
        const chat = model.startChat({
          history,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 1000,
            topP: request.topP ?? 1,
            stopSequences: request.stop,
          },
        });
        response = await chat.sendMessage(prompt);
      } else {
        // Single turn
        response = await model.generateContent({
          contents: [{ role: 'user', parts: prompt }],
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 1000,
            topP: request.topP ?? 1,
            stopSequences: request.stop,
          },
        });
      }

      const result = this.transformResponse(response, modelName);
      this.recordMetrics(startTime, result, request);
      return result;
    } catch (error) {
      const typedError = this.createTypedError(error);
      this.recordErrorMetrics(typedError, request);
      throw typedError;
    }
  }

  async *chatStream(request: ChatRequest): AsyncIterable<ChatChunk> {
    const modelName = request.model ?? this.config.defaultModel ?? 'gemini-1.5-pro';

    try {
      const model = this.getModel(modelName, request);
      const { history, prompt } = this.transformRequest(request);

      let stream: AsyncGenerator<{
        text: () => string;
      }>;

      if (history.length > 0) {
        const chat = model.startChat({
          history,
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 1000,
            topP: request.topP ?? 1,
            stopSequences: request.stop,
          },
        });
        const streamResult = await chat.sendMessageStream(prompt);
        stream = streamResult.stream as AsyncGenerator<{ text: () => string }>;
      } else {
        const streamResult = await model.generateContentStream({
          contents: [{ role: 'user', parts: prompt }],
          generationConfig: {
            temperature: request.temperature ?? 0.7,
            maxOutputTokens: request.maxTokens ?? 1000,
            topP: request.topP ?? 1,
            stopSequences: request.stop,
          },
        });
        stream = streamResult.stream as AsyncGenerator<{ text: () => string }>;
      }

      for await (const chunk of stream) {
        const text = chunk.text();
        yield {
          content: text,
          done: false,
        };
      }

      yield {
        content: '',
        done: true,
      };
    } catch (error) {
      throw this.createTypedError(error);
    }
  }

  async embed(request: EmbedRequest): Promise<EmbedResponse> {
    const modelName = request.model ?? 'text-embedding-004';
    const input = Array.isArray(request.input) ? request.input : [request.input];

    try {
      const model = this.genAI.getGenerativeModel({ model: modelName });
      const embeddings: number[][] = [];
      let totalTokens = 0;

      for (const text of input) {
        const result = await model.embedContent(text);
        embeddings.push(result.embedding.values);
        // Estimate tokens (Google doesn't return token count for embeddings)
        totalTokens += Math.ceil(text.length / 4);
      }

      return {
        embeddings,
        model: modelName,
        provider: 'google',
        usage: {
          totalTokens,
        },
      };
    } catch (error) {
      throw this.createTypedError(error);
    }
  }

  async countTokens(text: string, modelName?: string): Promise<number> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: modelName ?? 'gemini-1.5-pro',
      });
      const result = await model.countTokens(text);
      return result.totalTokens;
    } catch {
      // Fallback: rough estimate
      return Math.ceil(text.length / 4);
    }
  }

  getSupportedModels(): AIModel[] {
    return GOOGLE_MODELS;
  }

  getProviderInfo(): AIProvider {
    return {
      id: 'google',
      name: 'Google AI',
      type: 'google',
      baseUrl: 'https://generativelanguage.googleapis.com',
      apiVersion: 'v1',
      models: GOOGLE_MODELS,
      capabilities: {
        chat: true,
        completion: true,
        embedding: true,
        imageGeneration: false,
        imageAnalysis: true,
        functionCalling: true,
        streaming: true,
        jsonMode: true,
        codeExecution: true,
      },
      rateLimits: {
        requestsPerMinute: 360,
        tokensPerMinute: 120000,
        requestsPerDay: 1500,
      },
      healthCheck: {
        intervalMs: 30000,
        timeoutMs: 5000,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
      },
      isEnabled: true,
      priority: 3,
    };
  }

  private getModel(modelName: string, request: ChatRequest): GenerativeModel {
    const generationConfig: Record<string, unknown> = {
      temperature: request.temperature ?? 0.7,
      maxOutputTokens: request.maxTokens ?? 1000,
      topP: request.topP ?? 1,
    };

    if (request.stop) {
      generationConfig.stopSequences = request.stop;
    }

    const modelConfig: {
      model: string;
      generationConfig: Record<string, unknown>;
      safetySettings: Array<{ category: HarmCategory; threshold: HarmBlockThreshold }>;
      tools?: Tool[];
    } = {
      model: modelName,
      generationConfig,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
      ],
    };

    // Add tools if provided
    if (request.tools && request.tools.length > 0) {
      modelConfig.tools = [{
        functionDeclarations: request.tools as FunctionDeclaration[],
      }];
    }

    return this.genAI.getGenerativeModel(modelConfig);
  }

  protected transformRequest(request: ChatRequest): { history: Content[]; prompt: Part[] } {
    const history: Content[] = [];
    let systemPrompt = '';

    // Build history from messages
    for (let i = 0; i < request.messages.length - 1; i++) {
      const msg = request.messages[i]!;

      if (msg.role === 'system') {
        systemPrompt = msg.content;
        continue;
      }

      const role = msg.role === 'assistant' ? 'model' : 'user';
      history.push({
        role,
        parts: [{ text: msg.content }],
      });
    }

    // Get the last message as the prompt
    const lastMessage = request.messages[request.messages.length - 1];
    let promptText = lastMessage?.content ?? '';

    // Prepend system prompt if present
    if (systemPrompt && lastMessage?.role === 'user') {
      promptText = `${systemPrompt}\n\n${promptText}`;
    }

    return {
      history,
      prompt: [{ text: promptText }],
    };
  }

  protected transformResponse(response: GenerateContentResult, model: string): ChatResponse {
    const candidate = response.response.candidates?.[0];
    const content = candidate?.content?.parts?.map((p) => ('text' in p ? p.text : '')).join('') ?? '';

    // Extract function calls if present
    const functionCalls = candidate?.content?.parts?.filter(
      (p): p is Part & { functionCall: { name: string; args: Record<string, unknown> } } =>
        'functionCall' in p
    );

    const toolCalls = functionCalls?.map((fc, index) => ({
      id: `call_${index}`,
      name: fc.functionCall.name,
      arguments: fc.functionCall.args,
    }));

    // Map finish reason
    let finishReason: ChatResponse['finishReason'] = 'stop';
    if (candidate?.finishReason === 'MAX_TOKENS') {
      finishReason = 'length';
    } else if (candidate?.finishReason === 'SAFETY') {
      finishReason = 'content_filter';
    } else if (toolCalls && toolCalls.length > 0) {
      finishReason = 'tool_calls';
    }

    // Estimate token usage (Gemini doesn't always return precise counts)
    const promptTokens = response.response.usageMetadata?.promptTokenCount ?? 0;
    const completionTokens = response.response.usageMetadata?.candidatesTokenCount ?? 0;

    return {
      content,
      model,
      provider: 'google',
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      finishReason,
      toolCalls: toolCalls && toolCalls.length > 0 ? toolCalls : undefined,
      rawResponse: response,
    };
  }

  protected handleError(error: unknown): never {
    throw this.createTypedError(error);
  }

  private createTypedError(error: unknown): Error {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();

      if (message.includes('quota') || message.includes('rate limit') || message.includes('429')) {
        return new RateLimitError(error.message);
      }

      if (message.includes('api key') || message.includes('authentication') || message.includes('401')) {
        return new AuthenticationError(error.message);
      }

      if (message.includes('context') || message.includes('token limit')) {
        return new ContextLengthError(error.message);
      }

      if (message.includes('safety') || message.includes('blocked')) {
        return new ContentFilterError(error.message);
      }

      if (message.includes('timeout')) {
        return new TimeoutError(error.message, this.config.timeout ?? 60000);
      }

      if (message.includes('500') || message.includes('503') || message.includes('unavailable')) {
        return new ServiceUnavailableError(error.message);
      }

      return error;
    }

    return new Error(String(error));
  }
}

// Register the adapter factory
registerAdapterFactory('google', (config) => new GoogleAdapter(config as GoogleAdapterConfig));
