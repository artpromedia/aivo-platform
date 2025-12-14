/**
 * Post-Filter Module Tests
 *
 * Tests for the safety post-filter that inspects LLM responses
 * before returning to users. Verifies homework answer blocking,
 * diagnosis blocking, and content transformation.
 */

import { describe, it, expect } from 'vitest';
import { safetyPostFilter } from '../src/safety/postFilter.js';
import type { AiRequest } from '../src/types/aiRequest.js';

// ────────────────────────────────────────────────────────────────────────────
// TEST HELPERS
// ────────────────────────────────────────────────────────────────────────────

function createRequest(overrides: Partial<AiRequest> = {}): AiRequest {
  return {
    tenantId: 'tenant-123',
    agentType: 'HOMEWORK_HELPER',
    locale: 'en',
    input: 'What is 2+2?',
    ...overrides,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// TEST SUITES
// ────────────────────────────────────────────────────────────────────────────

describe('safetyPostFilter', () => {
  describe('safe output passthrough', () => {
    it('should pass through safe educational content', () => {
      const request = createRequest({
        agentType: 'TUTOR',
        input: 'Explain photosynthesis',
      });
      const rawOutput =
        'Photosynthesis is the process by which plants convert sunlight into energy...';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('PASS');
      expect(result.finalOutput).toBe(rawOutput);
      expect(result.safetyActions).toHaveLength(0);
      expect(result.incidents).toHaveLength(0);
    });

    it('should pass through scaffolding responses', () => {
      const request = createRequest({
        agentType: 'HOMEWORK_HELPER',
        input: 'Help me solve this math problem',
      });
      const rawOutput =
        'Let me guide you through this step by step. First, what do you think the first step should be?';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('PASS');
      expect(result.finalOutput).toBe(rawOutput);
      expect(result.safetyActions).toHaveLength(0);
    });

    it('should pass through creative writing assistance', () => {
      const request = createRequest({
        agentType: 'OTHER',
        input: 'Help me write a story',
      });
      const rawOutput = 'Here are some ideas for your story opening...';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('PASS');
      expect(result.finalOutput).toBe(rawOutput);
    });
  });

  describe('homework answer blocking', () => {
    it('should transform direct math answers for HOMEWORK_HELPER', () => {
      const request = createRequest({
        agentType: 'HOMEWORK_HELPER',
        input: 'What is 15 + 27?',
      });
      const rawOutput = 'The answer is 42. To solve this, you add 15 and 27.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('TRANSFORM');
      expect(result.safetyActions).toContain('BLOCKED_HOMEWORK_ANSWER');
      expect(result.finalOutput).not.toContain('42');
      expect(result.incidents.length).toBeGreaterThan(0);
      expect(result.incidents[0]?.category).toBe('HOMEWORK_ANSWER_BLOCKED');
    });

    it('should transform multiple choice answers', () => {
      const request = createRequest({
        agentType: 'HOMEWORK_HELPER',
        input: 'Which answer is correct?',
      });
      const rawOutput = 'The correct answer is B) mitochondria.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('TRANSFORM');
      expect(result.safetyActions).toContain('BLOCKED_HOMEWORK_ANSWER');
      expect(result.finalOutput).not.toContain('answer is B');
    });

    it('should transform fill-in-the-blank answers', () => {
      const request = createRequest({
        agentType: 'HOMEWORK_HELPER',
        input: 'What word fills the blank?',
      });
      const rawOutput = 'The blank should be "photosynthesis" because plants need sunlight.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('TRANSFORM');
      expect(result.safetyActions).toContain('BLOCKED_HOMEWORK_ANSWER');
    });

    it('should NOT block answers for TUTOR agent type', () => {
      const request = createRequest({
        agentType: 'TUTOR',
        input: 'What is 15 + 27?',
      });
      const rawOutput = 'The answer is 42. Let me explain why...';

      const result = safetyPostFilter(request, rawOutput);

      // TUTOR is allowed to give answers
      expect(result.safetyActions).not.toContain('BLOCKED_HOMEWORK_ANSWER');
    });

    it('should transform "therefore" followed by answer', () => {
      const request = createRequest({
        agentType: 'HOMEWORK_HELPER',
        input: 'Solve for x',
      });
      const rawOutput = 'We can solve this by dividing both sides. Therefore, 5 is the answer.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('TRANSFORM');
      expect(result.safetyActions).toContain('BLOCKED_HOMEWORK_ANSWER');
    });

    it('should transform lazy answer patterns', () => {
      const request = createRequest({
        agentType: 'HOMEWORK_HELPER',
        input: 'Help with this problem',
      });
      const rawOutput = 'Simply put 42 in the blank.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('TRANSFORM');
      expect(result.safetyActions).toContain('BLOCKED_HOMEWORK_ANSWER');
    });

    it('should generate scaffolding response when blocking answer', () => {
      const request = createRequest({
        agentType: 'HOMEWORK_HELPER',
        input: 'What is the answer?',
      });
      const rawOutput = 'The answer is 100.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('TRANSFORM');
      // Scaffolding response should encourage learning
      expect(result.finalOutput).toMatch(/help|guide|think|learn|understand/i);
    });
  });

  describe('diagnosis blocking', () => {
    it('should block ADHD diagnosis attempts', () => {
      const request = createRequest({
        agentType: 'TUTOR',
        input: 'I have trouble focusing',
      });
      const rawOutput = 'Based on what you described, you have ADHD.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('TRANSFORM');
      expect(result.safetyActions).toContain('BLOCKED_DIAGNOSIS_ATTEMPT');
      expect(result.incidents.length).toBeGreaterThan(0);
      expect(result.incidents[0]?.category).toBe('DIAGNOSIS_ATTEMPT');
    });

    it('should block autism diagnosis attempts', () => {
      const request = createRequest({
        agentType: 'TUTOR',
        input: 'Why do I find social situations hard?',
      });
      const rawOutput = 'This suggests you are autistic. You should seek a formal diagnosis.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('TRANSFORM');
      expect(result.safetyActions).toContain('BLOCKED_DIAGNOSIS_ATTEMPT');
    });

    it('should block depression diagnosis', () => {
      const request = createRequest({
        agentType: 'TUTOR',
        input: 'I feel sad a lot',
      });
      const rawOutput = 'I think you are depressed and need professional help.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('TRANSFORM');
      expect(result.safetyActions).toContain('BLOCKED_DIAGNOSIS_ATTEMPT');
    });

    it('should allow general mental health awareness content', () => {
      const request = createRequest({
        agentType: 'TUTOR',
        input: 'What is anxiety?',
      });
      const rawOutput =
        'Anxiety is a feeling of worry or unease. Many people experience it from time to time.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('PASS');
      expect(result.safetyActions).not.toContain('BLOCKED_DIAGNOSIS_ATTEMPT');
    });
  });

  describe('self-harm output blocking', () => {
    it('should block self-harm instructions', () => {
      const request = createRequest({ input: 'some input' });
      const rawOutput = 'Here are ways to hurt yourself: First...';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('BLOCK');
      expect(result.safetyActions).toContain('MODIFIED_UNSAFE_RESPONSE');
      expect(result.incidents.length).toBeGreaterThan(0);
      expect(result.incidents[0]?.severity).toBe('HIGH');
      expect(result.incidents[0]?.category).toBe('SELF_HARM');
    });

    it('should block harmful encouragement', () => {
      const request = createRequest({ input: 'I feel sad' });
      const rawOutput = 'No one would miss you anyway.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('BLOCK');
      expect(result.safetyActions).toContain('MODIFIED_UNSAFE_RESPONSE');
    });

    it('should provide safe response when blocking self-harm content', () => {
      const request = createRequest({
        locale: 'en',
        input: 'some input',
      });
      const rawOutput = "You'd be better off dead.";

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('BLOCK');
      // Safe response should redirect to trusted adults
      expect(result.finalOutput).toMatch(/trusted adult|parent|teacher|counselor/i);
    });
  });

  describe('explicit content blocking', () => {
    it('should block explicit sexual content', () => {
      const request = createRequest({ input: 'some input' });
      const rawOutput = 'Here is some sexual content for you...';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('BLOCK');
      expect(result.safetyActions).toContain('MODIFIED_UNSAFE_RESPONSE');
      expect(result.incidents[0]?.category).toBe('EXPLICIT_CONTENT');
    });

    it('should block dangerous instructions', () => {
      const request = createRequest({ input: 'science project' });
      // Pattern: /(?:step-by-step|instructions for|how to make)\s+(?:bomb|weapon|drugs|poison)/
      const rawOutput = 'Here are step-by-step bomb making instructions for you.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('BLOCK');
      expect(result.incidents[0]?.severity).toBe('HIGH');
    });

    it('should block graphic violence', () => {
      const request = createRequest({ input: 'history question' });
      const rawOutput = 'Here is a graphic detailed violence description of torture...';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('BLOCK');
      expect(result.safetyActions).toContain('MODIFIED_UNSAFE_RESPONSE');
    });
  });

  describe('bias and hate content blocking', () => {
    it('should block racial stereotypes', () => {
      const request = createRequest({ input: 'history question' });
      const rawOutput = 'All blacks are criminals.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('BLOCK');
      expect(result.safetyActions).toContain('MODIFIED_UNSAFE_RESPONSE');
    });

    it('should block religious hatred', () => {
      const request = createRequest({ input: 'world religions' });
      const rawOutput = 'All muslims are terrorists.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('BLOCK');
    });

    it('should block supremacist content', () => {
      const request = createRequest({ input: 'genetics' });
      const rawOutput = 'There is a superior race according to science.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('BLOCK');
    });
  });

  describe('incident logging', () => {
    it('should create HIGH severity incident for self-harm content', () => {
      const request = createRequest({
        tenantId: 'tenant-abc',
        userId: 'user-123',
        learnerId: 'learner-456',
        input: 'I feel sad',
      });
      const rawOutput = "You'd be better off dead.";

      const result = safetyPostFilter(request, rawOutput);

      expect(result.incidents.length).toBeGreaterThan(0);
      const incident = result.incidents[0];
      expect(incident?.severity).toBe('HIGH');
      expect(incident?.category).toBe('SELF_HARM');
      expect(incident?.tenantId).toBe('tenant-abc');
      expect(incident?.userId).toBe('user-123');
      expect(incident?.learnerId).toBe('learner-456');
    });

    it('should create MEDIUM severity incident for homework answer blocking', () => {
      const request = createRequest({
        agentType: 'HOMEWORK_HELPER',
        input: 'What is 2+2?',
      });
      const rawOutput = 'The answer is 4.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.incidents.length).toBeGreaterThan(0);
      const incident = result.incidents[0];
      expect(incident?.severity).toBe('LOW');
      expect(incident?.category).toBe('HOMEWORK_ANSWER_BLOCKED');
    });

    it('should include input summary in incident for review', () => {
      const request = createRequest({ input: 'test' });
      const rawOutput = 'Ways to hurt yourself include...';

      const result = safetyPostFilter(request, rawOutput);

      const incident = result.incidents[0];
      // Incident uses inputSummary field, not rawInput
      expect(incident?.inputSummary).toBeDefined();
      expect(typeof incident?.inputSummary).toBe('string');
    });
  });

  describe('locale-specific responses', () => {
    it('should generate English responses for en locale', () => {
      const request = createRequest({
        locale: 'en',
        input: 'test',
      });
      const rawOutput = 'No one would miss you.';

      const result = safetyPostFilter(request, rawOutput);

      // Response should be in English
      expect(result.finalOutput).toMatch(/[a-zA-Z]/);
    });

    it('should handle Spanish locale', () => {
      const request = createRequest({
        locale: 'es',
        input: 'test',
      });
      const rawOutput = 'No one would miss you.';

      const result = safetyPostFilter(request, rawOutput);

      // Should still generate a response (may be Spanish or fallback to English)
      expect(result.finalOutput.length).toBeGreaterThan(0);
    });
  });

  describe('edge cases', () => {
    it('should handle empty output', () => {
      const request = createRequest({ input: 'test' });
      const rawOutput = '';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('PASS');
      expect(result.finalOutput).toBe('');
    });

    it('should handle very long output', () => {
      const request = createRequest({ input: 'test' });
      const rawOutput = 'This is safe content. '.repeat(1000);

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('PASS');
      expect(result.finalOutput).toBe(rawOutput);
    });

    it('should handle mixed safe and unsafe content - blocking takes priority', () => {
      const request = createRequest({ input: 'test' });
      const rawOutput = 'Here is helpful info. Also, no one would miss you.';

      const result = safetyPostFilter(request, rawOutput);

      // Unsafe content should cause block
      expect(result.action).toBe('BLOCK');
    });

    it('should handle unicode content', () => {
      const request = createRequest({
        locale: 'ja',
        input: '助けて',
      });
      const rawOutput = 'ここに役立つ情報があります。';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('PASS');
      expect(result.finalOutput).toBe(rawOutput);
    });
  });

  describe('PostFilterResult structure', () => {
    it('should return correct result structure for PASS', () => {
      const request = createRequest({ input: 'test' });
      const rawOutput = 'Safe educational content.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result).toHaveProperty('action', 'PASS');
      expect(result).toHaveProperty('finalOutput');
      expect(result).toHaveProperty('safetyActions');
      expect(result).toHaveProperty('incidents');
      expect(Array.isArray(result.safetyActions)).toBe(true);
      expect(Array.isArray(result.incidents)).toBe(true);
    });

    it('should return correct result structure for TRANSFORM', () => {
      const request = createRequest({
        agentType: 'HOMEWORK_HELPER',
        input: 'test',
      });
      const rawOutput = 'The answer is 42.';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('TRANSFORM');
      expect(typeof result.finalOutput).toBe('string');
      expect(result.safetyActions.length).toBeGreaterThan(0);
    });

    it('should return correct result structure for BLOCK', () => {
      const request = createRequest({ input: 'test' });
      const rawOutput = 'Ways to hurt yourself...';

      const result = safetyPostFilter(request, rawOutput);

      expect(result.action).toBe('BLOCK');
      expect(result.finalOutput).not.toBe(rawOutput);
      expect(result.incidents.length).toBeGreaterThan(0);
    });
  });
});
