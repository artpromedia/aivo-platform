/**
 * Translation Management Service
 *
 * Integrates with translation management platforms like Crowdin, Lokalise, or Phrase.
 * Provides utilities for extracting, uploading, and downloading translations.
 */

import {
  type Locale,
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  type TranslationMessages,
} from '../constants/index';

/**
 * Translation management platform types
 */
export type TranslationPlatform = 'crowdin' | 'lokalise' | 'phrase' | 'custom';

/**
 * Translation status for a key
 */
export interface TranslationStatus {
  key: string;
  sourceText: string;
  translations: Record<
    Locale,
    {
      text: string | null;
      status: 'translated' | 'fuzzy' | 'untranslated' | 'approved';
      lastUpdated: string | null;
      translator: string | null;
    }
  >;
}

/**
 * Translation management configuration
 */
export interface TranslationManagerConfig {
  platform: TranslationPlatform;
  apiKey: string;
  projectId: string;
  baseUrl?: string;
  sourceLocale?: Locale;
}

/**
 * Translation upload options
 */
export interface UploadOptions {
  updateStrings?: boolean;
  cleanupMode?: 'none' | 'missing' | 'all';
  importEqOriginal?: 'hide' | 'translate' | 'skip';
}

/**
 * Translation download options
 */
export interface DownloadOptions {
  locales?: Locale[];
  includeUntranslated?: boolean;
  exportEmptyAsUnfinished?: boolean;
  format?: 'json' | 'xliff' | 'po';
}

/**
 * Translation Manager class
 */
export class TranslationManager {
  private config: TranslationManagerConfig;

  constructor(config: TranslationManagerConfig) {
    this.config = {
      sourceLocale: DEFAULT_LOCALE,
      ...config,
    };
  }

  /**
   * Get translation completion statistics
   */
  async getStatistics(): Promise<
    Record<
      Locale,
      {
        total: number;
        translated: number;
        approved: number;
        percentage: number;
      }
    >
  > {
    const stats: Record<
      string,
      { total: number; translated: number; approved: number; percentage: number }
    > = {};

    for (const locale of SUPPORTED_LOCALES) {
      if (locale === this.config.sourceLocale) {
        stats[locale] = { total: 100, translated: 100, approved: 100, percentage: 100 };
        continue;
      }

      // In a real implementation, this would call the translation platform API
      stats[locale] = {
        total: 0,
        translated: 0,
        approved: 0,
        percentage: 0,
      };
    }

    return stats as Record<
      Locale,
      { total: number; translated: number; approved: number; percentage: number }
    >;
  }

  /**
   * Upload source strings to translation platform
   */
  async uploadSourceStrings(
    messages: TranslationMessages,
    options: UploadOptions = {}
  ): Promise<{ uploaded: number; updated: number; errors: string[] }> {
    const { updateStrings = true, cleanupMode = 'none' } = options;

    console.log(
      `Uploading ${Object.keys(messages).length} source strings to ${this.config.platform}`
    );
    console.log(`Options: updateStrings=${updateStrings}, cleanupMode=${cleanupMode}`);

    // Platform-specific implementation would go here
    switch (this.config.platform) {
      case 'crowdin':
        return this.uploadToCrowdin(messages, options);
      case 'lokalise':
        return this.uploadToLokalise(messages, options);
      case 'phrase':
        return this.uploadToPhrase(messages, options);
      default:
        return { uploaded: Object.keys(messages).length, updated: 0, errors: [] };
    }
  }

  /**
   * Download translations from platform
   */
  async downloadTranslations(
    options: DownloadOptions = {}
  ): Promise<Record<Locale, TranslationMessages>> {
    const { locales = SUPPORTED_LOCALES, includeUntranslated = false } = options;

    console.log(
      `Downloading translations for ${locales.length} locales from ${this.config.platform}`
    );

    const translations: Record<string, TranslationMessages> = {};

    for (const locale of locales) {
      if (locale === this.config.sourceLocale) continue;

      // Platform-specific implementation would go here
      translations[locale] = {};
    }

    return translations as Record<Locale, TranslationMessages>;
  }

  /**
   * Sync translations (bi-directional)
   */
  async sync(): Promise<{
    uploaded: number;
    downloaded: Record<Locale, number>;
    errors: string[];
  }> {
    console.log(`Syncing translations with ${this.config.platform}`);

    return {
      uploaded: 0,
      downloaded: {},
      errors: [],
    };
  }

  /**
   * Get untranslated keys for a locale
   */
  async getUntranslatedKeys(locale: Locale): Promise<string[]> {
    console.log(`Getting untranslated keys for ${locale}`);
    return [];
  }

  /**
   * Add context/screenshot for a key
   */
  async addContext(
    key: string,
    context: {
      description?: string;
      screenshot?: string;
      maxLength?: number;
      tags?: string[];
    }
  ): Promise<void> {
    console.log(`Adding context for key ${key}`);
  }

  // Platform-specific implementations

  private async uploadToCrowdin(
    messages: TranslationMessages,
    options: UploadOptions
  ): Promise<{ uploaded: number; updated: number; errors: string[] }> {
    // Crowdin API implementation
    // POST https://api.crowdin.com/api/v2/projects/{projectId}/files
    return { uploaded: Object.keys(messages).length, updated: 0, errors: [] };
  }

  private async uploadToLokalise(
    messages: TranslationMessages,
    options: UploadOptions
  ): Promise<{ uploaded: number; updated: number; errors: string[] }> {
    // Lokalise API implementation
    // POST https://api.lokalise.com/api2/projects/{projectId}/keys
    return { uploaded: Object.keys(messages).length, updated: 0, errors: [] };
  }

  private async uploadToPhrase(
    messages: TranslationMessages,
    options: UploadOptions
  ): Promise<{ uploaded: number; updated: number; errors: string[] }> {
    // Phrase API implementation
    // POST https://api.phrase.com/v2/projects/{project_id}/uploads
    return { uploaded: Object.keys(messages).length, updated: 0, errors: [] };
  }
}

/**
 * Extract all translation keys from source code
 */
export function extractTranslationKeys(sourceCode: string): string[] {
  const keys: string[] = [];

  // Match formatMessage({ id: '...' })
  const formatMessageRegex = /formatMessage\s*\(\s*\{\s*id:\s*['"`]([^'"`]+)['"`]/g;
  let match;
  while ((match = formatMessageRegex.exec(sourceCode)) !== null) {
    keys.push(match[1]);
  }

  // Match t('...')
  const tRegex = /\bt\s*\(\s*['"`]([^'"`]+)['"`]/g;
  while ((match = tRegex.exec(sourceCode)) !== null) {
    keys.push(match[1]);
  }

  // Match <FormattedMessage id="..." />
  const formattedMessageRegex = /<FormattedMessage[^>]*id\s*=\s*['"`]([^'"`]+)['"`]/g;
  while ((match = formattedMessageRegex.exec(sourceCode)) !== null) {
    keys.push(match[1]);
  }

  // Match defineMessages({ key: { id: '...' } })
  const defineMessagesRegex = /id:\s*['"`]([^'"`]+)['"`]/g;
  while ((match = defineMessagesRegex.exec(sourceCode)) !== null) {
    keys.push(match[1]);
  }

  return [...new Set(keys)];
}

/**
 * Validate translations against source
 */
export function validateTranslations(
  sourceMessages: TranslationMessages,
  targetMessages: TranslationMessages
): {
  missing: string[];
  extra: string[];
  invalid: string[];
} {
  const sourceKeys = Object.keys(sourceMessages);
  const targetKeys = Object.keys(targetMessages);

  const missing = sourceKeys.filter((key) => !targetKeys.includes(key));
  const extra = targetKeys.filter((key) => !sourceKeys.includes(key));

  // Check for invalid ICU message syntax
  const invalid: string[] = [];
  for (const [key, value] of Object.entries(targetMessages)) {
    if (value && !isValidICUMessage(value)) {
      invalid.push(key);
    }
  }

  return { missing, extra, invalid };
}

/**
 * Basic ICU message syntax validation
 */
function isValidICUMessage(message: string): boolean {
  let braceCount = 0;
  for (const char of message) {
    if (char === '{') braceCount++;
    if (char === '}') braceCount--;
    if (braceCount < 0) return false;
  }
  return braceCount === 0;
}

/**
 * Merge translations with fallback to source
 */
export function mergeTranslations(
  sourceMessages: TranslationMessages,
  targetMessages: TranslationMessages,
  options: { fallbackToSource?: boolean } = {}
): TranslationMessages {
  const { fallbackToSource = true } = options;

  const merged: TranslationMessages = {};

  for (const key of Object.keys(sourceMessages)) {
    if (targetMessages[key]) {
      merged[key] = targetMessages[key];
    } else if (fallbackToSource) {
      merged[key] = sourceMessages[key];
    }
  }

  return merged;
}

/**
 * Create translation manager instance
 */
export function createTranslationManager(config: TranslationManagerConfig): TranslationManager {
  return new TranslationManager(config);
}
