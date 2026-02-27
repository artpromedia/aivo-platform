import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Import translations
import enMarketing from '@/locales/en/marketing.json';
import esMarketing from '@/locales/es/marketing.json';
import frMarketing from '@/locales/fr/marketing.json';
import deMarketing from '@/locales/de/marketing.json';
import ptMarketing from '@/locales/pt/marketing.json';
import zhMarketing from '@/locales/zh/marketing.json';
import jaMarketing from '@/locales/ja/marketing.json';
import koMarketing from '@/locales/ko/marketing.json';
import arMarketing from '@/locales/ar/marketing.json';
import hiMarketing from '@/locales/hi/marketing.json';

const resources = {
  en: { marketing: enMarketing },
  es: { marketing: esMarketing },
  fr: { marketing: frMarketing },
  de: { marketing: deMarketing },
  pt: { marketing: ptMarketing },
  zh: { marketing: zhMarketing },
  ja: { marketing: jaMarketing },
  ko: { marketing: koMarketing },
  ar: { marketing: arMarketing },
  hi: { marketing: hiMarketing },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    defaultNS: 'marketing',
    ns: ['marketing'],
    supportedLngs: ['en', 'es', 'fr', 'de', 'pt', 'ar', 'zh', 'ja', 'ko', 'hi'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['cookie', 'navigator'],
      lookupCookie: 'NEXT_LOCALE',
      caches: ['cookie'],
    },
  });

export default i18n;

export const supportedLanguages = [
  { code: 'en', name: 'English', dir: 'ltr' },
  { code: 'es', name: 'Español', dir: 'ltr' },
  { code: 'fr', name: 'Français', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', dir: 'ltr' },
  { code: 'pt', name: 'Português', dir: 'ltr' },
  { code: 'zh', name: '中文', dir: 'ltr' },
  { code: 'ja', name: '日本語', dir: 'ltr' },
  { code: 'ko', name: '한국어', dir: 'ltr' },
  { code: 'ar', name: 'العربية', dir: 'rtl' },
  { code: 'hi', name: 'हिन्दी', dir: 'ltr' },
];
