/**
 * Tutor Locale Configs (shared)
 *
 * Canonical locale configuration for AIVO's AI tutor system.
 * Consumed by ai-orchestrator (prompt building) and tutor-svc (voice checks).
 *
 * Each entry maps a BCP 47 locale to its cultural, curricular, and
 * Piper TTS voice configuration.
 */

import type { SupportedLocale } from './types';

// ──────────────────────────────────────────────────────────────────
// TYPES
// ──────────────────────────────────────────────────────────────────

export interface TutorLocaleConfig {
  locale: SupportedLocale;
  languageName: string;
  nativeLanguageName: string;
  measurementSystem: 'metric' | 'imperial';
  culturalContext: string;
  curriculumStandard: string;
  numberFormat: string;
  isRTL: boolean;
  bilingualVocabulary: boolean;
  exampleContext: string;
  piperVoiceAvailable: boolean;
  piperVoiceId: string | null;
}

// ──────────────────────────────────────────────────────────────────
// LOCALE CONFIG MAP — one entry per supported locale
// ──────────────────────────────────────────────────────────────────

export const TUTOR_LOCALE_CONFIGS: Record<string, TutorLocaleConfig> = {
  'en-US': {
    locale: 'en-US',
    languageName: 'English',
    nativeLanguageName: 'English',
    measurementSystem: 'imperial',
    culturalContext: 'American',
    curriculumStandard: 'COMMON_CORE',
    numberFormat: '1,234.56',
    isRTL: false,
    bilingualVocabulary: false,
    exampleContext:
      'Use American cultural references (dollars, miles, US geography, American holidays)',
    piperVoiceAvailable: true,
    piperVoiceId: 'en_US-amy-medium',
  },
  'en-GB': {
    locale: 'en-GB',
    languageName: 'English (UK)',
    nativeLanguageName: 'English',
    measurementSystem: 'metric',
    culturalContext: 'British',
    curriculumStandard: 'UK_NATIONAL_CURRICULUM',
    numberFormat: '1,234.56',
    isRTL: false,
    bilingualVocabulary: false,
    exampleContext:
      'Use British cultural references (pounds sterling, kilometres, UK geography, British holidays). Use British spelling (colour, favourite, centre).',
    piperVoiceAvailable: true,
    piperVoiceId: 'en_GB-alan-medium',
  },
  'es-MX': {
    locale: 'es-MX',
    languageName: 'Spanish (Mexico)',
    nativeLanguageName: 'Español (México)',
    measurementSystem: 'metric',
    culturalContext: 'Mexican',
    curriculumStandard: 'SEP',
    numberFormat: '1,234.56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext:
      'Use Mexican cultural references (pesos, Mexican geography, local holidays like Día de los Muertos). Use Latin American Spanish, not Castilian.',
    piperVoiceAvailable: true,
    piperVoiceId: 'es_MX-claude-high',
  },
  'es-ES': {
    locale: 'es-ES',
    languageName: 'Spanish (Spain)',
    nativeLanguageName: 'Español (España)',
    measurementSystem: 'metric',
    culturalContext: 'Spanish',
    curriculumStandard: 'LOMCE',
    numberFormat: '1.234,56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext:
      'Use Spanish/European cultural references (euros, Spanish geography). Use Castilian Spanish with vosotros.',
    piperVoiceAvailable: true,
    piperVoiceId: 'es_ES-sharvard-medium',
  },
  'fr': {
    locale: 'fr',
    languageName: 'French',
    nativeLanguageName: 'Français',
    measurementSystem: 'metric',
    culturalContext: 'French',
    curriculumStandard: 'EDUCATION_NATIONALE',
    numberFormat: '1 234,56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext:
      'Use French cultural references (euros, French geography, holidays like le 14 juillet). Use metropolitan French.',
    piperVoiceAvailable: true,
    piperVoiceId: 'fr_FR-siwis-medium',
  },
  'de': {
    locale: 'de',
    languageName: 'German',
    nativeLanguageName: 'Deutsch',
    measurementSystem: 'metric',
    culturalContext: 'German',
    curriculumStandard: 'KMK',
    numberFormat: '1.234,56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext: 'Use German cultural references (euros, German geography).',
    piperVoiceAvailable: true,
    piperVoiceId: 'de_DE-thorsten-medium',
  },
  'pt-BR': {
    locale: 'pt-BR',
    languageName: 'Portuguese (Brazil)',
    nativeLanguageName: 'Português (Brasil)',
    measurementSystem: 'metric',
    culturalContext: 'Brazilian',
    curriculumStandard: 'BNCC',
    numberFormat: '1.234,56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext:
      'Use Brazilian cultural references (reais, Brazilian geography, Carnaval). Use Brazilian Portuguese, not European.',
    piperVoiceAvailable: true,
    piperVoiceId: 'pt_BR-edresson-low',
  },
  'zh-CN': {
    locale: 'zh-CN',
    languageName: 'Chinese (Simplified)',
    nativeLanguageName: '简体中文',
    measurementSystem: 'metric',
    culturalContext: 'Chinese',
    curriculumStandard: 'MOE_CHINA',
    numberFormat: '1,234.56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext:
      'Use Chinese cultural references (yuan/renminbi, Chinese geography). Write in simplified Chinese characters.',
    piperVoiceAvailable: true,
    piperVoiceId: 'zh_CN-huayan-medium',
  },
  'ja': {
    locale: 'ja',
    languageName: 'Japanese',
    nativeLanguageName: '日本語',
    measurementSystem: 'metric',
    culturalContext: 'Japanese',
    curriculumStandard: 'MEXT',
    numberFormat: '1,234.56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext:
      'Use Japanese cultural references (yen, Japanese geography). Use polite form (です/ます).',
    piperVoiceAvailable: false,
    piperVoiceId: null,
  },
  'ko': {
    locale: 'ko',
    languageName: 'Korean',
    nativeLanguageName: '한국어',
    measurementSystem: 'metric',
    culturalContext: 'Korean',
    curriculumStandard: 'MOE_KOREA',
    numberFormat: '1,234.56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext:
      'Use Korean cultural references (won, Korean geography). Use polite speech level (합니다체).',
    piperVoiceAvailable: false,
    piperVoiceId: null,
  },
  'ar': {
    locale: 'ar',
    languageName: 'Arabic',
    nativeLanguageName: 'العربية',
    measurementSystem: 'metric',
    culturalContext: 'Arabic',
    curriculumStandard: 'UAE_MOE',
    numberFormat: '١٬٢٣٤٫٥٦',
    isRTL: true,
    bilingualVocabulary: true,
    exampleContext:
      'Use Modern Standard Arabic. Use culturally appropriate examples from the Arab world. Use Arabic-Indic numerals where appropriate.',
    piperVoiceAvailable: true,
    piperVoiceId: 'ar_JO-kareem-medium',
  },
  'hi': {
    locale: 'hi',
    languageName: 'Hindi',
    nativeLanguageName: 'हिन्दी',
    measurementSystem: 'metric',
    culturalContext: 'Indian',
    curriculumStandard: 'CBSE',
    numberFormat: '1,23,456.78',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext:
      'Use Indian cultural references (rupees, Indian geography, Indian number system with lakhs/crores). Use Devanagari script.',
    piperVoiceAvailable: false,
    piperVoiceId: null,
  },
  'id': {
    locale: 'id',
    languageName: 'Indonesian',
    nativeLanguageName: 'Bahasa Indonesia',
    measurementSystem: 'metric',
    culturalContext: 'Indonesian',
    curriculumStandard: 'KURIKULUM_MERDEKA',
    numberFormat: '1.234,56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext: 'Use Indonesian cultural references (rupiah, Indonesian geography).',
    piperVoiceAvailable: false,
    piperVoiceId: null,
  },
  'ru': {
    locale: 'ru',
    languageName: 'Russian',
    nativeLanguageName: 'Русский',
    measurementSystem: 'metric',
    culturalContext: 'Russian',
    curriculumStandard: 'FGOS',
    numberFormat: '1 234,56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext: 'Use Russian cultural references (rubles, Russian geography).',
    piperVoiceAvailable: true,
    piperVoiceId: 'ru_RU-irina-medium',
  },
  'tr': {
    locale: 'tr',
    languageName: 'Turkish',
    nativeLanguageName: 'Türkçe',
    measurementSystem: 'metric',
    culturalContext: 'Turkish',
    curriculumStandard: 'MEB',
    numberFormat: '1.234,56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext: 'Use Turkish cultural references (lira, Turkish geography).',
    piperVoiceAvailable: true,
    piperVoiceId: 'tr_TR-dfki-medium',
  },
  'nl': {
    locale: 'nl',
    languageName: 'Dutch',
    nativeLanguageName: 'Nederlands',
    measurementSystem: 'metric',
    culturalContext: 'Dutch',
    curriculumStandard: 'SLO',
    numberFormat: '1.234,56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext: 'Use Dutch cultural references (euros, Dutch geography).',
    piperVoiceAvailable: true,
    piperVoiceId: 'nl_NL-mls-medium',
  },
  'it': {
    locale: 'it',
    languageName: 'Italian',
    nativeLanguageName: 'Italiano',
    measurementSystem: 'metric',
    culturalContext: 'Italian',
    curriculumStandard: 'INDICAZIONI_NAZIONALI',
    numberFormat: '1.234,56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext: 'Use Italian cultural references (euros, Italian geography).',
    piperVoiceAvailable: true,
    piperVoiceId: 'it_IT-riccardo-x_low',
  },
  'sw': {
    locale: 'sw',
    languageName: 'Swahili',
    nativeLanguageName: 'Kiswahili',
    measurementSystem: 'metric',
    culturalContext: 'East African',
    curriculumStandard: 'CBC_KENYA',
    numberFormat: '1,234.56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext:
      'Use East African cultural references (Kenyan shillings, East African geography).',
    piperVoiceAvailable: false,
    piperVoiceId: null,
  },
};

// ──────────────────────────────────────────────────────────────────
// LOCALE RESOLUTION
// ──────────────────────────────────────────────────────────────────

/**
 * Resolve the best TutorLocaleConfig for a given locale.
 *
 * Fallback chain:
 *   1. Exact match: es-MX
 *   2. Base language match: es → es-MX or es-ES (first available)
 *   3. Default: en-US
 */
export function resolveLocaleConfig(locale: string): TutorLocaleConfig {
  // 1. Exact match
  if (TUTOR_LOCALE_CONFIGS[locale]) {
    return TUTOR_LOCALE_CONFIGS[locale];
  }

  // 2. Base language
  const baseLang = locale.split('-')[0];
  for (const [key, config] of Object.entries(TUTOR_LOCALE_CONFIGS)) {
    if (key === baseLang || key.startsWith(`${baseLang}-`)) {
      return config;
    }
  }

  // 3. Default
  return TUTOR_LOCALE_CONFIGS['en-US'];
}

// ──────────────────────────────────────────────────────────────────
// VOICE AVAILABILITY
// ──────────────────────────────────────────────────────────────────

/**
 * Check if a Piper TTS voice is available for a given locale.
 */
export function isVoiceAvailableForLocale(locale: string): boolean {
  const config = resolveLocaleConfig(locale);
  return config.piperVoiceAvailable;
}

/**
 * Get all locales that have Piper voice support.
 */
export function getVoiceEnabledLocales(): string[] {
  return Object.keys(TUTOR_LOCALE_CONFIGS).filter(
    (key) => TUTOR_LOCALE_CONFIGS[key].piperVoiceAvailable,
  );
}

/**
 * Get all locales that are text-only (no voice).
 */
export function getTextOnlyLocales(): string[] {
  return Object.keys(TUTOR_LOCALE_CONFIGS).filter(
    (key) => !TUTOR_LOCALE_CONFIGS[key].piperVoiceAvailable,
  );
}
