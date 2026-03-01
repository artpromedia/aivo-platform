import { config } from '../config.js';
import { mapPhonemeEventsToVisemes } from './phoneme-viseme-map.js';
import { getCachedTts, cacheTtsResult } from './tts-cache.service.js';

// =============================================================================
// Types
// =============================================================================

export interface VisemeEvent {
  /** Time offset from audio start in milliseconds. */
  offsetMs: number;
  /** Viseme ID for reference. */
  visemeId: number;
  /** Mapped mouth-open amount (0.0 – 1.0) for Rive / fallback avatar. */
  mouthOpen: number;
  /** Duration of this viseme in milliseconds. */
  durationMs: number;
}

export interface TtsSpeechResult {
  /** Base64-encoded audio (MP3 or WAV). */
  audioBase64: string;
  /** CDN URL after upload (set by caller after uploading). */
  audioUrl?: string;
  /** Total audio duration in milliseconds. */
  durationMs: number;
  /** Ordered viseme events for lip-sync. */
  visemes: VisemeEvent[];
  /** The original text that was synthesized. */
  text: string;
  /** Provider that generated the audio (e.g. 'dia_local', 'kokoro_local', 'openai_api', 'piper'). */
  provider?: string;
}

export interface TutorVoiceConfig {
  ttsProvider: string;
  ttsVoiceId: string;
  speakingRate: number;
  pitch: number;
  emotion: string;
  locale?: string;
}

// =============================================================================
// Emotion mapping: detectEmotion() output → TTS provider emotion params
// =============================================================================

/**
 * Maps tutor emotion tags (from detectEmotion()) to TTS-friendly emotion
 * descriptors understood by Dia / Kokoro / OpenAI TTS.
 */
const TUTOR_EMOTION_TO_TTS: Record<string, string> = {
  encouraging: 'encouraging',
  celebrating: 'excited',
  empathetic: 'empathetic',
  curious: 'neutral',
  thinking: 'calm',
  cheerful: 'excited',
  neutral: 'neutral',
};

export function mapTutorEmotionToTts(emotion: string): string {
  return TUTOR_EMOTION_TO_TTS[emotion] ?? 'neutral';
}

// =============================================================================
// Accessibility-AI-Svc TTS types (response from /api/v2/tts/synthesize)
// =============================================================================

interface AccessibilityTtsHeaders {
  duration: number;
  sampleRate: number;
  voiceId: string;
  provider: string;
  textLength: number;
}

// =============================================================================
// Piper TTS engine types (legacy fallback — response from /synthesize)
// =============================================================================

interface PiperPhonemeEvent {
  offset_ms: number;
  phoneme: string;
  duration_ms: number;
}

interface PiperSynthesizeResponse {
  audio_base64: string;
  duration_ms: number;
  sample_rate: number;
  phonemes: PiperPhonemeEvent[];
  format: string;
  voice_used: string;
  latency_ms: number;
}

// =============================================================================
// Multi-provider TTS synthesis (via accessibility-ai-svc)
// =============================================================================

/**
 * Synthesize speech via the accessibility-ai-svc MultiProviderTTS.
 *
 * Calls /api/v2/tts/synthesize which supports automatic failover
 * across Dia, Kokoro, OpenAI, Google, Azure, ElevenLabs, Amazon Polly.
 *
 * The v2 endpoint returns raw WAV audio with metadata in headers.
 */
async function synthesizeWithMultiProvider(
  text: string,
  voiceConfig: TutorVoiceConfig,
  locale: string,
  emotion: string = 'neutral',
): Promise<TtsSpeechResult> {
  const baseUrl = config.accessibilityAiSvcUrl;

  const response = await fetch(`${baseUrl}/api/v2/tts/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice: voiceConfig.ttsVoiceId,
      speed: voiceConfig.speakingRate,
      language: locale.split('-')[0] || 'en',
    }),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'unknown');
    throw new Error(`accessibility-ai-svc TTS returned ${response.status}: ${body}`);
  }

  // Parse metadata from response headers
  const headers: AccessibilityTtsHeaders = {
    duration: parseFloat(response.headers.get('X-Duration') || '0'),
    sampleRate: parseInt(response.headers.get('X-Sample-Rate') || '22050', 10),
    voiceId: response.headers.get('X-Voice-ID') || voiceConfig.ttsVoiceId,
    provider: response.headers.get('X-Provider') || 'unknown',
    textLength: parseInt(response.headers.get('X-Text-Length') || '0', 10),
  };

  // Read audio bytes and convert to base64
  const audioBuffer = await response.arrayBuffer();
  const audioBase64 = Buffer.from(audioBuffer).toString('base64');

  const durationMs = Math.round(headers.duration * 1000);

  // Multi-provider response is raw audio — no phoneme data
  // Use text-based viseme estimation synced to the actual audio duration
  const { visemes } = estimateVisemesFromText(text, voiceConfig.speakingRate);

  // Scale viseme timeline to match actual audio duration
  const estimatedDuration = visemes.length > 0
    ? visemes[visemes.length - 1]!.offsetMs + visemes[visemes.length - 1]!.durationMs
    : durationMs;

  const scaleFactor = estimatedDuration > 0 ? durationMs / estimatedDuration : 1;
  const scaledVisemes = visemes.map(v => ({
    ...v,
    offsetMs: Math.round(v.offsetMs * scaleFactor),
    durationMs: Math.round(v.durationMs * scaleFactor),
  }));

  return {
    audioBase64,
    durationMs,
    visemes: scaledVisemes,
    text,
    provider: headers.provider,
  };
}

// =============================================================================
// Piper TTS synthesis (legacy fallback — internal HTTP call)
// =============================================================================

/**
 * Synthesize speech using the self-hosted Piper TTS engine.
 *
 * Used as fallback when the accessibility-ai-svc is unreachable.
 * Maps IPA phonemes to viseme events for avatar lip-sync.
 */
async function synthesizeWithPiper(
  text: string,
  voiceConfig: TutorVoiceConfig,
  locale: string,
): Promise<TtsSpeechResult> {
  const ttsUrl = config.ttsServiceUrl;

  const response = await fetch(`${ttsUrl}/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text,
      voice: voiceConfig.ttsVoiceId,
      locale,
      output_format: 'mp3',
      speaking_rate: voiceConfig.speakingRate,
      include_phonemes: true,
    }),
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => 'unknown');
    throw new Error(`Piper TTS returned ${response.status}: ${body}`);
  }

  const data = (await response.json()) as PiperSynthesizeResponse;

  // Map IPA phonemes from Piper to viseme events for the avatar
  const visemes = data.phonemes.length > 0
    ? mapPhonemeEventsToVisemes(data.phonemes)
    : [];

  return {
    audioBase64: data.audio_base64,
    durationMs: data.duration_ms,
    visemes,
    text,
    provider: 'piper',
  };
}

// =============================================================================
// Fallback viseme estimator (text-based, no TTS engine required)
// =============================================================================

const VOWELS = new Set('aeiouAEIOU');
const CLOSED_CONSONANTS = new Set('bmpBMP');
const FRICATIVES = new Set('fvszFVSZ');
const OPEN_CONSONANTS = new Set('hHyY');

/**
 * Estimate viseme events from text without a TTS engine.
 *
 * Uses character-level heuristics for when the Piper engine is
 * unavailable or TTS is disabled. No audio is generated; the client
 * can drive avatar animation from these estimated visemes alone.
 */
export function estimateVisemesFromText(
  text: string,
  speakingRate: number = 1.0,
): { visemes: VisemeEvent[]; durationMs: number } {
  const visemes: VisemeEvent[] = [];
  const msPerChar = Math.round(60 / speakingRate);
  let offsetMs = 0;

  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;

    if (char === ' ' || char === '\n' || char === '\t') {
      visemes.push({
        offsetMs,
        visemeId: 0,
        mouthOpen: 0.0,
        durationMs: Math.round(msPerChar * 0.5),
      });
      offsetMs += Math.round(msPerChar * 0.5);
      continue;
    }

    if (/[.!?]/.test(char)) {
      visemes.push({
        offsetMs,
        visemeId: 0,
        mouthOpen: 0.0,
        durationMs: Math.round(msPerChar * 3),
      });
      offsetMs += Math.round(msPerChar * 3);
      continue;
    }

    if (/[,;:]/.test(char)) {
      visemes.push({
        offsetMs,
        visemeId: 0,
        mouthOpen: 0.0,
        durationMs: Math.round(msPerChar * 1.5),
      });
      offsetMs += Math.round(msPerChar * 1.5);
      continue;
    }

    let mouthOpen: number;
    let visemeId: number;

    if (VOWELS.has(char)) {
      const lower = char.toLowerCase();
      if (lower === 'a') {
        mouthOpen = 0.9;
        visemeId = 2;
      } else if (lower === 'o') {
        mouthOpen = 0.6;
        visemeId = 8;
      } else if (lower === 'e') {
        mouthOpen = 0.5;
        visemeId = 4;
      } else if (lower === 'i') {
        mouthOpen = 0.5;
        visemeId = 6;
      } else {
        mouthOpen = 0.55;
        visemeId = 1;
      }
    } else if (CLOSED_CONSONANTS.has(char)) {
      mouthOpen = 0.05;
      visemeId = 21;
    } else if (FRICATIVES.has(char)) {
      mouthOpen = 0.2;
      visemeId = 15;
    } else if (OPEN_CONSONANTS.has(char)) {
      mouthOpen = 0.4;
      visemeId = 12;
    } else if (/[a-zA-Z]/.test(char)) {
      mouthOpen = 0.35;
      visemeId = 19;
    } else {
      continue;
    }

    visemes.push({ offsetMs, visemeId, mouthOpen, durationMs: msPerChar });
    offsetMs += msPerChar;
  }

  if (visemes.length > 0) {
    visemes.push({
      offsetMs,
      visemeId: 0,
      mouthOpen: 0.0,
      durationMs: 100,
    });
    offsetMs += 100;
  }

  return { visemes, durationMs: offsetMs };
}

// =============================================================================
// Audio upload (S3 / MinIO)
// =============================================================================

type S3ClientModule = typeof import('@aws-sdk/client-s3');

let s3Module: S3ClientModule | null = null;

async function loadS3(): Promise<S3ClientModule> {
  if (!s3Module) {
    s3Module = await import('@aws-sdk/client-s3');
  }
  return s3Module;
}

/**
 * Upload base64 audio to S3/MinIO and return the public CDN URL.
 */
export async function uploadAudio(
  audioBase64: string,
  sessionId: string,
  messageId: string,
): Promise<string | undefined> {
  if (!config.audioBucket || !config.audioCdnBase) {
    return undefined;
  }

  try {
    const { S3Client, PutObjectCommand } = await loadS3();

    const client = new S3Client({
      region: config.audioS3Region,
      ...(config.audioS3Endpoint
        ? {
            endpoint: config.audioS3Endpoint,
            forcePathStyle: true,
          }
        : {}),
      ...(config.audioS3AccessKey && config.audioS3SecretKey
        ? {
            credentials: {
              accessKeyId: config.audioS3AccessKey,
              secretAccessKey: config.audioS3SecretKey,
            },
          }
        : {}),
    });

    const key = `tutor-audio/${sessionId}/${messageId}.mp3`;
    const body = Buffer.from(audioBase64, 'base64');

    await client.send(
      new PutObjectCommand({
        Bucket: config.audioBucket,
        Key: key,
        Body: body,
        ContentType: 'audio/mpeg',
        CacheControl: 'public, max-age=86400',
      }),
    );

    return `${config.audioCdnBase}/${key}`;
  } catch (error) {
    console.warn('Failed to upload audio to S3:', error);
    return undefined;
  }
}

// =============================================================================
// Public API
// =============================================================================

/**
 * Synthesize speech for tutor response text.
 *
 * Strategy:
 * 1. Try multi-provider TTS via accessibility-ai-svc (Dia, Kokoro, OpenAI, etc.)
 * 2. Fallback to legacy Piper TTS engine if accessibility-ai-svc is unreachable
 * 3. Final fallback → text-based estimated visemes (no audio generated;
 *    the client drives avatar animation from estimates alone).
 */
export async function synthesizeSpeech(
  text: string,
  voiceConfig: TutorVoiceConfig,
  locale: string,
  emotion: string = 'neutral',
): Promise<TtsSpeechResult> {
  if (!config.ttsEnabled) {
    // TTS disabled — estimated visemes only (no audio)
    const { visemes, durationMs } = estimateVisemesFromText(
      text,
      voiceConfig.speakingRate,
    );
    return { audioBase64: '', durationMs, visemes, text };
  }

  // Check Redis cache first (short common phrases)
  const ttsEmotion = mapTutorEmotionToTts(emotion);
  const cacheKey = `${voiceConfig.ttsVoiceId}:${ttsEmotion}`;
  const cached = await getCachedTts(
    text,
    cacheKey,
    locale,
    voiceConfig.speakingRate,
  );
  if (cached) return cached;

  // ── Try multi-provider TTS (accessibility-ai-svc) ───────────
  if (config.accessibilityAiSvcUrl) {
    try {
      const result = await synthesizeWithMultiProvider(
        text,
        voiceConfig,
        locale,
        ttsEmotion,
      );

      // Cache the result for future requests (fire-and-forget)
      cacheTtsResult(
        text,
        cacheKey,
        locale,
        voiceConfig.speakingRate,
        result,
      ).catch(() => {});

      return result;
    } catch (error) {
      console.warn('Multi-provider TTS failed, trying Piper fallback:', error);
    }
  }

  // ── Fallback to legacy Piper TTS ────────────────────────────
  if (config.ttsServiceUrl) {
    try {
      const result = await synthesizeWithPiper(text, voiceConfig, locale);

      // Cache Piper result too
      cacheTtsResult(
        text,
        cacheKey,
        locale,
        voiceConfig.speakingRate,
        result,
      ).catch(() => {});

      return result;
    } catch (error) {
      console.warn('Piper TTS also failed, falling back to estimated visemes:', error);
    }
  }

  // ── Final fallback — estimated visemes from text (no audio) ──
  const { visemes, durationMs } = estimateVisemesFromText(
    text,
    voiceConfig.speakingRate,
  );

  return {
    audioBase64: '',
    durationMs,
    visemes,
    text,
  };
}
