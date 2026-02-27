'use client';

import type { ReactNode } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n';

export function I18nProvider({ children, locale }: { children: ReactNode; locale: string }) {
  // Sync the server-detected locale into i18next on mount
  if (i18n.language !== locale) {
    i18n.changeLanguage(locale);
  }
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
