/**
 * Core I18n Manager
 *
 * Singleton manager for internationalization handling:
 * - Translation loading and caching
 * - Locale switching
 * - ICU MessageFormat support
 * - Namespace management
 */

import IntlMessageFormat from 'intl-messageformat';

import { DEFAULT_I18N_CONFIG, LOCALE_METADATA } from '../constants';
import type {
  SupportedLocale,
  I18nConfig,
  I18nInstance,
  TFunction,
  TranslationNamespace,
  TranslationResource,
} from '../types';
import { isRTLLocale } from '../types';

type MessageFormatCache = Map<string, IntlMessageFormat>;
type TranslationCache = Map<string, TranslationResource>;

interface LoadedNamespace {
  locale: SupportedLocale;
  namespace: TranslationNamespace;
}

/**
 * Core I18n Manager class
 */
export class I18nManager implements I18nInstance {
  private static instance: I18nManager | null = null;

  private config: I18nConfig;
  private currentLocale: SupportedLocale;
  private translations: TranslationCache = new Map();
  private messageFormatCache: MessageFormatCache = new Map();
  private loadedNamespaces = new Set<string>();
  private listeners = new Set<(locale: SupportedLocale) => void>();
  private loading = new Map<string, Promise<TranslationResource>>();

  private constructor(config: Partial<I18nConfig> = {}) {
    this.config = { ...DEFAULT_I18N_CONFIG, ...config } as I18nConfig;
    this.currentLocale = this.config.defaultLocale;
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: Partial<I18nConfig>): I18nManager {
    if (!I18nManager.instance) {
      I18nManager.instance = new I18nManager(config);
    }
    return I18nManager.instance;
  }

  /**
   * Create a new isolated instance (for testing)
   */
  static createInstance(config?: Partial<I18nConfig>): I18nManager {
    return new I18nManager(config);
  }

  /**
   * Reset singleton (for testing)
   */
  static resetInstance(): void {
    I18nManager.instance = null;
  }

  /**
   * Initialize i18n with detected or default locale
   */
  async init(): Promise<void> {
    const detectedLocale = this.detectLocale();
    await this.changeLocale(detectedLocale);
  }

  /**
   * Get current locale
   */
  get locale(): SupportedLocale {
    return this.currentLocale;
  }

  /**
   * Get current text direction
   */
  get direction(): 'ltr' | 'rtl' {
    return isRTLLocale(this.currentLocale) ? 'rtl' : 'ltr';
  }

  /**
   * Get locale metadata
   */
  getLocaleMetadata(locale?: SupportedLocale) {
    return LOCALE_METADATA[locale ?? this.currentLocale];
  }

  /**
   * Detect user's preferred locale
   */
  private detectLocale(): SupportedLocale {
    const { detection } = this.config;

    for (const source of detection.order) {
      let detected: string | null = null;

      switch (source) {
        case 'localStorage':
          if (typeof localStorage !== 'undefined') {
            detected = localStorage.getItem(detection.localStorageKey);
          }
          break;
        case 'cookie':
          if (typeof document !== 'undefined') {
            const match = new RegExp(`${detection.cookieName}=([^;]+)`).exec(document.cookie);
            detected = match?.[1] ?? null;
          }
          break;
        case 'navigator':
          if (typeof navigator !== 'undefined') {
            detected = navigator.language || (navigator as any).userLanguage;
          }
          break;
        case 'querystring':
          if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            detected = params.get('locale') || params.get('lang');
          }
          break;
        case 'path':
          if (typeof window !== 'undefined') {
            const match = /^\/([a-z]{2}(-[A-Z]{2})?)\//.exec(window.location.pathname);
            detected = match?.[1] ?? null;
          }
          break;
      }

      if (detected && this.isSupported(detected)) {
        return detected as SupportedLocale;
      }

      // Try base language if regional variant not supported
      if (detected?.includes('-')) {
        const baseLocale = detected.split('-')[0];
        if (baseLocale && this.isSupported(baseLocale)) {
          return baseLocale as SupportedLocale;
        }
      }
    }

    return this.config.defaultLocale;
  }

  /**
   * Check if locale is supported
   */
  isSupported(locale: string): boolean {
    return this.config.supportedLocales.includes(locale as SupportedLocale);
  }

  /**
   * Change current locale
   */
  async changeLocale(locale: SupportedLocale): Promise<void> {
    if (!this.isSupported(locale)) {
      console.warn(
        `Locale "${locale}" is not supported. Falling back to "${this.config.fallbackLocale}".`
      );
      locale = this.config.fallbackLocale;
    }

    // Load default namespace for new locale
    await this.loadNamespace(locale, this.config.defaultNamespace);

    this.currentLocale = locale;
    this.persistLocale(locale);
    this.notifyListeners();

    // Update document direction if in browser
    if (typeof document !== 'undefined') {
      document.documentElement.dir = this.direction;
      document.documentElement.lang = locale;
    }
  }

  /**
   * Persist locale to configured caches
   */
  private persistLocale(locale: SupportedLocale): void {
    const { detection } = this.config;

    if (detection.caches.includes('localStorage') && typeof localStorage !== 'undefined') {
      localStorage.setItem(detection.localStorageKey, locale);
    }

    if (detection.caches.includes('cookie') && typeof document !== 'undefined') {
      document.cookie = `${detection.cookieName}=${locale};path=/;max-age=31536000`;
    }
  }

  /**
   * Load translation namespace
   */
  async loadNamespace(
    locale: SupportedLocale,
    namespace: TranslationNamespace
  ): Promise<TranslationResource> {
    const cacheKey = `${locale}:${namespace}`;

    // Return cached if available
    if (this.translations.has(cacheKey)) {
      return this.translations.get(cacheKey)!;
    }

    // Return existing promise if loading
    if (this.loading.has(cacheKey)) {
      return this.loading.get(cacheKey)!;
    }

    const loadPromise = this.fetchTranslations(locale, namespace);
    this.loading.set(cacheKey, loadPromise);

    try {
      const translations = await loadPromise;
      this.translations.set(cacheKey, translations);
      this.loadedNamespaces.add(cacheKey);
      return translations;
    } catch (error) {
      // Try fallback locale
      if (locale !== this.config.fallbackLocale) {
        console.warn(`Failed to load translations for ${locale}:${namespace}, trying fallback.`);
        return this.loadNamespace(this.config.fallbackLocale, namespace);
      }
      throw error;
    } finally {
      this.loading.delete(cacheKey);
    }
  }

  /**
   * Fetch translations from server
   */
  private async fetchTranslations(
    locale: SupportedLocale,
    namespace: TranslationNamespace
  ): Promise<TranslationResource> {
    const path = this.config.loadPath.replace('{{lng}}', locale).replace('{{ns}}', namespace);

    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Failed to fetch translations from ${path}:`, error);
      return {};
    }
  }

  /**
   * Get translation function
   */
  t: TFunction = (key, options) => {
    const namespace = options?.ns ?? this.config.defaultNamespace;
    return this.translate(key, options, namespace);
  };

  /**
   * Translate a key
   */
  translate(
    key: string,
    options?: Record<string, any>,
    namespace: TranslationNamespace = 'common'
  ): string {
    const locale = this.currentLocale;
    const cacheKey = `${locale}:${namespace}`;
    const translations = this.translations.get(cacheKey);

    if (!translations) {
      return this.handleMissing(key, namespace);
    }

    // Get translation string (supports nested keys with dot notation)
    const message = this.getNestedValue(translations, key);

    if (!message) {
      return this.handleMissing(key, namespace);
    }

    // If no interpolation needed, return raw message
    if (!options || Object.keys(options).length === 0) {
      return message;
    }

    // Use ICU MessageFormat for complex interpolation
    return this.formatMessage(message, options, locale);
  }

  /**
   * Get nested value from object using dot notation
   */
  private getNestedValue(obj: TranslationResource, key: string): string | undefined {
    const keys = key.split('.');
    let value: any = obj;

    for (const k of keys) {
      if (value == null || typeof value !== 'object') {
        return undefined;
      }
      value = value[k];
    }

    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Format message with ICU MessageFormat
   */
  private formatMessage(
    message: string,
    values: Record<string, any>,
    locale: SupportedLocale
  ): string {
    const cacheKey = `${locale}:${message}`;

    let formatter = this.messageFormatCache.get(cacheKey);
    if (!formatter) {
      try {
        formatter = new IntlMessageFormat(message, locale);
        this.messageFormatCache.set(cacheKey, formatter);
      } catch (error) {
        console.error(`Failed to parse message format: ${message}`, error);
        return message;
      }
    }

    try {
      return formatter.format(values) as string;
    } catch (error) {
      console.error(`Failed to format message: ${message}`, error);
      return message;
    }
  }

  /**
   * Handle missing translation
   */
  private handleMissing(key: string, namespace: TranslationNamespace): string {
    if (this.config.debug) {
      console.warn(`Missing translation: ${namespace}:${key}`);
    }

    // Try fallback locale
    if (this.currentLocale !== this.config.fallbackLocale) {
      const fallbackKey = `${this.config.fallbackLocale}:${namespace}`;
      const fallbackTranslations = this.translations.get(fallbackKey);
      if (fallbackTranslations) {
        const fallbackMessage = this.getNestedValue(fallbackTranslations, key);
        if (fallbackMessage) {
          return fallbackMessage;
        }
      }
    }

    // Return key as fallback
    return key;
  }

  /**
   * Check if translation exists
   */
  exists(key: string, namespace: TranslationNamespace = 'common'): boolean {
    const cacheKey = `${this.currentLocale}:${namespace}`;
    const translations = this.translations.get(cacheKey);
    return translations ? this.getNestedValue(translations, key) !== undefined : false;
  }

  /**
   * Get all loaded namespaces
   */
  getLoadedNamespaces(): LoadedNamespace[] {
    return Array.from(this.loadedNamespaces).map((key) => {
      const [locale, namespace] = key.split(':');
      return { locale: locale as SupportedLocale, namespace: namespace as TranslationNamespace };
    });
  }

  /**
   * Add resource bundle programmatically
   */
  addResourceBundle(
    locale: SupportedLocale,
    namespace: TranslationNamespace,
    resources: TranslationResource,
    deep = true
  ): void {
    const cacheKey = `${locale}:${namespace}`;
    const existing = this.translations.get(cacheKey) ?? {};

    if (deep) {
      this.translations.set(cacheKey, this.deepMerge(existing, resources));
    } else {
      this.translations.set(cacheKey, { ...existing, ...resources });
    }

    this.loadedNamespaces.add(cacheKey);
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): any {
    const output = { ...target };
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        output[key] = this.deepMerge(target[key] ?? {}, source[key]);
      } else {
        output[key] = source[key];
      }
    }
    return output;
  }

  /**
   * Subscribe to locale changes
   */
  onLocaleChange(callback: (locale: SupportedLocale) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Notify all listeners of locale change
   */
  private notifyListeners(): void {
    this.listeners.forEach((callback) => {
      callback(this.currentLocale);
    });
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.translations.clear();
    this.messageFormatCache.clear();
    this.loadedNamespaces.clear();
  }

  /**
   * Get all supported locales
   */
  getSupportedLocales(): SupportedLocale[] {
    return [...this.config.supportedLocales];
  }

  /**
   * Get configuration
   */
  getConfig(): Readonly<I18nConfig> {
    return { ...this.config };
  }
}

/**
 * Default singleton instance
 */
export const i18n = I18nManager.getInstance();

/**
 * Shorthand translate function
 */
export const t: TFunction = (...args) => i18n.t(...args);
