/**
 * Tutor Locale Adapter
 *
 * Builds locale-specific system prompt instructions and manages
 * the relationship between platform locales and Piper TTS voice availability.
 *
 * The platform supports 20+ locales. Piper TTS supports ~15 of those.
 * For unsupported locales, the tutor responds in the correct language
 * as TEXT but with voice/lip-sync disabled.
 *
 * Locale sources:
 *   - Learner profile (set during onboarding via geolocation-svc)
 *   - Session override (student can switch mid-session)
 *   - Fallback chain: requested → base language → learner profile → en-US
 */

import { isRTLLocale, type SupportedLocale } from '@aivo/i18n';

// ──────────────────────────────────────────────────────────────────
// LOCALE CONFIG — one entry per supported locale
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
    exampleContext: 'Use American cultural references (dollars, miles, US geography, American holidays)',
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
    exampleContext: 'Use British cultural references (pounds sterling, kilometres, UK geography, British holidays). Use British spelling (colour, favourite, centre).',
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
    exampleContext: 'Use Mexican cultural references (pesos, Mexican geography, local holidays like Día de los Muertos). Use Latin American Spanish, not Castilian.',
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
    exampleContext: 'Use Spanish/European cultural references (euros, Spanish geography). Use Castilian Spanish with vosotros.',
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
    exampleContext: 'Use French cultural references (euros, French geography, holidays like le 14 juillet). Use metropolitan French.',
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
    exampleContext: 'Use Brazilian cultural references (reais, Brazilian geography, Carnaval). Use Brazilian Portuguese, not European.',
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
    exampleContext: 'Use Chinese cultural references (yuan/renminbi, Chinese geography). Write in simplified Chinese characters.',
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
    exampleContext: 'Use Japanese cultural references (yen, Japanese geography). Use polite form (です/ます).',
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
    exampleContext: 'Use Korean cultural references (won, Korean geography). Use polite speech level (합니다체).',
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
    exampleContext: 'Use Modern Standard Arabic. Use culturally appropriate examples from the Arab world. Use Arabic-Indic numerals where appropriate.',
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
    exampleContext: 'Use Indian cultural references (rupees, Indian geography, Indian number system with lakhs/crores). Use Devanagari script.',
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
    locale: 'sw' as SupportedLocale,
    languageName: 'Swahili',
    nativeLanguageName: 'Kiswahili',
    measurementSystem: 'metric',
    culturalContext: 'East African',
    curriculumStandard: 'CBC_KENYA',
    numberFormat: '1,234.56',
    isRTL: false,
    bilingualVocabulary: true,
    exampleContext: 'Use East African cultural references (Kenyan shillings, East African geography). Learners may speak Swahili as a second language with English.',
    piperVoiceAvailable: true,
    piperVoiceId: 'sw_CD-lanfrica-medium',
  },
};

// ──────────────────────────────────────────────────────────────────
// VOICE AVAILABILITY CHECK
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

// ──────────────────────────────────────────────────────────────────
// LOCALE RESOLUTION
// ──────────────────────────────────────────────────────────────────

/**
 * Resolve the best TutorLocaleConfig for a given locale.
 *
 * Fallback chain (matches platform i18n pattern from I18nManager.handleMissing):
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
// SYSTEM PROMPT BUILDER
// ──────────────────────────────────────────────────────────────────

/**
 * Build locale-specific system prompt instructions for the tutor AI.
 *
 * Injected into the subject tutor agent's system prompt.
 * Covers language, cultural context, curriculum alignment, and
 * text-optimization instructions for voice-unavailable locales.
 */
export function buildLocalePromptSection(locale: string): string {
  const config = resolveLocaleConfig(locale);

  let prompt = `
LOCALE INSTRUCTIONS (${config.locale}):
- You MUST respond entirely in ${config.nativeLanguageName} (${config.languageName}).
- Use ${config.measurementSystem} measurement system.
- Use locale-appropriate number formatting: ${config.numberFormat}
- ${config.exampleContext}
`;

  // Curriculum alignment
  prompt += `- Align explanations with ${config.curriculumStandard} curriculum standards where applicable.\n`;

  // Bilingual vocabulary support
  if (config.bilingualVocabulary) {
    prompt += `- When introducing subject-specific vocabulary, provide terms in both ${config.nativeLanguageName} and English.\n`;
    prompt += `  For example: "fracción (fraction)", "ecuación (equation)", "hipótesis (hypothesis)"\n`;
  }

  // RTL formatting instructions
  if (config.isRTL) {
    prompt += `
RTL LANGUAGE INSTRUCTIONS:
- Format all structured content for right-to-left reading.
- When showing mathematical expressions, maintain standard LTR mathematical notation but explain in RTL text.
- Use ${config.locale === 'ar' ? 'Arabic-Indic numerals (٠١٢٣٤٥٦٧٨٩)' : 'standard numerals'} where culturally appropriate.
- Place mathematical operators correctly for RTL display context.
`;
  }

  // Voice availability — affects content strategy
  if (!config.piperVoiceAvailable) {
    prompt += `
TEXT-ONLY MODE (voice not available for ${config.nativeLanguageName}):
- Your responses will be displayed as text only — the student cannot hear them spoken.
- Use extra formatting to compensate for lack of audio:
  • Bullet points and numbered lists for step-by-step explanations
  • Bold text (**like this**) for key terms and important concepts
  • Emoji sparingly for engagement (🎯 ✅ 💡 🤔)
  • Shorter paragraphs (2-3 sentences max) for readability
- Keep responses slightly more concise since the student is reading, not listening.
- Ask only one question at a time to avoid overwhelming the reader.
`;
  }

  return prompt;
}

/**
 * Build curriculum-aware system prompt section.
 *
 * Uses the learner's curriculum standards from their profile
 * (set during onboarding via parent-svc → brain-engine).
 */
export function buildCurriculumPromptSection(
  curriculumStandards: string[],
  gradeLevel: number,
  stateCode?: string,
): string {
  if (!curriculumStandards || curriculumStandards.length === 0) {
    return '';
  }

  const standardsList = curriculumStandards.join(', ');
  let prompt = `
CURRICULUM ALIGNMENT:
- This student follows: ${standardsList}
- Grade level: ${gradeLevel}
`;

  if (stateCode) {
    prompt += `- State/region: ${stateCode}\n`;
  }

  prompt += `- Reference specific standard codes when explaining concepts (e.g., "This is related to CCSS.MATH.4.NF.1")
- Ensure examples and problem difficulty match the grade-level expectations of these standards.
- When the student shows mastery, preview the next standard in the progression.
`;

  return prompt;
}
