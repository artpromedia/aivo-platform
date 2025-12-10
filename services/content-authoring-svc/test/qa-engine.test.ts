/**
 * QA Engine Tests
 *
 * Unit tests for the QA check functions.
 */

import { describe, it, expect } from 'vitest';
import { qaChecks } from '../src/qa-engine.js';

const {
  checkAccessibility,
  checkMetadataCompleteness,
  checkPolicyLanguage,
  checkContentStructure,
  checkSkillAlignment,
} = qaChecks;

// ══════════════════════════════════════════════════════════════════════════════
// ACCESSIBILITY CHECKS
// ══════════════════════════════════════════════════════════════════════════════

describe('checkAccessibility', () => {
  it('should pass when no media and no accessibility issues', () => {
    const result = checkAccessibility(
      { type: 'reading_passage', passage: 'Test passage' },
      {},
      'G3_5'
    );
    expect(result.status).toBe('PASSED');
    expect(result.checkType).toBe('ACCESSIBILITY');
  });

  it('should fail when images are missing alt text', () => {
    const result = checkAccessibility(
      {
        type: 'reading_passage',
        images: [{ url: 'image1.png' }, { url: 'image2.png' }],
      },
      {},
      'G3_5'
    );
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('2 media item(s) missing alt text');
  });

  it('should pass when images have inline alt text', () => {
    const result = checkAccessibility(
      {
        type: 'reading_passage',
        images: [{ url: 'image1.png', altText: 'A beautiful sunset' }],
      },
      {},
      'G3_5'
    );
    expect(result.status).toBe('PASSED');
  });

  it('should pass when images have alt text in accessibility JSON', () => {
    const result = checkAccessibility(
      {
        type: 'reading_passage',
        images: [{ url: 'image1.png' }],
      },
      {
        altTexts: { 'image1.png': 'A beautiful sunset' },
      },
      'G3_5'
    );
    expect(result.status).toBe('PASSED');
  });

  it('should warn when reading level is too high for grade band', () => {
    const result = checkAccessibility(
      { type: 'reading_passage' },
      { flesch_kincaid_grade: 10 }, // Grade 10 reading level
      'G3_5' // Grade 3-5
    );
    expect(result.status).toBe('WARNING');
    expect(result.message).toContain('Reading level');
  });

  it('should pass when reading level is appropriate', () => {
    const result = checkAccessibility(
      { type: 'reading_passage' },
      { flesch_kincaid_grade: 4 },
      'G3_5'
    );
    expect(result.status).toBe('PASSED');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// METADATA COMPLETENESS CHECKS
// ══════════════════════════════════════════════════════════════════════════════

describe('checkMetadataCompleteness', () => {
  it('should pass when all required metadata is present', () => {
    const result = checkMetadataCompleteness('ELA', 'G3_5', 2, { estimatedDuration: 15 });
    expect(result.status).toBe('PASSED');
    expect(result.checkType).toBe('METADATA_COMPLETENESS');
  });

  it('should fail when subject is missing', () => {
    const result = checkMetadataCompleteness(null, 'G3_5', 2, { estimatedDuration: 15 });
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('subject');
  });

  it('should fail when grade band is missing', () => {
    const result = checkMetadataCompleteness('ELA', null, 2, { estimatedDuration: 15 });
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('gradeBand');
  });

  it('should fail when no skills are aligned', () => {
    const result = checkMetadataCompleteness('ELA', 'G3_5', 0, { estimatedDuration: 15 });
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('skill');
  });

  it('should warn when estimated duration is missing', () => {
    const result = checkMetadataCompleteness('ELA', 'G3_5', 2, {});
    expect(result.status).toBe('WARNING');
    expect(result.message).toContain('estimatedDuration');
  });

  it('should fail when multiple required fields are missing', () => {
    const result = checkMetadataCompleteness(null, null, 0, {});
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('subject');
    expect(result.message).toContain('gradeBand');
    expect(result.message).toContain('skill');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// POLICY LANGUAGE CHECKS
// ══════════════════════════════════════════════════════════════════════════════

describe('checkPolicyLanguage', () => {
  it('should pass for clean content', () => {
    const result = checkPolicyLanguage({
      type: 'reading_passage',
      passage: 'The cat sat on the mat. It was a sunny day.',
      questions: [{ text: 'What did the cat do?', choices: [{ text: 'Sat' }, { text: 'Ran' }] }],
    });
    expect(result.status).toBe('PASSED');
    expect(result.checkType).toBe('POLICY_LANGUAGE');
  });

  it('should fail for diagnostic language', () => {
    const result = checkPolicyLanguage({
      type: 'reading_passage',
      passage: 'You have ADHD and need special accommodations.',
    });
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Diagnostic language');
  });

  it('should fail for stigmatizing language', () => {
    const result = checkPolicyLanguage({
      type: 'reading_passage',
      passage: 'The student suffers from anxiety.',
    });
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Stigmatizing language');
  });

  it('should fail for derogatory language', () => {
    const result = checkPolicyLanguage({
      type: 'reading_passage',
      passage: 'That was a stupid mistake.',
    });
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Derogatory language');
  });

  it('should fail for advertising language', () => {
    const result = checkPolicyLanguage({
      type: 'reading_passage',
      passage: 'Buy now for a limited time offer!',
    });
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('Advertising language');
  });

  it('should check question text and choices', () => {
    const result = checkPolicyLanguage({
      type: 'math_problem',
      questions: [
        {
          text: 'What is wrong with this stupid problem?',
          choices: [{ text: 'Nothing' }],
        },
      ],
    });
    expect(result.status).toBe('FAILED');
  });

  it('should detect "your ADHD" pattern', () => {
    const result = checkPolicyLanguage({
      type: 'reading_passage',
      passage: 'Because of your ADHD, you may need extra time.',
    });
    expect(result.status).toBe('FAILED');
  });

  it('should allow educational discussion of conditions without diagnosis', () => {
    const result = checkPolicyLanguage({
      type: 'reading_passage',
      passage: 'ADHD is a condition that affects attention. Some students learn differently.',
    });
    // This should pass because it's not diagnosing or stigmatizing
    expect(result.status).toBe('PASSED');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// CONTENT STRUCTURE CHECKS
// ══════════════════════════════════════════════════════════════════════════════

describe('checkContentStructure', () => {
  it('should pass for valid content', () => {
    const result = checkContentStructure({
      type: 'reading_passage',
      passage: 'This is a valid passage with content.',
      questions: [{ text: 'Question 1?', choices: [{ text: 'A' }, { text: 'B' }] }],
    });
    expect(result.status).toBe('PASSED');
    expect(result.checkType).toBe('CONTENT_STRUCTURE');
  });

  it('should fail for empty content', () => {
    const result = checkContentStructure({
      type: 'reading_passage',
    });
    expect(result.status).toBe('FAILED');
    expect(result.message).toContain('empty');
  });

  it('should warn for questions with only one choice', () => {
    const result = checkContentStructure({
      type: 'reading_passage',
      passage: 'Some passage.',
      questions: [{ text: 'Question?', choices: [{ text: 'Only one' }] }],
    });
    expect(result.status).toBe('WARNING');
    expect(result.message).toContain('only 1 choice');
  });

  it('should warn for questions without text', () => {
    const result = checkContentStructure({
      type: 'reading_passage',
      passage: 'Some passage.',
      questions: [{ choices: [{ text: 'A' }, { text: 'B' }] }],
    });
    expect(result.status).toBe('WARNING');
    expect(result.message).toContain('no text');
  });

  it('should pass for math problems with problem text', () => {
    const result = checkContentStructure({
      type: 'math_problem',
      problem: 'What is 2 + 2?',
    });
    expect(result.status).toBe('PASSED');
  });

  it('should pass for content with instructions', () => {
    const result = checkContentStructure({
      type: 'generic',
      instructions: 'Complete the following activity.',
    });
    expect(result.status).toBe('PASSED');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// SKILL ALIGNMENT CHECKS
// ══════════════════════════════════════════════════════════════════════════════

describe('checkSkillAlignment', () => {
  it('should pass when skills have a primary', () => {
    const result = checkSkillAlignment([
      { skillId: 'skill-1', isPrimary: true },
      { skillId: 'skill-2', isPrimary: false },
    ]);
    expect(result.status).toBe('PASSED');
    expect(result.checkType).toBe('SKILL_ALIGNMENT');
    expect(result.message).toContain('2 skill(s) aligned');
  });

  it('should warn when no skills aligned', () => {
    const result = checkSkillAlignment([]);
    expect(result.status).toBe('WARNING');
    expect(result.message).toContain('No skills aligned');
  });

  it('should warn when no primary skill', () => {
    const result = checkSkillAlignment([
      { skillId: 'skill-1', isPrimary: false },
      { skillId: 'skill-2', isPrimary: false },
    ]);
    expect(result.status).toBe('WARNING');
    expect(result.message).toContain('none marked as primary');
  });

  it('should pass with single primary skill', () => {
    const result = checkSkillAlignment([{ skillId: 'skill-1', isPrimary: true }]);
    expect(result.status).toBe('PASSED');
    expect(result.message).toContain('1 skill(s) aligned with 1 primary');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// BANNED PATTERNS COVERAGE
// ══════════════════════════════════════════════════════════════════════════════

describe('Banned Patterns Coverage', () => {
  const bannedPhrases = [
    'You have ADHD',
    "you're diagnosed with autism",
    'your dyslexia',
    'suffers from depression',
    'afflicted with anxiety',
    'victim of mental illness',
    'click here to purchase',
    'limited time offer',
    'buy now',
  ];

  bannedPhrases.forEach((phrase) => {
    it(`should detect banned phrase: "${phrase}"`, () => {
      const result = checkPolicyLanguage({
        passage: `Some text with ${phrase} in the middle.`,
      });
      expect(result.status).toBe('FAILED');
    });
  });

  const safePhrases = [
    'Students with learning differences may benefit from accommodations.',
    'ADHD is one of many neurodevelopmental conditions.',
    'Some people experience anxiety in new situations.',
    'Click here to learn more.',
    'Take your time with this activity.',
  ];

  safePhrases.forEach((phrase) => {
    it(`should allow safe phrase: "${phrase.slice(0, 40)}..."`, () => {
      const result = checkPolicyLanguage({
        passage: phrase,
      });
      expect(result.status).toBe('PASSED');
    });
  });
});
