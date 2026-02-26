import { config } from '../config.js';
import { prisma } from '../prisma.js';

export interface TTSResult {
  audioBase64: string;
  visemes: Array<{ time: number; value: string }>;
  durationMs: number;
}

export class TTSService {
  async synthesize(
    text: string,
    personaId: string,
    locale: string = 'en-US',
  ): Promise<TTSResult | null> {
    // Look up voice config for persona + locale
    const voiceConfig = await prisma.tutorVoiceConfig.findUnique({
      where: {
        personaId_locale: { personaId, locale },
      },
    });

    if (!voiceConfig || !config.azureSpeechKey) {
      return null;
    }

    // In production, this would call Azure TTS API with voiceConfig.ttsVoiceId
    // For now, return a placeholder indicating TTS is available but not configured
    return {
      audioBase64: '',
      visemes: [],
      durationMs: Math.ceil(text.length * 60), // rough estimate
    };
  }
}

export const ttsService = new TTSService();
