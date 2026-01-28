'use client';

/**
 * Locale Provider
 *
 * Comprehensive internationalization provider with:
 * - 16+ language support with ICU MessageFormat
 * - RTL language detection and CSS class injection
 * - Locale persistence in localStorage
 * - Browser locale detection
 * - Dynamic message loading
 * - Integration with GradeThemeProvider
 */

import type { ReactNode } from 'react';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
} from 'react';
import { IntlProvider } from 'react-intl';

// Import i18n utilities and types
import type { Locale, LocaleMetadata, TranslationMessages } from '@aivo/i18n';
import {
  SUPPORTED_LOCALES,
  DEFAULT_LOCALE,
  RTL_LOCALES,
  LOCALE_METADATA,
  getMessages,
  getBrowserLocale,
  getSupportedLocale,
  isRTLLocale,
} from '@aivo/i18n';

const LOCALE_STORAGE_KEY = 'aivo-locale';

/**
 * Props for the LocaleProvider component
 */
export interface LocaleProviderProps {
  children: ReactNode;
  /** Initial locale (overrides browser detection) */
  initialLocale?: Locale;
  /** Whether to persist locale preference to localStorage */
  persistPreference?: boolean;
  /** Whether to detect browser locale automatically */
  detectBrowserLocale?: boolean;
  /** Callback when locale changes */
  onLocaleChange?: (locale: Locale, metadata: LocaleMetadata) => void;
  /** Custom messages to merge with default messages */
  customMessages?: TranslationMessages;
  /** Default messages to use as fallback */
  defaultMessages?: TranslationMessages;
}

/**
 * Context value provided by LocaleProvider
 */
export interface LocaleContextValue {
  /** Current active locale */
  locale: Locale;
  /** Set locale by code */
  setLocale: (locale: Locale) => Promise<void>;
  /** Current locale metadata (name, flag, currency, etc.) */
  metadata: LocaleMetadata;
  /** All available locales */
  availableLocales: readonly Locale[];
  /** Whether current locale is RTL */
  isRTL: boolean;
  /** Text direction ('ltr' or 'rtl') */
  direction: 'ltr' | 'rtl';
  /** Whether messages are currently loading */
  isLoading: boolean;
  /** Locale grouped by region for display */
  localesByRegion: Record<string, Locale[]>;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * Group locales by region for UI display
 */
function groupLocalesByRegion(): Record<string, Locale[]> {
  const regions: Record<string, Locale[]> = {
    'Americas': ['en', 'es', 'pt-BR'],
    'Europe': ['fr', 'de', 'it', 'nl', 'ru'],
    'Asia': ['zh', 'ja', 'ko', 'hi', 'id'],
    'Middle East': ['ar', 'tr'],
    'Africa': ['sw'],
  };
  return regions;
}

/**
 * Load persisted locale from localStorage
 */
function loadPersistedLocale(): Locale | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && SUPPORTED_LOCALES.includes(stored as Locale)) {
      return stored as Locale;
    }
  } catch {
    // localStorage not available
  }
  return null;
}

/**
 * Persist locale to localStorage
 */
function persistLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // localStorage not available
  }
}

/**
 * Apply RTL styles to document
 */
function applyRTLStyles(isRTL: boolean): void {
  if (typeof document === 'undefined') return;

  const html = document.documentElement;
  html.dir = isRTL ? 'rtl' : 'ltr';
  html.lang = html.lang || 'en';

  if (isRTL) {
    html.classList.add('rtl');
    html.classList.remove('ltr');
  } else {
    html.classList.add('ltr');
    html.classList.remove('rtl');
  }
}

export function LocaleProvider({
  children,
  initialLocale,
  persistPreference = true,
  detectBrowserLocale = true,
  onLocaleChange,
  customMessages,
  defaultMessages,
}: LocaleProviderProps) {
  // Determine initial locale
  const getInitialLocale = useCallback((): Locale => {
    // 1. Use explicit initial locale if provided
    if (initialLocale) return initialLocale;

    // 2. Check localStorage for persisted preference
    const persisted = loadPersistedLocale();
    if (persisted) return persisted;

    // 3. Detect from browser
    if (detectBrowserLocale) {
      const browserLocale = getBrowserLocale();
      const supported = getSupportedLocale(browserLocale);
      if (supported) return supported as Locale;
    }

    // 4. Fall back to default
    return DEFAULT_LOCALE;
  }, [initialLocale, detectBrowserLocale]);

  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  const [messages, setMessages] = useState<TranslationMessages>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load messages for current locale
  useEffect(() => {
    let cancelled = false;

    async function loadLocaleMessages() {
      setIsLoading(true);
      try {
        const localeMessages = await getMessages(locale);

        if (!cancelled) {
          // Merge with custom messages if provided
          const mergedMessages = {
            ...localeMessages,
            ...customMessages,
          };
          setMessages(mergedMessages);
        }
      } catch (error) {
        console.error(`Failed to load messages for locale ${locale}:`, error);
        // Fall back to default messages
        if (!cancelled && defaultMessages) {
          setMessages(defaultMessages);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadLocaleMessages();

    return () => {
      cancelled = true;
    };
  }, [locale, customMessages, defaultMessages]);

  // Apply RTL styles when locale changes
  useEffect(() => {
    const rtl = isRTLLocale(locale);
    applyRTLStyles(rtl);

    // Update html lang attribute
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  // Set locale with persistence
  const setLocale = useCallback(
    async (newLocale: Locale) => {
      if (!SUPPORTED_LOCALES.includes(newLocale)) {
        console.warn(`Unsupported locale: ${newLocale}`);
        return;
      }

      setLocaleState(newLocale);

      if (persistPreference) {
        persistLocale(newLocale);
      }

      const metadata = LOCALE_METADATA[newLocale];
      if (onLocaleChange && metadata) {
        onLocaleChange(newLocale, metadata);
      }
    },
    [persistPreference, onLocaleChange]
  );

  // Compute context value
  const contextValue = useMemo<LocaleContextValue>(() => {
    const metadata = LOCALE_METADATA[locale] || LOCALE_METADATA[DEFAULT_LOCALE];
    const rtl = isRTLLocale(locale);

    return {
      locale,
      setLocale,
      metadata,
      availableLocales: SUPPORTED_LOCALES,
      isRTL: rtl,
      direction: rtl ? 'rtl' : 'ltr',
      isLoading,
      localesByRegion: groupLocalesByRegion(),
    };
  }, [locale, setLocale, isLoading]);

  return (
    <LocaleContext.Provider value={contextValue}>
      <IntlProvider
        locale={locale}
        messages={messages}
        defaultLocale={DEFAULT_LOCALE}
        onError={(err) => {
          // Ignore missing translation errors in development
          if (err.code === 'MISSING_TRANSLATION') {
            console.debug(`Missing translation: ${err.message}`);
            return;
          }
          console.error(err);
        }}
      >
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}

/**
 * Hook to access locale context
 */
export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}

/**
 * Hook to get translation function
 */
export function useTranslations() {
  const { locale, isRTL, direction } = useLocale();

  return {
    locale,
    isRTL,
    direction,
  };
}
