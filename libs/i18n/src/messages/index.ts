/**
 * Translation Messages Index
 *
 * Exports all translation message files for easy importing.
 * Each file contains ~350 translation keys covering all application domains.
 */

// Core Languages (High Priority)
export { default as en } from './en.json';
export { default as es } from './es.json';
export { default as fr } from './fr.json';
export { default as de } from './de.json';
export { default as pt_BR } from './pt-BR.json';
export { default as zh } from './zh.json';

// Asian Languages
export { default as ja } from './ja.json';
export { default as ko } from './ko.json';
export { default as hi } from './hi.json';
export { default as id } from './id.json';

// European Languages
export { default as it } from './it.json';
export { default as ru } from './ru.json';
export { default as nl } from './nl.json';
export { default as tr } from './tr.json';

// RTL Languages
export { default as ar } from './ar.json';

// African Languages
export { default as sw } from './sw.json';

// Message catalog for dynamic loading
export const messageCatalog = {
  en: () => import('./en.json'),
  es: () => import('./es.json'),
  fr: () => import('./fr.json'),
  de: () => import('./de.json'),
  'pt-BR': () => import('./pt-BR.json'),
  zh: () => import('./zh.json'),
  ja: () => import('./ja.json'),
  ko: () => import('./ko.json'),
  hi: () => import('./hi.json'),
  id: () => import('./id.json'),
  it: () => import('./it.json'),
  ru: () => import('./ru.json'),
  nl: () => import('./nl.json'),
  tr: () => import('./tr.json'),
  ar: () => import('./ar.json'),
  sw: () => import('./sw.json'),
} as const;

export type SupportedMessageLocale = keyof typeof messageCatalog;

/**
 * Get messages for a specific locale
 */
export async function getMessages(locale: string): Promise<Record<string, string>> {
  const normalizedLocale = locale.toLowerCase().replace('_', '-');

  // Try exact match first
  if (normalizedLocale in messageCatalog) {
    const messages = await messageCatalog[normalizedLocale as SupportedMessageLocale]();
    return messages.default || messages;
  }

  // Try language code only (e.g., 'en' from 'en-US')
  const languageCode = normalizedLocale.split('-')[0];
  if (languageCode in messageCatalog) {
    const messages = await messageCatalog[languageCode as SupportedMessageLocale]();
    return messages.default || messages;
  }

  // Fallback to English
  const messages = await messageCatalog.en();
  return messages.default || messages;
}

/**
 * Get all available message locales
 */
export function getAvailableMessageLocales(): string[] {
  return Object.keys(messageCatalog);
}

/**
 * Check if a locale has translations available
 */
export function hasMessages(locale: string): boolean {
  const normalizedLocale = locale.toLowerCase().replace('_', '-');
  const languageCode = normalizedLocale.split('-')[0];
  return normalizedLocale in messageCatalog || languageCode in messageCatalog;
}
