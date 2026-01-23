/**
 * IEP Generation Service
 *
 * AI-powered IEP (Individualized Education Program) goal generation using LLM Orchestrator.
 * Generates IDEA-compliant goals, objectives, and accommodations based on student profiles.
 *
 * @module generation/iep-generation.service
 */

import { v4 as uuidv4 } from 'uuid';

import {
  IEP_GOAL_GENERATION_SYSTEM_PROMPT,
  OBJECTIVE_GENERATION_SYSTEM_PROMPT,
  ACCOMMODATION_SUGGESTION_SYSTEM_PROMPT,
  buildIEPGoalPrompt,
  buildObjectivePrompt,
  buildAccommodationPrompt,
} from '../prompts/iep-prompts.js';
import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import type { LLMMessage } from '../providers/llm-provider.interface.js';
import { incrementCounter } from '../providers/metrics-helper.js';
import type {
  IEPGenerationRequest,
  IEPGenerationResponse,
  IEPGoal,
  IEPBenchmark,
  AccommodationSuggestion,
  IEPDomain,
  DisabilityCategory,
  MeasurementMethod,
  ServiceProvider,
  IEPGoalCategory,
  SuggestedService,
} from '../types/iep.types.js';
import {
  validateIEPGoals,
  validateEducationalAppropriateness,
  validateAgeAppropriateness,
  validateServiceMinutes,
} from '../validators/iep-validator.js';

// ════════════════════════════════════════════════════════════════════════════════
// RESPONSE PARSING TYPES
// ════════════════════════════════════════════════════════════════════════════════

interface LLMGoalResponse {
  goals: {
    title: string;
    annualGoal: string;
    category: string;
    domain: string;
    subject?: string;
    baseline: string;
    targetCriteria: string;
    measurementMethod: string;
    serviceMinutes: number;
    provider: string;
    benchmarks: {
      description: string;
      criteria: string;
      targetDate: string;
      measurementMethod: string;
    }[];
    accommodations: string[];
    alignedStandards?: string[];
    rationale?: string;
    confidence?: number;
  }[];
  rationale: string;
  suggestedServices?: {
    service: string;
    frequency: string;
    durationMinutes: number;
    provider: string;
    rationale: string;
  }[];
}

interface LLMObjectiveResponse {
  objectives: {
    description: string;
    criteria: string;
    targetDate: string;
    measurementMethod: string;
  }[];
}

interface LLMAccommodationResponse {
  accommodations: {
    category: string;
    accommodation: string;
    rationale: string;
    implementation: string;
    addressesDisabilities?: string[];
    supportsDomains?: string[];
  }[];
}

// ════════════════════════════════════════════════════════════════════════════════
// SERVICE CLASS
// ════════════════════════════════════════════════════════════════════════════════

export class IEPGenerationService {
  private readonly MAX_RETRIES = 2;
  private readonly TEMPERATURE = 0.7; // Balanced creativity and consistency

  constructor(private readonly llm: LLMOrchestrator) {}

  /**
   * Generate IEP goals for a student
   */
  async generateGoals(request: IEPGenerationRequest): Promise<IEPGenerationResponse> {
    const requestId = request.requestId ?? uuidv4();
    const startTime = Date.now();
    let attempts = 0;

    console.info('Starting IEP goal generation', {
      requestId,
      learnerId: request.studentContext.learnerId,
      focusAreas: request.focusAreas,
      goalsPerArea: request.goalsPerArea ?? 2,
    });

    try {
      incrementCounter('iep_generation.started');
      for (const area of request.focusAreas) {
        incrementCounter(`iep_generation.domain.${area}`);
      }

      // Build the prompt using the student context
      const userPrompt = buildIEPGoalPrompt(
        request.studentContext,
        request.focusAreas,
        request.goalsPerArea ?? 2,
        request.timeframe ?? 'annual'
      );

      const messages: LLMMessage[] = [
        { role: 'system', content: IEP_GOAL_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ];

      // Generate goals with retries
      let parsedResponse: LLMGoalResponse | null = null;
      let lastError: Error | null = null;

      for (attempts = 1; attempts <= this.MAX_RETRIES + 1; attempts++) {
        try {
          const result = await this.llm.complete(messages, {
            temperature: this.TEMPERATURE,
            maxTokens: 4000,
            metadata: {
              tenantId: request.tenantId,
              userId: 'system',
              agentType: 'IEP_GENERATOR',
            },
          });

          parsedResponse = this.parseLLMGoalResponse(result.content);
          break;
        } catch (error) {
          lastError = error as Error;
          console.warn(`IEP generation attempt ${attempts} failed`, { error });

          if (attempts <= this.MAX_RETRIES) {
            // Add guidance for retry - push both messages at once
            const retryMessages: LLMMessage[] = [
              {
                role: 'assistant',
                content: 'I apologize, but I need to regenerate the goals with proper formatting.',
              },
              {
                role: 'user',
                content:
                  'Please generate the IEP goals again, ensuring the response is valid JSON with the exact structure requested.',
              },
            ];
            messages.push(...retryMessages);
          }
        }
      }

      if (!parsedResponse) {
        throw lastError ?? new Error('Failed to generate IEP goals after retries');
      }

      // Convert to proper IEPGoal objects
      const goals = this.convertToIEPGoals(parsedResponse, request);

      // Validate generated goals
      const validation = validateIEPGoals(goals);

      // Run additional validations
      for (const goal of goals) {
        const appropriatenessIssues = validateEducationalAppropriateness(goal);
        const ageIssues = validateAgeAppropriateness(goal, request.studentContext.gradeLevel);
        const minutesIssues = validateServiceMinutes(goal.serviceMinutes, goal.domain);

        validation.warningSummary.push(
          ...appropriatenessIssues.map((i) => i.message),
          ...ageIssues.map((i) => i.message),
          ...minutesIssues.map((i) => i.message)
        );
      }

      const duration = Date.now() - startTime;
      incrementCounter('iep_generation.completed');
      incrementCounter('iep_generation.duration_ms', { duration: String(duration) });

      console.info('IEP goal generation completed', {
        requestId,
        goalsGenerated: goals.length,
        complianceScore: validation.overallComplianceScore,
        duration,
      });

      // Collect all accommodations
      const allAccommodations = [...new Set(goals.flatMap((g) => g.accommodations))];

      // Build suggested services
      const suggestedServices: SuggestedService[] =
        parsedResponse.suggestedServices?.map((s) => ({
          service: s.service,
          frequency: s.frequency,
          durationMinutes: s.durationMinutes,
          provider: s.provider as ServiceProvider,
          rationale: s.rationale,
        })) ?? [];

      // Calculate overall confidence
      const overallConfidence =
        goals.reduce((sum, g) => sum + (g.confidence ?? 0.8), 0) / Math.max(goals.length, 1);

      return {
        goals,
        rationale:
          parsedResponse.rationale ||
          'Goals generated based on student profile and IDEA requirements.',
        suggestedAccommodations: allAccommodations,
        suggestedServices,
        confidence: overallConfidence,
        metadata: {
          requestId,
          generatedAt: new Date().toISOString(),
          provider: 'llm-orchestrator',
          model: 'multi-provider',
          latencyMs: duration,
          attempts,
          validation: {
            passed: validation.valid,
            warnings: validation.warningSummary,
            errors: validation.errorSummary,
          },
        },
        disclaimer: this.getDisclaimer(),
      };
    } catch (error) {
      incrementCounter('iep_generation.failed');
      console.error('IEP goal generation failed', { requestId, error });
      throw error;
    }
  }

  /**
   * Generate objectives/benchmarks for an existing goal
   */
  async generateObjectives(
    goalTitle: string,
    goalDescription: string,
    domain: IEPDomain,
    gradeLevel: string,
    numberOfObjectives = 4,
    baseline?: string,
    timeframe?: 'quarter' | 'semester' | 'annual'
  ): Promise<IEPBenchmark[]> {
    const generationId = uuidv4();

    console.info('Generating IEP objectives', { generationId, goalTitle, domain });

    try {
      incrementCounter('iep_objectives.started');

      const userPrompt = buildObjectivePrompt(
        goalTitle,
        goalDescription,
        domain,
        gradeLevel,
        numberOfObjectives,
        baseline,
        timeframe
      );

      const messages: LLMMessage[] = [
        { role: 'system', content: OBJECTIVE_GENERATION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ];

      const result = await this.llm.complete(messages, {
        temperature: this.TEMPERATURE,
        maxTokens: 2000,
        metadata: {
          tenantId: 'system',
          userId: 'system',
          agentType: 'IEP_OBJECTIVE_GENERATOR',
        },
      });

      const objectives = this.parseObjectiveResponse(result.content);

      incrementCounter('iep_objectives.completed');

      return objectives;
    } catch (error) {
      incrementCounter('iep_objectives.failed');
      console.error('IEP objective generation failed', { generationId, error });
      throw error;
    }
  }

  /**
   * Suggest accommodations for a student
   */
  async generateAccommodations(
    disabilities: DisabilityCategory[],
    gradeLevel: string | number,
    domains: IEPDomain[],
    needs?: string[],
    existingAccommodations: string[] = []
  ): Promise<AccommodationSuggestion[]> {
    const generationId = uuidv4();

    console.info('Generating accommodation suggestions', {
      generationId,
      disabilities,
      domains,
    });

    try {
      incrementCounter('iep_accommodations.started');

      const userPrompt = buildAccommodationPrompt(
        disabilities,
        gradeLevel,
        domains,
        needs,
        existingAccommodations
      );

      const messages: LLMMessage[] = [
        { role: 'system', content: ACCOMMODATION_SUGGESTION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ];

      const result = await this.llm.complete(messages, {
        temperature: 0.6, // Lower temperature for more consistent accommodations
        maxTokens: 2000,
        metadata: {
          tenantId: 'system',
          userId: 'system',
          agentType: 'IEP_ACCOMMODATION_GENERATOR',
        },
      });

      const accommodations = this.parseAccommodationResponse(result.content);

      incrementCounter('iep_accommodations.completed');

      return accommodations;
    } catch (error) {
      incrementCounter('iep_accommodations.failed');
      console.error('Accommodation generation failed', { generationId, error });
      throw error;
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // RESPONSE PARSING
  // ════════════════════════════════════════════════════════════════════════════════

  /**
   * Parse raw LLM response to structured goal response
   */
  private parseLLMGoalResponse(content: string): LLMGoalResponse {
    // Extract JSON from response (handle markdown code blocks)
    const jsonRegex = /```(?:json)?\s*([\s\S]*?)```/;
    const jsonMatch = jsonRegex.exec(content);
    const jsonStr = jsonMatch?.[1]?.trim() ?? content.trim();

    try {
      const parsed: LLMGoalResponse = JSON.parse(jsonStr);

      if (!parsed.goals || !Array.isArray(parsed.goals)) {
        throw new Error('Response missing goals array');
      }

      return parsed;
    } catch (error) {
      console.error('Failed to parse goal response', { content, error });
      throw new Error(`Failed to parse LLM response: ${(error as Error).message}`);
    }
  }

  /**
   * Convert LLM response to properly typed IEPGoal objects
   */
  private convertToIEPGoals(response: LLMGoalResponse, request: IEPGenerationRequest): IEPGoal[] {
    return response.goals.map((goal) => ({
      id: uuidv4(),
      category: (goal.category as IEPGoalCategory) || 'academic',
      subject: goal.subject,
      domain: (goal.domain as IEPDomain) || request.focusAreas[0] || 'OTHER',
      annualGoal: goal.annualGoal || goal.title,
      baseline: goal.baseline,
      targetCriteria: goal.targetCriteria,
      measurementMethod:
        (goal.measurementMethod as MeasurementMethod) || 'curriculum-based-assessment',
      serviceMinutes: goal.serviceMinutes || 60,
      provider: (goal.provider as ServiceProvider) || 'special-education-teacher',
      benchmarks: (goal.benchmarks || []).map((b) => ({
        id: uuidv4(),
        targetDate: b.targetDate,
        description: b.description,
        criteria: b.criteria,
        measurementMethod: b.measurementMethod as MeasurementMethod,
      })),
      accommodations: goal.accommodations || [],
      alignedStandards: goal.alignedStandards || [],
      confidence: goal.confidence ?? 0.8,
      rationale: goal.rationale,
    }));
  }

  private parseObjectiveResponse(content: string): IEPBenchmark[] {
    const jsonRegex = /```(?:json)?\s*([\s\S]*?)```/;
    const jsonMatch = jsonRegex.exec(content);
    const jsonStr = jsonMatch?.[1]?.trim() ?? content.trim();

    try {
      const parsed: LLMObjectiveResponse = JSON.parse(jsonStr);

      if (!parsed.objectives || !Array.isArray(parsed.objectives)) {
        throw new Error('Response missing objectives array');
      }

      return parsed.objectives.map((obj) => ({
        id: uuidv4(),
        targetDate: obj.targetDate,
        description: obj.description,
        criteria: obj.criteria,
        measurementMethod: obj.measurementMethod as MeasurementMethod,
      }));
    } catch (error) {
      console.error('Failed to parse objective response', { content, error });
      throw new Error(`Failed to parse objective response: ${(error as Error).message}`);
    }
  }

  private parseAccommodationResponse(content: string): AccommodationSuggestion[] {
    const jsonRegex = /```(?:json)?\s*([\s\S]*?)```/;
    const jsonMatch = jsonRegex.exec(content);
    const jsonStr = jsonMatch?.[1]?.trim() ?? content.trim();

    try {
      const parsed: LLMAccommodationResponse = JSON.parse(jsonStr);

      if (!parsed.accommodations || !Array.isArray(parsed.accommodations)) {
        throw new Error('Response missing accommodations array');
      }

      return parsed.accommodations.map((acc) => ({
        category: acc.category as AccommodationSuggestion['category'],
        accommodation: acc.accommodation,
        rationale: acc.rationale,
        implementation: acc.implementation,
        addressesDisabilities: acc.addressesDisabilities as DisabilityCategory[],
        supportsDomains: acc.supportsDomains as IEPDomain[],
      }));
    } catch (error) {
      console.error('Failed to parse accommodation response', { content, error });
      throw new Error(`Failed to parse accommodation response: ${(error as Error).message}`);
    }
  }

  // ════════════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════════════════════════════

  private getDisclaimer(): string {
    return `IMPORTANT: AI-generated IEP goals are suggestions only and must be reviewed, customized, and approved by qualified IEP team members including special education teachers, related service providers, parents, and where appropriate, the student. These goals should be individualized based on comprehensive evaluation data and team input. Always ensure compliance with IDEA requirements and state/district guidelines.`;
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// FACTORY
// ════════════════════════════════════════════════════════════════════════════════

export function createIEPGenerationService(llm: LLMOrchestrator): IEPGenerationService {
  return new IEPGenerationService(llm);
}
