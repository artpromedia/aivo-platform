import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OCROrchestrator } from '../../src/ocr/orchestrator.js';

describe('OCROrchestrator', () => {
  let orchestrator: OCROrchestrator;

  beforeEach(() => {
    orchestrator = new OCROrchestrator();
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should register all providers', async () => {
      const statuses = await orchestrator.getProviderStatuses();
      expect(statuses.length).toBeGreaterThan(0);
      expect(statuses.map((s) => s.provider)).toContain('tesseract');
    });
  });

  describe('getProvider', () => {
    it('should return tesseract provider', () => {
      const provider = orchestrator.getProvider('tesseract');
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('tesseract');
    });

    it('should return google-vision provider', () => {
      const provider = orchestrator.getProvider('google-vision');
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('google-vision');
    });

    it('should return aws-textract provider', () => {
      const provider = orchestrator.getProvider('aws-textract');
      expect(provider).toBeDefined();
      expect(provider?.name).toBe('aws-textract');
    });

    it('should return undefined for unknown provider', () => {
      const provider = orchestrator.getProvider('unknown' as any);
      expect(provider).toBeUndefined();
    });
  });

  describe('getProviderStatuses', () => {
    it('should return status for all providers', async () => {
      const statuses = await orchestrator.getProviderStatuses();
      expect(statuses.length).toBe(3);
      for (const status of statuses) {
        expect(status).toHaveProperty('provider');
        expect(status).toHaveProperty('available');
      }
    });
  });

  describe('preprocessImage', () => {
    it('should return preprocessing result with transformations', async () => {
      const image = Buffer.from([0xff, 0xd8, 0xff, 0xe0]); // JPEG magic bytes
      const result = await orchestrator.preprocessImage(image);

      expect(result).toHaveProperty('originalImage');
      expect(result).toHaveProperty('processedImage');
      expect(result).toHaveProperty('metadata');
      expect(result).toHaveProperty('transformations');
      expect(result).toHaveProperty('processingTimeMs');
      expect(result.metadata.format).toBe('jpeg');
    });

    it('should detect PNG format', async () => {
      const image = Buffer.from([0x89, 0x50, 0x4e, 0x47]); // PNG magic bytes
      const result = await orchestrator.preprocessImage(image);
      expect(result.metadata.format).toBe('png');
    });

    it('should apply handwriting optimization', async () => {
      const image = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
      const result = await orchestrator.preprocessImage(image, {
        isHandwritten: true,
      });
      expect(result.transformations).toContain('noise-reduction');
    });
  });

  describe('enhanceResults', () => {
    const baseResult = {
      text: 'teh quick brown fox',
      confidence: 0.9,
      boundingBoxes: [],
      language: 'en',
      processingTimeMs: 100,
      provider: 'tesseract' as const,
    };

    it('should correct common spelling errors', async () => {
      const enhanced = await orchestrator.enhanceResults(baseResult);
      expect(enhanced.text).toContain('the'); // 'teh' -> 'the'
    });

    it('should not apply spell correction for MATH subject', async () => {
      const result = { ...baseResult, text: 'x = 5' };
      const enhanced = await orchestrator.enhanceResults(result, 'MATH');
      expect(enhanced.text).toBe('x = 5');
    });

    it('should normalize math symbols', async () => {
      const result = { ...baseResult, text: 'pi equals 3.14', containsMath: true };
      const enhanced = await orchestrator.enhanceResults(result, 'MATH');
      expect(enhanced.text).toContain('π');
    });
  });
});
