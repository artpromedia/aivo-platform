import { prisma } from '../prisma.js';
import type { TutorVoiceConfig } from './tts.service.js';

/**
 * Locale fallback chain for voice config resolution.
 *
 * Given a locale like "es-MX", the fallback order is:
 *   es-MX → es → persona default → en-US
 *
 * This ensures every persona always has a voice, even if a specific
 * locale variant isn't configured.
 */
function buildFallbackChain(locale: string): string[] {
  const chain: string[] = [locale];

  // Add base language (e.g. "es-MX" → "es")
  if (locale.includes('-')) {
    chain.push(locale.split('-')[0]!);
  }

  // Always fall back to en-US as last resort
  if (locale !== 'en-US' && !chain.includes('en-US')) {
    chain.push('en-US');
  }

  return chain;
}

/**
 * Look up the voice config for a persona + locale from the database.
 *
 * Uses the locale fallback chain: exact → base language → en-US.
 * Returns null only if no voice config exists at all for the persona.
 */
export async function getVoiceConfig(
  personaId: string,
  locale: string = 'en-US',
): Promise<TutorVoiceConfig | null> {
  const chain = buildFallbackChain(locale);

  // Try each locale in the fallback chain
  for (const candidateLocale of chain) {
    const vc = await prisma.tutorVoiceConfig.findUnique({
      where: {
        personaId_locale: { personaId, locale: candidateLocale },
      },
    });

    if (vc) {
      return {
        ttsProvider: vc.ttsProvider,
        ttsVoiceId: vc.ttsVoiceId,
        speakingRate: vc.speakingRate,
        pitch: vc.pitch,
        emotion: vc.emotion,
        locale: vc.locale,
      };
    }
  }

  // Last resort: try the persona's default voice config
  const defaultVc = await prisma.tutorVoiceConfig.findFirst({
    where: { personaId, isDefault: true },
  });

  if (defaultVc) {
    return {
      ttsProvider: defaultVc.ttsProvider,
      ttsVoiceId: defaultVc.ttsVoiceId,
      speakingRate: defaultVc.speakingRate,
      pitch: defaultVc.pitch,
      emotion: defaultVc.emotion,
      locale: defaultVc.locale,
    };
  }

  return null;
}
