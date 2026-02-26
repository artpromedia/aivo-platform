/**
 * Emotion Detection & Avatar State Unit Tests
 *
 * Tests for the emotion detection heuristic and avatar state mapping
 * used to drive tutor persona animations.
 */

import { describe, it, expect } from 'vitest';

import { detectEmotion, mapEmotionToAvatarState } from './session.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// EMOTION DETECTION
// ══════════════════════════════════════════════════════════════════════════════

describe('detectEmotion', () => {
  describe('encouraging tone', () => {
    it('detects "great job"', () => {
      expect(detectEmotion('Great job working through that problem!')).toBe('encouraging');
    });

    it('detects "awesome" and "well done"', () => {
      expect(detectEmotion("That's awesome! Well done solving it!")).toBe('encouraging');
    });

    it('detects "you got this"', () => {
      expect(detectEmotion("Keep going, you got this! I'm proud of your effort.")).toBe('encouraging');
    });
  });

  describe('celebrating tone', () => {
    it('detects "congratulations"', () => {
      expect(detectEmotion("Congratulations! You've mastered fractions!")).toBe('celebrating');
    });

    it('detects "nailed it" and "perfect"', () => {
      expect(detectEmotion('You nailed it! Perfect answer! Bravo!')).toBe('celebrating');
    });

    it('detects "correct" and "right answer"', () => {
      expect(detectEmotion("That's the correct answer! Hooray!")).toBe('celebrating');
    });
  });

  describe('empathetic tone', () => {
    it('detects "don\'t worry"', () => {
      expect(detectEmotion("Don't worry, this is a tricky one. Take your time.")).toBe('empathetic');
    });

    it('detects "it\'s okay"', () => {
      expect(detectEmotion("It's okay to make mistakes. That's how we learn!")).toBe('empathetic');
    });

    it('detects "happens to everyone"', () => {
      expect(detectEmotion("That happens to everyone, no rush at all.")).toBe('empathetic');
    });
  });

  describe('curious tone', () => {
    it('detects "what if" and "wonder"', () => {
      expect(detectEmotion("I wonder what if we tried a different approach?")).toBe('curious');
    });

    it('detects "explore" and "discover"', () => {
      expect(detectEmotion("Let's explore this idea and discover the pattern together.")).toBe('curious');
    });
  });

  describe('thinking tone', () => {
    it('detects "hmm" and "step by step"', () => {
      expect(detectEmotion("Hmm, let's work through this step by step.")).toBe('thinking');
    });

    it('detects "let me think"', () => {
      expect(detectEmotion("Let me think about the best way to explain this.")).toBe('thinking');
    });
  });

  describe('cheerful tone', () => {
    it('detects greetings', () => {
      expect(detectEmotion("Hello! Welcome! I'm glad you're here!")).toBe('cheerful');
    });

    it('detects "excited" and "let\'s get started"', () => {
      expect(detectEmotion("I'm excited for today! Let's get started!")).toBe('cheerful');
    });
  });

  describe('edge cases', () => {
    it('returns neutral for plain factual text', () => {
      expect(detectEmotion('The answer is 42. Two plus two equals four.')).toBe('neutral');
    });

    it('returns neutral for empty text', () => {
      expect(detectEmotion('')).toBe('neutral');
    });

    it('returns neutral for very short text', () => {
      expect(detectEmotion('Yes')).toBe('neutral');
    });

    it('is case-insensitive', () => {
      expect(detectEmotion('GREAT JOB! AWESOME!')).toBe('encouraging');
    });

    it('handles very long text', () => {
      const longText = 'This is a step by step explanation. '.repeat(500)
        + "Hmm, let me think about this. Let's figure it out.";
      const result = detectEmotion(longText);
      expect(typeof result).toBe('string');
      expect(result).not.toBe('');
    });

    it('handles non-English text gracefully', () => {
      const result = detectEmotion('这是一个数学问题。让我们一起解决它。');
      expect(typeof result).toBe('string');
    });

    it('picks the emotion with most keyword matches', () => {
      // Multiple keywords for "celebrating" vs single for "encouraging"
      const result = detectEmotion('Congratulations! Hooray! You nailed it! Bravo!');
      expect(result).toBe('celebrating');
    });
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// AVATAR STATE MAPPING
// ══════════════════════════════════════════════════════════════════════════════

describe('mapEmotionToAvatarState', () => {
  it('maps encouraging → talking', () => {
    expect(mapEmotionToAvatarState('encouraging')).toBe('talking');
  });

  it('maps celebrating → celebrating', () => {
    expect(mapEmotionToAvatarState('celebrating')).toBe('celebrating');
  });

  it('maps empathetic → thinking', () => {
    expect(mapEmotionToAvatarState('empathetic')).toBe('thinking');
  });

  it('maps curious → thinking', () => {
    expect(mapEmotionToAvatarState('curious')).toBe('thinking');
  });

  it('maps thinking → thinking', () => {
    expect(mapEmotionToAvatarState('thinking')).toBe('thinking');
  });

  it('maps cheerful → talking', () => {
    expect(mapEmotionToAvatarState('cheerful')).toBe('talking');
  });

  it('maps neutral → idle', () => {
    expect(mapEmotionToAvatarState('neutral')).toBe('idle');
  });

  it('maps unknown emotions → idle (fallback)', () => {
    expect(mapEmotionToAvatarState('angry')).toBe('idle');
    expect(mapEmotionToAvatarState('')).toBe('idle');
    expect(mapEmotionToAvatarState('nonexistent')).toBe('idle');
  });
});
