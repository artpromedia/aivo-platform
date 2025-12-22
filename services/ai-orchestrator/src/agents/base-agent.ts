/**
 * Base Agent
 *
 * Abstract base class for all AI agents with:
 * - LLM orchestration integration
 * - Safety filtering
 * - Adaptive prompting based on learner profile
 * - Metrics and logging
 */

import type { PromptBuilder } from '../prompts/prompt-builder.js';
import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage, LLMCompletionOptions } from '../providers/llm-provider.interface.js';
import { incrementCounter, recordHistogram } from '../providers/metrics-helper.js';
import type { SafetyFilter } from '../safety/safety-filter-v2.js';

/**
 * Context for agent interactions
 */
export interface AgentContext {
  tenantId: string;
  userId: string;
  sessionId?: string;
  learnerProfile?: {
    gradeLevel: number;
    age: number;
    neurodiversityProfile?: {
      adhd?: boolean;
      dyslexia?: boolean;
      autism?: boolean;
    };
    accommodations?: string[];
    learningStyle?: string;
  };
  conversationHistory?: LLMMessage[];
}

/**
 * Response from an agent
 */
export interface AgentResponse {
  content: string;
  metadata: {
    model: string;
    provider: string;
    tokens: number;
    latencyMs: number;
    safetyFiltered: boolean;
    adaptationsApplied: string[];
  };
}

/**
 * Abstract base class for all AI agents
 */
export abstract class BaseAgent {
  protected llm: LLMOrchestrator;
  protected safetyFilter: SafetyFilter;
  protected promptBuilder: PromptBuilder;

  abstract readonly agentType: string;
  abstract readonly systemPrompt: string;

  constructor(llm: LLMOrchestrator, safetyFilter: SafetyFilter, promptBuilder: PromptBuilder) {
    this.llm = llm;
    this.safetyFilter = safetyFilter;
    this.promptBuilder = promptBuilder;
  }

  /**
   * Generate a response to a user message
   */
  async respond(userMessage: string, context: AgentContext): Promise<AgentResponse> {
    const startTime = Date.now();

    // 1. Pre-process user input for safety
    const safetyCheck = await this.safetyFilter.checkInput(userMessage, context);
    if (!safetyCheck.safe) {
      console.warn('User input failed safety check', {
        userId: context.userId,
        reason: safetyCheck.reason,
      });
      return this.createSafeResponse(safetyCheck.reason ?? 'unknown', context);
    }

    // 2. Build prompt with context adaptations
    const adaptations = this.getAdaptations(context);
    const systemPrompt = this.promptBuilder.build(this.systemPrompt, {
      gradeLevel: context.learnerProfile?.gradeLevel,
      age: context.learnerProfile?.age,
      neurodiversityProfile: context.learnerProfile?.neurodiversityProfile,
      accommodations: context.learnerProfile?.accommodations,
      adaptations,
    });

    // 3. Construct messages
    const messages: LLMMessage[] = [
      { role: 'system', content: systemPrompt },
      ...(context.conversationHistory ?? []),
      { role: 'user', content: userMessage },
    ];

    // 4. Get LLM response
    const llmResult = await this.llm.complete(messages, {
      temperature: this.getTemperature(),
      maxTokens: this.getMaxTokens(),
      metadata: {
        tenantId: context.tenantId,
        userId: context.userId,
        agentType: this.agentType,
        sessionId: context.sessionId,
      },
    });

    // 5. Post-process response for safety
    const outputCheck = await this.safetyFilter.checkOutput(llmResult.content, context);

    const finalContent = outputCheck.safe
      ? llmResult.content
      : (outputCheck.sanitized ?? this.getFallbackResponse());

    // 6. Record metrics
    const latencyMs = Date.now() - startTime;
    recordHistogram(`agent.${this.agentType}.latency`, latencyMs);
    incrementCounter(`agent.${this.agentType}.requests`);

    return {
      content: finalContent,
      metadata: {
        model: llmResult.model,
        provider: llmResult.provider,
        tokens: llmResult.usage.totalTokens,
        latencyMs: llmResult.latencyMs,
        safetyFiltered: !outputCheck.safe,
        adaptationsApplied: adaptations,
      },
    };
  }

  /**
   * Get adaptations based on learner profile
   */
  protected getAdaptations(context: AgentContext): string[] {
    const adaptations: string[] = [];
    const profile = context.learnerProfile;

    if (!profile) return adaptations;

    // Grade-appropriate language
    if (profile.gradeLevel <= 2) {
      adaptations.push('use_simple_words');
      adaptations.push('short_sentences');
    } else if (profile.gradeLevel <= 5) {
      adaptations.push('use_clear_language');
    }

    // Neurodiversity adaptations
    if (profile.neurodiversityProfile?.adhd) {
      adaptations.push('chunked_information');
      adaptations.push('bullet_points');
      adaptations.push('engagement_hooks');
    }

    if (profile.neurodiversityProfile?.dyslexia) {
      adaptations.push('avoid_complex_words');
      adaptations.push('short_paragraphs');
    }

    if (profile.neurodiversityProfile?.autism) {
      adaptations.push('literal_language');
      adaptations.push('avoid_idioms');
      adaptations.push('explicit_instructions');
    }

    // Accommodation-based adaptations
    if (profile.accommodations?.includes('extended_time')) {
      adaptations.push('patient_pacing');
    }

    if (profile.accommodations?.includes('text_to_speech')) {
      adaptations.push('clear_pronunciation_friendly');
    }

    return adaptations;
  }

  /**
   * Get temperature for LLM calls (override in subclasses)
   */
  protected getTemperature(): number {
    return 0.7;
  }

  /**
   * Get max tokens for LLM calls (override in subclasses)
   */
  protected getMaxTokens(): number {
    return 500;
  }

  /**
   * Get fallback response when safety filter blocks output
   */
  protected getFallbackResponse(): string {
    return "I'm sorry, I couldn't provide a helpful response. Let's try a different approach!";
  }

  /**
   * Create a safe response when input is blocked
   */
  protected createSafeResponse(reason: string, context: AgentContext): AgentResponse {
    const safeResponses: Record<string, string> = {
      inappropriate_content: "Let's focus on our learning! What would you like to work on?",
      personal_information:
        "I noticed you might be sharing personal information. Let's keep our conversation about learning!",
      off_topic:
        "That's an interesting topic, but let's get back to our lesson. What can I help you with?",
      harmful_content: "I'm here to help you learn! What subject would you like to explore?",
    };

    return {
      content: safeResponses[reason] ?? this.getFallbackResponse(),
      metadata: {
        model: 'safety-filter',
        provider: 'internal',
        tokens: 0,
        latencyMs: 0,
        safetyFiltered: true,
        adaptationsApplied: [],
      },
    };
  }
}
