/**
 * Copy Linting Tests
 *
 * Validates that all user-facing copy strings follow the neurodiversity-aware
 * guidelines documented in docs/explainability/copy_guidelines.md
 *
 * These tests ensure no banned phrases appear in any localization strings.
 */

import { describe, expect, it } from 'vitest';
import {
  parentCopy,
  teacherCopy,
  adminCopy,
  sharedCopy,
  allBannedPhrases,
} from '../src/copy.js';

// ══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Recursively extracts all string values from an object
 */
function extractStrings(obj: unknown, path = ''): Array<{ path: string; value: string }> {
  const results: Array<{ path: string; value: string }> = [];

  if (typeof obj === 'string') {
    results.push({ path, value: obj });
  } else if (typeof obj === 'function') {
    // Test function outputs with sample values
    const testOutput = (obj as (n: number) => string)(5);
    if (typeof testOutput === 'string') {
      results.push({ path: `${path}(5)`, value: testOutput });
    }
  } else if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      results.push(...extractStrings(item, `${path}[${index}]`));
    });
  } else if (obj !== null && typeof obj === 'object') {
    for (const [key, value] of Object.entries(obj)) {
      const newPath = path ? `${path}.${key}` : key;
      results.push(...extractStrings(value, newPath));
    }
  }

  return results;
}

/**
 * Checks if a string contains any banned phrase (case-insensitive)
 */
function findBannedPhrases(text: string): string[] {
  const lowerText = text.toLowerCase();
  return allBannedPhrases.filter((phrase) => lowerText.includes(phrase.toLowerCase()));
}

// ══════════════════════════════════════════════════════════════════════════════
// TESTS
// ══════════════════════════════════════════════════════════════════════════════

describe('Copy Lint: Banned Phrases', () => {
  describe('parentCopy', () => {
    const strings = extractStrings(parentCopy);

    it('should contain no banned phrases', () => {
      const violations: Array<{ path: string; value: string; bannedPhrases: string[] }> = [];

      for (const { path, value } of strings) {
        const found = findBannedPhrases(value);
        if (found.length > 0) {
          violations.push({ path, value, bannedPhrases: found });
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map(
            (v) =>
              `  - parentCopy.${v.path}: contains [${v.bannedPhrases.join(', ')}]\n    "${v.value}"`
          )
          .join('\n');
        expect.fail(`Found banned phrases in parentCopy:\n${details}`);
      }
    });

    it('should have all required keys', () => {
      expect(parentCopy.whyThis).toBeDefined();
      expect(parentCopy.disclaimer).toBeDefined();
      expect(parentCopy.emptyState).toBeDefined();
      expect(parentCopy.error).toBeDefined();
      expect(parentCopy.encouragement).toBeDefined();
    });
  });

  describe('teacherCopy', () => {
    const strings = extractStrings(teacherCopy);

    it('should contain no banned phrases', () => {
      const violations: Array<{ path: string; value: string; bannedPhrases: string[] }> = [];

      for (const { path, value } of strings) {
        const found = findBannedPhrases(value);
        if (found.length > 0) {
          violations.push({ path, value, bannedPhrases: found });
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map(
            (v) =>
              `  - teacherCopy.${v.path}: contains [${v.bannedPhrases.join(', ')}]\n    "${v.value}"`
          )
          .join('\n');
        expect.fail(`Found banned phrases in teacherCopy:\n${details}`);
      }
    });

    it('should have all required keys', () => {
      expect(teacherCopy.whyThis).toBeDefined();
      expect(teacherCopy.disclaimer).toBeDefined();
      expect(teacherCopy.emptyState).toBeDefined();
      expect(teacherCopy.error).toBeDefined();
      expect(teacherCopy.dataQuality).toBeDefined();
    });
  });

  describe('adminCopy', () => {
    const strings = extractStrings(adminCopy);

    it('should contain no banned phrases', () => {
      const violations: Array<{ path: string; value: string; bannedPhrases: string[] }> = [];

      for (const { path, value } of strings) {
        const found = findBannedPhrases(value);
        if (found.length > 0) {
          violations.push({ path, value, bannedPhrases: found });
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map(
            (v) =>
              `  - adminCopy.${v.path}: contains [${v.bannedPhrases.join(', ')}]\n    "${v.value}"`
          )
          .join('\n');
        expect.fail(`Found banned phrases in adminCopy:\n${details}`);
      }
    });

    it('should have all required keys', () => {
      expect(adminCopy.modelCard).toBeDefined();
      expect(adminCopy.audit).toBeDefined();
      expect(adminCopy.compliance).toBeDefined();
      expect(adminCopy.error).toBeDefined();
    });
  });

  describe('sharedCopy', () => {
    const strings = extractStrings(sharedCopy);

    it('should contain no banned phrases', () => {
      const violations: Array<{ path: string; value: string; bannedPhrases: string[] }> = [];

      for (const { path, value } of strings) {
        const found = findBannedPhrases(value);
        if (found.length > 0) {
          violations.push({ path, value, bannedPhrases: found });
        }
      }

      if (violations.length > 0) {
        const details = violations
          .map(
            (v) =>
              `  - sharedCopy.${v.path}: contains [${v.bannedPhrases.join(', ')}]\n    "${v.value}"`
          )
          .join('\n');
        expect.fail(`Found banned phrases in sharedCopy:\n${details}`);
      }
    });

    it('should have all required keys', () => {
      expect(sharedCopy.actionTypes).toBeDefined();
      expect(sharedCopy.difficulty).toBeDefined();
      expect(sharedCopy.time).toBeDefined();
    });
  });
});

describe('Copy Lint: Positive Language Patterns', () => {
  describe('difficulty descriptions should use growth language', () => {
    it('should not use negative framing for decreased difficulty', () => {
      const decreaseDescriptions = [
        sharedCopy.difficulty.decreased,
        sharedCopy.difficulty.descriptions.decrease,
      ];

      for (const desc of decreaseDescriptions) {
        // Should not contain words like "struggle", "fail", "problem"
        const negativeWords = ['struggle', 'fail', 'problem', 'wrong', 'mistake', 'weak'];
        const lowerDesc = desc.toLowerCase();
        const found = negativeWords.filter((word) => lowerDesc.includes(word));

        expect(found).toEqual([]);
      }
    });

    it('should use strength-based language for difficulty changes', () => {
      const decreaseDesc = sharedCopy.difficulty.descriptions.decrease.toLowerCase();
      const strengthWords = ['strengthen', 'build', 'foundation', 'confidence', 'skill'];
      const hasStrengthLanguage = strengthWords.some((word) => decreaseDesc.includes(word));

      expect(hasStrengthLanguage).toBe(true);
    });
  });

  describe('error messages should be reassuring', () => {
    it('parentCopy error messages should not blame the user', () => {
      const errorMessages = Object.values(parentCopy.error);
      const blamingWords = ['your fault', 'you broke', 'you caused', 'user error'];

      for (const message of errorMessages) {
        const lowerMessage = message.toLowerCase();
        const found = blamingWords.filter((word) => lowerMessage.includes(word));
        expect(found).toEqual([]);
      }
    });

    it('error messages should include actionable guidance', () => {
      const allErrors = [
        ...Object.values(parentCopy.error),
        ...Object.values(teacherCopy.error),
        ...Object.values(adminCopy.error),
      ];

      // At least some errors should have action words
      const actionWords = ['try', 'check', 'refresh', 'contact', 'later'];
      const errorsWithActions = allErrors.filter((msg) => {
        const lowerMsg = msg.toLowerCase();
        return actionWords.some((word) => lowerMsg.includes(word));
      });

      // At least half should have actionable guidance
      expect(errorsWithActions.length).toBeGreaterThan(allErrors.length / 2);
    });
  });

  describe('disclaimers should be honest but not scary', () => {
    it('should mention AI limitations', () => {
      const disclaimers = [
        parentCopy.disclaimer.aiLimits,
        parentCopy.disclaimer.notDiagnostic,
        teacherCopy.disclaimer.dataLimits,
      ];

      for (const disclaimer of disclaimers) {
        const lowerDisclaimer = disclaimer.toLowerCase();
        const hasLimitationLanguage =
          lowerDisclaimer.includes('not') ||
          lowerDisclaimer.includes('limit') ||
          lowerDisclaimer.includes('may') ||
          lowerDisclaimer.includes('mistake');

        expect(hasLimitationLanguage).toBe(true);
      }
    });

    it('should not use fear-inducing language in disclaimers', () => {
      const allDisclaimers = [
        ...Object.values(parentCopy.disclaimer),
        ...Object.values(teacherCopy.disclaimer),
        adminCopy.modelCard.disclaimer,
        adminCopy.compliance.disclaimer,
      ];

      const fearWords = ['dangerous', 'harmful', 'risky', 'threat', 'warning', 'beware'];

      for (const disclaimer of allDisclaimers) {
        const lowerDisclaimer = disclaimer.toLowerCase();
        const found = fearWords.filter((word) => lowerDisclaimer.includes(word));
        expect(found).toEqual([]);
      }
    });
  });
});

describe('Copy Lint: Partnership Language', () => {
  it('parentCopy should emphasize collaboration', () => {
    const partnershipIndicators = ['you know', 'combined with', 'your', 'together'];
    const hasPartnership = Object.values(parentCopy.disclaimer).some((text) => {
      const lowerText = text.toLowerCase();
      return partnershipIndicators.some((indicator) => lowerText.includes(indicator));
    });

    expect(hasPartnership).toBe(true);
  });

  it('teacherCopy should respect professional judgment', () => {
    const respectIndicators = [
      'professional judgment',
      'your professional',
      'you know',
      'your expertise',
    ];
    const hasRespect = Object.values(teacherCopy.disclaimer).some((text) => {
      const lowerText = text.toLowerCase();
      return respectIndicators.some((indicator) => lowerText.includes(indicator));
    });

    expect(hasRespect).toBe(true);
  });
});
