/**
 * I18n React Context and Provider
 *
 * Provides React context for i18n functionality including:
 * - Locale management
 * - Translation function
 * - Direction handling for RTL support
 */

import type { ReactNode } from 'react';
import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';

import type { LOCALE_METADATA } from '../constants';
import { I18nManager, i18n } from '../core/i18n-manager';
import type {
  SupportedLocale,
  TFunction,
  TranslationNamespace,
  I18nConfig,
  isRTLLocale,
} from '../types';

/**
 * I18n context value
 */
export interface I18nContextValue {
  /** Current locale */
  locale: SupportedLocale;
  /** Text direction */
  direction: 'ltr' | 'rtl';
  /** Translation function */
  t: TFunction;
  /** Change locale */
  changeLocale: (locale: SupportedLocale) => Promise<void>;
  /** Check if locale is supported */
  isSupported: (locale: string) => boolean;
  /** Get all supported locales */
  supportedLocales: SupportedLocale[];
  /** Is locale currently loading */
  isLoading: boolean;
  /** Load additional namespace */
  loadNamespace: (namespace: TranslationNamespace) => Promise<void>;
  /** Get locale metadata */
  getLocaleMetadata: (locale?: SupportedLocale) => (typeof LOCALE_METADATA)[SupportedLocale];
  /** I18n manager instance */
  i18n: I18nManager;
}

/**
 * React Context for i18n
 */
const I18nContext = createContext<I18nContextValue | null>(null);

/**
 * I18n Provider props
 */
export interface I18nProviderProps {
  /** Child components */
  children: ReactNode;
  /** Initial locale (overrides detection) */
  initialLocale?: SupportedLocale;
  /** Custom i18n configuration */
  config?: Partial<I18nConfig>;
  /** Custom i18n instance (for testing) */
  instance?: I18nManager;
  /** Callback when locale changes */
  onLocaleChange?: (locale: SupportedLocale) => void;
  /** Namespaces to preload */
  preloadNamespaces?: TranslationNamespace[];
  /** Loading component */
  loadingComponent?: ReactNode;
}

/**
 * I18n Provider Component
 */
export function I18nProvider({
  children,
  initialLocale,
  config,
  instance,
  onLocaleChange,
  preloadNamespaces = ['common'],
  loadingComponent,
}: I18nProviderProps): React.ReactElement {
  // Use provided instance or get default
  const i18nInstance = useMemo(() => {
    if (instance) return instance;
    if (config) {
      I18nManager.resetInstance();
      return I18nManager.getInstance(config);
    }
    return i18n;
  }, [instance, config]);

  const [locale, setLocale] = useState<SupportedLocale>(initialLocale ?? i18nInstance.locale);
  const [isLoading, setIsLoading] = useState(true);
  const [, forceUpdate] = useState({});

  // Initialize i18n on mount
  useEffect(() => {
    let mounted = true;

    async function init() {
      setIsLoading(true);
      try {
        // Change to initial locale if provided
        if (initialLocale) {
          await i18nInstance.changeLocale(initialLocale);
        } else {
          await i18nInstance.init();
        }

        // Preload additional namespaces
        if (preloadNamespaces.length > 0) {
          await Promise.all(
            preloadNamespaces.map((ns) => i18nInstance.loadNamespace(i18nInstance.locale, ns))
          );
        }

        if (mounted) {
          setLocale(i18nInstance.locale);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to initialize i18n:', error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    init();

    // Subscribe to locale changes
    const unsubscribe = i18nInstance.onLocaleChange((newLocale) => {
      if (mounted) {
        setLocale(newLocale);
        onLocaleChange?.(newLocale);
        forceUpdate({});
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [i18nInstance, initialLocale, onLocaleChange, preloadNamespaces]);

  // Change locale handler
  const changeLocale = useCallback(
    async (newLocale: SupportedLocale) => {
      setIsLoading(true);
      try {
        await i18nInstance.changeLocale(newLocale);
        // Reload preloaded namespaces for new locale
        await Promise.all(preloadNamespaces.map((ns) => i18nInstance.loadNamespace(newLocale, ns)));
      } finally {
        setIsLoading(false);
      }
    },
    [i18nInstance, preloadNamespaces]
  );

  // Load namespace handler
  const loadNamespace = useCallback(
    async (namespace: TranslationNamespace) => {
      await i18nInstance.loadNamespace(locale, namespace);
      forceUpdate({});
    },
    [i18nInstance, locale]
  );

  // Context value
  const contextValue = useMemo<I18nContextValue>(
    () => ({
      locale,
      direction: isRTLLocale(locale) ? 'rtl' : 'ltr',
      t: i18nInstance.t,
      changeLocale,
      isSupported: (loc: string) => i18nInstance.isSupported(loc),
      supportedLocales: i18nInstance.getSupportedLocales(),
      isLoading,
      loadNamespace,
      getLocaleMetadata: (loc?: SupportedLocale) => i18nInstance.getLocaleMetadata(loc),
      i18n: i18nInstance,
    }),
    [locale, i18nInstance, changeLocale, isLoading, loadNamespace]
  );

  // Show loading component while initializing
  if (isLoading && loadingComponent) {
    return <>{loadingComponent}</>;
  }

  return <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>;
}

/**
 * Hook to access i18n context
 */
export function useI18nContext(): I18nContextValue {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18nContext must be used within an I18nProvider');
  }

  return context;
}

/**
 * HOC to inject i18n props
 */
export function withI18n<P extends object>(
  Component: React.ComponentType<P & { i18n: I18nContextValue }>
): React.FC<Omit<P, 'i18n'>> {
  const WrappedComponent: React.FC<Omit<P, 'i18n'>> = (props) => {
    const i18n = useI18nContext();
    return <Component {...(props as P)} i18n={i18n} />;
  };

  WrappedComponent.displayName = `withI18n(${Component.displayName || Component.name || 'Component'})`;

  return WrappedComponent;
}

export { I18nContext };
