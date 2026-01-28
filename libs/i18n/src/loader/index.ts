/**
 * Message Loader
 *
 * Configurable message loader with caching and fallback support.
 */

import { type Locale, type TranslationMessages, DEFAULT_LOCALE } from '../constants/index.js';

export interface MessageLoaderConfig {
  /**
   * Base URL for loading messages (for remote loading)
   */
  baseUrl?: string;
  /**
   * Custom fetch function for remote messages
   */
  fetchFn?: typeof fetch;
  /**
   * Cache loaded messages in memory
   */
  cache?: boolean;
  /**
   * Fallback messages (usually English)
   */
  fallbackMessages?: TranslationMessages;
  /**
   * Custom load function
   */
  loadFn?: (locale: Locale) => Promise<TranslationMessages>;
  /**
   * Callback when loading starts
   */
  onLoadStart?: (locale: Locale) => void;
  /**
   * Callback when loading completes
   */
  onLoadComplete?: (locale: Locale, messages: TranslationMessages) => void;
  /**
   * Callback when loading fails
   */
  onLoadError?: (locale: Locale, error: Error) => void;
}

/**
 * Creates a message loader with caching and remote loading support
 *
 * @example
 * ```ts
 * // Local loading with caching
 * const loader = createMessageLoader({ cache: true });
 * const messages = await loader.load('fr');
 *
 * // Remote loading
 * const remoteLoader = createMessageLoader({
 *   baseUrl: 'https://api.aivo.com/translations',
 *   cache: true,
 * });
 * const messages = await remoteLoader.load('es');
 * ```
 */
export function createMessageLoader(config: MessageLoaderConfig = {}) {
  const {
    baseUrl,
    fetchFn = fetch,
    cache = true,
    fallbackMessages = {},
    loadFn,
    onLoadStart,
    onLoadComplete,
    onLoadError,
  } = config;

  const messageCache = new Map<Locale, TranslationMessages>();

  /**
   * Load messages for a locale
   */
  async function load(locale: Locale): Promise<TranslationMessages> {
    // Check cache first
    if (cache && messageCache.has(locale)) {
      return messageCache.get(locale)!;
    }

    onLoadStart?.(locale);

    try {
      let messages: TranslationMessages;

      if (loadFn) {
        // Use custom load function
        messages = await loadFn(locale);
      } else if (baseUrl) {
        // Load from remote URL
        messages = await loadFromUrl(locale);
      } else {
        // Load from local imports
        messages = await loadFromImports(locale);
      }

      // Cache the messages
      if (cache) {
        messageCache.set(locale, messages);
      }

      onLoadComplete?.(locale, messages);
      return messages;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      onLoadError?.(locale, err);

      // Try fallback to base language
      const baseLocale = locale.split('-')[0] as Locale;
      if (baseLocale !== locale) {
        try {
          return await load(baseLocale);
        } catch {
          // Continue to default fallback
        }
      }

      // Return fallback messages
      return fallbackMessages;
    }
  }

  /**
   * Load messages from remote URL
   */
  async function loadFromUrl(locale: Locale): Promise<TranslationMessages> {
    const url = `${baseUrl}/${locale}.json`;
    const response = await fetchFn(url);

    if (!response.ok) {
      throw new Error(`Failed to load messages: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Load messages from local imports
   */
  async function loadFromImports(locale: Locale): Promise<TranslationMessages> {
    try {
      const module = await import(`../messages/${locale}.json`);
      return module.default || module;
    } catch {
      // Try base language
      const baseLocale = locale.split('-')[0] as Locale;
      if (baseLocale !== locale) {
        const module = await import(`../messages/${baseLocale}.json`);
        return module.default || module;
      }
      throw new Error(`Messages not found for locale: ${locale}`);
    }
  }

  /**
   * Preload messages for multiple locales
   */
  async function preload(locales: Locale[]): Promise<void> {
    await Promise.all(locales.map((locale) => load(locale)));
  }

  /**
   * Clear the message cache
   */
  function clearCache(): void {
    messageCache.clear();
  }

  /**
   * Check if messages are cached for a locale
   */
  function isCached(locale: Locale): boolean {
    return messageCache.has(locale);
  }

  /**
   * Get cached messages for a locale (returns undefined if not cached)
   */
  function getCached(locale: Locale): TranslationMessages | undefined {
    return messageCache.get(locale);
  }

  return {
    load,
    preload,
    clearCache,
    isCached,
    getCached,
  };
}

/**
 * Default message loader instance
 */
export const defaultMessageLoader = createMessageLoader({
  cache: true,
});
