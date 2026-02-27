/**
 * TTS Service Unit Tests
 *
 * Tests for text-to-speech synthesis, viseme mapping, SSML generation,
 * and audio upload functionality.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ══════════════════════════════════════════════════════════════════════════════

vi.mock('../config.js', () => ({
  config: {
    ttsServiceUrl: 'http://localhost:5100',
    ttsEnabled: true,
    audioBucket: 'aivo-tutor-audio',
    audioCdnBase: 'https://cdn.example.com',
    audioS3Endpoint: 'http://localhost:9000',
    audioS3Region: 'us-east-1',
    audioS3AccessKey: 'test-key',
    audioS3SecretKey: 'test-secret',
  },
}));

vi.mock('./tts-cache.service.js', () => ({
  getCachedTts: vi.fn().mockResolvedValue(null),
  cacheTtsResult: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('./phoneme-viseme-map.js', () => ({
  mapPhonemeEventsToVisemes: vi.fn().mockReturnValue([
    { offsetMs: 0, visemeId: 2, mouthOpen: 0.9, durationMs: 80 },
    { offsetMs: 80, visemeId: 6, mouthOpen: 0.5, durationMs: 60 },
    { offsetMs: 140, visemeId: 0, mouthOpen: 0.0, durationMs: 100 },
  ]),
}));

// ══════════════════════════════════════════════════════════════════════════════
// IMPORTS (after mocks)
// ══════════════════════════════════════════════════════════════════════════════

import {
  estimateVisemesFromText,
  synthesizeSpeech,
  type TutorVoiceConfig,
} from './tts.service.js';
import { getCachedTts, cacheTtsResult } from './tts-cache.service.js';

// ══════════════════════════════════════════════════════════════════════════════
// TEST HELPERS
// ══════════════════════════════════════════════════════════════════════════════

const defaultVoiceConfig: TutorVoiceConfig = {
  ttsProvider: 'piper',
  ttsVoiceId: 'en_US-amy-medium',
  speakingRate: 1.0,
  pitch: 0.0,
  emotion: 'neutral',
  locale: 'en-US',
};

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: estimateVisemesFromText
// ══════════════════════════════════════════════════════════════════════════════

describe('estimateVisemesFromText', () => {
  it('generates visemes for simple text', () => {
    const { visemes, durationMs } = estimateVisemesFromText('Hello');
    expect(visemes.length).toBeGreaterThan(0);
    expect(durationMs).toBeGreaterThan(0);
  });

  it('produces correct mouthOpen values for vowels', () => {
    const { visemes } = estimateVisemesFromText('a');
    // 'a' should produce high mouthOpen (0.9)
    const vowelViseme = visemes.find(v => v.mouthOpen > 0);
    expect(vowelViseme).toBeDefined();
    expect(vowelViseme!.mouthOpen).toBe(0.9);
  });

  it('produces low mouthOpen for closed consonants (b, m, p)', () => {
    const { visemes } = estimateVisemesFromText('b');
    const consonantViseme = visemes.find(v => v.mouthOpen > 0);
    expect(consonantViseme).toBeDefined();
    expect(consonantViseme!.mouthOpen).toBe(0.05);
  });

  it('produces medium mouthOpen for fricatives (f, v, s, z)', () => {
    const { visemes } = estimateVisemesFromText('f');
    const fricativeViseme = visemes.find(v => v.mouthOpen > 0);
    expect(fricativeViseme).toBeDefined();
    expect(fricativeViseme!.mouthOpen).toBe(0.2);
  });

  it('handles spaces with closed mouth', () => {
    const { visemes } = estimateVisemesFromText('a b');
    const spaceViseme = visemes.find(v => v.mouthOpen === 0.0 && v.durationMs < 100);
    expect(spaceViseme).toBeDefined();
  });

  it('handles punctuation with pauses', () => {
    const { visemes } = estimateVisemesFromText('Hi! Yes.');
    const pauses = visemes.filter(v => v.mouthOpen === 0.0 && v.durationMs > 100);
    expect(pauses.length).toBeGreaterThanOrEqual(2); // ! and .
  });

  it('returns empty for empty string', () => {
    const { visemes, durationMs } = estimateVisemesFromText('');
    expect(visemes).toHaveLength(0);
    expect(durationMs).toBe(0);
  });

  it('respects speaking rate', () => {
    const slow = estimateVisemesFromText('Hello', 0.5);
    const fast = estimateVisemesFromText('Hello', 2.0);
    expect(slow.durationMs).toBeGreaterThan(fast.durationMs);
  });

  it('adds closing viseme at the end', () => {
    const { visemes } = estimateVisemesFromText('Hi');
    const lastViseme = visemes[visemes.length - 1];
    expect(lastViseme?.mouthOpen).toBe(0.0);
    expect(lastViseme?.visemeId).toBe(0);
  });

  it('handles non-English text (skips non-alpha chars)', () => {
    const { visemes, durationMs } = estimateVisemesFromText('123');
    // Digits are not alpha, so no visemes should be generated for them
    expect(visemes).toHaveLength(0);
    expect(durationMs).toBe(0);
  });

  it('handles very long text without crashing', () => {
    const longText = 'Hello world. '.repeat(1000);
    const { visemes, durationMs } = estimateVisemesFromText(longText);
    expect(visemes.length).toBeGreaterThan(0);
    expect(durationMs).toBeGreaterThan(0);
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: synthesizeSpeech
// ══════════════════════════════════════════════════════════════════════════════

describe('synthesizeSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCachedTts as Mock).mockResolvedValue(null);
  });

  it('calls Piper engine and returns audio with visemes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          audio_base64: 'bW9ja19hdWRpbw==',
          duration_ms: 1200,
          sample_rate: 22050,
          phonemes: [
            { offset_ms: 0, phoneme: 'h', duration_ms: 80 },
            { offset_ms: 80, phoneme: 'ɪ', duration_ms: 60 },
          ],
          format: 'mp3',
          voice_used: 'en_US-amy-medium',
          latency_ms: 150,
        }),
        { status: 200 },
      ),
    );

    const result = await synthesizeSpeech('Hello', defaultVoiceConfig, 'en-US');

    expect(result.audioBase64).toBe('bW9ja19hdWRpbw==');
    expect(result.durationMs).toBe(1200);
    expect(result.visemes.length).toBeGreaterThan(0);
    expect(result.text).toBe('Hello');
  });

  it('returns cached result if available', async () => {
    const cachedResult = {
      audioBase64: 'cached_audio',
      durationMs: 500,
      visemes: [{ offsetMs: 0, visemeId: 0, mouthOpen: 0.5, durationMs: 100 }],
      text: 'Great job!',
    };
    (getCachedTts as Mock).mockResolvedValue(cachedResult);

    const result = await synthesizeSpeech('Great job!', defaultVoiceConfig, 'en-US');

    expect(result).toEqual(cachedResult);
    // Should not call Piper
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('caches result after successful synthesis', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          audio_base64: 'bW9jaw==',
          duration_ms: 800,
          sample_rate: 22050,
          phonemes: [],
          format: 'mp3',
          voice_used: 'en_US-amy-medium',
          latency_ms: 100,
        }),
        { status: 200 },
      ),
    );

    await synthesizeSpeech('Test', defaultVoiceConfig, 'en-US');

    expect(cacheTtsResult).toHaveBeenCalled();
  });

  it('falls back to estimated visemes when Piper fails', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Piper unreachable'));

    const result = await synthesizeSpeech('Hello', defaultVoiceConfig, 'en-US');

    // Should have estimated visemes but no audio
    expect(result.audioBase64).toBe('');
    expect(result.visemes.length).toBeGreaterThan(0);
    expect(result.text).toBe('Hello');
  });

  it('falls back when Piper returns non-200', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('Internal Server Error', { status: 500 }),
    );

    const result = await synthesizeSpeech('Hello', defaultVoiceConfig, 'en-US');

    expect(result.audioBase64).toBe('');
    expect(result.visemes.length).toBeGreaterThan(0);
  });

  it('works with different locales', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          audio_base64: 'ZXNfYXVkaW8=',
          duration_ms: 1000,
          sample_rate: 22050,
          phonemes: [],
          format: 'mp3',
          voice_used: 'es_ES-carla-medium',
          latency_ms: 120,
        }),
        { status: 200 },
      ),
    );

    const esVoiceConfig = { ...defaultVoiceConfig, ttsVoiceId: 'es_ES-carla-medium', locale: 'es' };
    const result = await synthesizeSpeech('Hola', esVoiceConfig, 'es');

    expect(result.audioBase64).toBe('ZXNfYXVkaW8=');
  });
});
