'use client';

import React, { createContext, useContext, type ReactNode } from 'react';
import type { UILocale } from '../config';

interface LocaleContextValue {
  locale: UILocale;
  direction: 'ltr' | 'rtl';
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: 'en',
  direction: 'ltr',
});

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

interface LocaleProviderProps {
  locale: UILocale;
  children: ReactNode;
}

const RTL_LOCALES = new Set(['ar']);

export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  const direction = RTL_LOCALES.has(locale) ? 'rtl' : 'ltr';
  return (
    <LocaleContext.Provider value={{ locale, direction }}>
      {children}
    </LocaleContext.Provider>
  );
}
