/**
 * @aivo/i18n - Internationalization Framework
 *
 * A comprehensive i18n solution for the AIVO platform supporting:
 * - 20+ languages including RTL
 * - Type-safe translations with ICU MessageFormat
 * - Lazy loading of language bundles
 * - Locale-aware date/number/currency formatting
 * - Pluralization with CLDR rules
 * - Dynamic content translation
 * - React hooks and components
 * - Flutter/Dart integration
 */

// Types
export * from './types';

// Constants
export * from './constants';

// Core functionality
export * from './core';

// Formatters
export * from './formatters';

// React integration
export * from './react';

// RTL utilities
export * from './rtl';

// RTL and style utilities
export * from './styles';

// i18n configuration (UI locales, display metadata, helpers)
export * from './config';

// React components (LanguageSwitcher)
export * from './components';

// ─── Compatibility Aliases ───
// These aliases bridge naming differences between packages/i18n and libs/i18n
// so that libs/ui-web (which was written against libs/i18n) compiles correctly.

import { LOCALE_METADATA, DEFAULT_I18N_CONFIG } from './constants';
import { detectBrowserLocale, findBestMatch } from './core';
import type { SupportedLocale, TranslationMessage } from './types';

/** Alias for SupportedLocale (libs/i18n calls it Locale) */
export type Locale = SupportedLocale;

/** Alias for Record<string, string> (libs/i18n calls it TranslationMessages) */
export type TranslationMessages = Record<string, TranslationMessage>;

/** Ordered array of every supported locale code */
export const SUPPORTED_LOCALES: readonly SupportedLocale[] = Object.keys(
  LOCALE_METADATA
) as SupportedLocale[];

/** Platform-wide default locale */
export const DEFAULT_LOCALE: SupportedLocale = DEFAULT_I18N_CONFIG.defaultLocale;

/**
 * Load translation messages for a locale.
 * Returns an empty record – actual message bundles live in the app layer.
 */
export async function getMessages(_locale: SupportedLocale): Promise<Record<string, string>> {
  return {};
}

/**
 * Detect the user's browser locale string (nullable).
 * Re-export under the name libs/ui-web expects.
 */
export { detectBrowserLocale as getBrowserLocale };

/**
 * Map an arbitrary locale string to the nearest SupportedLocale, or null.
 */
export function getSupportedLocale(locale: string | null): SupportedLocale | null {
  if (!locale) return null;
  const all = Object.keys(LOCALE_METADATA) as SupportedLocale[];
  const best = findBestMatch(locale, all, 'en');
  return best;
}
