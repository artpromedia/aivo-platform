import * as crypto from 'node:crypto';

import { config } from '../config.js';
import { prisma } from '../prisma.js';

// =============================================================================
// Types
// =============================================================================

export interface VisemeEvent {
  /** Time offset from audio start in milliseconds. */
  offsetMs: number;
  /** Azure viseme ID (0–21). */
  visemeId: number;
  /** Mapped mouth-open amount (0.0 – 1.0) for Rive / fallback avatar. */
  mouthOpen: number;
  /** Duration of this viseme in milliseconds. */
  durationMs: number;
}

export interface TtsSpeechResult {
  /** Base64-encoded MP3 audio. */
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
// Azure viseme-ID → mouthOpen mapping
// =============================================================================

/**
 * Maps Azure viseme IDs (0–21) to a normalized mouth-open value (0.0–1.0).
 *
 * Reference: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-speech-synthesis-viseme
 *
 * Groups:
 *   0        – Silence / rest
 *   1,2      – Bilabial closed (p, b, m)
 *   3,4      – Labiodental (f, v)
 *   5,6      – Dental / alveolar (th, t, d)
 *   7,8      – Alveolar ridge (s, z, n, l)
 *   9,10     – Palatal (sh, ch, j)
 *   11,12    – Velar (k, g, ng)
 *   13,14    – Back vowels (oo, oh)
 *   15,16,17 – Mid vowels (uh, er, aw)
 *   18,19    – Front vowels (ee, ih)
 *   20,21    – Open vowels (ah, aa)
 */
const VISEME_MOUTH_OPEN: Record<number, number> = {
  0: 0.0,   // silence
  1: 0.05,  // p, b, m — lips together
  2: 0.05,  // p, b, m variant
  3: 0.15,  // f, v — lower lip to upper teeth
  4: 0.15,  // f, v variant
  5: 0.2,   // th — tongue between teeth
  6: 0.25,  // t, d — tongue behind teeth
  7: 0.3,   // s, z — narrow opening
  8: 0.3,   // n, l
  9: 0.35,  // sh, ch
  10: 0.35, // j, zh
  11: 0.4,  // k, g — back of mouth
  12: 0.4,  // ng
  13: 0.45, // oo — rounded lips
  14: 0.5,  // oh — more open rounded
  15: 0.55, // uh
  16: 0.6,  // er
  17: 0.65, // aw
  18: 0.5,  // ee — wide narrow
  19: 0.5,  // ih — slightly open wide
  20: 0.85, // ah — open
  21: 0.95, // aa — fully open
};

function visemeToMouthOpen(visemeId: number): number {
  return VISEME_MOUTH_OPEN[visemeId] ?? 0.0;
}

// =============================================================================
// Azure Speech SDK synthesis
// =============================================================================

type SpeechSdkModule = typeof import('microsoft-cognitiveservices-speech-sdk');

let speechSdk: SpeechSdkModule | null = null;

async function loadSpeechSdk(): Promise<SpeechSdkModule> {
  if (!speechSdk) {
    speechSdk = await import('microsoft-cognitiveservices-speech-sdk');
  }
  return speechSdk;
}

/**
 * Build SSML with voice, rate, and pitch configuration.
 */
function buildSsml(
  text: string,
  voiceId: string,
  locale: string,
  rate: number,
  pitch: number,
): string {
  // Rate: 1.0 = default. Azure expects percentage strings like "+10%" or "-5%"
  const ratePercent = Math.round((rate - 1.0) * 100);
  const rateStr = ratePercent >= 0 ? `+${ratePercent}%` : `${ratePercent}%`;

  // Pitch: Azure expects semitones like "+2st" or "-1st"
  const pitchStr = pitch >= 0 ? `+${pitch.toFixed(1)}st` : `${pitch.toFixed(1)}st`;

  // Escape XML special characters in text
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  return `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${locale}">
  <voice name="${voiceId}">
    <prosody rate="${rateStr}" pitch="${pitchStr}">
      ${escaped}
    </prosody>
  </voice>
</speak>`;
}

/**
 * Synthesize speech using Azure Cognitive Services Speech SDK.
 *
 * Returns audio (base64 MP3) and viseme events with mouthOpen mapping.
 */
async function synthesizeWithAzure(
  text: string,
  voiceConfig: TutorVoiceConfig,
  locale: string,
): Promise<TtsSpeechResult> {
  const sdk = await loadSpeechSdk();

  const speechConfig = sdk.SpeechConfig.fromSubscription(
    config.azureSpeechKey,
    config.azureSpeechRegion,
  );

  // Output as MP3 for broad playback compatibility
  speechConfig.speechSynthesisOutputFormat =
    sdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3;

  const synthesizer = new sdk.SpeechSynthesizer(speechConfig);

  const visemes: VisemeEvent[] = [];
  let lastOffsetMs = 0;

  // Collect viseme events as they arrive
  synthesizer.visemeReceived = (_sender, event) => {
    const offsetMs = Math.round(event.audioOffset / 10_000); // 100-ns ticks → ms
    const visemeId = event.visemeId;

    // Set duration on previous viseme
    if (visemes.length > 0) {
      visemes[visemes.length - 1]!.durationMs = offsetMs - lastOffsetMs;
    }

    visemes.push({
      offsetMs,
      visemeId,
      mouthOpen: visemeToMouthOpen(visemeId),
      durationMs: 0, // will be set by next viseme or at end
    });

    lastOffsetMs = offsetMs;
  };

  const ssml = buildSsml(
    text,
    voiceConfig.ttsVoiceId,
    locale,
    voiceConfig.speakingRate,
    voiceConfig.pitch,
  );

  return new Promise<TtsSpeechResult>((resolve, reject) => {
    synthesizer.speakSsmlAsync(
      ssml,
      (result) => {
        synthesizer.close();

        if (
          result.reason === sdk.ResultReason.SynthesizingAudioCompleted &&
          result.audioData
        ) {
          const audioBuffer = Buffer.from(result.audioData);
          const durationMs = Math.round(
            (result.audioDuration ?? 0) / 10_000, // 100-ns ticks → ms
          );

          // Set duration on last viseme
          if (visemes.length > 0) {
            visemes[visemes.length - 1]!.durationMs =
              durationMs - lastOffsetMs;
          }

          resolve({
            audioBase64: audioBuffer.toString('base64'),
            durationMs,
            visemes,
            text,
          });
        } else {
          reject(
            new Error(
              `Azure TTS failed: ${result.errorDetails ?? sdk.ResultReason[result.reason]}`,
            ),
          );
        }
      },
      (error) => {
        synthesizer.close();
        reject(new Error(`Azure TTS error: ${error}`));
      },
    );
  });
}

// =============================================================================
// Fallback viseme estimator (text-based, no SDK required)
// =============================================================================

/**
 * Vowels and consonant groups for simple phoneme estimation.
 */
const VOWELS = new Set('aeiouAEIOU');
const CLOSED_CONSONANTS = new Set('bmpBMP');
const FRICATIVES = new Set('fvszFVSZ');
const OPEN_CONSONANTS = new Set('hHyY');

/**
 * Estimate viseme events from text without a TTS engine.
 *
 * Uses character-level heuristics:
 * - Spaces → silence (mouthOpen 0)
 * - Vowels → open mouth (0.6–0.9)
 * - Closed consonants (b, m, p) → nearly closed (0.05)
 * - Fricatives (f, v, s, z) → narrow (0.2)
 * - Other consonants → mid (0.3–0.4)
 *
 * Timing is estimated at ~60ms per character with adjustments for
 * spaces and punctuation.
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
      // Brief silence between words
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
      // Pause on sentence-ending punctuation
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
      // Short pause on commas
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
      // Map vowels to different openness
      const lower = char.toLowerCase();
      if (lower === 'a') {
        mouthOpen = 0.9;
        visemeId = 21;
      } else if (lower === 'o') {
        mouthOpen = 0.6;
        visemeId = 14;
      } else if (lower === 'e') {
        mouthOpen = 0.5;
        visemeId = 18;
      } else if (lower === 'i') {
        mouthOpen = 0.5;
        visemeId = 19;
      } else {
        mouthOpen = 0.55;
        visemeId = 15;
      }
    } else if (CLOSED_CONSONANTS.has(char)) {
      mouthOpen = 0.05;
      visemeId = 1;
    } else if (FRICATIVES.has(char)) {
      mouthOpen = 0.2;
      visemeId = 7;
    } else if (OPEN_CONSONANTS.has(char)) {
      mouthOpen = 0.4;
      visemeId = 11;
    } else if (/[a-zA-Z]/.test(char)) {
      mouthOpen = 0.35;
      visemeId = 6;
    } else {
      // Skip non-alpha characters silently
      continue;
    }

    visemes.push({
      offsetMs,
      visemeId,
      mouthOpen,
      durationMs: msPerChar,
    });
    offsetMs += msPerChar;
  }

  // Add a final silence
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
// Audio upload (S3/R2)
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
 * Upload base64 audio to S3/R2 and return the public CDN URL.
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
 * Look up the voice config for a persona + locale from the database.
 */
export async function getVoiceConfig(
  personaId: string,
  locale: string = 'en-US',
): Promise<TutorVoiceConfig | null> {
  const vc = await prisma.tutorVoiceConfig.findUnique({
    where: {
      personaId_locale: { personaId, locale },
    },
  });

  if (!vc) return null;

  return {
    ttsProvider: vc.ttsProvider,
    ttsVoiceId: vc.ttsVoiceId,
    speakingRate: vc.speakingRate,
    pitch: vc.pitch,
    emotion: vc.emotion,
    locale: vc.locale,
  };
}

/**
 * Synthesize speech for tutor response text.
 *
 * Strategy:
 * 1. If Azure Speech key is configured and provider is "azure" → full Azure
 *    synthesis with real viseme events.
 * 2. Otherwise → text-based estimated visemes (no audio generated server-side;
 *    the client can use browser SpeechSynthesis or skip audio entirely).
 */
export async function synthesizeSpeech(
  text: string,
  voiceConfig: TutorVoiceConfig,
  locale: string,
): Promise<TtsSpeechResult> {
  // Azure path — full TTS with real viseme data
  if (
    config.azureSpeechKey &&
    voiceConfig.ttsProvider === 'azure'
  ) {
    try {
      return await synthesizeWithAzure(text, voiceConfig, locale);
    } catch (error) {
      console.warn('Azure TTS failed, falling back to estimated visemes:', error);
      // Fall through to estimated visemes
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
