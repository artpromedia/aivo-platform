import { describe, it, expect } from 'vitest';
import { OCRError } from '../../src/ocr/types.js';

describe('OCR Types', () => {
  describe('OCRError', () => {
    it('should create error with correct properties', () => {
      const error = new OCRError(
        'Test error',
        'tesseract',
        'PROCESSING_FAILED',
        true
      );

      expect(error.message).toBe('Test error');
      expect(error.provider).toBe('tesseract');
      expect(error.code).toBe('PROCESSING_FAILED');
      expect(error.isRetryable).toBe(true);
      expect(error.name).toBe('OCRError');
    });

    it('should preserve original error', () => {
      const original = new Error('Original error');
      const error = new OCRError(
        'Wrapped error',
        'google-vision',
        'TIMEOUT',
        true,
        original
      );

      expect(error.originalError).toBe(original);
    });

    it('should default isRetryable to false', () => {
      const error = new OCRError(
        'Test error',
        'aws-textract',
        'AUTHENTICATION_FAILED'
      );

      expect(error.isRetryable).toBe(false);
    });
  });
});
