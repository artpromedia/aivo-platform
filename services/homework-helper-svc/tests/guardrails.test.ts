import { describe, it, expect } from 'vitest';
import {
  containsDirectAnswer,
  checkWarningPatterns,
  applyGuardrails,
  analyzeAndSanitize,
} from '../src/guardrails/directAnswerFilter.js';

describe('directAnswerFilter', () => {
  describe('containsDirectAnswer', () => {
    it('should detect "the answer is" pattern', () => {
      expect(containsDirectAnswer('The answer is 42.')).toBe(true);
      expect(containsDirectAnswer('So the answer is clearly 5.')).toBe(true);
    });

    it('should detect "final answer" pattern', () => {
      expect(containsDirectAnswer('Final answer: 100')).toBe(true);
      expect(containsDirectAnswer('The final answer is x = 5')).toBe(true);
    });

    it('should detect math variable assignments', () => {
      expect(containsDirectAnswer('Therefore, x = 5')).toBe(true);
      expect(containsDirectAnswer('So y = -3.14')).toBe(true);
    });

    it('should NOT detect variable questions', () => {
      // "x = ?" is asking a question, not giving an answer
      expect(containsDirectAnswer('What does x = ?')).toBe(false);
    });

    it('should detect "equals N" at end of sentence', () => {
      expect(containsDirectAnswer('The result equals 42')).toBe(true);
      expect(containsDirectAnswer('This equals 100')).toBe(true);
    });

    it('should detect conclusion phrases', () => {
      expect(containsDirectAnswer('Therefore, the answer is 5.')).toBe(true);
      expect(containsDirectAnswer('So the result is 10.')).toBe(true);
      expect(containsDirectAnswer('This gives 25.')).toBe(true);
    });

    it('should detect science-specific patterns', () => {
      expect(containsDirectAnswer('The formula gives us 9.8 m/s².')).toBe(true);
      expect(containsDirectAnswer('Substituting the values, we get 42.')).toBe(true);
    });

    it('should detect ELA-specific patterns', () => {
      expect(containsDirectAnswer('The main idea is that friendship matters.')).toBe(true);
      expect(containsDirectAnswer('The author means that war is bad.')).toBe(true);
    });

    it('should NOT flag safe scaffolding text', () => {
      expect(containsDirectAnswer('What do you think the first step should be?')).toBe(false);
      expect(containsDirectAnswer("Let's think about this together.")).toBe(false);
      expect(containsDirectAnswer('What operation would help us here?')).toBe(false);
      expect(containsDirectAnswer('Can you identify the key information?')).toBe(false);
    });
  });

  describe('checkWarningPatterns', () => {
    it('should detect warning patterns', () => {
      expect(checkWarningPatterns('Let me show you how to do this')).toHaveLength(1);
      expect(checkWarningPatterns("Here's how to solve it")).toHaveLength(1);
      expect(checkWarningPatterns('The trick is to multiply first')).toHaveLength(1);
      expect(checkWarningPatterns('Just multiply 5 by 3')).toHaveLength(1);
    });

    it('should return empty for safe text', () => {
      expect(checkWarningPatterns('What approach would you try first?')).toHaveLength(0);
    });

    it('should return multiple warnings if present', () => {
      const text = 'Let me show you the trick - just multiply.';
      const warnings = checkWarningPatterns(text);
      expect(warnings.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('applyGuardrails', () => {
    it('should replace sentences containing direct answers', () => {
      const input = 'Think about it. The answer is 42. What do you think?';
      const output = applyGuardrails(input);

      expect(output).not.toContain('The answer is 42');
      expect(output).toContain('Think about it');
      expect(output).toContain('What do you think?');
    });

    it('should use math-specific replacement for MATH subject', () => {
      const input = 'The answer is 5.';
      const output = applyGuardrails(input, 'MATH');

      expect(output).toContain('operation');
    });

    it('should use ELA-specific replacement for ELA subject', () => {
      const input = 'The main idea is that courage matters.';
      const output = applyGuardrails(input, 'ELA');

      expect(output).toContain('clues in the text');
    });

    it('should use science-specific replacement for SCIENCE subject', () => {
      const input = 'The formula gives us 9.8.';
      const output = applyGuardrails(input, 'SCIENCE');

      expect(output).toContain('scientific concept');
    });

    it('should return original text if no issues found', () => {
      const input = 'What do you think the first step should be?';
      const output = applyGuardrails(input);

      expect(output).toBe(input);
    });

    it('should handle multiple problematic sentences', () => {
      const input = 'First, x = 5. Then y = 10. What else do you notice?';
      const output = applyGuardrails(input);

      expect(output).not.toContain('x = 5');
      expect(output).not.toContain('y = 10');
    });
  });

  describe('analyzeAndSanitize', () => {
    it('should return complete analysis result', () => {
      const input = 'The answer is 42.';
      const result = analyzeAndSanitize(input, 'MATH');

      expect(result.directAnswersRemoved).toBe(true);
      expect(result.wasModified).toBe(true);
      expect(result.sanitizedText).not.toContain('42');
    });

    it('should report warnings without modifying', () => {
      const input = 'Let me show you how to think about this.';
      const result = analyzeAndSanitize(input);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.directAnswersRemoved).toBe(false);
      expect(result.wasModified).toBe(false);
      expect(result.sanitizedText).toBe(input);
    });

    it('should report no issues for safe text', () => {
      const input = 'What approach would you try first?';
      const result = analyzeAndSanitize(input);

      expect(result.directAnswersRemoved).toBe(false);
      expect(result.wasModified).toBe(false);
      expect(result.warnings).toHaveLength(0);
      expect(result.sanitizedText).toBe(input);
    });
  });
});
