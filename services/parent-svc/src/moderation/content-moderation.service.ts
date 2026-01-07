/**
 * Content Moderation Service
 *
 * Filters and moderates user-generated content in messaging.
 * Supports multiple providers:
 * - Google Perspective API (toxicity detection)
 * - AWS Comprehend (sentiment and toxicity)
 * - Local pattern matching (fallback)
 */

import { Injectable, OnModuleInit } from '@nestjs/common';
import { logger, metrics } from '@aivo/ts-observability';
import {
  ComprehendClient,
  DetectSentimentCommand,
  DetectToxicContentCommand,
} from '@aws-sdk/client-comprehend';

import { config } from '../config.js';
import { ModerationResult } from '../messaging/messaging.types.js';

// ══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ══════════════════════════════════════════════════════════════════════════════

// Blocklist of inappropriate words for children's platform
const BLOCKLIST = [
  'damn', 'hell', 'crap', 'stupid', 'idiot', 'dumb', 'shut up',
  // Add more age-appropriate restrictions
];

// Patterns that indicate potentially harmful content
const HARMFUL_PATTERNS = [
  /\b(hate|kill|hurt|harm|attack|fight)\b/i,
  /\b(threatening|harassment|bully|bullying)\b/i,
  /\b(die|death|dead|dying)\b/i,
  /\b(gun|knife|weapon)\b/i,
];

// Patterns for sharing personal information
const PII_PATTERNS = [
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone numbers
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, // SSN pattern
  /\b\d{5}(-\d{4})?\b/, // ZIP codes
];

// Perspective API attributes for children's content
const PERSPECTIVE_ATTRIBUTES = [
  'TOXICITY',
  'SEVERE_TOXICITY',
  'IDENTITY_ATTACK',
  'INSULT',
  'PROFANITY',
  'THREAT',
];

// ══════════════════════════════════════════════════════════════════════════════
// TYPES
// ══════════════════════════════════════════════════════════════════════════════

interface PerspectiveResponse {
  attributeScores: {
    [key: string]: {
      summaryScore: {
        value: number;
        type: string;
      };
    };
  };
  languages: string[];
}

interface ExternalModerationResult {
  score: number;
  categories: string[];
  details?: Record<string, number>;
}

// ══════════════════════════════════════════════════════════════════════════════
// SERVICE
// ══════════════════════════════════════════════════════════════════════════════

@Injectable()
export class ContentModerationService implements OnModuleInit {
  private comprehendClient: ComprehendClient | null = null;
  private isInitialized = false;

  async onModuleInit(): Promise<void> {
    await this.initialize();
  }

  /**
   * Initialize moderation providers
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const provider = config.moderationProvider;

    if (provider === 'comprehend') {
      if (!config.awsAccessKeyId || !config.awsSecretAccessKey) {
        logger.warn('AWS Comprehend configured but credentials missing');
        return;
      }

      this.comprehendClient = new ComprehendClient({
        region: config.awsRegion,
        credentials: {
          accessKeyId: config.awsAccessKeyId,
          secretAccessKey: config.awsSecretAccessKey,
        },
      });

      logger.info('Content moderation initialized with AWS Comprehend', {
        region: config.awsRegion,
      });
    } else if (provider === 'perspective') {
      if (!config.moderationApiKey) {
        logger.warn('Perspective API configured but API key missing');
        return;
      }

      logger.info('Content moderation initialized with Perspective API');
    } else {
      logger.info('Content moderation using local patterns only');
    }

    this.isInitialized = true;
  }

  /**
   * Check content for inappropriate material
   */
  async checkContent(content: string): Promise<ModerationResult> {
    const startTime = Date.now();
    const flaggedCategories: string[] = [];
    let score = 0;
    const details: Record<string, number> = {};

    try {
      // Always run local checks first (fast, no API cost)
      const localResult = this.checkLocalPatterns(content);
      score = localResult.score;
      flaggedCategories.push(...localResult.categories);
      Object.assign(details, localResult.details);

      // Use external moderation API if configured and enabled
      if (config.moderationEnabled && config.moderationProvider !== 'none') {
        const externalResult = await this.checkWithExternalApi(content);
        if (externalResult) {
          // Take the max score
          score = Math.max(score, externalResult.score);

          // Add external categories (avoid duplicates)
          for (const category of externalResult.categories) {
            if (!flaggedCategories.includes(category)) {
              flaggedCategories.push(category);
            }
          }

          if (externalResult.details) {
            Object.assign(details, externalResult.details);
          }
        }
      }

      const duration = Date.now() - startTime;
      metrics.histogram('moderation.duration_ms', duration);
      metrics.increment('moderation.checks', {
        provider: config.moderationProvider,
      });

      // Threshold for blocking content (0.5 = 50% confidence)
      const approved = score < 0.5;

      if (!approved) {
        logger.warn('Content moderation blocked message', {
          score,
          categories: flaggedCategories,
          provider: config.moderationProvider,
        });
        metrics.increment('moderation.blocked', {
          provider: config.moderationProvider,
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
      metrics.increment('moderation.errors', {
        provider: config.moderationProvider,
      });

      // Fail open - allow content if moderation fails (but log for review)
      return { approved: true, score: 0 };
    }
  }

  /**
   * Check content with local pattern matching
   */
  private checkLocalPatterns(content: string): ExternalModerationResult {
    const categories: string[] = [];
    const details: Record<string, number> = {};
    let score = 0;

    const lowerContent = content.toLowerCase();

    // Check blocklist
    for (const word of BLOCKLIST) {
      if (lowerContent.includes(word.toLowerCase())) {
        categories.push('blocklist');
        details['blocklist'] = 0.6;
        score = Math.max(score, 0.6);
        break;
      }
    }

    // Check harmful patterns
    for (const pattern of HARMFUL_PATTERNS) {
      if (pattern.test(content)) {
        categories.push('harmful');
        details['harmful'] = 0.7;
        score = Math.max(score, 0.7);
        break;
      }
    }

    // Check for PII (warning level, lower score)
    for (const pattern of PII_PATTERNS) {
      if (pattern.test(content)) {
        categories.push('pii');
        details['pii'] = 0.3;
        score = Math.max(score, 0.3);
        break;
      }
    }

    return { score, categories, details };
  }

  /**
   * Check content with external moderation API
   */
  private async checkWithExternalApi(
    content: string
  ): Promise<ExternalModerationResult | null> {
    switch (config.moderationProvider) {
      case 'perspective':
        return this.checkWithPerspectiveApi(content);
      case 'comprehend':
        return this.checkWithComprehend(content);
      default:
        return null;
    }
  }

  /**
   * Check content with Google Perspective API
   */
  private async checkWithPerspectiveApi(
    content: string
  ): Promise<ExternalModerationResult | null> {
    if (!config.moderationApiKey) {
      return null;
    }

    try {
      const requestedAttributes: Record<string, object> = {};
      for (const attr of PERSPECTIVE_ATTRIBUTES) {
        requestedAttributes[attr] = {};
      }

      const response = await fetch(
        `https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=${config.moderationApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            comment: { text: content },
            languages: ['en'],
            requestedAttributes,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Perspective API error', {
          status: response.status,
          error: errorText,
        });
        return null;
      }

      const data = (await response.json()) as PerspectiveResponse;

      // Process attribute scores
      const categories: string[] = [];
      const details: Record<string, number> = {};
      let maxScore = 0;

      for (const [attr, scoreData] of Object.entries(data.attributeScores)) {
        const score = scoreData.summaryScore.value;
        details[attr.toLowerCase()] = score;

        // Flag if score is above threshold
        if (score >= 0.5) {
          categories.push(attr.toLowerCase());
          maxScore = Math.max(maxScore, score);
        }
      }

      // Weight SEVERE_TOXICITY and THREAT higher
      const severeToxicity = details['severe_toxicity'] ?? 0;
      const threat = details['threat'] ?? 0;
      if (severeToxicity > 0.3 || threat > 0.3) {
        maxScore = Math.max(maxScore, severeToxicity * 1.2, threat * 1.2);
      }

      return {
        score: Math.min(maxScore, 1.0),
        categories,
        details,
      };
    } catch (error) {
      logger.error('Perspective API request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Check content with AWS Comprehend
   */
  private async checkWithComprehend(
    content: string
  ): Promise<ExternalModerationResult | null> {
    if (!this.comprehendClient) {
      return null;
    }

    try {
      const categories: string[] = [];
      const details: Record<string, number> = {};
      let maxScore = 0;

      // Run toxicity detection
      const toxicityCommand = new DetectToxicContentCommand({
        TextSegments: [{ Text: content }],
        LanguageCode: 'en',
      });

      const toxicityResult = await this.comprehendClient.send(toxicityCommand);

      if (toxicityResult.ResultList?.[0]) {
        const result = toxicityResult.ResultList[0];

        // Overall toxicity
        if (result.Toxicity !== undefined) {
          details['toxicity'] = result.Toxicity;
          if (result.Toxicity >= 0.5) {
            categories.push('toxicity');
            maxScore = Math.max(maxScore, result.Toxicity);
          }
        }

        // Individual labels
        if (result.Labels) {
          for (const label of result.Labels) {
            if (label.Name && label.Score !== undefined) {
              const key = label.Name.toLowerCase().replace(/_/g, '-');
              details[key] = label.Score;

              if (label.Score >= 0.5) {
                categories.push(key);
                maxScore = Math.max(maxScore, label.Score);
              }
            }
          }
        }
      }

      // Run sentiment analysis for additional context
      const sentimentCommand = new DetectSentimentCommand({
        Text: content,
        LanguageCode: 'en',
      });

      const sentimentResult = await this.comprehendClient.send(sentimentCommand);

      if (sentimentResult.SentimentScore) {
        details['sentiment_negative'] = sentimentResult.SentimentScore.Negative ?? 0;
        details['sentiment_positive'] = sentimentResult.SentimentScore.Positive ?? 0;

        // Very negative sentiment adds to score
        const negativeScore = sentimentResult.SentimentScore.Negative ?? 0;
        if (negativeScore > 0.8) {
          maxScore = Math.max(maxScore, negativeScore * 0.5);
        }
      }

      return {
        score: Math.min(maxScore, 1.0),
        categories,
        details,
      };
    } catch (error) {
      logger.error('AWS Comprehend request failed', {
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      return null;
    }
  }

  /**
   * Batch check multiple content items
   */
  async checkContentBatch(
    items: string[]
  ): Promise<Map<number, ModerationResult>> {
    const results = new Map<number, ModerationResult>();

    // Process in parallel with concurrency limit
    const batchSize = 10;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map((content, idx) =>
        this.checkContent(content).then((result) => ({
          index: i + idx,
          result,
        }))
      );

      const batchResults = await Promise.all(batchPromises);
      for (const { index, result } of batchResults) {
        results.set(index, result);
      }
    }

    return results;
  }

  /**
   * Get moderation service health status
   */
  getHealthStatus(): {
    initialized: boolean;
    provider: string;
    comprehendReady: boolean;
    perspectiveReady: boolean;
  } {
    return {
      initialized: this.isInitialized,
      provider: config.moderationProvider,
      comprehendReady: this.comprehendClient !== null,
      perspectiveReady: config.moderationProvider === 'perspective' && !!config.moderationApiKey,
    };
  }
}
