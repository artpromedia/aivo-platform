/**
 * AIVO Intl Provider
 *
 * Wraps react-intl with AIVO-specific configuration including:
 * - Automatic locale detection
 * - Message loading
 * - Error handling
 * - RTL support
 */

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react';
import { IntlProvider, type IntlConfig } from 'react-intl';

import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  LOCALE_METADATA,
  type Locale,
  type TranslationMessages,
} from '../constants/index';
import { loadMessagesAsync, getBrowserLocale, normalizeLocale } from '../utils/index';

/**
 * Locale context for accessing locale state outside IntlProvider
 */
export interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  isRTL: boolean;
  isLoading: boolean;
  supportedLocales: readonly Locale[];
  localeMetadata: typeof LOCALE_METADATA;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

export const useLocaleContext = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocaleContext must be used within AivoIntlProvider');
  }
  return context;
};

/**
 * Props for AivoIntlProvider
 */
export interface AivoIntlProviderProps {
  children: React.ReactNode;
  /**
   * Initial locale to use. Falls back to browser locale or default.
   */
  initialLocale?: Locale;
  /**
   * Function to load messages for a locale.
   * If not provided, uses the default message loader.
   */
  loadMessages?: (locale: Locale) => Promise<TranslationMessages>;
  /**
   * Default messages to use as fallback (usually English)
   */
  defaultMessages?: TranslationMessages;
  /**
   * Called when locale changes
   */
  onLocaleChange?: (locale: Locale) => void;
  /**
   * Called when an error occurs loading messages
   */
  onError?: (error: Error) => void;
  /**
   * Whether to persist locale selection in localStorage
   */
  persistLocale?: boolean;
  /**
   * localStorage key for persisting locale
   */
  storageKey?: string;
  /**
   * Custom error handler for IntlProvider
   */
  onIntlError?: IntlConfig['onError'];
}

const STORAGE_KEY = 'aivo-locale';

/**
 * Default message loader that imports from the messages directory
 */
const defaultLoadMessages = async (locale: Locale): Promise<TranslationMessages> => {
  return loadMessagesAsync(locale);
};

/**
 * Get initial locale from storage, browser, or default
 */
const getInitialLocale = (
  initialLocale?: Locale,
  persistLocale?: boolean,
  storageKey?: string
): Locale => {
  // Priority: explicit prop > localStorage > browser > default
  if (initialLocale && SUPPORTED_LOCALES.includes(initialLocale)) {
    return initialLocale;
  }

  if (persistLocale && typeof window !== 'undefined') {
    const stored = localStorage.getItem(storageKey || STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      return stored as Locale;
    }
  }

  const browserLocale = getBrowserLocale();
  const normalized = normalizeLocale(browserLocale);
  if (normalized && SUPPORTED_LOCALES.includes(normalized)) {
    return normalized;
  }

  return DEFAULT_LOCALE;
};

/**
 * AIVO Internationalization Provider
 *
 * Provides translation and formatting capabilities to the entire app.
 *
 * @example
 * ```tsx
 * import { AivoIntlProvider } from '@aivo/i18n';
 * import enMessages from '@aivo/i18n/messages/en.json';
 *
 * function App() {
 *   return (
 *     <AivoIntlProvider
 *       initialLocale="en"
 *       defaultMessages={enMessages}
 *       persistLocale
 *     >
 *       <YourApp />
 *     </AivoIntlProvider>
 *   );
 * }
 * ```
 */
export function AivoIntlProvider({
  children,
  initialLocale,
  loadMessages = defaultLoadMessages,
  defaultMessages = {},
  onLocaleChange,
  onError,
  persistLocale = true,
  storageKey = STORAGE_KEY,
  onIntlError,
}: AivoIntlProviderProps) {
  const [locale, setLocaleState] = useState<Locale>(() =>
    getInitialLocale(initialLocale, persistLocale, storageKey)
  );
  const [messages, setMessages] = useState<TranslationMessages>(defaultMessages);
  const [isLoading, setIsLoading] = useState(true);

  // Load messages when locale changes
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    loadMessages(locale)
      .then((loadedMessages) => {
        if (!cancelled) {
          setMessages(loadedMessages);
          setIsLoading(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          console.error(`Failed to load messages for locale ${locale}:`, error);
          onError?.(error instanceof Error ? error : new Error(String(error)));
          // Fall back to default messages
          setMessages(defaultMessages);
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [locale, loadMessages, defaultMessages, onError]);

  // Locale change handler
  const setLocale = useCallback(
    (newLocale: Locale) => {
      if (!SUPPORTED_LOCALES.includes(newLocale)) {
        console.warn(`Unsupported locale: ${newLocale}`);
        return;
      }

      setLocaleState(newLocale);

      if (persistLocale && typeof window !== 'undefined') {
        localStorage.setItem(storageKey, newLocale);
      }

      onLocaleChange?.(newLocale);

      // Update document direction for RTL support
      if (typeof document !== 'undefined') {
        const isRTL = RTL_LOCALES.includes(newLocale);
        document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
        document.documentElement.lang = newLocale;
      }
    },
    [persistLocale, storageKey, onLocaleChange]
  );

  // Set initial document direction
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const isRTL = RTL_LOCALES.includes(locale);
      document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // Memoized context value
  const contextValue = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      isRTL: RTL_LOCALES.includes(locale),
      isLoading,
      supportedLocales: SUPPORTED_LOCALES,
      localeMetadata: LOCALE_METADATA,
    }),
    [locale, setLocale, isLoading]
  );

  // Default error handler for IntlProvider
  const handleIntlError = useCallback<NonNullable<IntlConfig['onError']>>(
    (err) => {
      if (onIntlError) {
        onIntlError(err);
        return;
      }

      // Suppress missing translation warnings in development
      if (err.code === 'MISSING_TRANSLATION') {
        if (process.env.NODE_ENV === 'development') {
          console.warn(`Missing translation: ${err.message}`);
        }
        return;
      }

      console.error('IntlProvider error:', err);
    },
    [onIntlError]
  );

  return (
    <LocaleContext.Provider value={contextValue}>
      <IntlProvider
        locale={locale}
        messages={messages}
        defaultLocale={DEFAULT_LOCALE}
        onError={handleIntlError}
      >
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}

export default AivoIntlProvider;
