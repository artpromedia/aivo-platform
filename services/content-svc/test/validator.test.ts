import { describe, it, expect } from 'vitest';
import {
  validateContent,
  isContentSafe,
  formatValidationErrors,
  type ContentJson,
  type ValidateContentInput,
} from '../src/validator.js';

// ══════════════════════════════════════════════════════════════════════════════
// Helpers
// ══════════════════════════════════════════════════════════════════════════════

function input(content: ContentJson, extra: Partial<ValidateContentInput> = {}): ValidateContentInput {
  return { contentJson: content, ...extra };
}

// ══════════════════════════════════════════════════════════════════════════════
// Tests
// ══════════════════════════════════════════════════════════════════════════════

describe('validateContent', () => {
  // ── reading_passage ───────────────────────────────────────────────────

  describe('reading_passage', () => {
    it('should pass for valid reading passage', () => {
      const r = validateContent(input({
        type: 'reading_passage',
        passageText: 'A'.repeat(60),
        questions: [
          { id: 'q1', prompt: 'What happens?', answerChoices: ['A', 'B'], correctIndex: 0 },
        ],
      }));
      expect(r.valid).toBe(true);
      expect(r.errors).toHaveLength(0);
    });

    it('should fail when passage text is too short', () => {
      const r = validateContent(input({
        type: 'reading_passage',
        passageText: 'Short',
        questions: [{ id: 'q1', prompt: 'Q', answerChoices: ['A', 'B'], correctIndex: 0 }],
      }));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.code === 'SCHEMA_VALIDATION')).toBe(true);
    });

    it('should fail when questions are empty', () => {
      const r = validateContent(input({
        type: 'reading_passage',
        passageText: 'A'.repeat(60),
        questions: [],
      }));
      expect(r.valid).toBe(false);
    });
  });

  // ── math_problem ──────────────────────────────────────────────────────

  describe('math_problem', () => {
    it('should pass for valid math problem', () => {
      const r = validateContent(input({
        type: 'math_problem',
        problemStatement: 'Solve x^2 + 2x + 1 = 0',
        solution: 'x = -1',
      }));
      expect(r.valid).toBe(true);
    });

    it('should fail when problemStatement is missing', () => {
      const r = validateContent(input({
        type: 'math_problem',
      }));
      expect(r.valid).toBe(false);
    });
  });

  // ── quiz ──────────────────────────────────────────────────────────────

  describe('quiz', () => {
    it('should pass for valid quiz', () => {
      const r = validateContent(input({
        type: 'quiz',
        questions: [
          { id: 'q1', prompt: 'Pick one', answerChoices: ['A', 'B'], correctIndex: 1 },
        ],
      }));
      expect(r.valid).toBe(true);
    });

    it('should fail when correctIndex is out of bounds', () => {
      const r = validateContent(input({
        type: 'quiz',
        questions: [
          { id: 'q1', prompt: 'Pick', answerChoices: ['A', 'B'], correctIndex: 5 },
        ],
      }));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.code === 'INVALID_CORRECT_INDEX')).toBe(true);
    });

    it('should fail for empty answer choices', () => {
      const r = validateContent(input({
        type: 'quiz',
        questions: [
          { id: 'q1', prompt: 'Pick', answerChoices: ['A', ''], correctIndex: 0 },
        ],
      }));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.code === 'EMPTY_ANSWER_CHOICE')).toBe(true);
    });
  });

  // ── Safety validation ────────────────────────────────────────────────

  describe('safety', () => {
    it('should flag violence', () => {
      const r = validateContent(input({ type: 'generic', body: { text: 'kill everyone' } }));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.code === 'SAFETY_VIOLENCE')).toBe(true);
    });

    it('should flag explicit content', () => {
      const r = validateContent(input({ type: 'generic', body: { text: 'nude photos here' } }));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.code === 'SAFETY_EXPLICIT')).toBe(true);
    });

    it('should flag substance references', () => {
      const r = validateContent(input({ type: 'generic', body: { text: 'cocaine usage' } }));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.code === 'SAFETY_SUBSTANCES')).toBe(true);
    });

    it('should flag PII collection', () => {
      const r = validateContent(input({ type: 'generic', body: { text: 'enter your social security number' } }));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.code === 'SAFETY_PII')).toBe(true);
    });

    it('should flag hate speech', () => {
      const r = validateContent(input({ type: 'generic', body: { text: 'racist remarks' } }));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.code === 'SAFETY_HATE')).toBe(true);
    });

    it('should flag medical content', () => {
      const r = validateContent(input({ type: 'generic', body: { text: 'the doctor will prescribe medication' } }));
      expect(r.valid).toBe(false);
      expect(r.errors.some(e => e.code === 'SAFETY_MEDICAL')).toBe(true);
    });
  });

  // ── Warning patterns ─────────────────────────────────────────────────

  describe('warnings', () => {
    it('should warn about scary content', () => {
      const r = validateContent(input({ type: 'generic', body: { text: 'a scary nightmare' } }));
      expect(r.warnings.some(w => w.code === 'WARNING_AGE-APPROPRIATENESS')).toBe(true);
    });

    it('should warn about death references', () => {
      const r = validateContent(input({ type: 'generic', body: { text: 'after death comes peace' } }));
      expect(r.warnings.some(w => w.code === 'WARNING_SENSITIVE-TOPIC')).toBe(true);
    });

    it('should warn about family situations', () => {
      const r = validateContent(input({ type: 'generic', body: { text: 'about divorce' } }));
      expect(r.warnings.some(w => w.code === 'WARNING_FAMILY-SITUATION')).toBe(true);
    });
  });

  // ── Accessibility ────────────────────────────────────────────────────

  describe('accessibility', () => {
    it('should warn when accessibility metadata is missing', () => {
      const r = validateContent(input(
        { type: 'generic', body: { text: 'ok' } },
        { accessibilityJson: null }
      ));
      expect(r.warnings.some(w => w.code === 'MISSING_ACCESSIBILITY')).toBe(true);
    });

    it('should recommend audio for reading content without audio support', () => {
      const r = validateContent(input(
        { type: 'generic', body: { text: 'ok' } },
        { accessibilityJson: { requiresReading: true, hasAudioSupport: false, cognitiveLoad: 'LOW' } }
      ));
      expect(r.warnings.some(w => w.code === 'RECOMMEND_AUDIO')).toBe(true);
    });
  });

  // ── Unknown content type ─────────────────────────────────────────────

  it('should warn for unknown content type', () => {
    const r = validateContent(input({ type: 'custom_interactive' }));
    expect(r.warnings.some(w => w.code === 'UNKNOWN_CONTENT_TYPE')).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════════════════════

describe('isContentSafe', () => {
  it('should return true for safe content', () => {
    expect(isContentSafe({ type: 'generic', body: { text: 'hello world' } })).toBe(true);
  });

  it('should return false for unsafe content', () => {
    expect(isContentSafe({ type: 'generic', body: { text: 'buy cocaine' } })).toBe(false);
  });
});

// ══════════════════════════════════════════════════════════════════════════════

describe('formatValidationErrors', () => {
  it('should format errors and warnings', () => {
    const output = formatValidationErrors({
      valid: false,
      errors: [{ field: 'x', code: 'E1', message: 'bad', severity: 'error' }],
      warnings: [{ field: 'y', code: 'W1', message: 'meh', severity: 'warning' }],
    });

    expect(output).toContain('Errors:');
    expect(output).toContain('[E1]');
    expect(output).toContain('Warnings:');
    expect(output).toContain('[W1]');
  });

  it('should return empty string for clean result', () => {
    const output = formatValidationErrors({ valid: true, errors: [], warnings: [] });
    expect(output).toBe('');
  });
});
