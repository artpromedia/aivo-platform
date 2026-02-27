/**
 * Locale Service
 *
 * Re-exports tutor locale adapter functions for use within tutor-svc.
 * The canonical implementation lives in ai-orchestrator; this service
 * provides a local copy of the locale config and resolution logic
 * so tutor-svc doesn't need a runtime dependency on ai-orchestrator.
 */

// ── Inline locale config (mirrors ai-orchestrator/tutor-locale-adapter) ──

export interface TutorLocaleConfig {
  locale: string;
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

const TUTOR_LOCALE_CONFIGS: Record<string, TutorLocaleConfig> = {
  'en-US': { locale: 'en-US', languageName: 'English', nativeLanguageName: 'English', measurementSystem: 'imperial', culturalContext: 'American', curriculumStandard: 'COMMON_CORE', numberFormat: '1,234.56', isRTL: false, bilingualVocabulary: false, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'en_US-amy-medium' },
  'en-GB': { locale: 'en-GB', languageName: 'English (UK)', nativeLanguageName: 'English', measurementSystem: 'metric', culturalContext: 'British', curriculumStandard: 'UK_NATIONAL_CURRICULUM', numberFormat: '1,234.56', isRTL: false, bilingualVocabulary: false, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'en_GB-alan-medium' },
  'es-MX': { locale: 'es-MX', languageName: 'Spanish (Mexico)', nativeLanguageName: 'Español (México)', measurementSystem: 'metric', culturalContext: 'Mexican', curriculumStandard: 'SEP', numberFormat: '1,234.56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'es_MX-claude-high' },
  'es-ES': { locale: 'es-ES', languageName: 'Spanish (Spain)', nativeLanguageName: 'Español (España)', measurementSystem: 'metric', culturalContext: 'Spanish', curriculumStandard: 'LOMCE', numberFormat: '1.234,56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'es_ES-sharvard-medium' },
  'fr': { locale: 'fr', languageName: 'French', nativeLanguageName: 'Français', measurementSystem: 'metric', culturalContext: 'French', curriculumStandard: 'EDUCATION_NATIONALE', numberFormat: '1 234,56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'fr_FR-siwis-medium' },
  'de': { locale: 'de', languageName: 'German', nativeLanguageName: 'Deutsch', measurementSystem: 'metric', culturalContext: 'German', curriculumStandard: 'KMK', numberFormat: '1.234,56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'de_DE-thorsten-medium' },
  'pt-BR': { locale: 'pt-BR', languageName: 'Portuguese (Brazil)', nativeLanguageName: 'Português (Brasil)', measurementSystem: 'metric', culturalContext: 'Brazilian', curriculumStandard: 'BNCC', numberFormat: '1.234,56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'pt_BR-edresson-low' },
  'zh-CN': { locale: 'zh-CN', languageName: 'Chinese (Simplified)', nativeLanguageName: '简体中文', measurementSystem: 'metric', culturalContext: 'Chinese', curriculumStandard: 'MOE_CHINA', numberFormat: '1,234.56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'zh_CN-huayan-medium' },
  'ja': { locale: 'ja', languageName: 'Japanese', nativeLanguageName: '日本語', measurementSystem: 'metric', culturalContext: 'Japanese', curriculumStandard: 'MEXT', numberFormat: '1,234.56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: false, piperVoiceId: null },
  'ko': { locale: 'ko', languageName: 'Korean', nativeLanguageName: '한국어', measurementSystem: 'metric', culturalContext: 'Korean', curriculumStandard: 'MOE_KOREA', numberFormat: '1,234.56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: false, piperVoiceId: null },
  'ar': { locale: 'ar', languageName: 'Arabic', nativeLanguageName: 'العربية', measurementSystem: 'metric', culturalContext: 'Arabic', curriculumStandard: 'UAE_MOE', numberFormat: '١٬٢٣٤٫٥٦', isRTL: true, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'ar_JO-kareem-medium' },
  'hi': { locale: 'hi', languageName: 'Hindi', nativeLanguageName: 'हिन्दी', measurementSystem: 'metric', culturalContext: 'Indian', curriculumStandard: 'CBSE', numberFormat: '1,23,456.78', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: false, piperVoiceId: null },
  'id': { locale: 'id', languageName: 'Indonesian', nativeLanguageName: 'Bahasa Indonesia', measurementSystem: 'metric', culturalContext: 'Indonesian', curriculumStandard: 'KURIKULUM_MERDEKA', numberFormat: '1.234,56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: false, piperVoiceId: null },
  'ru': { locale: 'ru', languageName: 'Russian', nativeLanguageName: 'Русский', measurementSystem: 'metric', culturalContext: 'Russian', curriculumStandard: 'FGOS', numberFormat: '1 234,56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'ru_RU-irina-medium' },
  'tr': { locale: 'tr', languageName: 'Turkish', nativeLanguageName: 'Türkçe', measurementSystem: 'metric', culturalContext: 'Turkish', curriculumStandard: 'MEB', numberFormat: '1.234,56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'tr_TR-dfki-medium' },
  'nl': { locale: 'nl', languageName: 'Dutch', nativeLanguageName: 'Nederlands', measurementSystem: 'metric', culturalContext: 'Dutch', curriculumStandard: 'SLO', numberFormat: '1.234,56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'nl_NL-mls-medium' },
  'it': { locale: 'it', languageName: 'Italian', nativeLanguageName: 'Italiano', measurementSystem: 'metric', culturalContext: 'Italian', curriculumStandard: 'INDICAZIONI_NAZIONALI', numberFormat: '1.234,56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'it_IT-riccardo-x_low' },
  'sw': { locale: 'sw', languageName: 'Swahili', nativeLanguageName: 'Kiswahili', measurementSystem: 'metric', culturalContext: 'East African', curriculumStandard: 'CBC_KENYA', numberFormat: '1,234.56', isRTL: false, bilingualVocabulary: true, exampleContext: '', piperVoiceAvailable: true, piperVoiceId: 'sw_CD-lanfrica-medium' },
};

/**
 * Resolve the best TutorLocaleConfig for a given locale.
 * Fallback: exact → base language → en-US
 */
export function resolveLocaleConfig(locale: string): TutorLocaleConfig {
  if (TUTOR_LOCALE_CONFIGS[locale]) {
    return TUTOR_LOCALE_CONFIGS[locale];
  }

  const baseLang = locale.split('-')[0];
  for (const [key, config] of Object.entries(TUTOR_LOCALE_CONFIGS)) {
    if (key === baseLang || key.startsWith(`${baseLang}-`)) {
      return config;
    }
  }

  return TUTOR_LOCALE_CONFIGS['en-US'];
}

/**
 * Check if a Piper TTS voice is available for a given locale.
 */
export function isVoiceAvailableForLocale(locale: string): boolean {
  return resolveLocaleConfig(locale).piperVoiceAvailable;
}
