/**
 * TTS Service Unit Tests
 *
 * Tests for text-to-speech synthesis, viseme mapping, emotion mapping,
 * and multi-provider TTS via accessibility-ai-svc with Piper fallback.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';

// ══════════════════════════════════════════════════════════════════════════════
// MOCKS
// ══════════════════════════════════════════════════════════════════════════════

vi.mock('../config.js', () => ({
  config: {
    accessibilityAiSvcUrl: 'http://localhost:8080',
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
  mapTutorEmotionToTts,
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
// TESTS: mapTutorEmotionToTts
// ══════════════════════════════════════════════════════════════════════════════

describe('mapTutorEmotionToTts', () => {
  it('maps encouraging → encouraging', () => {
    expect(mapTutorEmotionToTts('encouraging')).toBe('encouraging');
  });

  it('maps celebrating → excited', () => {
    expect(mapTutorEmotionToTts('celebrating')).toBe('excited');
  });

  it('maps empathetic → empathetic', () => {
    expect(mapTutorEmotionToTts('empathetic')).toBe('empathetic');
  });

  it('maps curious → neutral', () => {
    expect(mapTutorEmotionToTts('curious')).toBe('neutral');
  });

  it('maps thinking → calm', () => {
    expect(mapTutorEmotionToTts('thinking')).toBe('calm');
  });

  it('maps cheerful → excited', () => {
    expect(mapTutorEmotionToTts('cheerful')).toBe('excited');
  });

  it('maps neutral → neutral', () => {
    expect(mapTutorEmotionToTts('neutral')).toBe('neutral');
  });

  it('maps unknown emotions → neutral', () => {
    expect(mapTutorEmotionToTts('angry')).toBe('neutral');
    expect(mapTutorEmotionToTts('')).toBe('neutral');
  });
});

// ══════════════════════════════════════════════════════════════════════════════
// TESTS: synthesizeSpeech
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Helper: create a mock Response mimicking accessibility-ai-svc /api/v2/tts/synthesize.
 * Returns raw audio bytes with metadata in headers.
 */
function mockMultiProviderResponse(
  audioContent: string = 'mock_audio_bytes',
  provider: string = 'dia_local',
  duration: number = 1.2,
): Response {
  const body = new TextEncoder().encode(audioContent);
  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'audio/wav',
      'X-Duration': String(duration),
      'X-Sample-Rate': '22050',
      'X-Voice-ID': 'en_US-amy-medium',
      'X-Provider': provider,
      'X-Text-Length': '5',
    },
  });
}

describe('synthesizeSpeech', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (getCachedTts as Mock).mockResolvedValue(null);
  });

  it('calls multi-provider TTS and returns audio with scaled visemes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockMultiProviderResponse('mock_wav_audio', 'kokoro_local', 1.5),
    );

    const result = await synthesizeSpeech('Hello', defaultVoiceConfig, 'en-US');

    expect(result.audioBase64).toBeTruthy();
    expect(result.durationMs).toBe(1500);
    expect(result.visemes.length).toBeGreaterThan(0);
    expect(result.text).toBe('Hello');
    expect(result.provider).toBe('kokoro_local');

    // Should have called accessibility-ai-svc, not Piper
    expect(globalThis.fetch).toHaveBeenCalledWith(
      'http://localhost:8080/api/v2/tts/synthesize',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('passes emotion through to multi-provider call', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockMultiProviderResponse('audio', 'dia_local'),
    );

    await synthesizeSpeech('Great job!', defaultVoiceConfig, 'en-US', 'celebrating');

    const fetchCall = (globalThis.fetch as Mock).mock.calls[0];
    // Emotion is mapped but request body should still be valid
    expect(fetchCall[0]).toBe('http://localhost:8080/api/v2/tts/synthesize');
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
    // Should not call any TTS provider
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('caches result after successful multi-provider synthesis', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockMultiProviderResponse('audio_data', 'dia_local', 0.8),
    );

    await synthesizeSpeech('Test', defaultVoiceConfig, 'en-US');

    expect(cacheTtsResult).toHaveBeenCalled();
  });

  it('falls back to Piper when multi-provider fails', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    // First call (multi-provider) fails
    fetchMock.mockRejectedValueOnce(new Error('accessibility-ai-svc unreachable'));

    // Second call (Piper) succeeds
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          audio_base64: 'cGlwZXJfYXVkaW8=',
          duration_ms: 1000,
          sample_rate: 22050,
          phonemes: [
            { offset_ms: 0, phoneme: 'h', duration_ms: 80 },
          ],
          format: 'mp3',
          voice_used: 'en_US-amy-medium',
          latency_ms: 100,
        }),
        { status: 200 },
      ),
    );

    const result = await synthesizeSpeech('Hello', defaultVoiceConfig, 'en-US');

    expect(result.audioBase64).toBe('cGlwZXJfYXVkaW8=');
    expect(result.durationMs).toBe(1000);
    expect(result.provider).toBe('piper');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to estimated visemes when both providers fail', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('All TTS unreachable'));

    const result = await synthesizeSpeech('Hello', defaultVoiceConfig, 'en-US');

    // Should have estimated visemes but no audio
    expect(result.audioBase64).toBe('');
    expect(result.visemes.length).toBeGreaterThan(0);
    expect(result.text).toBe('Hello');
  });

  it('falls back when multi-provider returns non-200', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    // Multi-provider returns 500
    fetchMock.mockResolvedValueOnce(
      new Response('Internal Server Error', { status: 500 }),
    );

    // Piper also returns 500
    fetchMock.mockResolvedValueOnce(
      new Response('Piper Error', { status: 500 }),
    );

    const result = await synthesizeSpeech('Hello', defaultVoiceConfig, 'en-US');

    expect(result.audioBase64).toBe('');
    expect(result.visemes.length).toBeGreaterThan(0);
  });

  it('works with different locales', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockMultiProviderResponse('es_audio', 'kokoro_local', 1.0),
    );

    const esVoiceConfig = { ...defaultVoiceConfig, ttsVoiceId: 'es_ES-carla-medium', locale: 'es' };
    const result = await synthesizeSpeech('Hola', esVoiceConfig, 'es');

    expect(result.audioBase64).toBeTruthy();
    expect(result.provider).toBe('kokoro_local');

    // Check that language was extracted from locale
    const fetchCall = (globalThis.fetch as Mock).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.language).toBe('es');
  });

  it('includes emotion in cache key for different emotions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      mockMultiProviderResponse('audio', 'dia_local'),
    );

    await synthesizeSpeech('Hello', defaultVoiceConfig, 'en-US', 'celebrating');

    // Cache key should include emotion mapping
    expect(getCachedTts).toHaveBeenCalledWith(
      'Hello',
      expect.stringContaining('excited'), // celebrating → excited
      'en-US',
      1.0,
    );
  });
});
