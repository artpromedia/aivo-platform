/**
 * Tutor Locale Adapter
 *
 * Adapts tutor agent prompts and responses for different locales.
 * Handles:
 * - Language-specific prompt modifications
 * - Cultural context for examples and analogies
 * - Measurement system preferences (metric/imperial)
 * - Age-appropriate vocabulary per locale
 */

export interface LocaleConfig {
  locale: string;
  language: string;
  measurementSystem: 'metric' | 'imperial';
  culturalContext: string;
  currencySymbol: string;
  dateFormat: string;
}

const LOCALE_CONFIGS: Record<string, LocaleConfig> = {
  'en-US': {
    locale: 'en-US',
    language: 'English',
    measurementSystem: 'imperial',
    culturalContext: 'American cultural references and examples',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
  },
  'en-GB': {
    locale: 'en-GB',
    language: 'English',
    measurementSystem: 'metric',
    culturalContext: 'British cultural references and examples',
    currencySymbol: '£',
    dateFormat: 'DD/MM/YYYY',
  },
  'es-US': {
    locale: 'es-US',
    language: 'Spanish',
    measurementSystem: 'imperial',
    culturalContext: 'Latino American cultural references, bilingual support',
    currencySymbol: '$',
    dateFormat: 'MM/DD/YYYY',
  },
  'es-MX': {
    locale: 'es-MX',
    language: 'Spanish',
    measurementSystem: 'metric',
    culturalContext: 'Mexican cultural references and examples',
    currencySymbol: '$',
    dateFormat: 'DD/MM/YYYY',
  },
  'fr-FR': {
    locale: 'fr-FR',
    language: 'French',
    measurementSystem: 'metric',
    culturalContext: 'French cultural references and examples',
    currencySymbol: '€',
    dateFormat: 'DD/MM/YYYY',
  },
  'sw-KE': {
    locale: 'sw-KE',
    language: 'Swahili',
    measurementSystem: 'metric',
    culturalContext: 'East African cultural references and examples',
    currencySymbol: 'KSh',
    dateFormat: 'DD/MM/YYYY',
  },
};

export class TutorLocaleAdapter {
  private readonly config: LocaleConfig;

  constructor(locale: string) {
    this.config = LOCALE_CONFIGS[locale] ?? LOCALE_CONFIGS['en-US'];
  }

  /**
   * Adapt a system prompt for the current locale
   */
  adaptPrompt(basePrompt: string): string {
    const localeInstructions = this.buildLocaleInstructions();
    return `${basePrompt}\n\n${localeInstructions}`;
  }

  /**
   * Build locale-specific instructions for the AI
   */
  private buildLocaleInstructions(): string {
    const parts: string[] = [];

    if (this.config.language !== 'English') {
      parts.push(`LANGUAGE: Respond in ${this.config.language}. Use clear, age-appropriate ${this.config.language}.`);
    }

    parts.push(`CULTURAL CONTEXT: Use ${this.config.culturalContext}.`);

    if (this.config.measurementSystem === 'metric') {
      parts.push('MEASUREMENTS: Use metric units (meters, kilograms, Celsius).');
    } else {
      parts.push('MEASUREMENTS: Use imperial units (feet, pounds, Fahrenheit).');
    }

    parts.push(`CURRENCY: Use ${this.config.currencySymbol} for money examples.`);
    parts.push(`DATES: Use ${this.config.dateFormat} format when mentioning dates.`);

    return `LOCALE ADAPTATIONS (${this.config.locale}):\n${parts.map((p) => `- ${p}`).join('\n')}`;
  }

  /**
   * Get the locale configuration
   */
  getConfig(): LocaleConfig {
    return { ...this.config };
  }

  /**
   * Check if a locale is supported
   */
  static isSupported(locale: string): boolean {
    return locale in LOCALE_CONFIGS;
  }

  /**
   * Get all supported locales
   */
  static getSupportedLocales(): string[] {
    return Object.keys(LOCALE_CONFIGS);
  }
}
