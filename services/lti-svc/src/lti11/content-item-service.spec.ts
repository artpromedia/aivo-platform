/**
 * LTI 1.1 Content-Item Service Tests
 *
 * Tests deep linking / content-item message support for
 * embedding AIVO content in LMS course pages.
 */
/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-non-null-assertion */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import type { PrismaClient } from '../../generated/prisma-client/index.js';

import { Lti11ContentItemService, generateAutoSubmitHtml } from './content-item-service.js';
import type { Lti11Consumer, Lti11ContentItem } from './types.js';

function createMockPrisma() {
  return {
    lti11Consumer: {
      findUnique: vi.fn(),
    },
  } as unknown as PrismaClient;
}

describe('Lti11ContentItemService', () => {
  let service: Lti11ContentItemService;
  let mockPrisma: ReturnType<typeof createMockPrisma>;

  const testConsumer: Lti11Consumer = {
    id: 'consumer-123',
    tenantId: 'tenant-abc',
    consumerKey: 'test-consumer-key',
    sharedSecret: 'test-shared-secret-12345',
    name: 'Test LMS',
    isActive: true,
    settings: {},
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const baseUrl = 'https://lti.aivo.com';

  beforeEach(() => {
    mockPrisma = createMockPrisma();
    service = new Lti11ContentItemService(mockPrisma, { baseUrl });
    vi.clearAllMocks();
  });

  describe('buildLtiLinkItem', () => {
    it('should build valid LtiLinkItem structure', () => {
      const item = service.buildLtiLinkItem({
        title: 'Introduction to Algebra',
        text: 'Learn the basics of algebraic expressions',
        launchUrl: `${baseUrl}/lti/1.1/launch?content_id=lesson-123`,
      });

      expect(item).toEqual({
        '@type': 'LtiLinkItem',
        title: 'Introduction to Algebra',
        text: 'Learn the basics of algebraic expressions',
        url: expect.stringContaining('/lti/1.1/launch'),
        mediaType: 'application/vnd.ims.lti.v1.ltilink',
        placementAdvice: {
          presentationDocumentTarget: 'iframe',
        },
        custom: undefined,
      });
    });

    it('should include custom parameters when provided', () => {
      const item = service.buildLtiLinkItem({
        title: 'Chapter 1 Quiz',
        launchUrl: `${baseUrl}/lti/1.1/launch?content_id=quiz-456`,
        custom: {
          due_date: '2024-12-31',
          max_attempts: '3',
        },
      });

      expect(item.custom).toEqual({
        due_date: '2024-12-31',
        max_attempts: '3',
      });
    });

    it('should include icon when provided', () => {
      const item = service.buildLtiLinkItem({
        title: 'Lecture Video',
        launchUrl: `${baseUrl}/lti/1.1/launch?content_id=video-789`,
        icon: 'https://cdn.aivo.com/icons/video-icon.png',
      });

      expect(item.icon).toEqual({
        '@id': 'https://cdn.aivo.com/icons/video-icon.png',
        width: 50,
        height: 50,
      });
    });

    it('should include line item for gradable content', () => {
      const item = service.buildLtiLinkItem({
        title: 'Final Exam',
        launchUrl: `${baseUrl}/lti/1.1/launch?content_id=exam-001`,
        lineItem: {
          label: 'Final Exam',
          scoreMaximum: 100,
        },
      });

      expect(item.lineItem).toEqual({
        '@type': 'LineItem',
        label: 'Final Exam',
        scoreMaximum: 100,
      });
    });
  });

  describe('buildFileItem', () => {
    it('should build valid FileItem structure', () => {
      const item = service.buildFileItem({
        title: 'Study Guide PDF',
        text: 'Chapter 1-5 study materials',
        url: 'https://cdn.aivo.com/files/study-guide.pdf',
        mediaType: 'application/pdf',
      });

      expect(item).toEqual({
        '@type': 'FileItem',
        title: 'Study Guide PDF',
        text: 'Chapter 1-5 study materials',
        url: 'https://cdn.aivo.com/files/study-guide.pdf',
        mediaType: 'application/pdf',
      });
    });

    it('should include thumbnail when provided', () => {
      const item = service.buildFileItem({
        title: 'Video Lecture',
        url: 'https://cdn.aivo.com/videos/lecture-1.mp4',
        mediaType: 'video/mp4',
        thumbnail: 'https://cdn.aivo.com/thumbnails/lecture-1.jpg',
      });

      expect(item.thumbnail).toEqual({
        '@id': 'https://cdn.aivo.com/thumbnails/lecture-1.jpg',
        width: 128,
        height: 128,
      });
    });
  });

  describe('buildContentItemResponse', () => {
    const contentItemReturnUrl = 'https://lms.example.com/content-item/return';

    it('should build content-item response with form params', async () => {
      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );

      const items: Lti11ContentItem[] = [
        {
          '@type': 'LtiLinkItem',
          title: 'Test Lesson',
          url: `${baseUrl}/lti/1.1/launch?content_id=lesson-1`,
          mediaType: 'application/vnd.ims.lti.v1.ltilink',
        },
      ];

      const response = await service.buildContentItemResponse(
        testConsumer.id,
        contentItemReturnUrl,
        items,
        'opaque-lms-data'
      );

      expect(response.formAction).toBe(contentItemReturnUrl);
      expect(response.formMethod).toBe('POST');
      expect(response.formParams).toHaveProperty('lti_message_type', 'ContentItemSelection');
      expect(response.formParams).toHaveProperty('lti_version', 'LTI-1p0');
      expect(response.formParams).toHaveProperty('content_items');
      expect(response.formParams).toHaveProperty('data', 'opaque-lms-data');

      // Verify content_items is valid JSON-LD
      expect(response.formParams.content_items).toBeDefined();
      const contentItems = JSON.parse(response.formParams.content_items!);
      expect(contentItems['@context']).toBe('http://purl.imsglobal.org/ctx/lti/v1/ContentItem');
      expect(contentItems['@graph']).toHaveLength(1);
      expect(contentItems['@graph'][0].title).toBe('Test Lesson');
    });

    it('should handle multiple content items', async () => {
      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );

      const items: Lti11ContentItem[] = [
        {
          '@type': 'LtiLinkItem',
          title: 'Lesson 1',
          url: `${baseUrl}/lti/1.1/launch?content_id=lesson-1`,
          mediaType: 'application/vnd.ims.lti.v1.ltilink',
        },
        {
          '@type': 'LtiLinkItem',
          title: 'Lesson 2',
          url: `${baseUrl}/lti/1.1/launch?content_id=lesson-2`,
          mediaType: 'application/vnd.ims.lti.v1.ltilink',
        },
      ];

      const response = await service.buildContentItemResponse(
        testConsumer.id,
        contentItemReturnUrl,
        items
      );

      expect(response.formParams.content_items).toBeDefined();
      const contentItems = JSON.parse(response.formParams.content_items!);
      expect(contentItems['@graph']).toHaveLength(2);
    });

    it('should throw error for unknown consumer', async () => {
      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(null);

      await expect(
        service.buildContentItemResponse('unknown-consumer', contentItemReturnUrl, [])
      ).rejects.toThrow('Consumer not found');
    });
  });

  describe('buildContentItemsFromSelection', () => {
    it('should convert content selection to LTI link items', () => {
      const selection = [
        {
          type: 'lesson' as const,
          id: 'lesson-123',
          title: 'Introduction to Algebra',
          description: 'Learn algebraic basics',
        },
        {
          type: 'assessment' as const,
          id: 'quiz-456',
          title: 'Algebra Quiz',
          scoreMaximum: 100,
        },
      ];

      const items = service.buildContentItemsFromSelection(selection);

      expect(items).toHaveLength(2);
      expect(items[0]).toBeDefined();
      expect(items[0]!.title).toBe('Introduction to Algebra');
      expect(items[0]!.custom?.content_type).toBe('lesson');
      expect(items[0]!.custom?.content_id).toBe('lesson-123');

      expect(items[1]).toBeDefined();
      expect(items[1]!.title).toBe('Algebra Quiz');
      expect(items[1]!.lineItem?.scoreMaximum).toBe(100);
    });
  });

  describe('Signature Generation', () => {
    it('should include OAuth signature in form params', async () => {
      (mockPrisma.lti11Consumer.findUnique as ReturnType<typeof vi.fn>).mockResolvedValue(
        testConsumer
      );

      const response = await service.buildContentItemResponse(
        testConsumer.id,
        'https://lms.example.com/return',
        []
      );

      // OAuth signature params should be present
      expect(response.formParams).toHaveProperty('oauth_signature');
      expect(response.formParams).toHaveProperty('oauth_signature_method');
      expect(response.formParams).toHaveProperty('oauth_timestamp');
      expect(response.formParams).toHaveProperty('oauth_nonce');
      expect(response.formParams).toHaveProperty('oauth_consumer_key');
      expect(response.formParams).toHaveProperty('oauth_version');

      // Signature should be base64 encoded
      expect(response.formParams.oauth_signature).toMatch(/^[A-Za-z0-9+/=]+$/);

      // Timestamp should be recent (within 60 seconds)
      expect(response.formParams.oauth_timestamp).toBeDefined();
      const timestamp = parseInt(response.formParams.oauth_timestamp!);
      const now = Math.floor(Date.now() / 1000);
      expect(Math.abs(now - timestamp)).toBeLessThan(60);

      // Nonce should be sufficiently long
      expect(response.formParams.oauth_nonce).toBeDefined();
      expect(response.formParams.oauth_nonce!.length).toBeGreaterThanOrEqual(16);
    });
  });
});

describe('generateAutoSubmitHtml', () => {
  it('should generate HTML form with hidden fields', () => {
    const response = {
      formAction: 'https://lms.example.com/return',
      formMethod: 'POST' as const,
      formParams: {
        lti_message_type: 'ContentItemSelection',
        content_items: '{"@context":"..."}',
        oauth_signature: 'abc123',
      },
    };

    const html = generateAutoSubmitHtml(response);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<form');
    expect(html).toContain('action="https://lms.example.com/return"');
    expect(html).toContain('method="POST"');
    expect(html).toContain('name="lti_message_type"');
    expect(html).toContain('value="ContentItemSelection"');
    expect(html).toContain('document.getElementById');
    expect(html).toContain('.submit()');
  });

  it('should escape HTML entities in values', () => {
    const response = {
      formAction: 'https://lms.example.com/return',
      formMethod: 'POST' as const,
      formParams: {
        data: '<script>alert("xss")</script>',
        title: 'Test "quoted" & special',
      },
    };

    const html = generateAutoSubmitHtml(response);

    expect(html).not.toContain('<script>alert');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('&quot;');
    expect(html).toContain('&amp;');
  });

  it('should include all provided parameters as hidden inputs', () => {
    const response = {
      formAction: 'https://example.com/return',
      formMethod: 'POST' as const,
      formParams: {
        param1: 'value1',
        param2: 'value2',
        param3: 'value3',
      },
    };

    const html = generateAutoSubmitHtml(response);

    expect(html).toContain('name="param1"');
    expect(html).toContain('value="value1"');
    expect(html).toContain('name="param2"');
    expect(html).toContain('value="value2"');
    expect(html).toContain('name="param3"');
    expect(html).toContain('value="value3"');
  });
});
