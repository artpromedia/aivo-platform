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
// Piper TTS engine types (response from /synthesize)
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
// Piper TTS synthesis (internal HTTP call)
// =============================================================================

/**
 * Synthesize speech using the self-hosted Piper TTS engine.
 *
 * Calls the internal tts-engine service and maps IPA phonemes
 * to viseme events for avatar lip-sync.
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
 * 1. If TTS is enabled and the Piper engine is reachable → full synthesis
 *    with IPA phoneme-based viseme events.
 * 2. Otherwise → text-based estimated visemes (no audio generated;
 *    the client drives avatar animation from estimates alone).
 */
export async function synthesizeSpeech(
  text: string,
  voiceConfig: TutorVoiceConfig,
  locale: string,
): Promise<TtsSpeechResult> {
  if (config.ttsEnabled && config.ttsServiceUrl) {
    // Check Redis cache first (short common phrases)
    const cached = await getCachedTts(
      text,
      voiceConfig.ttsVoiceId,
      locale,
      voiceConfig.speakingRate,
    );
    if (cached) return cached;

    try {
      const result = await synthesizeWithPiper(text, voiceConfig, locale);

      // Cache the result for future requests (fire-and-forget)
      cacheTtsResult(
        text,
        voiceConfig.ttsVoiceId,
        locale,
        voiceConfig.speakingRate,
        result,
      ).catch(() => {});

      return result;
    } catch (error) {
      console.warn('Piper TTS failed, falling back to estimated visemes:', error);
    }
  }

  // Fallback — estimated visemes from text (no audio)
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
