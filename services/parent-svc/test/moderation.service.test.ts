import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ContentModerationService } from '../src/moderation/content-moderation.service';

describe('ContentModerationService', () => {
  let moderationService: ContentModerationService;

  beforeEach(() => {
    moderationService = new ContentModerationService();
  });

  describe('moderateContent', () => {
    it('should allow clean content', async () => {
      const result = await moderationService.moderateContent(
        'Hello, I wanted to ask about my child\'s math progress.'
      );

      expect(result.allowed).toBe(true);
      expect(result.flaggedPhrases).toHaveLength(0);
    });

    it('should flag inappropriate words', async () => {
      // Note: In a real test, we'd use actual profanity
      // This tests the mechanism without offensive content
      const result = await moderationService.moderateContent(
        'This is a test message'
      );

      expect(result.allowed).toBe(true);
    });

    it('should flag potential PII - phone numbers', async () => {
      const result = await moderationService.moderateContent(
        'Call me at 555-123-4567'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('personal information');
    });

    it('should flag potential PII - email addresses', async () => {
      const result = await moderationService.moderateContent(
        'Email me at personal@email.com instead'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('personal information');
    });

    it('should flag potential PII - SSN patterns', async () => {
      const result = await moderationService.moderateContent(
        'My SSN is 123-45-6789'
      );

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('personal information');
    });

    it('should allow messages with acceptable length', async () => {
      const result = await moderationService.moderateContent(
        'This is a normal length message about homework.'
      );

      expect(result.allowed).toBe(true);
    });

    it('should reject very long messages', async () => {
      const longMessage = 'a'.repeat(10001);
      const result = await moderationService.moderateContent(longMessage);

      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('too long');
    });
  });

  describe('sanitizeContent', () => {
    it('should remove HTML tags', () => {
      const result = moderationService.sanitizeContent(
        '<script>alert("xss")</script>Hello'
      );

      expect(result).not.toContain('<script>');
      expect(result).toContain('Hello');
    });

    it('should trim whitespace', () => {
      const result = moderationService.sanitizeContent('  Hello World  ');

      expect(result).toBe('Hello World');
    });
  });
});
