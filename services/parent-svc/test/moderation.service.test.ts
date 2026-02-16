import { describe, it, expect, beforeEach } from 'vitest';
import { ContentModerationService } from '../src/moderation/content-moderation.service';

describe('ContentModerationService', () => {
  let moderationService: ContentModerationService;

  beforeEach(() => {
    moderationService = new ContentModerationService();
  });

  describe('checkContent', () => {
    it('should approve clean content', async () => {
      const result = await moderationService.checkContent(
        "Hi, I wanted to ask about my child's math progress."
      );

      expect(result.approved).toBe(true);
      expect(result.score).toBeLessThan(0.5);
    });

    it('should approve normal test message', async () => {
      const result = await moderationService.checkContent('This is a test message');

      expect(result.approved).toBe(true);
    });

    it('should flag potential PII - phone numbers', async () => {
      const result = await moderationService.checkContent('Call me at 555-123-4567');

      // PII has score 0.3 which is below 0.5 threshold — content is approved but flagged
      expect(result.flaggedCategories).toBeDefined();
      expect(result.flaggedCategories).toContain('pii');
    });

    it('should flag potential PII - email addresses', async () => {
      const result = await moderationService.checkContent('Email me at personal@email.com instead');

      expect(result.flaggedCategories).toBeDefined();
      expect(result.flaggedCategories).toContain('pii');
    });

    it('should flag potential PII - SSN patterns', async () => {
      const result = await moderationService.checkContent('My SSN is 123-45-6789');

      expect(result.flaggedCategories).toBeDefined();
      expect(result.flaggedCategories).toContain('pii');
    });

    it('should approve messages with acceptable length', async () => {
      const result = await moderationService.checkContent(
        'This is a normal length message about homework.'
      );

      expect(result.approved).toBe(true);
    });

    it('should flag blocklisted words', async () => {
      const result = await moderationService.checkContent('You are so stupid and dumb');

      expect(result.approved).toBe(false);
      expect(result.flaggedCategories).toContain('blocklist');
    });

    it('should flag harmful content', async () => {
      const result = await moderationService.checkContent('I will hurt someone at school');

      expect(result.approved).toBe(false);
      expect(result.flaggedCategories).toContain('harmful');
    });
  });

  describe('checkContentBatch', () => {
    it('should check multiple items', async () => {
      const results = await moderationService.checkContentBatch([
        'Good morning, how are you?',
        'You are stupid',
      ]);

      expect(results.size).toBe(2);
      expect(results.get(0)?.approved).toBe(true);
      expect(results.get(1)?.approved).toBe(false);
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status', () => {
      const status = moderationService.getHealthStatus();

      expect(status.initialized).toBe(false);
      expect(status.provider).toBeDefined();
    });
  });
});
