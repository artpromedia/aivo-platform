/**
 * Safety Filter v2
 *
 * Comprehensive safety filtering for K-12 educational AI with:
 * - Pattern-based content blocking
 * - PII detection
 * - Age-appropriate content verification
 * - Direct answer detection and conversion
 * - COPPA compliance
 */

import type { AgentContext } from '../agents/base-agent.js';
import type { LLMOrchestrator } from '../providers/llm-orchestrator.js';
import { incrementCounter } from '../providers/metrics-helper.js';

export interface SafetyCheckResult {
  safe: boolean;
  reason?: string;
  sanitized?: string;
  confidence: number;
}

/**
 * Safety Filter for K-12 educational content
 */
export class SafetyFilter {
  private llm: LLMOrchestrator | null;
  private blockedPatterns: RegExp[];
  private piiPatterns: RegExp[];

  constructor(llm?: LLMOrchestrator) {
    this.llm = llm ?? null;

    // Content that should never appear
    this.blockedPatterns = [
      /\b(suicide|self-harm|kill\s+(myself|yourself)|hurt\s+(myself|yourself))\b/i,
      /\b(bomb|weapon|gun)\s+(make|build|create)\b/i,
      /\b(make|build|create)\s+(a\s+)?(bomb|weapon|gun)\b/i,
      /\bhow\s+(do\s+)?(i|to)\s+(make|build|create)\s+(a\s+)?(bomb|weapon|gun)\b/i,
      /\b(drug|alcohol)\s+(buy|get|find)\b/i,
      /\bexplicit\s+content\b/i,
      /\b(porn|pornography|xxx)\b/i,
      /\b(hate|kill)\s+(all|every)\s+\w+/i,
      /\bterroris(t|m)\b/i,
      /\b(child|minor)\s+(abuse|exploitation)\b/i,
    ];

    // PII patterns to detect (COPPA compliance)
    this.piiPatterns = [
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone numbers
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
      /\b\d{3}[-]?\d{2}[-]?\d{4}\b/, // SSN
      /\b\d{1,5}\s+\w+\s+(street|st|avenue|ave|road|rd|drive|dr|lane|ln|way|court|ct|circle|cir|boulevard|blvd)\b/i, // Addresses
      /\b\d{5}(-\d{4})?\b/, // ZIP codes
      /\b(my|i live at|my address is|i'm at)\s+\d+\s+\w+/i, // Location disclosure
    ];
  }

  /**
   * Check input message for safety issues
   */
  async checkInput(input: string, context: AgentContext): Promise<SafetyCheckResult> {
    // Quick pattern checks first
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(input)) {
        incrementCounter('safety.input.blocked', { reason: 'blocked_pattern' });
        return {
          safe: false,
          reason: 'inappropriate_content',
          confidence: 1.0,
        };
      }
    }

    // Check for PII
    for (const pattern of this.piiPatterns) {
      if (pattern.test(input)) {
        incrementCounter('safety.input.blocked', { reason: 'pii_detected' });
        return {
          safe: false,
          reason: 'personal_information',
          confidence: 0.9,
        };
      }
    }

    // Age-appropriate content check using LLM (if available)
    if (this.llm) {
      const ageCheck = await this.checkAgeAppropriate(input, context);
      if (!ageCheck.safe) {
        return ageCheck;
      }
    }

    return { safe: true, confidence: 1.0 };
  }

  /**
   * Check output for safety issues
   */
  async checkOutput(output: string, context: AgentContext): Promise<SafetyCheckResult> {
    // Check for blocked content in AI response
    for (const pattern of this.blockedPatterns) {
      if (pattern.test(output)) {
        console.error('LLM produced blocked content', {
          pattern: pattern.source,
          context: { sessionId: context.sessionId },
        });
        incrementCounter('safety.output.blocked', { reason: 'blocked_pattern' });
        return {
          safe: false,
          reason: 'inappropriate_content',
          confidence: 1.0,
        };
      }
    }

    // Check output doesn't give direct homework answers (if LLM available)
    if (this.llm && (await this.containsDirectAnswer(output, context))) {
      // Sanitize rather than block
      const sanitized = await this.convertToGuidance(output, context);
      return {
        safe: false,
        reason: 'direct_answer',
        sanitized,
        confidence: 0.8,
      };
    }

    return { safe: true, confidence: 1.0 };
  }

  /**
   * Check if content is age-appropriate
   */
  private async checkAgeAppropriate(
    content: string,
    context: AgentContext
  ): Promise<SafetyCheckResult> {
    if (!this.llm) {
      return { safe: true, confidence: 0.5 };
    }

    const age = context.learnerProfile?.age ?? 10;

    try {
      const response = await this.llm.complete(
        [
          {
            role: 'system',
            content: `You are a content safety classifier for K-12 educational content.
Analyze the following text and determine if it's appropriate for a ${age}-year-old student.
Respond with JSON only: {"appropriate": true/false, "reason": "brief explanation if not appropriate"}`,
          },
          {
            role: 'user',
            content: content,
          },
        ],
        {
          temperature: 0,
          maxTokens: 100,
          metadata: {
            tenantId: context.tenantId,
            userId: 'system',
            agentType: 'safety',
          },
        }
      );

      const result = JSON.parse(response.content);
      if (!result.appropriate) {
        incrementCounter('safety.age_inappropriate');
        return {
          safe: false,
          reason: result.reason ?? 'inappropriate_content',
          confidence: 0.85,
        };
      }
    } catch (error) {
      // If parsing fails, err on side of allowing (don't block on errors)
      console.warn('Failed to parse safety check response', { error });
    }

    return { safe: true, confidence: 0.9 };
  }

  /**
   * Check if response contains direct answers
   */
  private async containsDirectAnswer(output: string, context: AgentContext): Promise<boolean> {
    if (!this.llm) {
      return false;
    }

    try {
      const response = await this.llm.complete(
        [
          {
            role: 'system',
            content: `You are analyzing an AI tutor's response to determine if it gives a direct answer to a homework problem instead of guiding the student.

A direct answer is when the tutor:
- Provides the final numerical or textual answer
- Completes the work for the student
- Shows all the steps without asking the student to participate

A guiding response:
- Asks questions to lead the student
- Gives hints without revealing the answer
- Encourages the student to try

Respond with JSON only: {"gives_direct_answer": true/false}`,
          },
          {
            role: 'user',
            content: output,
          },
        ],
        {
          temperature: 0,
          maxTokens: 50,
          metadata: {
            tenantId: context.tenantId,
            userId: 'system',
            agentType: 'safety',
          },
        }
      );

      const result = JSON.parse(response.content);
      return result.gives_direct_answer === true;
    } catch {
      return false;
    }
  }

  /**
   * Convert a direct answer to guiding response
   */
  private async convertToGuidance(directAnswer: string, context: AgentContext): Promise<string> {
    if (!this.llm) {
      return directAnswer;
    }

    try {
      const response = await this.llm.complete(
        [
          {
            role: 'system',
            content: `Convert the following tutor response that gives a direct answer into a guiding response that helps the student discover the answer themselves through questions.

Keep the same friendly tone but replace direct answers with guiding questions.`,
          },
          {
            role: 'user',
            content: directAnswer,
          },
        ],
        {
          temperature: 0.7,
          maxTokens: 300,
          metadata: {
            tenantId: context.tenantId,
            userId: 'system',
            agentType: 'safety',
          },
        }
      );

      return response.content;
    } catch {
      return directAnswer;
    }
  }

  /**
   * Sanitize text by removing PII
   */
  sanitizePII(text: string): string {
    let result = text;

    // Replace phone numbers
    result = result.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE REMOVED]');

    // Replace emails
    result = result.replace(
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      '[EMAIL REMOVED]'
    );

    // Replace SSNs
    result = result.replace(/\b\d{3}[-]?\d{2}[-]?\d{4}\b/g, '[SSN REMOVED]');

    return result;
  }
}

/**
 * Create a safety filter with optional LLM for advanced checks
 */
export function createSafetyFilter(llm?: LLMOrchestrator): SafetyFilter {
  return new SafetyFilter(llm);
}
