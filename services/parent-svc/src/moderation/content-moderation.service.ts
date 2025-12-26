/**
 * Content Moderation Service
 *
 * Filters and moderates user-generated content in messaging.
 */

import { Injectable } from '@nestjs/common';
import { logger, metrics } from '@aivo/ts-observability';
import { config } from '../config.js';
import { ModerationResult } from '../messaging/messaging.types.js';

// Blocklist of inappropriate words (simplified - use a proper library in production)
const BLOCKLIST = [
  // Add inappropriate words here
];

// Patterns that indicate potentially harmful content
const HARMFUL_PATTERNS = [
  /\b(hate|kill|hurt|harm)\b/i,
  /\b(threatening|harassment)\b/i,
];

// Patterns for sharing personal information
const PII_PATTERNS = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses (flag, don't block)
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, // SSN pattern
];

@Injectable()
export class ContentModerationService {
  /**
   * Check content for inappropriate material
   */
  async checkContent(content: string): Promise<ModerationResult> {
    const startTime = Date.now();
    const flaggedCategories: string[] = [];
    let score = 0;

    try {
      // Check blocklist
      const lowerContent = content.toLowerCase();
      for (const word of BLOCKLIST) {
        if (lowerContent.includes(word)) {
          flaggedCategories.push('blocklist');
          score += 0.5;
          break;
        }
      }

      // Check harmful patterns
      for (const pattern of HARMFUL_PATTERNS) {
        if (pattern.test(content)) {
          flaggedCategories.push('harmful');
          score += 0.3;
          break;
        }
      }

      // Check for PII (warning only, don't block)
      for (const pattern of PII_PATTERNS) {
        if (pattern.test(content)) {
          flaggedCategories.push('pii');
          score += 0.1;
          break;
        }
      }

      // Use external moderation API if configured
      if (config.moderationApiKey) {
        const externalResult = await this.checkWithExternalApi(content);
        if (externalResult) {
          score = Math.max(score, externalResult.score);
          flaggedCategories.push(...externalResult.categories);
        }
      }

      const duration = Date.now() - startTime;
      metrics.histogram('moderation.duration_ms', duration);

      // Threshold for blocking content
      const approved = score < 0.5;

      if (!approved) {
        logger.warn('Content moderation blocked message', {
          score,
          categories: flaggedCategories,
        });
      }

      return {
        approved,
        score,
        reason: approved ? undefined : `Content flagged: ${flaggedCategories.join(', ')}`,
        flaggedCategories: flaggedCategories.length > 0 ? flaggedCategories : undefined,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Content moderation failed', { error: message });
      
      // Fail open - allow content if moderation fails
      return { approved: true, score: 0 };
    }
  }

  /**
   * Check content with external moderation API
   */
  private async checkWithExternalApi(
    _content: string
  ): Promise<{ score: number; categories: string[] } | null> {
    // TODO: Integrate with external moderation service (Perspective API, AWS Comprehend, etc.)
    // Example with Perspective API:
    // const response = await fetch('https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze', {
    //   method: 'POST',
    //   body: JSON.stringify({
    //     comment: { text: content },
    //     languages: ['en'],
    //     requestedAttributes: {
    //       TOXICITY: {},
    //       PROFANITY: {},
    //       THREAT: {},
    //     },
    //   }),
    // });

    return null;
  }
}
