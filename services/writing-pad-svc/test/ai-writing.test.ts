import { describe, it, expect } from 'vitest';
import { calculateMetrics } from '../src/services/ai-writing.service.js';

// ============================================================================
// calculateMetrics - pure text analysis
// ============================================================================

describe('calculateMetrics', () => {
  it('counts words correctly', () => {
    const metrics = calculateMetrics('Hello world this is a test');
    expect(metrics.wordCount).toBe(6);
  });

  it('counts sentences correctly', () => {
    const metrics = calculateMetrics('First sentence. Second sentence! Third?');
    expect(metrics.sentenceCount).toBe(3);
  });

  it('counts paragraphs correctly', () => {
    const metrics = calculateMetrics('Paragraph one.\n\nParagraph two.\n\nParagraph three.');
    expect(metrics.paragraphCount).toBe(3);
  });

  it('handles empty string', () => {
    const metrics = calculateMetrics('');
    expect(metrics.wordCount).toBe(0);
    expect(metrics.sentenceCount).toBe(1); // Math.max(0, 1)
    expect(metrics.paragraphCount).toBe(1); // Math.max(0, 1)
  });

  it('calculates average word length', () => {
    const metrics = calculateMetrics('cat dog fox'); // 3+3+3 = 9, /3 = 3.0
    expect(metrics.averageWordLength).toBe(3);
  });

  it('calculates average sentence length', () => {
    const metrics = calculateMetrics('One two. Three four five.');
    // 5 words, 2 sentences → avg = 2.5
    expect(metrics.averageSentenceLength).toBe(2.5);
  });

  it('calculates readability score between 0 and 100', () => {
    const metrics = calculateMetrics(
      'The cat sat on the mat. The dog ran in the park. It was a nice day.'
    );
    expect(metrics.readabilityScore).toBeGreaterThanOrEqual(0);
    expect(metrics.readabilityScore).toBeLessThanOrEqual(100);
  });

  it('returns BASIC vocabulary for short words', () => {
    const metrics = calculateMetrics('I am a cat. He is a dog.');
    expect(metrics.vocabularyLevel).toBe('BASIC');
  });

  it('returns INTERMEDIATE vocabulary for medium words', () => {
    const metrics = calculateMetrics(
      'Understanding complex educational environments requires significantly methodical approaches.'
    );
    // Average word length > 4.5
    expect(metrics.vocabularyLevel).toBe('INTERMEDIATE');
  });

  it('returns ADVANCED vocabulary for long words', () => {
    const metrics = calculateMetrics('Electroencephalography neuropharmacology psychophysiology.');
    // Average word length > 6
    expect(metrics.vocabularyLevel).toBe('ADVANCED');
  });

  it('handles single word', () => {
    const metrics = calculateMetrics('Hello');
    expect(metrics.wordCount).toBe(1);
    expect(metrics.sentenceCount).toBe(1);
    expect(metrics.paragraphCount).toBe(1);
  });

  it('handles multiple spaces between words', () => {
    const metrics = calculateMetrics('Hello   world   test');
    expect(metrics.wordCount).toBe(3);
  });
});
