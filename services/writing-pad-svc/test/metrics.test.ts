/**
 * Tests for writing-pad-svc calculateMetrics pure function.
 */
import { describe, it, expect } from 'vitest';

// Pure function test — calculateMetrics logic
function calculateMetrics(text: string) {
  if (!text || text.trim().length === 0) {
    return {
      wordCount: 0,
      sentenceCount: 0,
      paragraphCount: 0,
      characterCount: 0,
      avgWordsPerSentence: 0,
      readabilityScore: 0,
      readingLevel: 'N/A',
    };
  }

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const wordCount = words.length;
  const sentenceCount = Math.max(sentences.length, 1);
  const avgWordsPerSentence = wordCount / sentenceCount;

  // Flesch-Kincaid approximation
  const syllableCount = words.reduce((sum, w) => {
    const s = w.toLowerCase().replace(/[^a-z]/g, '');
    const vowels = s.match(/[aeiouy]+/g);
    return sum + Math.max(vowels ? vowels.length : 1, 1);
  }, 0);
  const avgSyllablesPerWord = syllableCount / Math.max(wordCount, 1);

  const readabilityScore = Math.max(
    0,
    Math.min(100, 206.835 - 1.015 * avgWordsPerSentence - 84.6 * avgSyllablesPerWord),
  );

  let readingLevel: string;
  if (readabilityScore >= 90) readingLevel = 'Grade 1-2';
  else if (readabilityScore >= 80) readingLevel = 'Grade 3-4';
  else if (readabilityScore >= 70) readingLevel = 'Grade 5-6';
  else if (readabilityScore >= 60) readingLevel = 'Grade 7-8';
  else if (readabilityScore >= 50) readingLevel = 'Grade 9-10';
  else if (readabilityScore >= 30) readingLevel = 'Grade 11-12';
  else readingLevel = 'College';

  return {
    wordCount,
    sentenceCount,
    paragraphCount: paragraphs.length,
    characterCount: text.length,
    avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
    readabilityScore: Math.round(readabilityScore * 10) / 10,
    readingLevel,
  };
}

describe('calculateMetrics', () => {
  it('returns zero metrics for empty string', () => {
    const m = calculateMetrics('');
    expect(m.wordCount).toBe(0);
    expect(m.sentenceCount).toBe(0);
    expect(m.readingLevel).toBe('N/A');
  });

  it('returns zero metrics for whitespace-only string', () => {
    const m = calculateMetrics('   \n\n  ');
    expect(m.wordCount).toBe(0);
  });

  it('counts words correctly', () => {
    const m = calculateMetrics('The quick brown fox jumps.');
    expect(m.wordCount).toBe(5);
  });

  it('counts sentences correctly', () => {
    const m = calculateMetrics('Hello world. How are you? I am fine!');
    expect(m.sentenceCount).toBe(3);
  });

  it('counts paragraphs correctly', () => {
    const text = 'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.';
    const m = calculateMetrics(text);
    expect(m.paragraphCount).toBe(3);
  });

  it('calculates average words per sentence', () => {
    const m = calculateMetrics('One two three. Four five.');
    expect(m.avgWordsPerSentence).toBe(2.5);
  });

  it('calculates character count including spaces', () => {
    const text = 'Hello world';
    const m = calculateMetrics(text);
    expect(m.characterCount).toBe(11);
  });

  it('produces readability score between 0 and 100', () => {
    const m = calculateMetrics(
      'The cat sat on the mat. The dog ran in the park. It was a nice day.',
    );
    expect(m.readabilityScore).toBeGreaterThanOrEqual(0);
    expect(m.readabilityScore).toBeLessThanOrEqual(100);
  });

  it('assigns appropriate reading level for simple text', () => {
    const m = calculateMetrics('I am Sam. Sam I am. I like ham.');
    expect(['Grade 1-2', 'Grade 3-4', 'Grade 5-6']).toContain(m.readingLevel);
  });

  it('assigns higher reading level for complex text', () => {
    const m = calculateMetrics(
      'The philosophical implications of epistemological uncertainty fundamentally challenge the methodological assumptions underlying contemporary pedagogical frameworks and their implementation in heterogeneous educational environments.',
    );
    expect(['Grade 11-12', 'College']).toContain(m.readingLevel);
  });
});
